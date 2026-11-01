import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { readJsonIfExists, writeJson, writeJsonLines, writeText } from './lib/files.ts';
import { createHttp, errorMessage, type Http } from './lib/http.ts';
import { formatLisbon, isoDate, parseFantasyDate, uefaSeasonYear } from './lib/time.ts';
import {
  buildHistory,
  nextMatchFromFeed,
  normalizePlayer,
  sortPlayers,
  statusKey,
  updateGamedayStats,
} from './normalize/players.ts';
import {
  buildTeams,
  crossCheckFixtures,
  fixtureFromUefa,
  fixturesFromFantasy,
  kickoffLookup,
  sortFixtures,
  teamInfoFromMatches,
  type TeamInfo,
} from './normalize/teams.ts';
import { fetchClubElo, type EloClub } from './sources/clubElo.ts';
import { fetchUefaCoefficients, type Coefficient } from './sources/uefaCoefficients.ts';
import { EmptyFeedError, fetchFantasyFeed, type ParsedFeed } from './sources/uefaFantasy.ts';
import { fetchTeamNews, fold, type NewsItem } from './sources/news.ts';
import { fetchUefaMatches } from './sources/uefaMatches.ts';
import { fantasyTourId, fetchPlayerHistory, mapPool, PLAYER_HISTORY_PARSER_VERSION } from './sources/uefaPlayerHistory.ts';
import { ensurePrevSeason, type PrevSeasonResult } from './prevSeason.ts';
import { runModel, type ModelSummary } from './model/publish.ts';
import type { PlayerXp } from './model/xp.ts';
import type {
  Fixture,
  GamedayState,
  GamedayStatsFile,
  Meta,
  Player,
  PlayerHistoryCache,
  SourceStatus,
  Team,
} from './types.ts';

export const PIPELINE_VERSION = '0.2.0';

export type SourceName =
  | 'uefaMatches'
  | 'uefaFantasy'
  | 'uefaPlayerHistory'
  | 'uefaPrevSeason'
  | 'uefaCoefficients'
  | 'clubElo'
  | 'googleNews';

export interface RunOptions {
  /** Pasta de saída (no GitHub Actions: worktree do branch `data`). */
  outDir: string;
  now?: Date;
  httpFactory?: (source: SourceName) => Http;
  /** Mínimo de jogadores válidos para aceitar o feed (controlo de qualidade). */
  minPlayers?: number;
  /** ID de equipa UEFA → nome do clube no ClubElo. */
  aliases?: Record<string, string>;
  /** Pedidos em paralelo ao histórico por jogador (cortesia com a UEFA). */
  historyConcurrency?: number;
  log?: (msg: string) => void;
}

/** Verificações mínimas antes de publicar dados do feed fantasy. */
export function fantasyQualityGate(feed: ParsedFeed, minPlayers: number): void {
  const n = feed.players.length;
  const problems: string[] = [];
  if (n < minPlayers) problems.push(`só ${n} jogadores válidos (mínimo ${minPlayers})`);
  if (feed.invalid > Math.max(5, n * 0.1)) problems.push(`${feed.invalid} jogadores inválidos (${feed.invalidSamples.join('; ')})`);
  const teams = new Set(feed.players.map((p) => p.tId)).size;
  if (teams < 2 || teams > 40) problems.push(`${teams} equipas`);
  for (const skill of [1, 2, 3, 4]) if (!feed.players.some((p) => p.skill === skill)) problems.push(`sem jogadores na posição ${skill}`);
  const prices = feed.players.map((p) => p.value).sort((a, b) => a - b);
  const median = prices[Math.floor(prices.length / 2)] ?? 0;
  if (median < 3 || median > 10) problems.push(`preço mediano estranho (${median})`);
  if (!feed.gameday) problems.push('jornada atual desconhecida (mdId)');
  if (problems.length) throw new Error(`Controlo de qualidade falhou: ${problems.join(' · ')}`);
}

