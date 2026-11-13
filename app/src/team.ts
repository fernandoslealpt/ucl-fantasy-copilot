import type { Position, Row } from './types';

export interface MyTeam {
  version: 1;
  updatedAt: string;
  /** IDs dos 15 jogadores */
  players: string[];
  /** Dinheiro disponível (€M) */
  bank: number;
  /** Transferências grátis disponíveis em `ftGameday` */
  freeTransfers?: number;
  ftGameday?: number;
  /** jogadores a não vender nas sugestões */
  keep?: string[];
  /** jornada em que cada chip foi usado (null/ausente = ainda disponível) */
  chips?: { wildcard?: number | null; limitless?: number | null };
  /** decisões confirmadas pelo Fernando para a jornada `gameday` */
  decisions?: Decisions;
}

export interface Decisions {
  gameday: number;
  /** transferências decididas (feitas ou "não vou trocar") */
  transfers?: boolean;
  /** capitão e vice escolhidos */
  captain?: string;
  vice?: string;
}

/** Decisões da jornada `gameday` (vazias se as guardadas são de outra jornada). */
export function decisionsFor(team: MyTeam | null, gameday: number | null): Decisions | null {
  if (!team?.decisions || gameday == null || team.decisions.gameday !== gameday) return null;
  return team.decisions;
}

/** O que ainda falta decidir antes do fecho. */
export function pendingDecisions(team: MyTeam | null, gameday: number | null): ('team' | 'transfers' | 'captain')[] {
  if (!team || team.players.length !== 15) return ['team'];
  const d = decisionsFor(team, gameday);
  const out: ('transfers' | 'captain')[] = [];
  if (!d?.transfers) out.push('transfers');
  if (!d?.captain) out.push('captain');
  return out;
}

export function withDecisions(team: MyTeam, gameday: number, patch: Partial<Omit<Decisions, 'gameday'>>): MyTeam {
  const cur = decisionsFor(team, gameday) ?? { gameday };
  return { ...team, decisions: { ...cur, ...patch, gameday }, updatedAt: new Date().toISOString() };
}

export const SQUAD: Record<Position, number> = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
export const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

/** Máximo de jogadores por clube conforme a fase (regras 2026/27). */
export function clubLimit(gameday: number | null): number {
  const g = gameday ?? 1;
  if (g <= 8) return 3;
  if (g <= 12) return 4;
  if (g <= 14) return 5;
  if (g <= 16) return 6;
  return 8;
}

export interface Validation {
  counts: Record<Position, number>;
  complete: boolean;
  overClub: string[];
  valid: boolean;
}

export function validate(ids: string[], byId: Map<string, Row>, gameday: number | null): Validation {
  const counts: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  const perClub = new Map<string, { name: string; n: number }>();
  for (const id of ids) {
    const p = byId.get(id);
    if (!p) continue;
    counts[p.position]++;
    const c = perClub.get(p.teamId) ?? { name: p.teamName, n: 0 };
    perClub.set(p.teamId, { ...c, n: c.n + 1 });
  }
  const max = clubLimit(gameday);
  const overClub = [...perClub.values()].filter((c) => c.n > max).map((c) => c.name);
  const complete = POSITIONS.every((p) => counts[p] === SQUAD[p]);
  return { counts, complete, overClub, valid: complete && overClub.length === 0 };
}

const defaultScore = (r: Row) => r.xp?.xp1 ?? 0;

/** Onze com mais xP com formação válida (1 GR, 3–5 DEF, 2–5 MED, 1–3 AV) e banco ordenado por xP. */
export function bestXI(squad: Row[], score: (r: Row) => number = defaultScore): { xi: Row[]; bench: Row[] } {
  const xp1 = score;
  const by = (pos: Position) => squad.filter((r) => r.position === pos).sort((a, b) => xp1(b) - xp1(a));
  const gk = by('GK');
  const outfield = { DEF: by('DEF'), MID: by('MID'), FWD: by('FWD') };
  const min = { DEF: 3, MID: 2, FWD: 1 };
  const max = { DEF: 5, MID: 5, FWD: 3 };
  const xi: Row[] = gk.slice(0, 1);
  const taken = { DEF: 0, MID: 0, FWD: 0 };
  for (const pos of ['DEF', 'MID', 'FWD'] as const) {
    xi.push(...outfield[pos].slice(0, min[pos]));
    taken[pos] = Math.min(min[pos], outfield[pos].length);
  }
  const rest = (['DEF', 'MID', 'FWD'] as const)
    .flatMap((pos) => outfield[pos].slice(min[pos]).map((r) => ({ r, pos })))
    .sort((a, b) => xp1(b.r) - xp1(a.r));
  for (const { r, pos } of rest) {
    if (xi.length >= 11) break;
    if (taken[pos] >= max[pos]) continue;
    xi.push(r);
    taken[pos]++;
  }
  const inXi = new Set(xi.map((r) => r.id));
  const bench = [...gk.slice(1), ...squad.filter((r) => r.position !== 'GK' && !inXi.has(r.id)).sort((a, b) => xp1(b) - xp1(a))];
  return { xi, bench };
}

/**
 * Transferências grátis para a jornada `gameday`. Fase de liga: 2 por jornada e passa no máximo 1 para a seguinte.
 * Sem informação, assume 2.
 */
export function freeTransfersFor(team: MyTeam, gameday: number): number {
  if (team.freeTransfers == null || team.ftGameday == null) return 2;
  if (gameday <= team.ftGameday) return team.freeTransfers;
  return Math.min(1, team.freeTransfers) + 2;
}

const KEY = 'ucl.team';

export function loadLocalTeam(): MyTeam | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MyTeam) : null;
  } catch {
    return null;
  }
}

export function saveLocalTeam(team: MyTeam): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(team));
  } catch {
    /* sem armazenamento: a equipa fica só em memória */
  }
}
