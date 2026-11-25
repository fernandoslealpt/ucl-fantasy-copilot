import { describe, expect, it } from 'vitest';
import { captainSwitch, isLocked, liveXp, realPoints } from './live';
import type { Row } from '../types';

const T0 = Date.parse('2026-11-25T10:00:00Z');
const row = (id: string, kickoff: string, xp: number, pts?: number, pStart = 0.9): Row =>
  ({ id, name: id, xp: { fixtures: [{ gameday: 5, kickoff, xp, pStart }] }, history: pts == null ? [] : [{ gameday: 5, points: pts, minutes: 90, source: 'uefa' }] }) as unknown as Row;
const model = (r: Row) => r.xp!.fixtures[0]!.xp;
const before = '2026-11-25T17:45:00Z';
const played = '2026-11-24T20:00:00Z';

describe('jornada em curso', () => {
  it('bloqueia quem já tem o jogo começado e usa os pontos reais', () => {
    const a = row('a', played, 7, 16);
    const b = row('b', before, 7);
    expect(isLocked(a, 5, T0)).toBe(true);
    expect(isLocked(b, 5, T0)).toBe(false);
    expect(realPoints(a, 5)).toBe(16);
    expect(liveXp(a, 5, T0, model)).toBe(16);
    expect(liveXp(b, 5, T0, model)).toBe(7);
  });
  it('jogo começado sem registo: mantém o xP até passarem 3 h, depois assume 0', () => {
    const live = row('c', '2026-11-25T09:00:00Z', 5);
    expect(liveXp(live, 5, T0, model)).toBe(5);
    expect(liveXp(live, 5, T0 + 3 * 3600_000, model)).toBe(0);
  });
  it('sugere passar a braçadeira quando o capitão já jogou mal e há alguém bem acima por jogar', () => {
    const cap = row('paz', played, 6.9, 2);
    const rap = row('rap', before, 7.8, undefined, 0.87);
    const fer = row('fer', before, 6.5);
    const s = captainSwitch([cap, rap, fer], 'paz', 5, T0, model)!;
    expect(s.to.id).toBe('rap');
    expect(s.fromPts).toBe(2);
    expect(s.gain).toBeGreaterThan(5);
  });
  it('não sugere se o capitão fez bem, se ainda não jogou, ou se ninguém compensa', () => {
    const rap = row('rap', before, 7.8);
    expect(captainSwitch([row('paz', played, 6.9, 14), rap], 'paz', 5, T0, model)).toBeNull();
    expect(captainSwitch([row('paz', before, 6.9), rap], 'paz', 5, T0, model)).toBeNull();
    expect(captainSwitch([row('paz', played, 6.9, 7), row('x', before, 4)], 'paz', 5, T0, model)).toBeNull();
  });
});

import { adviseCaptain } from './engine';
import { lineupSuggestion } from '../squad';
import type { Position } from '../types';

describe('sugestões a meio da jornada', () => {
  const mk = (id: string, pos: Position, kickoff: string, xp: number, pts?: number): Row => ({ ...row(id, kickoff, xp, pts), position: pos }) as unknown as Row;
  // GR g1,g2; DEF d1..d5; MID m1..m5; FWD f1..f3
  const squad: Row[] = [
    mk('g1', 'GK', before, 3), mk('g2', 'GK', before, 1),
    mk('d1', 'DEF', before, 4), mk('d2', 'DEF', before, 4), mk('d3', 'DEF', before, 4), mk('d4', 'DEF', before, 3), mk('d5', 'DEF', before, 6),
    mk('m1', 'MID', before, 5), mk('m2', 'MID', before, 5), mk('m3', 'MID', before, 5), mk('m4', 'MID', before, 5), mk('m5', 'MID', before, 2),
    mk('f1', 'FWD', before, 6), mk('f2', 'FWD', before, 6), mk('f3', 'FWD', before, 1),
  ];
  const lineup = { xi: ['g1', 'd1', 'd2', 'd3', 'd4', 'm1', 'm2', 'm3', 'm4', 'f1', 'f2'], bench: ['g2', 'd5', 'm5', 'f3'] };
  const live = (r: Row) => liveXp(r, 5, T0, model);

  it('sugere meter o suplente melhor quando ninguém está bloqueado', () => {
    const s = lineupSuggestion(lineup as never, squad, live, new Set());
    expect(s.pairs).toEqual([{ out: 'd4', in: 'd5' }]);
    expect(s.gain).toBeCloseTo(3);
  });
  it('não mexe em quem já jogou nem usa suplentes já jogados', () => {
    const lockedD4 = squad.map((r) => (r.id === 'd4' ? mk('d4', 'DEF', played, 3, 1) : r));
    const s1 = lineupSuggestion(lineup as never, lockedD4, live, new Set(['d4']));
    expect(s1.pairs.some((p) => p.out === 'd4')).toBe(false); // d4 já jogou: fica
    expect(s1.pairs).toEqual([{ out: 'd3', in: 'd5' }]); // a troca possível é com outro defesa por jogar
    const lockedD5 = squad.map((r) => (r.id === 'd5' ? mk('d5', 'DEF', played, 6, 12) : r));
    const s2 = lineupSuggestion(lineup as never, lockedD5, live, new Set(['d5']));
    expect(s2.pairs).toEqual([]); // d5 já jogou: não pode entrar
  });
  it('o conselho de capitão ignora quem já tem o jogo começado', () => {
    const xi = [mk('a', 'MID', played, 9, 2), mk('b', 'MID', before, 7)];
    expect(adviseCaptain(xi, 5, T0).captain?.row.id).toBe('b');
    expect(adviseCaptain(xi, 5).captain?.row.id).toBe('a'); // sem "agora", como antes
  });
});