export function gamedayTiming(
  gameday: number,
  fixtures: Fixture[],
  now: Date,
): { deadline: string | null; state: GamedayState | null } {
  const gd = fixtures.filter((f) => f.gameday === gameday && f.kickoff);
  if (gd.length === 0) return { deadline: null, state: null };
  const kicks = gd.map((f) => f.kickoff!).sort();
  const deadline = kicks[0]!;
  const last = Date.parse(kicks[kicks.length - 1]!);
  const t = now.getTime();
  if (t < Date.parse(deadline)) return { deadline, state: 'upcoming' };
  const allFinished = gd.every((f) => f.status === 'FINISHED');
  const anyLive = gd.some((f) => f.status === 'LIVE');
  if (allFinished || (!anyLive && t > last + 3 * 3600_000)) return { deadline, state: 'finished' };
  return { deadline, state: 'live' };
}

/** Jornada atual = a primeira com jogos por terminar; se todas terminaram, a última. */
export function currentGamedayFromFixtures(fixtures: Fixture[]): number | null {
  const gds = fixtures.filter((f) => f.gameday != null);
  if (gds.length === 0) return null;
  const open = gds.filter((f) => f.status !== 'FINISHED').map((f) => f.gameday!);
  return open.length ? Math.min(...open) : Math.max(...gds.map((f) => f.gameday!));
}

/**
 * Feed da jornada atual. Visto nos runners (1 nov 2026): sem `gamedayId` o feed vem vazio, e
 * qualquer `gamedayId` passado devolve o estado ATUAL — por isso a jornada verdadeira é o `mdId`
 * do próprio feed. Pede-se a jornada indicada (ou J1) e, se vier vazia, a anterior.
 */
export async function fetchCurrentFantasy(http: Http, hint: number | null): Promise<{ feed: ParsedFeed; gameday: number }> {
  const candidates = [...new Set([hint, hint ? hint - 1 : null, 1].filter((g): g is number => g != null && g >= 1))];
  for (const gd of candidates) {
    try {
      const feed = await fetchFantasyFeed(http, gd);
      return { feed, gameday: feed.gameday ?? gd };
    } catch (e) {
      if (!(e instanceof EmptyFeedError)) throw e;
    }
  }
  throw new Error(`Feed fantasy vazio para as jornadas ${candidates.join(', ')}`);
}

const NEWS_EVERY_MS = 3 * 3600_000 - 10 * 60_000;

/** Sem duplicados, últimas 72 h, no máximo 8 por equipa, mais recentes primeiro. */
export function selectNews(items: NewsItem[], now: Date): NewsItem[] {
  const seen = new Set<string>();
  const perTeam = new Map<string, number>();
  return items
    .filter((n) => now.getTime() - Date.parse(n.publishedAt) <= 72 * 3600_000)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .filter((n) => {
      const key = fold(n.title).replace(/[^a-z0-9]+/g, ' ').trim();
      if (seen.has(key)) return false;
      const c = perTeam.get(n.teamId) ?? 0;
      if (c >= 8) return false;
      seen.add(key);
      perTeam.set(n.teamId, c + 1);
      return true;
    });
}

function loadAliases(): Record<string, string> {
  const file = readJsonIfExists<{ clubElo?: Record<string, string> }>(join(process.cwd(), 'data', 'team-aliases.json'));
  return file?.clubElo ?? {};
}

