/**
 * Plano de várias jornadas (fase de liga: J1–J8).
 * Valor = pontos esperados (xP) SEM cortes: cada jornada conta pelo que se espera, com a informação de hoje.
 * Cada passo (jornada) parte do plantel e do banco do passo anterior; as grátis acumulam (2 por jornada,
 * passa no máximo 1). "Ganho" = equipa com o plano contra a equipa de hoje sem trocas, na MESMA jornada.
 * "Líquido" = soma dos ganhos − 4 por cada troca paga. A margem conservadora (+2 por troca paga) só entra
 * na pontuação que ordena os planos, como preferência do perfil e não como correção do modelo.
 */
import type { Row } from '../types';
import { adviseTransfers, HIT, HIT_MARGIN, makeCtx, makeEvaluator, squadValue, type Swap } from './engine';

/** Última jornada em que o plano vale: antes da J9 as transferências são ilimitadas e há novas regras. */
export const LAST_PLAN_GD = 8;

export interface PlanStepIds {
  gameday: number;
  swaps: { out: string; in: string }[];
}

export interface PathRow {
  gameday: number;
  /** grátis disponíveis neste passo */
  free: number;
  swaps: Swap[];
  hits: number;
  /** xP do melhor onze + capitão com o plantel DEPOIS deste passo */
  value: number;
  /** xP da equipa de hoje sem trocas */
  base: number;
  gain: number;
  bankBefore: number;
  bankAfter: number;
  /** plantel antes deste passo (para editar o passo) */
  squadBefore: Row[];
  legal: boolean;
}

export interface PathResult {
  rows: PathRow[];
  hits: number;
  /** soma dos ganhos − 4 × transferências pagas (sem margem) */
  net: number;
  /** net − margem conservadora × pagas: ordena planos */
  score: number;
  legal: boolean;
}

export const freeAfter = (free: number, used: number) => (used <= free ? Math.min(1, free - used) + 2 : 2);

/** Jornadas do plano: as jornadas com jogos a partir de `gameday`, no máximo 3 e até à J8. */
export function planGamedays(rows: Row[], gameday: number): number[] {
  return makeCtx(rows, gameday).gds.filter((g) => g <= LAST_PLAN_GD);
}

export function evaluatePath(rows: Row[], squad: Row[], bank: number, free: number, gameday: number, steps: { gameday: number; swaps: Swap[] }[]): PathResult {
  const ctx = makeCtx(rows, gameday);
  const gds = ctx.gds.filter((g) => g <= LAST_PLAN_GD);
  const baseVals = squadValue(ctx, squad).perGd;
  let cur = squad;
  let money = bank;
  let fr = free;
  const out: PathRow[] = [];
  let legalAll = true;
  let hitsTotal = 0;
  let net = 0;
  gds.forEach((g, k) => {
    const sw = steps.find((s) => s.gameday === g)?.swaps ?? [];
    const before = cur;
    const bankBefore = money;
    let legal = true;
    let hits = 0;
    if (sw.length) {
      const ev = makeEvaluator(ctx, cur, money, fr, g);
      const bankAfter = ev.legal(sw);
      if (bankAfter == null) legal = false;
      else {
        const outs = new Set(sw.map((s) => s.out.id));
        cur = [...cur.filter((r) => !outs.has(r.id)), ...sw.map((s) => s.in)];
        money = bankAfter;
        hits = Math.max(0, sw.length - fr);
      }
    }
    if (!legal) legalAll = false;
    const value = squadValue(ctx, cur).perGd[k]!;
    const gain = value - baseVals[k]!;
    out.push({ gameday: g, free: fr, swaps: sw, hits, value, base: baseVals[k]!, gain, bankBefore, bankAfter: money, squadBefore: before, legal });
    hitsTotal += hits;
    net += gain;
    fr = freeAfter(fr, sw.length);
  });
  net -= HIT * hitsTotal;
  return { rows: out, hits: hitsTotal, net, score: net - HIT_MARGIN * hitsTotal, legal: legalAll };
}

export interface SuggestProgress {
  step: number;
  of: number;
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/**
 * Procura a melhor sequência de trocas: em cada jornada gera candidatas (0–3 trocas, as melhores do motor de
 * transferências) e mantém as 4 melhores sequências pelo valor total do horizonte. ~5 s.
 */
export async function suggestPath(
  rows: Row[],
  squad: Row[],
  bank: number,
  free: number,
  gameday: number,
  keep: ReadonlySet<string> = new Set(),
  onProgress?: (p: SuggestProgress) => void,
): Promise<PathResult> {
  const ctx = makeCtx(rows, gameday);
  const gds = ctx.gds.filter((g) => g <= LAST_PLAN_GD);
  type Node = { steps: { gameday: number; swaps: Swap[] }[]; res: PathResult };
  let beam: Node[] = [{ steps: [], res: evaluatePath(rows, squad, bank, free, gameday, []) }];
  for (let k = 0; k < gds.length; k++) {
    onProgress?.({ step: k + 1, of: gds.length });
    await tick();
    const next: Node[] = [];
    for (const node of beam) {
      const r = node.res.rows[k]!;
      const adv = adviseTransfers(rows, r.squadBefore, r.bankBefore, r.free, gds[k]!, keep);
      const cands: Swap[][] = [[]];
      for (const n of [1, 2, 3] as const) {
        const p = adv.byCount[n][0];
        if (p) cands.push(p.swaps);
      }
      for (const sw of cands) {
        const steps = [...node.steps, { gameday: gds[k]!, swaps: sw }];
        const res = evaluatePath(rows, squad, bank, free, gameday, steps);
        if (res.legal) next.push({ steps, res });
      }
      await tick();
    }
    next.sort((a, b) => b.res.score - a.res.score);
    beam = next.slice(0, 4);
  }
  return beam[0]?.res ?? evaluatePath(rows, squad, bank, free, gameday, []);
}
