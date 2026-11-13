import { describe, expect, it } from 'vitest';
import { emptyHistory, evaluateGameday, mergeHistory, updateGameday, type History } from './history';
import { pendingDecisions, withDecisions, type MyTeam } from './team';
import type { Row } from './types';

const row = (id: string, pts: Record<number, number>): Row =>
  ({ id, name: id, history: Object.entries(pts).map(([g, p]) => ({ gameday: Number(g), points: p, minutes: 90, source: 'uefa' })) }) as unknown as Row;

describe('Diário', () => {
  const deadline = '2026-11-24T17:45:00Z';
  const before = new Date('2026-11-20T10:00:00Z');
  const after = new Date('2026-11-26T10:00:00Z');

  it('grava a recomendação antes do fecho e congela depois (exceto os pontos oficiais)', () => {
    let h = updateGameday(emptyHistory(), 5, deadline, { teamXp: 54.6 }, before);
    expect(h.gamedays['5']!.teamXp).toBe(54.6);
    const frozen = updateGameday(h, 5, deadline, { teamXp: 99 }, after);
    expect(frozen.gamedays['5']!.teamXp).toBe(54.6);
    h = updateGameday(h, 5, deadline, { officialPoints: 61 }, after);
    expect(h.gamedays['5']!.officialPoints).toBe(61);
  });

  it('não reescreve quando nada muda', () => {
    const h = updateGameday(emptyHistory(), 5, deadline, { teamXp: 50 }, before);
    expect(updateGameday(h, 5, deadline, { teamXp: 50 }, before)).toBe(h);
  });

  it('juntar telemóvel e PC fica com a jornada mais recente e nunca perde jornadas', () => {
    const a: History = { version: 1, updatedAt: '2026-11-20T00:00:00Z', gamedays: { '4': { gameday: 4, updatedAt: '2026-11-01T00:00:00Z', teamXp: 40 }, '5': { gameday: 5, updatedAt: '2026-11-20T00:00:00Z', teamXp: 55 } } };
    const b: History = { version: 1, updatedAt: '2026-11-21T00:00:00Z', gamedays: { '5': { gameday: 5, updatedAt: '2026-11-21T00:00:00Z', teamXp: 57 } } };
    const m = mergeHistory(a, b);
    expect(Object.keys(m.gamedays).sort()).toEqual(['4', '5']);
    expect(m.gamedays['5']!.teamXp).toBe(57);
    expect(mergeHistory(b, a).gamedays['5']!.teamXp).toBe(57);
  });

  it('avalia trocas feitas e recomendadas com os pontos reais e o custo do −4', () => {
    const byId = new Map([['A', row('A', { 5: 2 })], ['B', row('B', { 5: 12 })], ['C', row('C', { 5: 3 })], ['D', row('D', { 5: 1 })]]);
    const ev = evaluateGameday(
      {
        gameday: 5,
        updatedAt: '',
        squad: ['B', 'C'],
        recommended: { swaps: [{ out: 'A', in: 'B' }], deltaNow: 3, delta: 5, hits: 0, captain: 'B', vice: 'C' },
        done: { swaps: [{ out: 'A', in: 'B' }, { out: 'C', in: 'D' }], hits: 1, captain: 'C' },
      },
      byId,
    );
    expect(ev.recommendedGain).toBe(10);
    expect(ev.doneGain).toBe(10 - 2 - 4);
    expect(ev.captain).toEqual({ id: 'C', pts: 3 });
    expect(ev.bestCaptain).toEqual({ id: 'B', pts: 12 });
    expect(ev.played).toBe(true);
  });

  it('jornada por jogar fica sem pontos reais', () => {
    const ev = evaluateGameday({ gameday: 6, updatedAt: '', squad: ['A'], recommended: { swaps: [{ out: 'A', in: 'B' }], deltaNow: 1, delta: 1, hits: 0, captain: null, vice: null } }, new Map([['A', row('A', {})], ['B', row('B', {})]]));
    expect(ev.played).toBe(false);
    expect(ev.recommendedGain).toBeNull();
  });
});

describe('decisões pendentes', () => {
  const team: MyTeam = { version: 1, updatedAt: '', players: Array.from({ length: 15 }, (_, i) => String(i)), bank: 0.2 };
  it('sem decisões falta tudo; decisões de outra jornada não contam', () => {
    expect(pendingDecisions(team, 5)).toEqual(['transfers', 'captain']);
    const t4 = withDecisions(team, 4, { transfers: true, captain: '1' });
    expect(pendingDecisions(t4, 5)).toEqual(['transfers', 'captain']);
  });
  it('marca transferências e capitão', () => {
    const t = withDecisions(withDecisions(team, 5, { transfers: true }), 5, { captain: '3', vice: '4' });
    expect(pendingDecisions(t, 5)).toEqual([]);
    expect(t.decisions).toEqual({ gameday: 5, transfers: true, captain: '3', vice: '4' });
  });
  it('sem equipa completa pede a equipa', () => {
    expect(pendingDecisions(null, 5)).toEqual(['team']);
  });
});
