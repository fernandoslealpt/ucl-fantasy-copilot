import type { Position } from '../types.ts';

/**
 * Pontuação UCL Fantasy 2026/27 (docs/SPEC.md §13), confirmada pela decomposição oficial
 * do histórico por jogador (ex.: golo de avançado = 4, assistência = 3, aparição+60' = 2, MOTM = 3).
 */
export const SCORING = {
  appearance: 1,
  sixtyMinutes: 1,
  goal: { GK: 6, DEF: 6, MID: 5, FWD: 4 } as Record<Position, number>,
  assist: 3,
  cleanSheet: { GK: 4, DEF: 4, MID: 1, FWD: 0 } as Record<Position, number>,
  /** 1 ponto por cada 3 recuperações */
  recoveriesPer: 3,
  /** GR: 1 ponto por cada 3 defesas */
  savesPer: 3,
  playerOfTheMatch: 3,
  yellow: -1,
  red: -3,
  /** GR/DEF: -1 por cada 2 golos sofridos */
  concededPer: 2,
  concededPenalty: { GK: -1, DEF: -1, MID: 0, FWD: 0 } as Record<Position, number>,
};