export async function runPipeline(opts: RunOptions): Promise<Meta> {
  const started = Date.now();
  const now = opts.now ?? new Date();
  const nowIso = now.toISOString();
  const log = opts.log ?? ((m: string) => console.log(m));
  const httpFactory =
    opts.httpFactory ??
    ((s: SourceName) =>
      createHttp(
        s === 'clubElo'
          ? { retries: 0, timeoutMs: 20_000 }
          : s === 'uefaPlayerHistory' || s === 'uefaPrevSeason'
            ? { retries: 1, timeoutMs: 20_000, backoffMs: 2_000 }
            : {},
      ));
  const minPlayers = opts.minPlayers ?? 200;
  const historyConcurrency = opts.historyConcurrency ?? 6;
  const aliases = opts.aliases ?? loadAliases();
  const season = uefaSeasonYear(now);
  const latest = join(opts.outDir, 'latest');

  const prevMeta = readJsonIfExists<Meta>(join(latest, 'meta.json'));
  const prevStats = readJsonIfExists<GamedayStatsFile>(join(latest, 'gameday-stats.json'));
  const prevFixtures = readJsonIfExists<{ fixtures: Fixture[] }>(join(latest, 'fixtures.json'))?.fixtures ?? null;
  const prevTeams = readJsonIfExists<{ teams: Team[] }>(join(latest, 'teams.json'))?.teams ?? null;

  const warnings: string[] = [];
  const sources: Record<string, SourceStatus> = {};
  const record = (name: SourceName, http: Http, error: unknown | null, records?: number) => {
    sources[name] = {
      status: error ? 'failed' : 'ok',
      lastAttempt: nowIso,
      lastSuccess: error ? (prevMeta?.sources[name]?.lastSuccess ?? null) : nowIso,
      requests: http.requests,
      ...(records !== undefined ? { records } : {}),
      ...(error ? { error: errorMessage(error) } : {}),
    };
    log(`[${name}] ${error ? `FALHOU: ${errorMessage(error)}` : `ok (${records ?? '?'} registos, ${http.requests} pedidos)`}`);
  };

  // 1) API de jogos UEFA: calendário completo, horas UTC, resultados — e a jornada atual.
  const mHttp = httpFactory('uefaMatches');
  let uefaFixtures: Fixture[] | null = null;
  let teamInfo = new Map<string, TeamInfo>();
  try {
    const { matches, invalid } = await fetchUefaMatches(mHttp, season);
    if (matches.length === 0) throw new Error('0 jogos devolvidos');
    if (invalid > 0) warnings.push(`API de jogos: ${invalid} jogos ignorados por formato inválido`);
    uefaFixtures = sortFixtures(matches.map(fixtureFromUefa));
    teamInfo = teamInfoFromMatches(matches);
    record('uefaMatches', mHttp, null, uefaFixtures.length);
  } catch (e) {
    record('uefaMatches', mHttp, e);
  }

  // 2) Feed fantasy: jogadores, preços, estado, estatísticas (1 pedido por execução).
  const fHttp = httpFactory('uefaFantasy');
  let fantasy: { feed: ParsedFeed; gameday: number } | null = null;
  try {
    const hint = (uefaFixtures && currentGamedayFromFixtures(uefaFixtures)) ?? prevMeta?.currentGameday ?? null;
    const got = await fetchCurrentFantasy(fHttp, hint);
    fantasyQualityGate(got.feed, minPlayers);
    if (hint && got.gameday !== hint) warnings.push(`Jornada: API de jogos indica J${hint}, feed fantasy indica J${got.gameday}`);
    if (got.feed.invalid > 0)
      warnings.push(`${got.feed.invalid} jogadores ignorados por formato inválido: ${got.feed.invalidSamples.join('; ')}`);
    fantasy = got;
    record('uefaFantasy', fHttp, null, got.feed.players.length);
  } catch (e) {
    record('uefaFantasy', fHttp, e);
  }

  // 2b) Histórico oficial por jogador (popupstats): só para quem mudou desde a última execução.
  const hHttp = httpFactory('uefaPlayerHistory');
  let official: PlayerHistoryCache | null = null;
  const officialStats = { players: 0, fetched: 0, failed: 0, sumMatchesTotal: 0, sumMismatch: 0 };
  if (fantasy) {
    const tourId = fantasyTourId(season);
    const prev = readJsonIfExists<PlayerHistoryCache>(join(latest, 'player-history.json'));
    const cache: PlayerHistoryCache =
      prev && prev.season === season && prev.tourId === tourId && prev.parserVersion === PLAYER_HISTORY_PARSER_VERSION
        ? { ...prev, players: { ...prev.players } }
        : { parserVersion: PLAYER_HISTORY_PARSER_VERSION, season, tourId, updatedAt: nowIso, players: {} };
    const toFetch = fantasy.feed.players.filter((p) => {
      const c = cache.players[p.id];
      if (p.minsPlyd === 0 && p.totPts === 0) {
        cache.players[p.id] = { totPts: 0, minutes: 0, fetchedAt: c?.fetchedAt ?? nowIso, lines: [] };
        return false;
      }
      return !c || c.totPts !== p.totPts || c.minutes !== p.minsPlyd;
    });
    let firstError: unknown = null;
    await mapPool(toFetch, historyConcurrency, async (p) => {
      try {
        const r = await fetchPlayerHistory(hHttp, tourId, p.id);
        cache.players[p.id] = { totPts: p.totPts, minutes: p.minsPlyd, fetchedAt: nowIso, lines: r.lines };
        officialStats.fetched++;
      } catch (e) {
        officialStats.failed++;
        firstError ??= e;
      }
    });
    cache.updatedAt = nowIso;
    official = cache;
    const tooMany = toFetch.length > 0 && officialStats.failed > toFetch.length * 0.2;
    record('uefaPlayerHistory', hHttp, tooMany ? (firstError ?? new Error('demasiadas falhas')) : null, officialStats.fetched);
    if (officialStats.failed && !tooMany)
      warnings.push(`Histórico oficial: ${officialStats.failed}/${toFetch.length} jogadores falharam (usado plano B)`);
  }

  // 2c) Época anterior (jogos + estatísticas por jogador), em cache permanente.
  let prevSeason: PrevSeasonResult | null = null;
  if (fantasy) {
    const pHttp = httpFactory('uefaPrevSeason');
    prevSeason = await ensurePrevSeason(
      opts.outDir,
      season,
      fantasy.feed.players.map((p) => p.id),
      pHttp,
      pHttp,
      nowIso,
      historyConcurrency,
    );
    const known = Object.keys(prevSeason.players?.players ?? {}).length;
    record('uefaPrevSeason', pHttp, prevSeason.fixtures ? null : new Error(prevSeason.errors.join('; ') || 'sem jogos'), known);
    if (prevSeason.errors.length) warnings.push(`Época anterior: ${prevSeason.errors.join('; ')}`);
  }

  // 3) Força das equipas: coeficientes UEFA (fiável a partir do GitHub) e Elo (ClubElo, se responder).
  const cHttp = httpFactory('uefaCoefficients');
  let coefficients: Map<string, Coefficient> | null = null;
  try {
    coefficients = await fetchUefaCoefficients(cHttp, season);
    if (coefficients.size < 50) throw new Error(`só ${coefficients.size} clubes`);
    record('uefaCoefficients', cHttp, null, coefficients.size);
  } catch (e) {
    coefficients = null;
    record('uefaCoefficients', cHttp, e);
  }
  const eHttp = httpFactory('clubElo');
  let clubs: EloClub[] | null = null;
  try {
    clubs = await fetchClubElo(eHttp, isoDate(now));
    if (clubs.length < 100) throw new Error(`só ${clubs.length} clubes`);
    record('clubElo', eHttp, null, clubs.length);
  } catch (e) {
    clubs = null;
    record('clubElo', eHttp, e);
  }

  // 4) Normalizar e cruzar.
  const parseDate = (raw: string) => parseFantasyDate(raw);
  const fixtures: Fixture[] =
    uefaFixtures ?? prevFixtures ?? (fantasy ? fixturesFromFantasy(fantasy.feed.players, parseDate) : []);
  if (!uefaFixtures && prevFixtures) warnings.push('Calendário: API de jogos falhou, mantido o último calendário válido');

  let players: Player[] | null = null;
  let teams: Team[] | null = null;
  let currentGameday: number | null = prevMeta?.currentGameday ?? null;
  let timing: { deadline: string | null; state: GamedayState | null } = {
    deadline: prevMeta?.deadline ?? null,
    state: prevMeta?.gamedayState ?? null,
  };
  let pointsCheck = prevMeta?.checks.pointsHistory ?? { checked: 0, mismatches: 0 };
  let coverage: Omit<Meta['checks']['history'], 'official'> = {
    tracked: prevMeta?.checks.history?.tracked ?? [],
    fromFeed: prevMeta?.checks.history?.fromFeed ?? null,
    unavailable: prevMeta?.checks.history?.unavailable ?? [],
  };
  let crossCheck: Meta['checks']['fixturesCrossCheck'] = null;
  const statusValues: Record<string, number> = {};
  let modelSummary: ModelSummary | null = null;
  let topXp: PlayerXp[] = [];

  if (fantasy) {
    const { feed, gameday } = fantasy;
    currentGameday = gameday;
    const fantasyFixtures = fixturesFromFantasy(feed.players, parseDate).filter((f) => f.gameday === gameday);
    if (uefaFixtures) {
      crossCheck = crossCheckFixtures(fantasyFixtures, uefaFixtures);
      if (crossCheck.matched < crossCheck.fantasy)
        warnings.push(`Só ${crossCheck.matched}/${crossCheck.fantasy} jogos da jornada ${gameday} do feed fantasy foram encontrados na API de jogos`);
    }
    const timingFixtures = fixtures.some((f) => f.gameday === gameday) ? fixtures : fantasyFixtures;
    timing = gamedayTiming(gameday, timingFixtures, now);

    const beforeDeadline = timing.state === 'upcoming';
    const stats = updateGamedayStats(prevStats, season, gameday, feed, nowIso, beforeDeadline);
    const built = buildHistory(stats, feed.players, gameday, timing.state === 'live' || timing.state === 'finished');
    pointsCheck = built.check;
    coverage = built.coverage;
    if (pointsCheck.mismatches > 0)
      warnings.push(`Pontos por jornada: ${pointsCheck.mismatches}/${pointsCheck.checked} diferem do valor oficial do feed`);
    if (!stats.gamedays[String(gameday)]!.startBeforeDeadline && gameday === Number(Object.keys(stats.gamedays)[0]))
      warnings.push(`J${gameday}: 1.º snapshot feito depois do fecho — pontos desta jornada só a partir do feed`);

    // Histórico: oficial (popupstats) quando coincide com os totais atuais; senão, plano B.
    const historyFor = (p: (typeof feed.players)[number]) => {
      const c = official?.players[p.id];
      if (c && c.totPts === p.totPts && c.minutes === p.minsPlyd) {
        officialStats.players++;
        const sum = Math.round(c.lines.reduce((a, l) => a + l.points, 0) * 10) / 10;
        if (Math.abs(sum - p.totPts) < 0.01) officialStats.sumMatchesTotal++;
        else officialStats.sumMismatch++;
        return c.lines;
      }
      return built.history.get(p.id) ?? [];
    };
    const lookup = kickoffLookup(fixtures);
    players = sortPlayers(
      feed.players.map((p) => normalizePlayer(p, historyFor(p), nextMatchFromFeed(p, gameday, lookup, parseDate))),
    );
    if (officialStats.sumMismatch > 0)
      warnings.push(`Histórico oficial: ${officialStats.sumMismatch} jogadores cuja soma por jornada ≠ total`);
    if (official) writeText(join(latest, 'player-history.json'), JSON.stringify(official));
    for (const p of feed.players) {
      const k = statusKey(p);
      statusValues[k] = (statusValues[k] ?? 0) + 1;
    }

    const teamsBuilt = buildTeams({ players, fixtures, info: teamInfo, clubs, coefficients, aliases, nowIso });
    teams = teamsBuilt.teams;
    if (prevTeams && (!clubs || !coefficients)) {
      const prev = new Map(prevTeams.map((t) => [t.id, t]));
      for (const t of teams) {
        const old = prev.get(t.id);
        if (!old) continue;
        if (!clubs && old.elo != null) Object.assign(t, { elo: old.elo, eloClub: old.eloClub, eloMatch: old.eloMatch });
        if (!coefficients && old.coefficient != null)
          Object.assign(t, { coefficient: old.coefficient, coefficientRank: old.coefficientRank });
      }
    }
    if (clubs && teamsBuilt.unmatchedElo.length)
      warnings.push(`Sem Elo (acrescentar em data/team-aliases.json): ${teamsBuilt.unmatchedElo.join(', ')}`);
    const noCoef = teams.filter((t) => t.coefficient == null).map((t) => t.name);
    if (coefficients && noCoef.length) warnings.push(`Sem coeficiente UEFA: ${noCoef.join(', ')}`);

    // Modelo xP (Fase 2). Uma falha aqui nunca impede a publicação dos dados.
    try {
      const coefMap = new Map<string, number>(
        coefficients
          ? [...coefficients].map(([id, c]) => [id, c.value])
          : teams.filter((t) => t.coefficient != null).map((t) => [t.id, t.coefficient!]),
      );
      const out = runModel({
        outDir: opts.outDir,
        nowIso,
        season,
        gameday,
        state: timing.state,
        players,
        teams,
        fixtures,
        prevFixtures: prevSeason?.fixtures ?? null,
        prev: prevSeason?.players?.players ?? {},
        coefficients: coefMap,
      });
      modelSummary = out.summary;
      topXp = out.xp.slice(0, 20);
    } catch (e) {
      warnings.push(`Modelo xP falhou: ${errorMessage(e)}`);
    }

    // Notícias por equipa (no máximo a cada 3 h; usar o Google News com moderação).
    const prevNews = readJsonIfExists<{ fetchedAt: string; items: NewsItem[] }>(join(latest, 'news.json'));
    const newsDue = !prevNews || Date.parse(nowIso) - Date.parse(prevNews.fetchedAt) >= NEWS_EVERY_MS;
    const nHttp = httpFactory('googleNews');
    if (!newsDue && prevNews) {
      sources.googleNews = {
        status: 'ok',
        lastAttempt: prevMeta?.sources.googleNews?.lastAttempt ?? prevNews.fetchedAt,
        lastSuccess: prevNews.fetchedAt,
        requests: 0,
        records: prevNews.items.length,
      };
    } else {
      const rosters = new Map<string, { id: string; name: string }[]>();
      for (const p of players) rosters.set(p.teamId, [...(rosters.get(p.teamId) ?? []), { id: p.id, name: p.name }]);
      const found: NewsItem[] = [];
      let newsFailed = 0;
      let newsError: unknown = null;
      await mapPool(teams, 3, async (t) => {
        try {
          found.push(...(await fetchTeamNews(nHttp, t, rosters.get(t.id) ?? [])));
        } catch (e) {
          newsFailed++;
          newsError ??= e;
        }
      });
      if (newsFailed === teams.length) record('googleNews', nHttp, newsError ?? new Error('todas as equipas falharam'));
      else {
        const items = selectNews(found, now);
        writeJsonLines(join(latest, 'news.json'), { fetchedAt: nowIso }, 'items', items);
        record('googleNews', nHttp, null, items.length);
      }
    }

    const header = { generatedAt: nowIso, season, gameday };
    writeJsonLines(join(latest, 'players.json'), header, 'players', players);
    writeJsonLines(join(latest, 'teams.json'), header, 'teams', teams);
    writeText(join(latest, 'gameday-stats.json'), JSON.stringify(stats));
    writeJsonLines(
      join(opts.outDir, 'history', `gd${String(gameday).padStart(2, '0')}`, `${isoDate(now)}.json`),
      { generatedAt: nowIso, season, gameday, fields: ['id', 'price', 'selectedPct', 'points', 'minutes', 'availability'] },
      'players',
      players.map((p) => [p.id, p.price, p.selectedPct, p.stats.points, p.stats.minutes, p.availability]),
    );
  }
  if (uefaFixtures || (!prevFixtures && fixtures.length > 0)) {
    writeJsonLines(join(latest, 'fixtures.json'), { generatedAt: nowIso, season }, 'fixtures', fixtures);
  }

  const topStatus = Object.fromEntries(
    Object.entries(statusValues)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20),
  );
  const finalTeams = teams ?? prevTeams ?? [];
  const meta: Meta = {
    schemaVersion: 1,
    generatedAt: nowIso,
    currentGameday,
    gamedayState: timing.state,
    deadline: timing.deadline,
    sources,
    counts: {
      players: players?.length ?? prevMeta?.counts.players ?? 0,
      teams: finalTeams.length,
      fixtures: fixtures.length,
      teamsWithElo: finalTeams.filter((t) => t.elo != null).length,
      teamsWithCoefficient: finalTeams.filter((t) => t.coefficient != null).length,
    },
    checks: {
      invalidPlayers: fantasy?.feed.invalid ?? 0,
      pointsHistory: pointsCheck,
      history: { official: officialStats, ...coverage },
      fixturesCrossCheck: crossCheck,
    },
    statusValues: players ? topStatus : (prevMeta?.statusValues ?? {}),
    model: modelSummary
      ? {
          version: modelSummary.version,
          targets: modelSummary.targets,
          players: modelSummary.players,
          backtest: modelSummary.backtest.map((b) => ({
            gameday: b.gameday,
            modelMae: b.model.mae,
            baselineMae: b.baseline.mae,
            modelTop20: b.model.top20Actual,
            baselineTop20: b.baseline.top20Actual,
          })),
        }
      : (prevMeta?.model ?? null),
    warnings,
    durationMs: Date.now() - started,
  };
  writeJson(join(latest, 'meta.json'), meta);
  writeText(join(latest, 'summary.md'), renderSummary(meta, players, finalTeams, topXp));
  return meta;
}

