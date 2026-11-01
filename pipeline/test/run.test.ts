import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fixtureFromUefa } from '../normalize/teams.ts';
import { currentGamedayFromFixtures, fetchCurrentFantasy, gamedayTiming, runPipeline, type SourceName } from '../run.ts';
import { parseUefaMatches } from '../sources/uefaMatches.ts';
import type { Fixture, Meta, Player, Team } from '../types.ts';
import {
  coefficientRoutes,
  eloRoutes,
  fakeHttp,
  fantasyRoutes,
  matchRoutes,
  playerHistoryRoutes,
  ptsFor,
  uefaMatchesJson,
  type Route,
} from './helpers.ts';

const NOW = new Date('2026-10-31T12:00:00Z');
const read = <T>(dir: string, f: string) => JSON.parse(readFileSync(join(dir, 'latest', f), 'utf8')) as T;

function factory(routes: Partial<Record<SourceName, Route[]>>, calls: Record<string, string[]> = {}) {
  return (s: SourceName) => fakeHttp(routes[s] ?? [], (calls[s] ??= []));
}

const ALL: Partial<Record<SourceName, Route[]>> = {
  uefaFantasy: fantasyRoutes(),
  uefaPlayerHistory: playerHistoryRoutes(3),
  uefaMatches: matchRoutes,
  uefaCoefficients: coefficientRoutes,
  clubElo: eloRoutes,
};
const opts = { minPlayers: 200, aliases: {}, log: () => {} };
const fail = (status: number): Route[] => [{ match: () => true, status }];

