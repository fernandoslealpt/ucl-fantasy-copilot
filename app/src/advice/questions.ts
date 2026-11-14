/**
 * Respostas às perguntas mais frequentes, calculadas pela app (sem IA):
 * 1. Porque não este jogador?  2. E se eu guardar a transferência?  3. (squad.ts) E se o X não jogar?
 * 4. Capitão diferencial.  5. O que mudou desde a última visita?
 */
import { clubLimit } from '../team';
import type { Row } from '../types';
import { adviseTransfers, makeCtx, makeEvaluator, playerXp, type Plan, type TransferAdvice } from './engine';

// ———————————————— 1. Porque não este jogador? ————————————————

export type WhyNotReason =
  | { code: 'IN_SQUAD' }
  | { code: 'UNAVAILABLE'; status: string }
  | { code: 'NO_GAMES' }
  | { code: 'BUDGET'; need: number }
  | { code: 'CLUB_LIMIT'; club: string; max: number }
  | { code: 'LOW_START'; p: number }
  | { code: 'SPIKY'; share: number }
  | { code: 'LOW_GAIN' }
  | { code: 'RECOMMENDED' };

export interface WhyNot {
  /** melhor troca com este jogador (vender quem) ou null se não há troca legal */
  best: Plan | null;
  /** ganho da melhor troca recomendada com 1 jogador (referência) */
  reference: number;
  /** pontos esperados (ponderados, 3 jornadas) que lhe faltam para igualar a referência */
  shortfall: number;
  reasons: WhyNotReason[];
}

export function whyNot(advice: TransferAdvice, rows: Row[], squadRows: Row[], bank: number, free: number, gameday: number, r: Row): WhyNot {
  const reasons: WhyNotReason[] = [];
  const recIds = new Set((advice.recommended?.swaps ?? []).map((s) => s.in.id));
  if (squadRows.some((x) => x.id === r.id)) return { best: null, reference: 0, shortfall: 0, reasons: [{ code: 'IN_SQUAD' }] };
  if (recIds.has(r.id)) reasons.push({ code: 'RECOMMENDED' });
  if (!r.status.active || r.availability === 'out' || r.availability === 'inactive') reasons.push({ code: 'UNAVAILABLE', status: r.availability });
  const ctx = advice.ctx;
  const xs = playerXp(ctx, r);
  if (xs.every((x) => x === 0)) reasons.push({ code: 'NO_GAMES' });

  const { evaluate } = makeEvaluator(ctx, squadRows, bank, free, gameday, advice.base);
  let best: Plan | null = null;
  let cheapest = Infinity;
  let clubBlocked = false;
  const sameClub = squadRows.filter((x) => x.teamId === r.teamId).length;
  for (const out of squadRows.filter((x) => x.position === r.position)) {
    const p = evaluate([{ out, in: r }]);
    if (p) {
      if (!best || p.delta > best.delta) best = p;
    } else {
      const need = r.price - out.price - bank;
      if (need > 1e-6) cheapest = Math.min(cheapest, need);
      else if (sameClub >= clubLimit(gameday) && out.teamId !== r.teamId) clubBlocked = true;
    }
  }
  if (!best && cheapest < Infinity && !clubBlocked) reasons.push({ code: 'BUDGET', need: Math.round(cheapest * 10) / 10 });
  if (!best && clubBlocked) reasons.push({ code: 'CLUB_LIMIT', club: r.teamName, max: clubLimit(gameday) });
  const p0 = r.xp?.fixtures.find((f) => f.gameday === ctx.gds[0])?.pStart ?? 0;
  if (p0 < 0.7 && !reasons.some((x) => x.code === 'UNAVAILABLE')) reasons.push({ code: 'LOW_START', p: p0 });
  if (r.xp?.sample?.spiky) reasons.push({ code: 'SPIKY', share: r.xp.sample.bestShare });

  const singles = advice.byCount[1];
  const reference = singles[0]?.delta ?? 0;
  const shortfall = best ? Math.max(0, reference - best.delta) : 0;
  if (best && shortfall > 0.05 && !reasons.some((x) => x.code === 'RECOMMENDED')) reasons.push({ code: 'LOW_GAIN' });
  return { best, reference, shortfall, reasons };
}

// ———————————————— 2. E se eu guardar a transferência? ————————————————

export interface RollOption {
  /** trocas feitas agora (todas grátis) */
  now: number;
  planNow: Plan | null;
  /** grátis na jornada seguinte */
  nextFree: number;
  planNext: Plan | null;
  /** ganhos ponderados no horizonte de cada jornada */
  gainNow: number;
  gainNext: number;
  total: number;
  best: boolean;
}

export interface RollAnalysis {
  gameday: number;
  next: number;
  options: RollOption[];
}

/**
 * Compara usar agora todas as grátis com guardar 1 (ou 2) para a jornada seguinte (fase de liga: 2 por jornada,
 * passa no máximo 1). Para cada opção: melhor plano grátis agora e, com o plantel resultante, o melhor plano
 * grátis na jornada seguinte. Usa o xP de hoje para as duas jornadas.
 */