const STATE_PT: Record<GamedayState, string> = { upcoming: 'por jogar', live: 'a decorrer', finished: 'terminada' };
const AVAIL_PT: Record<string, string> = {
  available: 'disponível',
  doubtful: 'dúvida',
  out: 'fora',
  inactive: 'inativo',
  unknown: '?',
};

const gdList = (g: number[]) => (g.length ? g.map((x) => `J${x}`).join(', ') : '—');

export function renderSummary(meta: Meta, players: Player[] | null, teams: Team[], topXp: PlayerXp[] = []): string {
  const L: string[] = [];
  L.push('# UCL Fantasy — atualização de dados', '');
  L.push(
    `**Gerado:** ${formatLisbon(meta.generatedAt)} (Lisboa) · **Jornada:** ${meta.currentGameday ?? '—'}` +
      `${meta.gamedayState ? ` (${STATE_PT[meta.gamedayState]})` : ''} · **Fecho da equipa:** ${formatLisbon(meta.deadline)}`,
    '',
  );
  L.push('| Fonte | Estado | Pedidos | Registos | Último sucesso | Erro |', '|---|---|---|---|---|---|');
  for (const [name, s] of Object.entries(meta.sources)) {
    L.push(
      `| ${name} | ${s.status === 'ok' ? '✅ ok' : '❌ falhou'} | ${s.requests} | ${s.records ?? '—'} | ${formatLisbon(s.lastSuccess)} | ${s.error ?? ''} |`,
    );
  }
  L.push('');
  const c = meta.counts;
  L.push(
    `**Totais:** ${c.players} jogadores · ${c.teams} equipas (${c.teamsWithCoefficient} com coeficiente UEFA, ${c.teamsWithElo} com Elo) · ${c.fixtures} jogos`,
  );
  const ph = meta.checks.pointsHistory;
  const cc = meta.checks.fixturesCrossCheck;
  const h = meta.checks.history;
  L.push(
    `**Verificações:** pontos por jornada vs. feed oficial: ${ph.checked ? `${ph.checked - ph.mismatches}/${ph.checked} iguais` : 'nada a comparar ainda'}` +
      (cc ? ` · jogos do feed fantasy na API UEFA: ${cc.matched}/${cc.fantasy}` : ''),
  );
  const o = h.official;
  L.push(
    `**Histórico por jornada (oficial UEFA):** ${o.players}/${c.players} jogadores · soma das jornadas = total em ${o.sumMatchesTotal}/${o.players}` +
      ` · pedidos nesta execução: ${o.fetched}${o.failed ? ` (${o.failed} falharam)` : ''}`,
  );
  L.push(
    `**Plano B (sem histórico oficial):** snapshots ${gdList(h.tracked)} · feed ${h.fromFeed ? `J${h.fromFeed} (só pontos)` : '—'}`,
    '',
  );
  if (meta.warnings.length) {
    L.push('## Avisos', '', ...meta.warnings.map((w) => `- ${w}`), '');
  }
  if (meta.model) {
    const m = meta.model;
    L.push(`## Modelo xP v${m.version} — próximas jornadas ${m.targets.map((g) => `J${g}`).join(', ')}`, '');
    if (m.backtest.length) {
      L.push(
        '**Teste nas jornadas jogadas** (previsão feita só com dados anteriores):',
        '',
        '| Jornada | Erro médio modelo | Erro médio baseline | Pts reais top 20 modelo | Pts reais top 20 baseline |',
        '|---|---|---|---|---|',
        ...m.backtest.map((b) => `| J${b.gameday} | ${b.modelMae} | ${b.baselineMae} | ${b.modelTop20} | ${b.baselineTop20} |`),
        '',
      );
    }
    if (topXp.length) {
      L.push(
        `**Top 20 xP — J${m.targets[0]}**`,
        '',
        '| # | Jogador | Equipa | Pos | €M | xP J | xP 3J | xP/€M | P(titular) | Adversário | Confiança |',
        '|---|---|---|---|---|---|---|---|---|---|---|',
      );
      topXp.forEach((x, i) => {
        const f = x.fixtures[0];
        L.push(
          `| ${i + 1} | ${x.name} | ${x.teamName} | ${x.position} | ${x.price.toFixed(1)} | ${x.xp1.toFixed(1)} | ${x.xp3.toFixed(1)} | ${x.valuePerM.toFixed(2)} | ${f ? Math.round(f.pStart * 100) + '%' : '—'} | ${f ? `${f.home ? 'vs' : '@'} ${f.opponentName}` : '—'} | ${x.confidence} |`,
        );
      });
      L.push('');
    }
  }
  if (players?.length) {
    L.push(
      '## Top 15 por pontos',
      '',
      '| # | Jogador | Equipa | Pos | €M | Pts | Últ. J | Min | % sel. | Estado | Próximo jogo |',
      '|---|---|---|---|---|---|---|---|---|---|---|',
    );
    players.slice(0, 15).forEach((p, i) => {
      const nm = p.nextMatch
        ? `J${p.nextMatch.gameday} ${p.nextMatch.home ? 'vs' : '@'} ${p.nextMatch.opponentName} · ${formatLisbon(p.nextMatch.kickoff)}`
        : '—';
      const last = p.history[p.history.length - 1];
      L.push(
        `| ${i + 1} | ${p.name} | ${p.teamName} | ${p.position} | ${p.price.toFixed(1)} | ${p.stats.points} | ${last ? `${last.points} (J${last.gameday})` : '—'} | ${p.stats.minutes} | ${p.selectedPct} | ${AVAIL_PT[p.availability]} | ${nm} |`,
      );
    });
    L.push('');
  }
  if (teams.length) {
    L.push(
      '## Equipas mais fortes (top 10)',
      '',
      '| Equipa | Coef. UEFA (rank) | Elo | V-E-D | Golos | Próximo jogo |',
      '|---|---|---|---|---|---|',
    );
    for (const t of teams.slice(0, 10)) {
      const nm = t.nextMatch ? `J${t.nextMatch.gameday} ${t.nextMatch.home ? 'vs' : '@'} ${t.nextMatch.opponentName}` : '—';
      L.push(
        `| ${t.name} | ${t.coefficient ?? '—'}${t.coefficientRank ? ` (#${t.coefficientRank})` : ''} | ${t.elo ?? '—'} | ${t.record.won}-${t.record.drawn}-${t.record.lost} | ${t.record.goalsFor}:${t.record.goalsAgainst} | ${nm} |`,
      );
    }
    L.push('');
  }
  if (Object.keys(meta.statusValues).length) {
    L.push('<details><summary>Valores de estado no feed</summary>', '');
    for (const [k, v] of Object.entries(meta.statusValues)) L.push(`- ${v} × ${k}`);
    L.push('', '</details>');
  }
  return L.join('\n');
}

async function main() {
  const { values } = parseArgs({
    options: { out: { type: 'string', default: 'out' }, strict: { type: 'boolean', default: false } },
  });
  const meta = await runPipeline({ outDir: values.out! });
  console.log(`\nJornada ${meta.currentGameday ?? '—'} · ${meta.counts.players} jogadores · ${meta.counts.teams} equipas · ${meta.counts.fixtures} jogos`);
  for (const w of meta.warnings) console.log(`AVISO: ${w}`);
  if (values.strict && meta.sources.uefaFantasy?.status !== 'ok') process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
