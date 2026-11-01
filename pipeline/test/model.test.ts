import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { metrics, spearman } from '../model/backtest.ts';
import { expectedFloorDiv, poissonPmf, pZero } from '../model/poisson.ts';
import { modelWindow, teamRatings } from '../model/publish.ts';
import { expectedGoals, fitRatings, type MatchObs } from '../model/ratings.ts';
import { availabilityFactor, computeXp } from '../model/xp.ts';
import { runPipeline, type SourceName } from '../run.ts';
import type { Fixture, Player, Team } from '../types.ts';
import {
  coefficientRoutes,
  eloRoutes,
  fakeHttp,
  fantasyRoutes,
  matchRoutes,
  playerHistoryRoutes,
  prevSeasonRoutes,
  type Route,
} from './helpers.ts';

describe('Poisson', () => {
  it('pmf soma 1 e P(0) = e^-λ', () => {
    const s = Array.from({ length: 40 }, (_, k) => poissonPmf(k, 2.3)).reduce((a, b) => a + b, 0);
    expect(s).toBeCloseTo(1, 6);
    expect(pZero(1.2)).toBeCloseTo(Math.exp(-1.2), 9);
  });

  it('E[floor(X/k)] bate com o cálculo direto', () => {
    const direct = (l: number, k: number) =>
      Array.from({ length: 80 }, (_, x) => Math.floor(x / k) * poissonPmf(x, l)).reduce((a, b) => a + b, 0);
    for (const [l, k] of [
      [0.5, 2],
      [1.7, 2],
      [4.2, 3],
      [9, 3],
    ] as const)
      expect(expectedFloorDiv(l, k)).toBeCloseTo(direct(l, k), 6);
    expect(expectedFloorDiv(0, 3)).toBe(0);
  });
});

describe('força das equipas', () => {
  const m = (homeId: string, awayId: string, hg: number, ag: number): MatchObs => ({ homeId, awayId, hg, ag, weight: 1 });
  const matches = [
    m('A', 'B', 3, 0),
    m('B', 'A', 0, 2),
    m('A', 'C', 2, 1),
    m('C', 'A', 1, 2),
    m('B', 'C', 1, 1),
    m('C', 'B', 1, 1),
  ];

  it('quem marca mais e sofre menos fica com mais ataque e defesa', () => {
    const r = fitRatings(matches, new Map());
    expect(r.att.get('A')!).toBeGreaterThan(r.att.get('B')!);
    expect(r.def.get('A')!).toBeGreaterThan(r.def.get('B')!);
    const g = expectedGoals(r, 'A', 'B');
    expect(g.home).toBeGreaterThan(g.away);
  });

  it('o coeficiente UEFA serve de prior quando não há jogos', () => {
    const r = fitRatings([...matches, m('X', 'Y', 1, 1)], new Map([['X', 120], ['Y', 10], ['A', 50], ['B', 50], ['C', 50]]));
    const xy = expectedGoals(r, 'X', 'Y', true);
    expect(r.beta).toBeGreaterThanOrEqual(-1);
    expect(Number.isFinite(xy.home) && Number.isFinite(xy.away)).toBe(true);
  });

  it('dificuldade 1–5 por quintis', () => {
    const r = fitRatings(matches, new Map());
    const fx = (gd: number, h: string, a: string): Fixture => ({
      id: `${gd}${h}${a}`, gameday: gd, phase: '', round: '', homeId: h, awayId: a, homeName: h, awayName: a,
      homeCode: h, awayCode: a, kickoff: null, status: 'UPCOMING', score: null, source: 'uefa-matches',
    });
    const teams = ['A', 'B', 'C'].map((id) => ({ id, name: id }) as Team);
    const tr = teamRatings(r, teams, [fx(4, 'A', 'B'), fx(5, 'C', 'A'), fx(5, 'B', 'C')], [4, 5]);
    const a = tr.find((t) => t.id === 'A')!;
    expect(a.fixtures.map((f) => f.gameday)).toEqual([4, 5]);
    const all = tr.flatMap((t) => t.fixtures.map((f) => f.difficulty));
    expect(Math.min(...all)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...all)).toBeLessThanOrEqual(5);
    expect(a.fixtures[0]!.difficulty).toBeLessThan(tr.find((t) => t.id === 'B')!.fixtures[0]!.difficulty);
  });
});

