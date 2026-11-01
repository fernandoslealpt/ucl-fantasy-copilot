import { afterEach, describe, expect, it, vi } from 'vitest';
import { newest, writeRemoteTeam } from './sync';
import { bestXI, clubLimit, validate, type MyTeam } from './team';
import type { Position, Row } from './types';

let n = 0;
const row = (position: Position, xp1: number, teamId = `t${n % 6}`): Row =>
  ({
    id: `p${++n}`,
    name: `P${n}`,
    teamId,
    teamName: teamId,
    position,
    price: 5,
    availability: 'available',
    xp: { xp1 },
  }) as unknown as Row;

const squad = (): Row[] => [
  row('GK', 4),
  row('GK', 2),
  ...[5, 4, 3, 2, 1].map((x) => row('DEF', x)),
  ...[6, 5, 4, 1, 0.5].map((x) => row('MID', x)),
  ...[7, 3, 0.2].map((x) => row('FWD', x)),
];

describe('regras da equipa', () => {
  it('valida 2/5/5/3 e máximo por clube', () => {
    const s = squad();
    const byId = new Map(s.map((r) => [r.id, r]));
    expect(validate(s.map((r) => r.id), byId, 4)).toMatchObject({ complete: true, valid: true });
    expect(validate(s.slice(1).map((r) => r.id), byId, 4)).toMatchObject({ complete: false, valid: false });
    const sameClub = s.map((r, i) => (i < 4 ? { ...r, teamId: 'X', teamName: 'Clube X' } : r));
    const v = validate(sameClub.map((r) => r.id), new Map(sameClub.map((r) => [r.id, r])), 4);
    expect(v.overClub).toEqual(['Clube X']);
    expect(clubLimit(4)).toBe(3);
    expect(clubLimit(10)).toBe(4);
    expect(clubLimit(17)).toBe(8);
  });

  it('onze com mais xP respeita a formação', () => {
    const { xi, bench } = bestXI(squad());
    expect(xi).toHaveLength(11);
    expect(bench).toHaveLength(4);
    const count = (p: Position) => xi.filter((r) => r.position === p).length;
    expect(count('GK')).toBe(1);
    expect(count('DEF')).toBeGreaterThanOrEqual(3);
    expect(count('MID')).toBeGreaterThanOrEqual(2);
    expect(count('FWD')).toBeGreaterThanOrEqual(1);
    expect(bench[0]!.position).toBe('GK');
    const minXi = Math.min(...xi.filter((r) => r.position !== 'GK').map((r) => r.xp!.xp1));
    const maxBench = Math.max(...bench.filter((r) => r.position !== 'GK').map((r) => r.xp!.xp1));
    expect(minXi).toBeGreaterThanOrEqual(maxBench);
  });
});

describe('sincronização', () => {
  const team = (at: string): MyTeam => ({ version: 1, updatedAt: at, players: ['a'], bank: 1.5 });
  afterEach(() => vi.unstubAllGlobals());

  it('fica a versão mais recente', () => {
    const a = team('2026-11-01T10:00:00Z');
    const b = team('2026-11-01T11:00:00Z');
    expect(newest(a, b)).toBe(b);
    expect(newest(b, a)).toBe(b);
    expect(newest(null, a)).toBe(a);
  });

  it('grava no GitHub com o sha atual, em base64 UTF-8', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (!init?.method) return new Response(JSON.stringify({ content: btoa('{}'), sha: 'abc' }), { status: 200 });
      return new Response('{}', { status: 200 });
    });
    await writeRemoteTeam({ ...team('2026-11-01T12:00:00Z'), players: ['Bodø'] }, 'tok');
    const put = calls.find((c) => c.init?.method === 'PUT')!;
    expect(put.url).toContain('/contents/data/user/team.json');
    expect((put.init!.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    const body = JSON.parse(String(put.init!.body));
    expect(body.sha).toBe('abc');
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(body.content), (c) => c.charCodeAt(0)));
    expect(JSON.parse(decoded).players).toEqual(['Bodø']);
  });

  it('explica a falta de permissão', async () => {
    vi.stubGlobal('fetch', async (_: string, init?: RequestInit) =>
      init?.method ? new Response('{}', { status: 403 }) : new Response('', { status: 404 }),
    );
    await expect(writeRemoteTeam(team('2026-11-01T12:00:00Z'), 'tok')).rejects.toThrow(/permissão/);
  });
});
