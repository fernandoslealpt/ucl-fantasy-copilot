import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { readJsonIfExists, writeJson, writeJsonLines, writeText } from './lib/files.ts';
import { createHttp, errorMessage, type Http } from './lib/http.ts';
import { formatLisbon, isoDate, parseFantasyDate, uefaSeasonYear } from './lib/time.ts';
import {
  buildHistory,
  checkPointsHistory,
  feedToTuples,
  nextMatchFromFeed,
  normalizePlayer,
  sortPlayers,
  statusKey,
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
import { fetchFantasyFeed, type ParsedFeed } from './sources/uefaFantasy.ts';
import { fetchUefaMatches } from './sources/uefaMatches.ts';
import type { Fixture, GamedayState, GamedayStatsFile, Meta, Player, SourceStatus, Team } from './types.ts';

export const PIPELINE_VERSION = '0.1.0';

export type SourceName = 'uefaFantasy' | 'uefaMatches' | 'clubElo';

export interface RunOptions {
  /** Pasta de saída (no GitHub Actions: worktree do branch `data`). */
  outDir: string;
  now?: Date;
  httpFactory?: (source: SourceName) => Http;
  /** Mínimo de jogadores válidos para aceitar o feed (controlo de qualidade). */
  minPlayers?: number;
  /** ID de equipa UEFA → nome do clube no ClubElo. */
  aliases?: Record<string, string>;
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

function loadAliases(): Record<string, string> {
  const file = readJsonIfExists<{ clubElo?: Record<string, string> }>(join(process.cwd(), 'data', 'team-aliases.json'));
  return file?.clubElo ?? {};
}

export async function runPipeline(opts: RunOptions): Promise<Meta> {
  const started = Date.now();
  const now = opts.now ?? new Date();
  const nowIso = now.toISOString();
  const log = opts.log ?? ((m: string) => console.log(m));
  const httpFactory = opts.httpFactory ?? (() => createHttp());
  const minPlayers = opts.minPlayers ?? 200;
  const aliases = opts.aliases ?? loadAliases();
  const season = uefaSeasonYear(now);
  const latest = join(opts.outDir, 'latest');

  const prevMeta = readJsonIfExists<Meta>(join(latest, 'meta.json'));
  const prevStatsRaw = readJsonIfExists<GamedayStatsFile>(join(latest, 'gameday-stats.json'));
  const prevStats: GamedayStatsFile =
    prevStatsRaw && prevStatsRaw.season === season ? prevStatsRaw : { season, updatedAt: '', gamedays: {} };
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

  // 1) Feed fantasy: jogadores, preços, estado, estatísticas e pontos por jornada.
  const fHttp = httpFactory('uefaFantasy');
  let fantasy: { feed: ParsedFeed; gameday: number; stats: GamedayStatsFile } | null = null;
  try {
    const current = await fetchFantasyFeed(fHttp);
    fantasyQualityGate(current, minPlayers);
    const gameday = current.gameday!;
    const stats: GamedayStatsFile = { season, updatedAt: nowIso, gamedays: {} };
    for (const [gd, entry] of Object.entries(prevStats.gamedays)) if (Number(gd) < gameday) stats.gamedays[gd] = entry;
    stats.gamedays[String(gameday)] = { fetchedAt: nowIso, players: feedToTuples(current) };
    for (let gd = 1; gd < gameday; gd++) {
      const cached = stats.gamedays[String(gd)];
      if (cached && gd < gameday - 1) continue; // jornadas antigas já fechadas: usar cache
      try {
        const feed = await fetchFantasyFeed(fHttp, gd);
        if (feed.players.length < minPlayers / 2) throw new Error(`só ${feed.players.length} jogadores`);
        stats.gamedays[String(gd)] = { fetchedAt: nowIso, players: feedToTuples(feed) };
      } catch (e) {
        warnings.push(`Feed fantasy da jornada ${gd} falhou${cached ? ' (mantida a cache)' : ''}: ${errorMessage(e)}`);
      }
    }
    if (current.invalid > 0) warnings.push(`${current.invalid} jogadores ignorados por formato inválido: ${current.invalidSamples.join('; ')}`);
    fantasy = { feed: current, gameday, stats };
    record('uefaFantasy', fHttp, null, current.players.length);
  } catch (e) {
    record('uefaFantasy', fHttp, e);
  }

  // 2) API de jogos UEFA: calendário completo, horas UTC, resultados.
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

  // 3) ClubElo: força das equipas.
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
  let crossCheck: Meta['checks']['fixturesCrossCheck'] = null;
  const statusValues: Record<string, number> = {};

  if (fantasy) {
    const { feed, gameday, stats } = fantasy;
    currentGameday = gameday;
    const fantasyFixtures = fixturesFromFantasy(feed.players, parseDate).filter((f) => f.gameday === gameday);
    if (uefaFixtures) {
      crossCheck = crossCheckFixtures(fantasyFixtures, uefaFixtures);
      if (crossCheck.matched < crossCheck.fantasy)
        warnings.push(`Só ${crossCheck.matched}/${crossCheck.fantasy} jogos da jornada ${gameday} do feed fantasy foram encontrados na API de jogos`);
    }
    const timingFixtures = fixtures.some((f) => f.gameday === gameday) ? fixtures : fantasyFixtures;
    timing = gamedayTiming(gameday, timingFixtures, now);

    const lastForHistory = timing.state === 'upcoming' ? gameday - 1 : gameday;
    const history = buildHistory(stats, lastForHistory);
    pointsCheck = checkPointsHistory(feed.players, history);
    if (pointsCheck.mismatches > 0)
      warnings.push(`Pontos por jornada: ${pointsCheck.mismatches}/${pointsCheck.checked} jogadores não somam o total do feed`);

    const lookup = kickoffLookup(fixtures);
    players = sortPlayers(
      feed.players.map((p) => normalizePlayer(p, history.get(p.id) ?? [], nextMatchFromFeed(p, gameday, lookup, parseDate))),
    );
    for (const p of feed.players) {
      const k = statusKey(p);
      statusValues[k] = (statusValues[k] ?? 0) + 1;
    }

    const built = buildTeams({ players, fixtures, info: teamInfo, clubs, aliases, nowIso });
    teams = built.teams;
    if (!clubs && prevTeams) {
      const prev = new Map(prevTeams.map((t) => [t.id, t]));
      for (const t of teams) {
        const old = prev.get(t.id);
        if (old) Object.assign(t, { elo: old.elo, eloClub: old.eloClub, eloMatch: old.eloMatch });
      }
      warnings.push('Elo: ClubElo falhou, mantidos os últimos valores válidos');
    }
    if (built.unmatchedElo.length)
      warnings.push(`Sem Elo (acrescentar em data/team-aliases.json): ${built.unmatchedElo.join(', ')}`);

    const header = { generatedAt: nowIso, season, gameday };
    writeJsonLines(join(latest, 'players.json'), header, 'players', players);
    writeJsonLines(join(latest, 'teams.json'), header, 'teams', teams);
    writeText(join(latest, 'gameday-stats.json'), JSON.stringify(stats));
    writeJsonLines(
      join(opts.outDir, 'history', `gd${String(gameday).padStart(2, '0')}`, `${isoDate(now)}.json`),
      { generatedAt: nowIso, season, gameday, fields: ['id', 'price', 'selectedPct', 'points', 'availability'] },
      'players',
      players.map((p) => [p.id, p.price, p.selectedPct, p.stats.points, p.availability]),
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
  const finalPlayers = players?.length ?? prevMeta?.counts.players ?? 0;
  const finalTeams = teams ?? prevTeams ?? [];
  const meta: Meta = {
    schemaVersion: 1,
    generatedAt: nowIso,
    currentGameday,
    gamedayState: timing.state,
    deadline: timing.deadline,
    sources,
    counts: {
      players: finalPlayers,
      teams: finalTeams.length,
      fixtures: fixtures.length,
      teamsWithElo: finalTeams.filter((t) => t.elo != null).length,
    },
    checks: {
      invalidPlayers: fantasy?.feed.invalid ?? 0,
      pointsHistory: pointsCheck,
      fixturesCrossCheck: crossCheck,
    },
    statusValues: players ? topStatus : (prevMeta?.statusValues ?? {}),
    warnings,
    durationMs: Date.now() - started,
  };
  writeJson(join(latest, 'meta.json'), meta);
  writeText(join(latest, 'summary.md'), renderSummary(meta, players, finalTeams));
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

export function renderSummary(meta: Meta, players: Player[] | null, teams: Team[]): string {
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
  L.push(
    `**Totais:** ${meta.counts.players} jogadores · ${meta.counts.teams} equipas (${meta.counts.teamsWithElo} com Elo) · ${meta.counts.fixtures} jogos`,
  );
  const ph = meta.checks.pointsHistory;
  const cc = meta.checks.fixturesCrossCheck;
  L.push(
    `**Verificações:** pontos por jornada coerentes em ${ph.checked - ph.mismatches}/${ph.checked} jogadores` +
      (cc ? ` · jogos do feed fantasy na API UEFA: ${cc.matched}/${cc.fantasy}` : ''),
    '',
  );
  if (meta.warnings.length) {
    L.push('## Avisos', '', ...meta.warnings.map((w) => `- ${w}`), '');
  }
  if (players?.length) {
    L.push('## Top 15 por pontos', '', '| # | Jogador | Equipa | Pos | €M | Pts | Min | % sel. | Estado | Próximo jogo |', '|---|---|---|---|---|---|---|---|---|---|');
    players.slice(0, 15).forEach((p, i) => {
      const nm = p.nextMatch
        ? `J${p.nextMatch.gameday} ${p.nextMatch.home ? 'vs' : '@'} ${p.nextMatch.opponentName} · ${formatLisbon(p.nextMatch.kickoff)}`
        : '—';
      L.push(
        `| ${i + 1} | ${p.name} | ${p.teamName} | ${p.position} | ${p.price.toFixed(1)} | ${p.stats.points} | ${p.stats.minutes} | ${p.selectedPct} | ${AVAIL_PT[p.availability]} | ${nm} |`,
      );
    });
    L.push('');
  }
  if (teams.length) {
    L.push('## Equipas por Elo (top 10)', '', '| Equipa | Elo (clube ClubElo) | V-E-D | Golos | Próximo jogo |', '|---|---|---|---|---|');
    for (const t of teams.slice(0, 10)) {
      const nm = t.nextMatch ? `J${t.nextMatch.gameday} ${t.nextMatch.home ? 'vs' : '@'} ${t.nextMatch.opponentName}` : '—';
      L.push(
        `| ${t.name} | ${t.elo ?? '—'} (${t.eloClub ?? '—'}, ${t.eloMatch ?? '—'}) | ${t.record.won}-${t.record.drawn}-${t.record.lost} | ${t.record.goalsFor}:${t.record.goalsAgainst} | ${nm} |`,
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
