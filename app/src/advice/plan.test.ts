import { describe, expect, it } from 'vitest';
import type { Position, Row } from '../types';
import { evaluatePath, freeAfter, LAST_PLAN_GD, planGamedays, suggestPath } from './plan';

let n = 0;
function P(pos: Position, club: string, price: number, xps: number[], gd0 = 5): Row {
  const id = `z${++n}`;
  return {
    id, name: id, fullName: id, teamId: club, teamName: club, teamCode: club, position: pos, price, selectedPct: 5,
    availability: 'available', status: { code: '', quality: '', note: '', active: true },
    stats: { minutes: 0, points: 0, goals: 0, assists: 0, cleanSheets: 0, recoveries: 0, saves: 0 },
    form: { lastGameday: 0, avgPoints: 0 }, history: [],
    xp: {
      id, xp1: xps[0]!, xp3: 0, xp5: 0, valuePerM: 0, confidence: 'alta',
      rates: { goals90: 0, assists90: 0, recoveries90: 0, saves90: 0, motmPerApp: 0 },
      fixtures: xps.map((xp, k) => ({
        gameday: gd0 + k, opponentId: 'x', opponentName: 'X', home: true, kickoff: null, xp, pPlay: 0.95, pStart: 0.9, expMinutes: 80,
        goalsFor: 1.5, goalsAgainst: 1.2, pCleanSheet: 0.3,
        components: { appearance: 2, goals: 0, assists: 0, cleanSheet: 0, recoveries: 0, saves: 0, playerOfTheMatch: 0, conceded: 0, cards: 0 },
      })),
    },
  } as Row;
}
const shape: Position[] = ['GK', 'GK', 'DEF', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD'];
const squad = () => shape.map((p, i) => P(p, `C${i}`, 6, [3, 3, 3]));

describe('grátis a acumular', () => {
  it('2 grátis: usar 0 → 3 na seguinte; 1 → 3; 2 → 2; mais do que as grátis → 2', () => {
    expect(freeAfter(2, 0)).toBe(3);
    expect(freeAfter(2, 1)).toBe(3);
    expect(freeAfter(2, 2)).toBe(2);
    expect(freeAfter(2, 3)).toBe(2);
    expect(freeAfter(3, 1)).toBe(3);
  });
});

describe('plano de várias jornadas', () => {
  it('sem trocas o ganho é 0 em todas as jornadas e o líquido é 0', () => {
    const s = squad();
    const r = evaluatePath(s, s, 0, 2, 5, []);
    expect(r.rows.map((x) => x.gameday)).toEqual([5, 6, 7]);
    expect(r.rows.every((x) => Math.abs(x.gain) < 1e-9)).toBe(true);
    expect(r.net).toBe(0);
  });

  it('cada jornada compara com a equipa de hoje na mesma jornada, sem cortes; as grátis acumulam', () => {
    const s = squad();
    const up = P('FWD', 'U', 6, [9, 7, 5]);
    const up2 = P('MID', 'V', 6, [3, 8, 4]);
    const out1 = s.find((r) => r.position === 'FWD')!;
    const out2 = s.find((r) => r.position === 'MID')!;
    const r = evaluatePath([...s, up, up2], s, 0, 2, 5, [
      { gameday: 5, swaps: [{ out: out1, in: up }] },
      { gameday: 6, swaps: [{ out: out2, in: up2 }] },
    ]);
    expect(r.legal).toBe(true);
    expect(r.rows[0]!.free).toBe(2);
    expect(r.rows[1]!.free).toBe(3); // usou 1 → guarda 1 → 3
    expect(r.rows[2]!.free).toBe(3);
    // J5: o FWD 9 entra no lugar de um 3 → ganho = 9 − 3 (capitão a dobrar: sobe também o capitão)
    expect(r.rows[0]!.gain).toBeGreaterThan(5);
    // J7: nenhuma troca nova, mas o plantel mantém as duas trocas (ganho continua a contar)
    expect(r.rows[2]!.gain).toBeGreaterThan(0);
    expect(r.hits).toBe(0);
    expect(r.net).toBeCloseTo(r.rows.reduce((a, x) => a + x.gain, 0), 9);
  });

  it('3 trocas com 2 grátis custa −4 no líquido e a margem só entra na pontuação', () => {
    const s = squad();
    const ups = ['A', 'B', 'C'].map((c) => P('FWD', c, 6, [9, 9, 9]));
    const outs = s.filter((r) => r.position === 'FWD');
    const r = evaluatePath([...s, ...ups], s, 0, 2, 5, [{ gameday: 5, swaps: outs.map((o, i) => ({ out: o, in: ups[i]! })) }]);
    expect(r.hits).toBe(1);
    expect(r.net).toBeCloseTo(r.rows.reduce((a, x) => a + x.gain, 0) - 4, 9);
    expect(r.score).toBeCloseTo(r.net - 2, 9);
  });

  it('troca ilegal (sem dinheiro) marca o plano como ilegal', () => {
    const s = squad();
    const star = P('FWD', 'BIG', 12, [9, 9, 9]);
    const out = s.find((r) => r.position === 'FWD')!;
    expect(evaluatePath([...s, star], s, 0, 2, 5, [{ gameday: 5, swaps: [{ out, in: star }] }]).legal).toBe(false);
  });

  it('o plano acaba na J8', () => {
    const s = shape.map((p, i) => P(p, `C${i}`, 6, [3, 3, 3, 3, 3], 6));
    expect(planGamedays(s, 6)).toEqual([6, 7, 8]);
    expect(planGamedays(s, 7)).toEqual([7, 8]);
    expect(LAST_PLAN_GD).toBe(8);
  });

  it('a sugestão encontra um plano pelo menos tão bom como não mexer e legal', async () => {
    const s = squad();
    const ups = ['A', 'B', 'C', 'D'].map((c, i) => P('FWD', c, 6, [9 - i, 8, 7]));
    const r = await suggestPath([...s, ...ups], s, 0, 2, 5);
    expect(r.legal).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.net).toBeGreaterThan(0);
  });
});