export function rollAnalysis(rows: Row[], squadRows: Row[], bank: number, free: number, gameday: number, keep: ReadonlySet<string> = new Set()): RollAnalysis | null {
  const ctx = makeCtx(rows, gameday);
  const next = ctx.gds[1];
  if (next == null) return null;
  const now = adviseTransfers(rows, squadRows, bank, free, gameday, keep);
  const options: RollOption[] = [];
  for (let n = 0; n <= free; n++) {
    // mesma escolha da recomendação (critério conservador), para não mostrar trocas diferentes
    const rec = now.recommended && now.recommended.swaps.length === n && now.recommended.hits === 0 ? now.recommended : null;
    const planNow = n === 0 ? null : rec ?? (now.byCount[n as 1 | 2] ?? []).filter((p) => p.hits === 0).sort((a, b) => b.score - a.score)[0] ?? null;
    if (n > 0 && !planNow) continue;
    const outs = new Set((planNow?.swaps ?? []).map((s) => s.out.id));
    const squadNext = [...squadRows.filter((r) => !outs.has(r.id)), ...(planNow?.swaps ?? []).map((s) => s.in)];
    const nextFree = Math.min(1, free - n) + 2;
    const adv = adviseTransfers(rows, squadNext, planNow?.bankAfter ?? bank, nextFree, next, keep);
    const planNext = [1, 2, 3]
      .filter((k) => k <= nextFree)
      .flatMap((k) => adv.byCount[k as 1 | 2 | 3])
      .filter((p) => p.hits === 0)
      .sort((a, b) => b.score - a.score)[0] ?? null;
    const gainNow = planNow?.delta ?? 0;
    const gainNext = Math.max(0, planNext?.delta ?? 0);
    options.push({ now: n, planNow, nextFree, planNext, gainNow, gainNext, total: gainNow + gainNext, best: false });
  }
  const best = options.reduce<RollOption | null>((b, o) => (!b || o.total > b.total + 1e-9 ? o : b), null);
  if (best) best.best = true;
  return { gameday, next, options };
}

// ———————————————— 4. Capitão diferencial ————————————————

export interface CaptainOption {
  row: Row;
  xp: number;
  /** % de equipas que o têm */
  owned: number;
  /** pontos que ganhas às equipas que não o têm, se o fizeres capitão (aprox.: xP × fração que não o tem) */
  edge: number;
  /** pontos esperados que deixas de ter face ao capitão mais seguro */
  cost: number;
}

/** Para as ligas privadas: quem pode ser capitão diferencial (poucos têm) e quanto custa face ao mais seguro. */
export function captainDifferentials(xi: Row[], gameday: number): CaptainOption[] {
  const xpAt = (r: Row) => (r.xp?.fixtures ?? []).filter((f) => f.gameday === gameday).reduce((a, f) => a + f.xp, 0);
  const opts = xi
    .map((row) => ({ row, xp: xpAt(row), owned: Math.min(100, Math.max(0, row.selectedPct)) }))
    .filter((o) => o.xp > 0);
  const top = Math.max(0, ...opts.map((o) => o.xp));
  return opts
    .map((o) => ({ ...o, edge: o.xp * (1 - o.owned / 100), cost: top - o.xp }))
    .sort((a, b) => b.edge - a.edge);
}

// ———————————————— 5. O que mudou desde a última visita? ————————————————

export interface Snapshot {
  generatedAt: string;
  gameday: number;
  recommended: string[];
  captain: string | null;
  xp: Record<string, number>;
}

export interface SnapshotDiff {
  since: string;
  recChanged: boolean;
  before: string[];
  after: string[];
  captainChanged: boolean;
  captainBefore: string | null;
  captainAfter: string | null;
  /** maiores mudanças de xP (jogadores do plantel e recomendados) */
  moves: { id: string; before: number; after: number }[];
}

export function diffSnapshots(prev: Snapshot | null, cur: Snapshot): SnapshotDiff | null {
  if (!prev || prev.generatedAt === cur.generatedAt || prev.gameday !== cur.gameday) return null;
  // só jogadores que existem nos dois retratos (quem entrou de novo não "mudou")
  const ids = new Set(Object.keys(cur.xp).filter((id) => id in prev.xp));
  const moves = [...ids]
    .map((id) => ({ id, before: prev.xp[id] ?? 0, after: cur.xp[id] ?? 0 }))
    .filter((m) => Math.abs(m.after - m.before) >= 0.5)
    .sort((a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before))
    .slice(0, 6);
  const key = (x: string[]) => [...x].sort().join('|');
  const recChanged = key(prev.recommended) !== key(cur.recommended);
  const captainChanged = prev.captain !== cur.captain;
  if (!recChanged && !captainChanged && moves.length === 0) return null;
  return {
    since: prev.generatedAt,
    recChanged,
    before: prev.recommended,
    after: cur.recommended,
    captainChanged,
    captainBefore: prev.captain,
    captainAfter: cur.captain,
    moves,
  };
}

const SNAP_KEY = 'ucl.snapshots';

/** Guarda o retrato atual e devolve o anterior (dados de outra atualização). */
export function rotateSnapshot(cur: Snapshot): Snapshot | null {
  try {
    const raw = localStorage.getItem(SNAP_KEY);
    const st = raw ? (JSON.parse(raw) as { prev: Snapshot | null; cur: Snapshot | null }) : { prev: null, cur: null };
    if (st.cur && st.cur.generatedAt !== cur.generatedAt) {
      st.prev = st.cur;
      st.cur = cur;
    } else st.cur = cur;
    localStorage.setItem(SNAP_KEY, JSON.stringify(st));
    return st.prev;
  } catch {
    return null;
  }
}
