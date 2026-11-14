import { describe, expect, it } from 'vitest';
import type { Position, Row } from '../types';
import { adviseTransfers } from './engine';
import { captainDifferentials, diffSnapshots, rollAnalysis, whyNot } from './questions';

let n = 0;
function P(pos: Position, club: string, price: number, xps: number[], extra: Partial<Row> = {}): Row {
  const id = `q${++n}`;
  return {
    id,
    name: id,
    fullName: id,
    teamId: club,
    teamName: club,
    teamCode: club,
    position: pos,
    price,
    selectedPct: 10,
    availability: 'available',
    status: { code: '', quality: '', note: '', active: true },
    stats: { minutes: 0, points: 0, goals: 0, assists: 0, cleanSheets: 0, recoveries: 0, saves: 0 },
    form: { lastGameday: 0, avgPoints: 0 },
    history: [],
    xp: {
      id,
      xp1: xps[0]!,
      xp3: 0,
      xp5: 0,
      valuePerM: 0,
      confidence: 'alta',
      rates: { goals90: 0, assists90: 0, recoveries90: 0, saves90: 0, motmPerApp: 0 },
      fixtures: xps.map((xp, k) => ({
        gameday: 5 + k,
        opponentId: 'x',
        opponentName: 'X',
        home: true,
        kickoff: null,
        xp,
        pPlay: 0.95,
        pStart: 0.9,
        expMinutes: 80,
        goalsFor: 1.5,
        goalsAgainst: 1.2,
        pCleanSheet: 0.3,
        components: { appearance: 2, goals: 0, assists: 0, cleanSheet: 0, recoveries: 0, saves: 0, playerOfTheMatch: 0, conceded: 0, cards: 0 },
      })),
    },
    ...extra,
  } as Row;
}
const shape: Position[] = ['GK', 'GK', 'DEF', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD'];
const squad = () => shape.map((p, i) => P(p, `C${i}`, 6, [3, 3, 3, 3]));

describe('Porque não este jogador?', () => {
  it('sem dinheiro: diz quanto falta', () => {
    const s = squad();
    const star = P('FWD', 'BIG', 12, [9, 9, 9, 9]);
    const a = adviseTransfers([...s, star], s, 1, 2, 5);
    const w = whyNot(a, [...s, star], s, 1, 2, 5, star);
    expect(w.best).toBeNull();
    expect(w.reasons).toContainEqual({ code: 'BUDGET', need: 5 });
  });
  it('ganho menor do que a melhor alternativa: mostra quanto falta', () => {
    const s = squad();
    const good = P('FWD', 'G', 6, [9, 9, 9, 9]);
    const meh = P('FWD', 'M', 6, [4, 4, 4, 4]);
    // com 1 grátis só o melhor é recomendado
    const a = adviseTransfers([...s, good, meh], s, 0, 1, 5);
    const w = whyNot(a, [...s, good, meh], s, 0, 1, 5, meh);
    expect(w.best).not.toBeNull();
    expect(w.shortfall).toBeGreaterThan(0);
    expect(w.reasons.some((r) => r.code === 'LOW_GAIN')).toBe(true);
  });
});

describe('E se eu guardar a transferência?', () => {
  it('compara usar as 2 agora com guardar 1 (3 grátis na seguinte)', () => {
    const s = squad();
    // ganhos grandes só a partir da jornada seguinte: guardar devia valer a pena
    const later = ['L1', 'L2', 'L3'].map((c) => P('MID', c, 6, [3, 9, 9, 9]));
    const r = rollAnalysis([...s, ...later], s, 0, 2, 5)!;
    expect(r.options.map((o) => o.now)).toEqual([0, 1, 2]);
    expect(r.options.find((o) => o.now === 1)!.nextFree).toBe(3);
    expect(r.options.find((o) => o.now === 2)!.nextFree).toBe(2);
    expect(r.options.filter((o) => o.best)).toHaveLength(1);
  });
});

describe('Capitão diferencial e o que mudou', () => {
  it('diferencial = xP × fração que não o tem; custo face ao mais seguro', () => {
    const a = P('FWD', 'A', 10, [8], { selectedPct: 60 });
    const b = P('MID', 'B', 7, [7], { selectedPct: 5 });
    const d = captainDifferentials([a, b], 5);
    expect(d[0]!.row.id).toBe(b.id);
    expect(d[0]!.edge).toBeCloseTo(6.65, 2);
    expect(d[0]!.cost).toBeCloseTo(1, 5);
  });
  it('só mostra mudanças entre atualizações diferentes', () => {
    const prev = { generatedAt: 'a', gameday: 5, recommended: ['x>y'], captain: 'c1', xp: { p1: 5 } };
    const cur = { generatedAt: 'b', gameday: 5, recommended: ['x>z'], captain: 'c1', xp: { p1: 3 } };
    const d = diffSnapshots(prev, cur)!;
    expect(d.recChanged).toBe(true);
    expect(d.moves[0]).toEqual({ id: 'p1', before: 5, after: 3 });
    expect(diffSnapshots(cur, cur)).toBeNull();
  });
});