describe('modelo xP', () => {
  const ratings = fitRatings(
    [
      { homeId: 'S', awayId: 'W', hg: 3, ag: 0, weight: 1 },
      { homeId: 'W', awayId: 'S', hg: 0, ag: 2, weight: 1 },
    ],
    new Map(),
  );
  const fixtures: Fixture[] = [1, 2, 3].map((gd) => ({
    id: `f${gd}`, gameday: gd, phase: '', round: '', homeId: gd % 2 ? 'S' : 'W', awayId: gd % 2 ? 'W' : 'S',
    homeName: '', awayName: '', homeCode: '', awayCode: '', kickoff: null, status: gd === 1 ? 'FINISHED' : 'UPCOMING',
    score: gd === 1 ? { home: 3, away: 0 } : null, source: 'uefa-matches',
  }));
  const player = (id: string, position: Player['position'], over: Partial<Player> = {}): Player =>
    ({
      id, name: id, fullName: id, teamId: 'S', teamName: 'S', teamCode: 'S', position, price: 6, selectedPct: 10,
      availability: 'available', status: { code: '', quality: '', note: '', active: true },
      stats: {} as Player['stats'], form: { lastGameday: 0, avgPoints: 0 },
      transfers: { inGameday: 0, outGameday: 0, inPct: 0, outPct: 0 }, nextMatch: null,
      history: [{ gameday: 1, points: 8, minutes: 90, source: 'uefa', stats: { goals: 1, assists: 0, cleanSheets: 1, goalsConceded: 0, saves: 3, recoveries: 6, yellowCards: 0, redCards: 0, ownGoals: 0, penaltiesSaved: 0, penaltiesMissed: 0, penaltiesEarned: 0, penaltiesConceded: 0, goalsOutsideBox: 0, playerOfTheMatch: 0 } }],
      ...over,
    }) as Player;

  const run = (players: Player[]) =>
    computeXp({ players, prev: {}, fixtures, ratings, targets: [2, 3], lastGameday: 1 });

  it('titular disponível tem xP > 2 por jogo, inativo tem 0', () => {
    const [nailed, inactive] = run([
      player('a', 'MID'),
      player('b', 'MID', { availability: 'inactive', status: { code: 'NIS', quality: '', note: '', active: false } }),
    ]);
    expect(nailed!.xp1).toBeGreaterThan(2);
    expect(nailed!.fixtures).toHaveLength(2);
    expect(inactive!.xp1).toBe(0);
    expect(inactive!.xp3).toBe(0);
  });

  it('lesionado: 0 na próxima jornada, recupera nas seguintes', () => {
    const [x] = run([player('c', 'DEF', { availability: 'out' })]);
    expect(x!.fixtures[0]!.xp).toBe(0);
    expect(x!.fixtures[1]!.xp).toBeGreaterThan(0);
    expect(availabilityFactor(player('d', 'DEF', { availability: 'doubtful' }), 0).play).toBeLessThan(1);
  });

  it('GR/DEF ganham clean sheet e perdem por golos sofridos; avançados não', () => {
    const [gk, fwd] = run([player('g', 'GK'), player('f', 'FWD')]);
    expect(gk!.fixtures[0]!.components.cleanSheet).toBeGreaterThan(0);
    expect(gk!.fixtures[0]!.components.conceded).toBeLessThanOrEqual(0);
    expect(gk!.fixtures[0]!.components.saves).toBeGreaterThanOrEqual(0);
    expect(fwd!.fixtures[0]!.components.cleanSheet).toBe(0);
    expect(fwd!.fixtures[0]!.components.conceded).toBe(0);
  });

  it('janela: jornada por jogar prevê-se a ela própria; terminada → a seguinte', () => {
    expect(modelWindow(4, 'upcoming')).toEqual({ first: 4, lastPlayed: 3 });
    expect(modelWindow(4, 'live')).toEqual({ first: 4, lastPlayed: 3 });
    expect(modelWindow(4, 'finished')).toEqual({ first: 5, lastPlayed: 4 });
  });
});

describe('métricas do backtest', () => {
  it('spearman', () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1);
    expect(spearman([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1);
  });
  it('erro e top-k', () => {
    const m = metrics([5, 1, 0], [6, 0, 0]);
    expect(m.mae).toBeCloseTo(0.67, 2);
    expect(m.top20Actual).toBe(2);
    expect(m.meanPred).toBe(2);
  });
});

describe('modelo no pipeline', () => {
  it('publica xp.json, team-ratings.json e model-report.json', async () => {
    const out = mkdtempSync(join(tmpdir(), 'ucl-'));
    const routes: Partial<Record<SourceName, Route[]>> = {
      uefaFantasy: fantasyRoutes(),
      uefaPlayerHistory: playerHistoryRoutes(3),
      uefaPrevSeason: prevSeasonRoutes(),
      uefaMatches: matchRoutes,
      uefaCoefficients: coefficientRoutes,
      clubElo: eloRoutes,
    };
    const meta = await runPipeline({
      outDir: out,
      now: new Date('2026-10-31T12:00:00Z'),
      minPlayers: 200,
      aliases: {},
      log: () => {},
      httpFactory: (s) => fakeHttp(routes[s] ?? []),
    });
    expect(meta.warnings.filter((w) => w.includes('Modelo'))).toEqual([]);
    expect(meta.model?.targets).toEqual([4]);
    expect(meta.model?.backtest.map((b) => b.gameday)).toEqual([1, 2, 3]);
    for (const f of ['xp.json', 'team-ratings.json', 'model-report.json']) expect(existsSync(join(out, 'latest', f))).toBe(true);
    const xp = JSON.parse(readFileSync(join(out, 'latest', 'xp.json'), 'utf8'));
    expect(xp.players).toHaveLength(240);
    expect(xp.players[0].xp1).toBeGreaterThanOrEqual(xp.players[1].xp1);
    expect(xp.players[0].fixtures[0]).toMatchObject({ gameday: 4 });
    expect(readFileSync(join(out, 'latest', 'summary.md'), 'utf8')).toContain('Top 20 xP — J4');
  });
});