describe('pipeline completo', () => {
  it('1.ª execução: publica jogadores, equipas, jogos, estatísticas e meta', async () => {
    const out = mkdtempSync(join(tmpdir(), 'ucl-'));
    const calls: Record<string, string[]> = {};
    const meta = await runPipeline({ ...opts, outDir: out, now: NOW, httpFactory: factory(ALL, calls) });

    for (const s of ['uefaMatches', 'uefaFantasy', 'uefaPlayerHistory', 'uefaCoefficients', 'clubElo'])
      expect(meta.sources[s]?.status, s).toBe('ok');
    expect(meta.currentGameday).toBe(4);
    expect(meta.gamedayState).toBe('upcoming');
    expect(meta.deadline).toBe('2026-11-04T17:45:00.000Z');
    expect(meta.counts).toEqual({ players: 240, teams: 4, fixtures: 8, teamsWithElo: 4, teamsWithCoefficient: 4 });
    expect(meta.checks.history.official).toEqual({ players: 240, fetched: 240, failed: 0, sumMatchesTotal: 240, sumMismatch: 0 });
    expect(meta.checks.fixturesCrossCheck).toEqual({ fantasy: 2, matched: 2 });
    expect(meta.warnings).toEqual([]);
    expect(calls.uefaFantasy).toHaveLength(1); // 1 pedido ao feed por execução
    expect(calls.uefaFantasy?.[0]).toContain('gamedayId=4&');

    const { players } = read<{ players: Player[] }>(out, 'players.json');
    expect(players).toHaveLength(240);
    expect(players[0]!.stats.points).toBeGreaterThanOrEqual(players[1]!.stats.points);
    const p7 = players.find((p) => p.id === '250000007')!;
    expect(p7.position).toBe('FWD');
    expect(p7.stats.points).toBe([1, 2, 3].reduce((a, g) => a + ptsFor(7, g), 0));
    expect(p7.history.map((h) => [h.gameday, h.points, h.minutes, h.source])).toEqual(
      [1, 2, 3].map((g) => [g, ptsFor(7, g), 90, 'uefa']),
    );
    expect(p7.history[0]?.stats?.recoveries).toBe(7);
    expect(p7.history[0]?.breakdown).toEqual({ appearance: 2 });
    expect(p7.teamName).toBe('Benfica');
    expect(p7.nextMatch).toMatchObject({ gameday: 4, home: true, opponentName: 'Paris', opponentId: '52747' });
    expect(p7.nextMatch?.kickoff).toBe('2026-11-04T17:45:00.000Z');
    expect(p7.availability).toBe('available');

    const { teams } = read<{ teams: Team[] }>(out, 'teams.json');
    const psg = teams.find((t) => t.id === '52747')!;
    expect(psg).toMatchObject({ eloClub: 'Paris SG', country: 'FRA', players: 60, coefficient: 100, coefficientRank: 3 });
    expect(psg.record.played).toBe(3);
    expect(psg.nextMatch).toMatchObject({ gameday: 4, home: false, opponentId: '50147' });

    const { fixtures } = read<{ fixtures: Fixture[] }>(out, 'fixtures.json');
    expect(fixtures.every((f) => f.phase !== 'QUALIFYING')).toBe(true);
    expect(existsSync(join(out, 'history', 'gd04', '2026-10-31.json'))).toBe(true);
    expect(readFileSync(join(out, 'latest', 'summary.md'), 'utf8')).toContain('Jornada:** 4 (por jogar)');
  });

  it('ciclo completo: antes do fecho → jornada jogada → jornada seguinte', async () => {
    const out = mkdtempSync(join(tmpdir(), 'ucl-'));
    // J4 por jogar (snapshot de partida antes do fecho)
    await runPipeline({ ...opts, outDir: out, now: NOW, httpFactory: factory(ALL) });

    // J4 jogada (feed já com os pontos da J4)
    const afterGd4 = await runPipeline({
      ...opts,
      outDir: out,
      now: new Date('2026-11-05T23:30:00Z'),
      httpFactory: factory({ ...ALL, uefaFantasy: fantasyRoutes(4, 4), uefaPlayerHistory: playerHistoryRoutes(4) }),
    });
    expect(afterGd4.gamedayState).toBe('finished');
    expect(afterGd4.checks.pointsHistory).toEqual({ checked: 240, mismatches: 0 }); // snapshots vs curGDPts
    expect(afterGd4.checks.history.official).toMatchObject({ fetched: 240, sumMatchesTotal: 240 }); // totais mudaram
    let p7 = read<{ players: Player[] }>(out, 'players.json').players.find((p) => p.id === '250000007')!;
    expect(p7.history.at(-1)).toMatchObject({ gameday: 4, points: ptsFor(7, 4), minutes: 90, source: 'uefa' });

    // Feed passa para a J5 (API de jogos em baixo: pista vem da execução anterior)
    const calls5: Record<string, string[]> = {};
    const gd5 = await runPipeline({
      ...opts,
      outDir: out,
      now: new Date('2026-11-10T12:00:00Z'),
      httpFactory: factory(
        { ...ALL, uefaMatches: fail(503), uefaFantasy: fantasyRoutes(5, 4), uefaPlayerHistory: playerHistoryRoutes(4) },
        calls5,
      ),
    });
    expect(calls5.uefaPlayerHistory ?? []).toHaveLength(0); // ninguém mudou: tudo da cache
    expect(gd5.currentGameday).toBe(5);
    expect(gd5.gamedayState).toBe('upcoming');
    expect(gd5.checks.history).toMatchObject({ tracked: [4], official: { players: 240, fetched: 0, sumMatchesTotal: 240 } });
    expect(gd5.checks.pointsHistory).toEqual({ checked: 240, mismatches: 0 }); // snapshots vs lastGdPoints
    p7 = read<{ players: Player[] }>(out, 'players.json').players.find((p) => p.id === '250000007')!;
    expect(p7.history.map((h) => h.points)).toEqual([1, 2, 3, 4].map((g) => ptsFor(7, g)));
  });

  it('se o histórico oficial falhar, usa o plano B (J3 pelo feed)', async () => {
    const out = mkdtempSync(join(tmpdir(), 'ucl-'));
    const meta = await runPipeline({
      ...opts,
      outDir: out,
      now: NOW,
      httpFactory: factory({ ...ALL, uefaPlayerHistory: fail(403) }),
    });
    expect(meta.sources.uefaPlayerHistory?.status).toBe('failed');
    expect(meta.sources.uefaFantasy?.status).toBe('ok');
    const p7 = read<{ players: Player[] }>(out, 'players.json').players.find((p) => p.id === '250000007')!;
    expect(p7.history).toEqual([{ gameday: 3, points: ptsFor(7, 3), minutes: null, source: 'feed' }]);
  });

  it('se o feed fantasy falhar, mantém os últimos dados válidos e assinala a falha', async () => {
    const out = mkdtempSync(join(tmpdir(), 'ucl-'));
    await runPipeline({ ...opts, outDir: out, now: NOW, httpFactory: factory(ALL) });
    const before = readFileSync(join(out, 'latest', 'players.json'), 'utf8');

    const later = new Date('2026-10-31T16:00:00Z');
    const meta = await runPipeline({
      ...opts,
      outDir: out,
      now: later,
      httpFactory: factory({ ...ALL, uefaFantasy: fail(403), clubElo: [] }),
    });
    expect(readFileSync(join(out, 'latest', 'players.json'), 'utf8')).toBe(before);
    expect(meta.sources.uefaFantasy).toMatchObject({ status: 'failed', lastSuccess: NOW.toISOString() });
    expect(meta.sources.uefaFantasy?.error).toMatch(/403/);
    expect(meta.counts.players).toBe(240);
    expect(meta.currentGameday).toBe(4);
    expect(read<Meta>(out, 'meta.json').generatedAt).toBe(later.toISOString());
  });

  it('se o ClubElo e os coeficientes falharem, mantém os valores anteriores', async () => {
    const out = mkdtempSync(join(tmpdir(), 'ucl-'));
    await runPipeline({ ...opts, outDir: out, now: NOW, httpFactory: factory(ALL) });
    const meta = await runPipeline({
      ...opts,
      outDir: out,
      now: new Date('2026-11-01T12:00:00Z'),
      httpFactory: factory({ ...ALL, clubElo: fail(502), uefaCoefficients: fail(500) }),
    });
    expect(meta.sources.clubElo?.status).toBe('failed');
    expect(meta.sources.uefaCoefficients?.status).toBe('failed');
    expect(meta.counts.teamsWithElo).toBe(4);
    expect(meta.counts.teamsWithCoefficient).toBe(4);
  });

  it('sem ClubElo (situação real), as equipas têm força pelo coeficiente UEFA', async () => {
    const out = mkdtempSync(join(tmpdir(), 'ucl-'));
    const meta = await runPipeline({ ...opts, outDir: out, now: NOW, httpFactory: factory({ ...ALL, clubElo: fail(502) }) });
    expect(meta.counts).toMatchObject({ teamsWithElo: 0, teamsWithCoefficient: 4 });
    const { teams } = read<{ teams: Team[] }>(out, 'teams.json');
    expect(teams[0]!.name).toBe('Man City'); // ordenadas por coeficiente
  });

  it('rejeita um feed com poucos jogadores (controlo de qualidade)', async () => {
    const out = mkdtempSync(join(tmpdir(), 'ucl-'));
    const meta = await runPipeline({ ...opts, minPlayers: 500, outDir: out, now: NOW, httpFactory: factory(ALL) });
    expect(meta.sources.uefaFantasy?.status).toBe('failed');
    expect(meta.sources.uefaFantasy?.error).toMatch(/qualidade/);
    expect(existsSync(join(out, 'latest', 'players.json'))).toBe(false);
  });
});

