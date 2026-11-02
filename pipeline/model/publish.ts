/**
 * Corre o modelo (força das equipas → xP → backtest) e escreve:
 *   latest/xp.json            xP por jogador (próxima jornada, 3 e 5), componentes, confiança
 *   latest/team-ratings.json  ataque/defesa e dificuldade (1–5) dos próximos jogos
 *   latest/model-report.json  parâmetros, ajuste e backtest vs. baseline
 */
import { join } from 'node:path';
import { writeJson, writeJsonLines } from '../lib/files.ts';
import type { StartSignal } from '../normalize/lineups.ts';
import type { PrevSeasonPlayer } from '../prevSeason.ts';
import type { Fixture, GamedayState, Player, Team } from '../types.ts';
import { backtest, type BacktestRow } from './backtest.ts';
import { pZero } from './poisson.ts';
import { expectedGoals, fitRatings, matchObservations, type TeamRatings } from './ratings.ts';
import { computeXp, MODEL_VERSION, PARAMS, type PlayerXp } from './xp.ts';

export interface ModelSummary {
  version: string;
  targets: number[];
  players: number;
  backtest: BacktestRow[];
  ratings: { mu: number; home: number; beta: number; gamma: number; observations: number };
}

export interface TeamFixtureRating {
  gameday: number;
  opponentId: string;
  opponentName: string;
  home: boolean;
  goalsFor: number;
  goalsAgainst: number;
  pCleanSheet: number;
  /** 1 = muito fácil … 5 = muito difícil (quintis de golos sofridos − marcados esperados) */
  difficulty: number;
}

export interface TeamRating {
  id: string;
  name: string;
  attack: number;
  defense: number;
  fixtures: TeamFixtureRating[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Primeira jornada a prever e última jornada completa no histórico. */
export function modelWindow(gameday: number, state: GamedayState | null): { first: number; lastPlayed: number } {
  if (state === 'finished') return { first: gameday + 1, lastPlayed: gameday };
  return { first: gameday, lastPlayed: gameday - 1 };
}

export function teamRatings(
  ratings: TeamRatings,
  teams: Team[],
  fixtures: Fixture[],
  targets: number[],
): TeamRating[] {
  const rows: TeamRating[] = teams.map((t) => {
    const z = ratings.z.get(t.id) ?? ratings.zMissing;
    const fx: TeamFixtureRating[] = [];
    for (const gd of targets) {
      const f = fixtures.find((x) => x.gameday === gd && (x.homeId === t.id || x.awayId === t.id));
      if (!f) continue;
      const home = f.homeId === t.id;
      const eg = expectedGoals(ratings, f.homeId, f.awayId);
      const gf = home ? eg.home : eg.away;
      const ga = home ? eg.away : eg.home;
      fx.push({
        gameday: gd,
        opponentId: home ? f.awayId : f.homeId,
        opponentName: home ? f.awayName : f.homeName,
        home,
        goalsFor: r2(gf),
        goalsAgainst: r2(ga),
        pCleanSheet: r2(pZero(ga)),
        difficulty: 0,
      });
    }
    return {
      id: t.id,
      name: t.name,
      attack: r2(ratings.beta * z + (ratings.att.get(t.id) ?? 0)),
      defense: r2(ratings.gamma * z + (ratings.def.get(t.id) ?? 0)),
      fixtures: fx,
    };
  });
  // Dificuldade por quintis do saldo esperado (golos sofridos − marcados) em todos os jogos previstos
  const all = rows.flatMap((t) => t.fixtures);
  const keys = all.map((f) => f.goalsAgainst - f.goalsFor).sort((a, b) => a - b);
  const q = [0.2, 0.4, 0.6, 0.8].map((p) => keys[Math.floor(p * (keys.length - 1))] ?? 0);
  for (const f of all) {
    const k = f.goalsAgainst - f.goalsFor;
    f.difficulty = 1 + q.filter((x) => k > x).length;
  }
  rows.sort((a, b) => b.attack + b.defense - (a.attack + a.defense));
  return rows;
}

export interface RunModelInput {
  outDir: string;
  nowIso: string;
  season: number;
  gameday: number;
  state: GamedayState | null;
  players: Player[];
  teams: Team[];
  fixtures: Fixture[];
  prevFixtures: Fixture[] | null;
  prev: Record<string, PrevSeasonPlayer | null>;
  coefficients: Map<string, number>;
  /** onze provável, lesões e notícias da próxima jornada */
  signals?: Map<string, StartSignal>;
}

export function runModel(input: RunModelInput): { xp: PlayerXp[]; summary: ModelSummary; teamRatings: TeamRating[] } {
  const { first, lastPlayed } = modelWindow(input.gameday, input.state);
  const maxGd = Math.max(0, ...input.fixtures.map((f) => f.gameday ?? 0));
  const targets = [0, 1, 2, 3, 4].map((k) => first + k).filter((g) => g <= maxGd);

  const ratings = fitRatings(matchObservations(input.fixtures, input.prevFixtures), input.coefficients);
  const xp = computeXp({
    players: input.players,
    prev: input.prev,
    fixtures: input.fixtures,
    ratings,
    targets,
    lastGameday: lastPlayed,
    signals: input.signals,
  }).sort((a, b) => b.xp1 - a.xp1 || b.xp3 - a.xp3);

  const bt = lastPlayed >= 1
    ? backtest({
        players: input.players,
        prev: input.prev,
        fixtures: input.fixtures,
        prevFixtures: input.prevFixtures,
        coefficients: input.coefficients,
        gamedays: Array.from({ length: lastPlayed }, (_, i) => i + 1),
      })
    : [];

  const tr = teamRatings(ratings, input.teams, input.fixtures, targets);
  const summary: ModelSummary = {
    version: MODEL_VERSION,
    targets,
    players: xp.length,
    backtest: bt,
    ratings: {
      mu: r2(ratings.mu),
      home: r2(ratings.home),
      beta: r2(ratings.beta),
      gamma: r2(ratings.gamma),
      observations: ratings.observations,
    },
  };

  const header = { generatedAt: input.nowIso, season: input.season, gameday: input.gameday, targets, modelVersion: MODEL_VERSION };
  writeJsonLines(join(input.outDir, 'latest', 'xp.json'), header, 'players', xp);
  writeJsonLines(join(input.outDir, 'latest', 'team-ratings.json'), header, 'teams', tr);
  writeJson(join(input.outDir, 'latest', 'model-report.json'), { ...header, params: PARAMS, ...summary });
  return { xp, summary, teamRatings: tr };
}
