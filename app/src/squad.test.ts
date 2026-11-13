import { describe, expect, it } from 'vitest';
import { applySwap, canSwap, defaultLineup, draftFrom, lineupFor, lineupSuggestion, placeInSlot, removeSlot, restoreSlot, summarize } from './squad';
import type { MyTeam } from './team';
import type { Position, Row } from './types';

let n = 0;
const R = (pos: Position, club: string, price: number, xp = 3): Row => {
  const id = `p${++n}`;
  return { id, name: id, teamId: club, teamName: club, position: pos, price, xp: { fixtures: [{ gameday: 5, xp }] } } as unknown as Row;
};
const shape: Position[] = ['GK', 'GK', 'DEF', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD'];
const build = () => {
  const squad = shape.map((p, i) => R(p, `C${i}`, 6, 3 + i / 10));
  const team: MyTeam = { version: 1, updatedAt: '', players: squad.map((r) => r.id), bank: 0.2 };
  return { squad, team };
};
const xpAt = (r: Row) => r.xp?.fixtures.reduce((a, f) => a + f.xp, 0) ?? 0;

describe('Plantel em rascunho (transferências)', () => {
  it('✕ devolve o preço ao banco; entrar desconta, mesmo a negativo; ↺ recupera', () => {
    const { squad, team } = build();
    const byId = new Map(squad.map((r) => [r.id, r]));
    let d = draftFrom(team, byId);
    const i = d.slots.findIndex((s) => s.pos === 'FWD');
    d = removeSlot(d, i);
    let s = summarize(d, team, byId, 2, 5);
    expect(s.bank).toBeCloseTo(6.2, 5);
    expect(s.empty).toBe(1);
    expect(s.valid).toBe(false);
    const star = R('FWD', 'BIG', 11.2);
    byId.set(star.id, star);
    d = placeInSlot(d, i, star);
    s = summarize(d, team, byId, 2, 5);
    expect(s.bank).toBeCloseTo(-5, 5);
    expect(s.swaps).toEqual([{ out: squad[12]!.id, in: star.id }]);
    expect(s.valid).toBe(false);
    d = restoreSlot(d, i);
    expect(summarize(d, team, byId, 2, 5).bank).toBeCloseTo(0.2, 5);
  });

  it('não aceita jogador de outra posição nem repetido', () => {
    const { squad, team } = build();
    const byId = new Map(squad.map((r) => [r.id, r]));
    let d = removeSlot(draftFrom(team, byId), 14);
    expect(placeInSlot(d, 14, R('MID', 'X', 5))).toBe(d);
    d = placeInSlot(d, 14, squad[13]!);
    expect(d.slots[14]!.current).toBeNull();
  });

  it('conta −4 além das grátis; Limitless sem custo nem limite de orçamento', () => {
    const { squad, team } = build();
    const byId = new Map(squad.map((r) => [r.id, r]));
    let d = draftFrom(team, byId);
    for (const k of [12, 13, 14]) {
      d = removeSlot(d, k);
      const r = R('FWD', `N${k}`, 9);
      byId.set(r.id, r);
      d = placeInSlot(d, k, r);
    }
    const s = summarize(d, team, byId, 2, 5);
    expect(s.hits).toBe(1);
    expect(s.valid).toBe(false); // banco negativo
    const l = summarize({ ...d, limitless: true }, team, byId, 2, 5);
    expect(l.hits).toBe(0);
    expect(l.valid).toBe(true);
  });

  it('assinala mais de 3 do mesmo clube', () => {
    const { squad, team } = build();
    const byId = new Map(squad.map((r) => [r.id, r]));
    let d = draftFrom(team, byId);
    for (const k of [12, 13, 14]) {
      d = removeSlot(d, k);
      const r = R('FWD', 'C0', 6);
      byId.set(r.id, r);
      d = placeInSlot(d, k, r);
    }
    expect(summarize(d, team, byId, 5, 5).overClub).toEqual(['C0']);
  });
});

describe('Jornada (onze e banco)', () => {
  it('onze por defeito válido e banco com o GR primeiro', () => {
    const { squad } = build();
    const l = defaultLineup(squad, 5, xpAt);
    expect(l.xi).toHaveLength(11);
    expect(squad.find((r) => r.id === l.bench[0])!.position).toBe('GK');
  });

  it('substituição só com formação válida; GR só com GR', () => {
    const { squad } = build();
    const byId = new Map(squad.map((r) => [r.id, r]));
    const l = defaultLineup(squad, 5, xpAt);
    const gkBench = l.bench[0]!;
    const gkXi = l.xi.find((id) => byId.get(id)!.position === 'GK')!;
    const fwdXi = l.xi.find((id) => byId.get(id)!.position === 'FWD')!;
    expect(canSwap(l, gkXi, gkBench, byId)).toBe(true);
    expect(canSwap(l, fwdXi, gkBench, byId)).toBe(false);
    const outfieldBench = l.bench.slice(1);
    expect(canSwap(l, outfieldBench[0]!, outfieldBench[1]!, byId)).toBe(true);
    const sw = applySwap(l, gkXi, gkBench);
    expect(sw.xi).toContain(gkBench);
    expect(sw.bench[0]).toBe(gkXi);
  });

  it('sugere pôr no onze quem tem mais xP (caso Mbappé no banco)', () => {
    const { squad } = build();
    const byId = new Map(squad.map((r) => [r.id, r]));
    const l = defaultLineup(squad, 5, xpAt);
    const benchFwd = squad.find((r) => r.position === 'FWD' && l.bench.includes(r.id));
    const xiMid = l.xi.find((id) => byId.get(id)!.position === 'MID')!;
    // força um onze pior: troca o melhor por um pior se possível
    if (benchFwd && canSwap(l, xiMid, benchFwd.id, byId)) {
      const worse = applySwap(l, benchFwd.id, xiMid);
      expect(lineupSuggestion(worse, squad, xpAt).gain).toBeGreaterThanOrEqual(0);
    }
    expect(lineupSuggestion(l, squad, xpAt).gain).toBeCloseTo(0, 5);
  });

  it('onze guardado acompanha uma transferência (quem entra fica no lugar de quem saiu)', () => {
    const { squad, team } = build();
    const byId = new Map(squad.map((r) => [r.id, r]));
    const l = defaultLineup(squad, 5, xpAt);
    const outId = l.xi.find((id) => byId.get(id)!.position === 'FWD')!;
    const newcomer = R('FWD', 'NEW', 6);
    byId.set(newcomer.id, newcomer);
    const newSquad = [...squad.filter((r) => r.id !== outId), newcomer];
    const t = { ...team, players: newSquad.map((r) => r.id), lineup: l };
    const res = lineupFor(t, newSquad, 5, xpAt, byId);
    expect(res.saved).toBe(true);
    expect(res.lineup.xi).toContain(newcomer.id);
    expect(res.lineup.xi).not.toContain(outId);
  });
});