describe('jornada atual', () => {
  it('deduz a jornada atual da API de jogos', () => {
    const parsed = parseUefaMatches(uefaMatchesJson()).matches.map(fixtureFromUefa);
    expect(currentGamedayFromFixtures(parsed)).toBe(4);
    expect(currentGamedayFromFixtures(parsed.map((f) => ({ ...f, status: 'FINISHED' })))).toBe(4);
    expect(currentGamedayFromFixtures([])).toBeNull();
  });

  it('a jornada verdadeira é o mdId do feed (o feed ignora jornadas passadas)', async () => {
    const calls: string[] = [];
    const { gameday, feed } = await fetchCurrentFantasy(fakeHttp(fantasyRoutes(4), calls), null);
    expect(gameday).toBe(4);
    expect(feed.gameday).toBe(4);
    expect(calls).toHaveLength(1); // pediu J1, recebeu o estado atual (J4)
    expect((await fetchCurrentFantasy(fakeHttp(fantasyRoutes(5)), 4)).gameday).toBe(5); // pista desatualizada
  });

  it('com pista de jornada ainda não aberta, recua uma', async () => {
    const calls: string[] = [];
    const { gameday } = await fetchCurrentFantasy(fakeHttp(fantasyRoutes(4), calls), 5);
    expect(gameday).toBe(4);
    expect(calls).toHaveLength(2);
  });

  it('pipeline funciona sem a API de jogos (horas do feed fantasy)', async () => {
    const out = mkdtempSync(join(tmpdir(), 'ucl-'));
    const meta = await runPipeline({ ...opts, outDir: out, now: NOW, httpFactory: factory({ ...ALL, uefaMatches: fail(503) }) });
    expect(meta.sources.uefaFantasy?.status).toBe('ok');
    expect(meta.currentGameday).toBe(4);
    expect(meta.deadline).toBe('2026-11-04T17:45:00.000Z');
  });
});

describe('estado da jornada', () => {
  const fx = (kickoff: string, status = 'UPCOMING'): Fixture => ({
    id: kickoff,
    gameday: 4,
    phase: '',
    round: '',
    homeId: 'a',
    awayId: 'b',
    homeName: '',
    awayName: '',
    homeCode: '',
    awayCode: '',
    kickoff,
    status,
    score: null,
    source: 'uefa-matches',
  });
  const f = [fx('2026-11-04T17:45:00.000Z'), fx('2026-11-05T20:00:00.000Z')];

  it('por jogar → a decorrer → terminada', () => {
    expect(gamedayTiming(4, f, new Date('2026-11-04T17:00:00Z')).state).toBe('upcoming');
    expect(gamedayTiming(4, f, new Date('2026-11-04T18:00:00Z')).state).toBe('live');
    expect(gamedayTiming(4, f, new Date('2026-11-06T02:00:00Z')).state).toBe('finished');
    expect(gamedayTiming(4, f.map((x) => ({ ...x, status: 'FINISHED' })), new Date('2026-11-05T22:00:00Z')).state).toBe('finished');
    expect(gamedayTiming(5, f, new Date()).deadline).toBeNull();
  });
});
