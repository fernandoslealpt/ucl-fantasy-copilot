/**
 * Jornada em curso: quem já tem o jogo começado fica bloqueado (na UEFA já não se mexe nele) e conta pelos pontos
 * reais. Serve para sugerir, a meio da jornada, a troca de capitão e as substituições que ainda são possíveis.
 */
import type { Row } from '../types';

/** Margem (pontos) que a troca de capitão tem de ganhar, em média, para ser sugerida (perfil conservador). */
export const SWITCH_MARGIN = 2;
/** Passadas 3 h do início do jogo sem pontos no registo, assume-se que não jogou. */
const SETTLE_MS = 3 * 3600_000;

export const kickoffOf = (r: Row, gd: number): string | null => r.xp?.fixtures.find((f) => f.gameday === gd)?.kickoff ?? null;

export function isLocked(r: Row, gd: number, now: number): boolean {
  const k = kickoffOf(r, gd);
  return !!k && Date.parse(k) <= now;
}

export function realPoints(r: Row, gd: number): number | null {
  const l = r.history.find((h) => h.gameday === gd);
  return l ? l.points : null;
}

/** xP "vivo": jogo já começado → pontos reais (ou 0 se já passou tempo sem registo); caso contrário o xP do modelo. */
export function liveXp(r: Row, gd: number, now: number, model: (r: Row) => number): number {
  if (!isLocked(r, gd, now)) return model(r);
  const p = realPoints(r, gd);
  if (p != null) return p;
  return now - Date.parse(kickoffOf(r, gd)!) > SETTLE_MS ? 0 : model(r);
}

export interface CaptainSwitch {
  from: Row;
  fromPts: number;
  to: Row;
  toXp: number;
  /** ganho esperado (pontos a dobrar do novo capitão menos os do atual) */
  gain: number;
  kickoff: string | null;
}

/**
 * Se o capitão já jogou e fez poucos pontos, e há alguém do onze por jogar com xP bem acima, sugere passar a braçadeira.
 * O xP do candidato é penalizado pela dúvida de titularidade (como no conselho de capitão).
 */
export function captainSwitch(xi: Row[], captainId: string | null | undefined, gd: number, now: number, model: (r: Row) => number): CaptainSwitch | null {
  const cap = xi.find((r) => r.id === captainId);
  if (!cap || !isLocked(cap, gd, now)) return null;
  const fromPts = realPoints(cap, gd);
  if (fromPts == null) return null;
  const score = (r: Row) => model(r) * (0.75 + 0.25 * (r.xp?.fixtures.find((f) => f.gameday === gd)?.pStart ?? 0));
  const cands = xi
    .filter((r) => r.id !== cap.id && !isLocked(r, gd, now) && model(r) > 0)
    .sort((a, b) => score(b) - score(a));
  const best = cands[0];
  if (!best) return null;
  const gain = score(best) - fromPts;
  if (gain < SWITCH_MARGIN) return null;
  return { from: cap, fromPts, to: best, toXp: model(best), gain, kickoff: kickoffOf(best, gd) };
}
