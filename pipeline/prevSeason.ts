/**
 * Dados da época anterior, guardados uma vez em `cache/` no branch data (não mudam):
 * - jogos UCL (resultados) → força das equipas;
 * - estatísticas agregadas por jogador (popupstats do tour anterior) → taxas por 90' e titularidade.
 */
import { join } from 'node:path';
import { readJsonIfExists, writeJsonLines, writeText } from './lib/files.ts';
import { HttpError, type Http } from './lib/http.ts';
import { fixtureFromUefa, sortFixtures } from './normalize/teams.ts';
import { fetchUefaMatches } from './sources/uefaMatches.ts';
import { fantasyTourId, fetchPlayerHistory, mapPool, PLAYER_HISTORY_PARSER_VERSION } from './sources/uefaPlayerHistory.ts';
import type { Fixture, GamedayLine } from './types.ts';

export interface PrevSeasonPlayer {
  /** Jornadas com minutos > 0 */
  apps: number;
  /** Jornadas com 60+ minutos */
  starts60: number;
  /** Jornadas disponíveis no histórico (inclui 0 minutos) */
  gamedays: number;
  minutes: number;
  points: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  goalsConceded: number;
  recoveries: number;
  saves: number;
  yellowCards: number;
  redCards: number;
  playerOfTheMatch: number;
}

export interface PrevSeasonCache {
  parserVersion?: number;
  tourId: number;
  updatedAt: string;
  /** null = jogador sem histórico nessa época (não estava na Champions). */
  players: Record<string, PrevSeasonPlayer | null>;
}

export function aggregateLines(lines: GamedayLine[]): PrevSeasonPlayer | null {
  if (lines.length === 0) return null;
  const agg: PrevSeasonPlayer = {
    apps: 0,
    starts60: 0,
    gamedays: lines.length,
    minutes: 0,
    points: 0,
    goals: 0,
    assists: 0,
    cleanSheets: 0,
    goalsConceded: 0,
    recoveries: 0,
    saves: 0,
    yellowCards: 0,
    redCards: 0,
    playerOfTheMatch: 0,
  };
  for (const l of lines) {
    const m = l.minutes ?? 0;
    if (m > 0) agg.apps++;
    if (m >= 60) agg.starts60++;
    agg.minutes += m;
    agg.points += l.points;
    const s = l.stats;
    if (!s) continue;
    agg.goals += s.goals;
    agg.assists += s.assists;
    agg.cleanSheets += s.cleanSheets;
    agg.goalsConceded += s.goalsConceded;
    agg.recoveries += s.recoveries;
    agg.saves += s.saves;
    agg.yellowCards += s.yellowCards;
    agg.redCards += s.redCards;
    agg.playerOfTheMatch += s.playerOfTheMatch;
  }
  return agg;
}

export interface PrevSeasonResult {
  fixtures: Fixture[] | null;
  players: PrevSeasonCache | null;
  fetchedMatches: boolean;
  fetchedPlayers: number;
  missingPlayers: number;
  errors: string[];
}

/** Garante a cache da época anterior; só pede o que ainda falta. */
export async function ensurePrevSeason(
  outDir: string,
  season: number,
  playerIds: string[],
  matchesHttp: Http,
  playersHttp: Http,
  nowIso: string,
  concurrency = 6,
): Promise<PrevSeasonResult> {
  const prev = season - 1;
  const errors: string[] = [];
  const result: PrevSeasonResult = {
    fixtures: null,
    players: null,
    fetchedMatches: false,
    fetchedPlayers: 0,
    missingPlayers: 0,
    errors,
  };

  // Jogos da época anterior
  const matchesPath = join(outDir, 'cache', `matches-${prev}.json`);
  const cachedMatches = readJsonIfExists<{ fixtures: Fixture[] }>(matchesPath)?.fixtures ?? null;
  if (cachedMatches && cachedMatches.length > 0) result.fixtures = cachedMatches;
  else {
    try {
      const { matches } = await fetchUefaMatches(matchesHttp, prev);
      const fixtures = sortFixtures(matches.map(fixtureFromUefa));
      if (fixtures.length < 20) throw new Error(`só ${fixtures.length} jogos`);
      writeJsonLines(matchesPath, { season: prev, fetchedAt: nowIso }, 'fixtures', fixtures);
      result.fixtures = fixtures;
      result.fetchedMatches = true;
    } catch (e) {
      errors.push(`jogos ${prev}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Estatísticas por jogador da época anterior
  const tourId = fantasyTourId(prev);
  const playersPath = join(outDir, 'cache', `player-prev-${tourId}.json`);
  const cached = readJsonIfExists<PrevSeasonCache>(playersPath);
  const cache: PrevSeasonCache =
    cached && cached.parserVersion === PLAYER_HISTORY_PARSER_VERSION
      ? cached
      : { parserVersion: PLAYER_HISTORY_PARSER_VERSION, tourId, updatedAt: nowIso, players: {} };
  const todo = playerIds.filter((id) => !(id in cache.players));
  await mapPool(todo, concurrency, async (id) => {
    try {
      const { lines } = await fetchPlayerHistory(playersHttp, tourId, id);
      cache.players[id] = aggregateLines(lines);
      result.fetchedPlayers++;
    } catch (e) {
      // O S3 da UEFA responde 403/404 quando o jogador não tem ficheiro nessa época.
      if (e instanceof HttpError && (e.status === 403 || e.status === 404)) {
        cache.players[id] = null;
        result.missingPlayers++;
      } else if (errors.length < 5) errors.push(`jogador ${id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  });
  if (todo.length > 0 || cached?.parserVersion !== PLAYER_HISTORY_PARSER_VERSION) {
    cache.updatedAt = nowIso;
    writeText(playersPath, JSON.stringify(cache));
  }
  result.players = cache;
  return result;
}
