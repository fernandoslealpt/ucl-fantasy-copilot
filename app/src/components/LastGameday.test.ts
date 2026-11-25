import { describe, expect, it } from 'vitest';
import { gamedayTotal, lastResultGameday } from './LastGameday';
import type { Row } from '../types';

const row = (gds: number[]): Row => ({ history: gds.map((gameday) => ({ gameday, points: 1, minutes: 90, source: 'uefa' })) }) as unknown as Row;

describe('Como correu a jornada', () => {
  it('escolhe a última jornada com resultados no plantel', () => {
    expect(lastResultGameday([row([1, 2, 3]), row([1, 2, 3, 4]), row([1])])).toBe(4);
    expect(lastResultGameday([row([]), row([])])).toBe(0);
  });
  it('soma o onze e dobra o capitão (só se está no onze)', () => {
    const pts = (id: string) => ({ a: 10, b: 4, c: 6, d: 20 })[id as 'a'] ?? 0;
    expect(gamedayTotal(['a', 'b', 'c'], 'a', pts)).toBe(10 + 4 + 6 + 10);
    expect(gamedayTotal(['a', 'b', 'c'], 'd', pts)).toBe(20);
    expect(gamedayTotal(['a', 'b', 'c'], undefined, pts)).toBe(20);
  });
});
