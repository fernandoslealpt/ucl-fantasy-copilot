import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { gamedayTiming, runPipeline, type SourceName } from '../run.ts';
import type { Fixture, Meta, Player, Team } from '../types.ts';
import { eloRoutes, fakeHttp, fantasyRoutes, matchRoutes, ptsFor, type Route } from './helpers.ts';

const NOW = new Date('2026-10-31T12:00:00Z');
const read = <T>(dir: string, f: string) => JSON.parse(readFileSync(join(dir, 'latest', f), 'utf8')) as T;

function factory(routes: Partial<Record<SourceName, Route[]>>, calls: Record<string, string[]> = {}) {
  return (s: SourceName) => fakeHttp(routes[s] ?? [], (calls[s] ??= []));
}

const ALL = { uefaFantasy: fantasyRoutes(), uefaMatches: matchRoutes, clubElo: eloRoutes };
const opts = { minPlayers: 200, aliases: {}, log: () => {} };

describe('pipeline completo', () => {
  it('1.ª execução: publica jogadores, equipas, jogos, estatísticas e meta', async () => {
    const out = mkdtempSync(join(tmpdir(), 'ucl-'));
    const calls: Record<string, string[]> = {};
    const meta = await runPipeline({ ...opts, outDir: out, now: NOW, httpFactory: factory(ALL, calls) });

    expect(meta.sources.uefaFantasy?.status).toBe('ok');
    expect(meta.sources.uefaMatches?.status).toBe('ok');
    expect(meta.sources.clubElo?.status).toBe('ok');
    expect(meta.currentGameday).toBe(4);
    expect(meta.gamedayState).toBe('upcoming');
    expect(meta.deadline).toBe('2026-11-04T17:45:00.000Z');
    expect(meta.counts).toEqual({ players: 240, teams: 4, fixtures: 8, teamsWithElo: 4 });
    expect(meta.checks.pointsHistory).toEqual({ checked: 240, mismatches: 0 });
    expect(meta.checks.fixturesCrossCheck).toEqual({ fantasy: 2, matched: 2 });
    expect(meta.warnings).toEqual([]);
    expect(calls.uefaFantasy).toHaveLength(4); // atual + J1..J3

    const { players } = read<{ players: Player[] }>(out, 'players.json');
    expect(players).toHaveLength(240);
    expect(players[0]!.stats.points).toBeGreaterThanOrEqual(players[1]!.stats.points);
    const p7 = players.find((p) => p.id === '250000007')!;
    expect(p7.position).toBe('FWD');
    expect(p7.history.map((h) => h.points)).toEqual([1, 2, 3].map((gd) => ptsFor(7, gd)));
    expect(p7.history.every((h) => h.minutes === 90)).toBe(true);
    expect(p7.teamName).toBe('Benfica');
    expect(p7.nextMatch).toMatchObject({ gameday: 4, home: true, opponentName: 'Paris', opponentId: '52747' });
    expect(p7.nextMatch?.kickoff).toBe('2026-11-04T17:45:00.000Z');
    expect(p7.availability).toBe('available');

    const { teams } = read<{ teams: Team[] }>(out, 'teams.json');
    const psg = teams.find((t) => t.id === '52747')!;
    expect(psg).toMatchObject({ eloClub: 'Paris SG', country: 'FRA', players: 60 });
    expect(psg.record.played).toBe(3);
    expect(psg.nextMatch).toMatchObject({ gameday: 4, home: false, opponentId: '50147' });

    const { fixtures } = read<{ fixtures: Fixture[] }>(out, 'fixtures.json');
    expect(fixtures.every((f) => f.phase !== 'QUALIFYING')).toBe(true);
    expect(existsSync(join(out, 'history', 'gd04', '2026-10-31.json'))).toBe(true);
    expect(readFileSync(join(out, 'latest', 'summary.md'), 'utf8')).toContain('Jornada:** 4 (por jogar)');
  });

  it('execuções seguintes usam cache das jornadas fechadas', async () => {
    const out = mkdtempSync(join(tmpdir(), 'ucl-'));
    await runPipeline({ ...opts, outDir: out, now: NOW, httpFactory: factory(ALL) });
    const calls: Record<string, string[]> = {};
    const meta = await runPipeline({ ...opts, outDir: out, now: new Date('2026-10-31T14:00:00Z'), httpFactory: factory(ALL, calls) });
    expect(calls.uefaFantasy).toHaveLength(2); // atual + J3
    expect(meta.checks.pointsHistory.mismatches).toBe(0);
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
      httpFactory: factory({ ...ALL, uefaFantasy: [{ match: () => true, status: 403 }], clubElo: [] }),
    });
    expect(readFileSync(join(out, 'latest', 'players.json'), 'utf8')).toBe(before);
    expect(meta.sources.uefaFantasy).toMatchObject({ status: 'failed', lastSuccess: NOW.toISOString() });
    expect(meta.sources.uefaFantasy?.error).toMatch(/403/);
    expect(meta.counts.players).toBe(240);
    expect(meta.currentGameday).toBe(4);
    const saved = read<Meta>(out, 'meta.json');
    expect(saved.generatedAt).toBe(later.toISOString());
  });

  it('se o ClubElo falhar, mantém o Elo anterior', async () => {
    const out = mkdtempSync(join(tmpdir(), 'ucl-'));
    await runPipeline({ ...opts, outDir: out, now: NOW, httpFactory: factory(ALL) });
    const meta = await runPipeline({
      ...opts,
      outDir: out,
      now: new Date('2026-11-01T12:00:00Z'),
      httpFactory: factory({ ...ALL, clubElo: [{ match: () => true, status: 500 }] }),
    });
    expect(meta.sources.clubElo?.status).toBe('failed');
    expect(meta.counts.teamsWithElo).toBe(4);
    expect(meta.warnings.some((w) => w.includes('Elo'))).toBe(true);
  });

  it('rejeita um feed com poucos jogadores (controlo de qualidade)', async () => {
    const out = mkdtempSync(join(tmpdir(), 'ucl-'));
    const meta = await runPipeline({ ...opts, minPlayers: 500, outDir: out, now: NOW, httpFactory: factory(ALL) });
    expect(meta.sources.uefaFantasy?.status).toBe('failed');
    expect(meta.sources.uefaFantasy?.error).toMatch(/qualidade/);
    expect(existsSync(join(out, 'latest', 'players.json'))).toBe(false);
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
