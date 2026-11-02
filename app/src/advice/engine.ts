/**
 * Motor de recomendações (Fase 4), tudo no browser, sem IA.
 *
 * Valor de uma equipa numa jornada = xP do melhor onze (formação válida) + capitão (o maior xP do onze conta 2×)
 * + 10% do xP do banco (substituições automáticas). Horizonte: 3 jornadas com desconto (1 / 0,85 / 0,7).
 * Transferências: todas as trocas de 1 jogador; 2 trocas sobre os melhores candidatos; 3 trocas por pesquisa em feixe.
 * Respeita orçamento (preço de venda = preço atual), 2/5/5/3, máximo por clube.
 */
import { clubLimit } from '../team';
import type { Dataset, FixtureSignal, Position, Row } from '../types';

export const WEIGHTS = [1, 0.85, 0.7];
/** Pontos perdidos por cada transferência a mais do que as grátis. */
export const HIT = 4;
/** Perfil conservador: uma transferência paga só se ganhar 4 + 2 pontos esperados. */
export const HIT_MARGIN = 2;
/** Gastar a última grátis (que podia passar para a jornada seguinte) só se ganhar pelo menos 1 ponto. */
export const KEEP_VALUE = 1;
/** Abaixo disto não vale a pena mexer. */
export const MIN_GAIN = 0.5;
const BENCH_WEIGHT = 0.1;

export interface Ctx {
  gameday: number;
  /** jornadas do horizonte (só as que têm jogos) */
  gds: number[];
  weights: number[];
  xpCache: Map<string, number[]>;
}

export function makeCtx(rows: Row[], gameday: number): Ctx {
  const withGames = new Set<number>();
  for (const r of rows) for (const f of r.xp?.fixtures ?? []) withGames.add(f.gameday);
  const gds = [...withGames]
    .filter((g) => g >= gameday)
    .sort((a, b) => a - b)
    .slice(0, WEIGHTS.length);
  return { gameday, gds, weights: WEIGHTS.slice(0, gds.length), xpCache: new Map() };
}

/** xP do jogador em cada jornada do horizonte. */
export function playerXp(ctx: Ctx, r: Row): number[] {
  let v = ctx.xpCache.get(r.id);
  if (!v) {
    v = ctx.gds.map((g) => (r.xp?.fixtures ?? []).filter((f) => f.gameday === g).reduce((s, f) => s + f.xp, 0));
    ctx.xpCache.set(r.id, v);
  }
  return v;
}

export const horizonXp = (ctx: Ctx, r: Row) => playerXp(ctx, r).reduce((s, x, k) => s + x * ctx.weights[k]!, 0);

const MIN = { DEF: 3, MID: 2, FWD: 1 } as const;
const MAX = { DEF: 5, MID: 5, FWD: 3 } as const;

/** Valor de uma jornada (k = índice no horizonte). */
function gamedayValue(ctx: Ctx, squad: Row[], k: number): number {
  const gk: number[] = [];
  const out: Record<'DEF' | 'MID' | 'FWD', number[]> = { DEF: [], MID: [], FWD: [] };
  for (const r of squad) {
    const x = playerXp(ctx, r)[k]!;
    if (r.position === 'GK') gk.push(x);
    else out[r.position].push(x);
  }
  gk.sort((a, b) => b - a);
  let xi = gk[0] ?? 0;
  let best = xi;
  let bench = 0;
  const rest: { x: number; pos: 'DEF' | 'MID' | 'FWD' }[] = [];
  const taken = { DEF: 0, MID: 0, FWD: 0 };
  for (const pos of ['DEF', 'MID', 'FWD'] as const) {
    const xs = out[pos].sort((a, b) => b - a);
    xs.forEach((x, i) => {
      if (i < MIN[pos]) {
        xi += x;
        best = Math.max(best, x);
        taken[pos]++;
      } else rest.push({ x, pos });
    });
  }
  rest.sort((a, b) => b.x - a.x);
  let n = 1 + taken.DEF + taken.MID + taken.FWD;
  for (const { x, pos } of rest) {
    if (n < 11 && taken[pos] < MAX[pos]) {
      xi += x;
      best = Math.max(best, x);
      taken[pos]++;
      n++;
    } else bench += x;
  }
  return xi + best + BENCH_WEIGHT * bench;
}

export function squadValue(ctx: Ctx, squad: Row[]): { total: number; perGd: number[] } {
  const perGd = ctx.gds.map((_, k) => gamedayValue(ctx, squad, k));
  return { total: perGd.reduce((s, v, k) => s + v * ctx.weights[k]!, 0), perGd };
}

export interface Swap {
  out: Row;
  in: Row;
}

export interface Plan {
  swaps: Swap[];
  /** ganho de xP no horizonte (ponderado) */
  delta: number;
  /** ganho por jornada do horizonte */
  deltaGd: number[];
  hits: number;
  /** ganho esperado real: delta − 4 × penalizações */
  net: number;
  /** critério conservador para recomendar */
  score: number;
  bankAfter: number;
}

export interface TransferAdvice {
  ctx: Ctx;
  base: { total: number; perGd: number[] };
  free: number;
  bank: number;
  /** melhores opções com 1, 2 e 3 trocas */
  byCount: Record<1 | 2 | 3, Plan[]>;
  recommended: Plan | null;
  /** melhor opção sem penalização (para explicar quando não se recomenda mexer) */
  bestFree: Plan | null;
}

const round1 = (x: number) => Math.round(x * 10) / 10;

/** Candidatos a entrar, por posição: os melhores no horizonte + os que dão mais pontos por €M. */
function pools(ctx: Ctx, rows: Row[], squad: Set<string>, top: number, value: number): Record<Position, Row[]> {
  const res = { GK: [], DEF: [], MID: [], FWD: [] } as Record<Position, Row[]>;
  for (const pos of ['GK', 'DEF', 'MID', 'FWD'] as Position[]) {
    const c = rows
      .filter(
        (r) =>
          r.position === pos && !squad.has(r.id) && r.status.active && r.availability !== 'out' && r.availability !== 'inactive' && r.xp,
      )
      .map((r) => ({ r, h: horizonXp(ctx, r) }))
      .filter((x) => x.h > 0);
    const byH = [...c].sort((a, b) => b.h - a.h).slice(0, top);
    const byV = [...c].sort((a, b) => b.h / Math.max(3.5, b.r.price) - a.h / Math.max(3.5, a.r.price)).slice(0, value);
    res[pos] = [...new Map([...byH, ...byV].map((x) => [x.r.id, x.r])).values()];
  }
  return res;
}

export function adviseTransfers(
  rows: Row[],
  squadRows: Row[],
  bank: number,
  free: number,
  gameday: number,
  /** jogadores que o Fernando não quer vender */
  keep: ReadonlySet<string> = new Set(),
): TransferAdvice {
  const ctx = makeCtx(rows, gameday);
  const base = squadValue(ctx, squadRows);
  const limit = clubLimit(gameday);
  const inSquad = new Set(squadRows.map((r) => r.id));
  const poolBig = pools(ctx, rows, inSquad, 30, 12);
  const poolSmall = pools(ctx, rows, inSquad, 16, 6);

  const clubCount = new Map<string, number>();
  for (const r of squadRows) clubCount.set(r.teamId, (clubCount.get(r.teamId) ?? 0) + 1);

  const legal = (swaps: Swap[]): number | null => {
    let money = bank;
    const counts = new Map(clubCount);
    const ins = new Set<string>();
    for (const s of swaps) {
      if (s.out.position !== s.in.position || ins.has(s.in.id) || inSquad.has(s.in.id)) return null;
      ins.add(s.in.id);
      money += s.out.price - s.in.price;
      counts.set(s.out.teamId, (counts.get(s.out.teamId) ?? 0) - 1);
      counts.set(s.in.teamId, (counts.get(s.in.teamId) ?? 0) + 1);
    }
    if (money < -1e-6) return null;
    for (const s of swaps) if ((counts.get(s.in.teamId) ?? 0) > limit) return null;
    return round1(money);
  };

  const evaluate = (swaps: Swap[]): Plan | null => {
    const bankAfter = legal(swaps);
    if (bankAfter == null) return null;
    const outs = new Set(swaps.map((s) => s.out.id));
    const squad = [...squadRows.filter((r) => !outs.has(r.id)), ...swaps.map((s) => s.in)];
    const v = squadValue(ctx, squad);
    const n = swaps.length;
    const hits = Math.max(0, n - free);
    const delta = v.total - base.total;
    const deltaGd = v.perGd.map((x, k) => x - base.perGd[k]!);
    // gastar a última grátis perde a que passaria para a jornada seguinte
    const keepCost = free >= 1 && n >= free ? KEEP_VALUE : 0;
    // o ganho das jornadas seguintes conta metade: essas trocas também se podem fazer na próxima jornada,
    // com as grátis dessa jornada (e sem −4)
    const now = (deltaGd[0] ?? 0) * (ctx.weights[0] ?? 1);
    const future = delta - now;
    return {
      swaps,
      delta,
      deltaGd,
      hits,
      net: delta - HIT * hits,
      score: now + 0.5 * future - (HIT + HIT_MARGIN) * hits - keepCost,
      bankAfter,
    };
  };

  // 1 troca: todas as combinações
  const singles: Plan[] = [];
  const sellable = squadRows.filter((r) => !keep.has(r.id));
  for (const out of sellable)
    for (const inn of poolBig[out.position]) {
      const p = evaluate([{ out, in: inn }]);
      if (p) singles.push(p);
    }
  singles.sort((a, b) => b.delta - a.delta);

  // 2 trocas: pares de saídas × melhores candidatos
  const doubles: Plan[] = [];
  for (let i = 0; i < sellable.length; i++)
    for (let j = i + 1; j < sellable.length; j++) {
      const o1 = sellable[i]!;
      const o2 = sellable[j]!;
      for (const a of poolSmall[o1.position])
        for (const b of poolSmall[o2.position]) {
          if (a.id === b.id) continue;
          const p = evaluate([
            { out: o1, in: a },
            { out: o2, in: b },
          ]);
          if (p) doubles.push(p);
        }
    }
  doubles.sort((a, b) => b.delta - a.delta);

  // 3 trocas: acrescenta uma troca às 40 melhores de 2
  const triples: Plan[] = [];
  const seen = new Set<string>();
  for (const d of doubles.slice(0, 40)) {
    const outs = new Set(d.swaps.map((s) => s.out.id));
    for (const o of sellable) {
      if (outs.has(o.id)) continue;
      for (const c of poolSmall[o.position]) {
        const swaps = [...d.swaps, { out: o, in: c }];
        const key = swaps
          .map((s) => `${s.out.id}>${s.in.id}`)
          .sort()
          .join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        const p = evaluate(swaps);
        if (p) triples.push(p);
      }
    }
  }
  triples.sort((a, b) => b.delta - a.delta);

  const distinct = (plans: Plan[], n: number) => {
    const out: Plan[] = [];
    const keys = new Set<string>();
    for (const p of plans) {
      const k = p.swaps
        .map((s) => `${s.out.id}>${s.in.id}`)
        .sort()
        .join('|');
      if (keys.has(k)) continue;
      keys.add(k);
      out.push(p);
      if (out.length >= n) break;
    }
    return out;
  };
  const byScore = (xs: Plan[]) => [...xs].sort((a, b) => b.score - a.score);
  const byCount = { 1: distinct(byScore(singles), 5), 2: distinct(byScore(doubles), 5), 3: distinct(byScore(triples), 5) };
  const all = [...byCount[1], ...byCount[2], ...byCount[3]];
  // só se recomenda o que não perde pontos já nesta jornada
  const eligible = all.filter((p) => (p.deltaGd[0] ?? 0) > 0);
  const top = eligible.reduce<Plan | null>((acc, p) => (!acc || p.score > acc.score ? p : acc), null);
  const recommended = top && top.score > 0 && top.delta >= MIN_GAIN ? top : null;
  const bestFree = all.filter((p) => p.hits === 0).sort((a, b) => b.delta - a.delta)[0] ?? null;
  return { ctx, base, free, bank, byCount, recommended, bestFree };
}

// ———————————————————————————— Razões (com números) ————————————————————————————

export type Reason =
  | { code: 'OUT_STATUS'; v: { name: string; status: 'out' | 'doubtful'; p: number } }
  | { code: 'START'; v: { inName: string; inP: number; outName: string; outP: number; inSig?: FixtureSignal; outSig?: FixtureSignal } }
  | { code: 'FIXTURES'; v: { inName: string; inAvg: number; outName: string; outAvg: number; n: number } }
  | { code: 'ATTACK'; v: { inName: string; inRate: number; outName: string; outRate: number } }
  | { code: 'CLEAN_SHEET'; v: { inName: string; inP: number; outName: string; outP: number } }
  | { code: 'FORM'; v: { inName: string; inAvg: number; outName: string; outAvg: number } }
  | { code: 'XP_NOW'; v: { gd: number; inName: string; inXp: number; outName: string; outXp: number } }
  | { code: 'BUDGET'; v: { diff: number } };

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

/** Até 3 razões por troca, ordenadas pelo peso no ganho. */
export function swapReasons(ctx: Ctx, data: Pick<Dataset, 'ratingById'>, s: Swap, max = 3): Reason[] {
  const cands: { r: Reason; w: number }[] = [];
  const g0 = ctx.gds[0]!;
  const fx = (r: Row) => (r.xp?.fixtures ?? []).filter((f) => ctx.gds.includes(f.gameday));
  const pStart = (r: Row) => fx(r).find((f) => f.gameday === g0)?.pStart ?? 0;
  const inName = s.in.name;
  const outName = s.out.name;

  if (s.out.availability === 'out' || s.out.availability === 'doubtful')
    cands.push({
      r: { code: 'OUT_STATUS', v: { name: outName, status: s.out.availability, p: pStart(s.out) } },
      w: s.out.availability === 'out' ? 10 : 6,
    });

  const pi = pStart(s.in);
  const po = pStart(s.out);
  const sigOf = (r: Row) => fx(r).find((f) => f.gameday === g0)?.signal;
  const inSig = sigOf(s.in);
  const outSig = sigOf(s.out);
  const lineupGap = inSig?.lineup === 'start' && outSig?.lineup === 'bench';
  if (pi - po >= 0.15 || lineupGap)
    cands.push({ r: { code: 'START', v: { inName, inP: pi, outName, outP: po, inSig, outSig } }, w: 8 * (pi - po) + (lineupGap ? 3 : 0) });

  const diff = (r: Row) =>
    avg(
      ctx.gds
        .map((g) => data.ratingById.get(r.teamId)?.fixtures.find((f) => f.gameday === g)?.difficulty)
        .filter((d): d is number => d != null),
    );
  const di = diff(s.in);
  const dout = diff(s.out);
  if (di && dout && dout - di >= 0.4)
    cands.push({ r: { code: 'FIXTURES', v: { inName, inAvg: di, outName, outAvg: dout, n: ctx.gds.length } }, w: 1.5 * (dout - di) });

  if (s.in.position === 'MID' || s.in.position === 'FWD') {
    const rate = (r: Row) => (r.xp?.rates.goals90 ?? 0) + (r.xp?.rates.assists90 ?? 0);
    const ri = rate(s.in);
    const ro = rate(s.out);
    if (ri - ro >= 0.15) cands.push({ r: { code: 'ATTACK', v: { inName, inRate: ri, outName, outRate: ro } }, w: 3 * (ri - ro) });
  } else {
    const cs = (r: Row) => avg(fx(r).map((f) => f.pCleanSheet));
    const ci = cs(s.in);
    const co = cs(s.out);
    if (ci - co >= 0.07) cands.push({ r: { code: 'CLEAN_SHEET', v: { inName, inP: ci, outName, outP: co } }, w: 10 * (ci - co) });
  }

  const fi = s.in.form.avgPoints;
  const fo = s.out.form.avgPoints;
  if (fi - fo >= 1.5) cands.push({ r: { code: 'FORM', v: { inName, inAvg: fi, outName, outAvg: fo } }, w: 0.4 * (fi - fo) });

  // sempre disponíveis (garantem 3 razões com números)
  const xi = playerXp(ctx, s.in)[0] ?? 0;
  const xo = playerXp(ctx, s.out)[0] ?? 0;
  cands.push({ r: { code: 'XP_NOW', v: { gd: g0, inName, inXp: xi, outName, outXp: xo } }, w: 0.5 + 0.3 * Math.abs(xi - xo) });
  cands.push({ r: { code: 'BUDGET', v: { diff: round1(s.out.price - s.in.price) } }, w: 0.4 + 0.2 * Math.abs(s.out.price - s.in.price) });

  return cands
    .sort((a, b) => b.w - a.w)
    .slice(0, max)
    .map((c) => c.r);
}

/** Confiança da troca: baixa se o jogador que entra tem dúvidas de titularidade ou o ganho é pequeno. */
export function planConfidence(ctx: Ctx, p: Plan): 'alta' | 'média' | 'baixa' {
  const g0 = ctx.gds[0]!;
  const minStart = Math.min(...p.swaps.map((s) => s.in.xp?.fixtures.find((f) => f.gameday === g0)?.pStart ?? 0));
  const perSwap = p.delta / p.swaps.length;
  if (minStart >= 0.8 && perSwap >= 2) return 'alta';
  if (minStart >= 0.6 && perSwap >= 1) return 'média';
  return 'baixa';
}

// ———————————————————————————— Capitão ————————————————————————————

export interface CaptainPick {
  row: Row;
  xp: number;
  pStart: number;
  kickoff: string | null;
  /** dia do jogo (AAAA-MM-DD, hora de Lisboa) */
  day: string | null;
}

export interface CaptainAdvice {
  gameday: number;
  ranking: CaptainPick[];
  captain: CaptainPick | null;
  vice: CaptainPick | null;
  /** plano de troca a meio da jornada */
  plan: { start: CaptainPick; switchTo: CaptainPick; below: number } | null;
}

const dayOf = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Europe/Lisbon' }) : null);

/**
 * Capitão: maior xP no onze, penalizando dúvida de titularidade (perfil conservador).
 * Plano: começar com um capitão que joga primeiro e passar a braçadeira a quem joga depois
 * se o primeiro fizer menos pontos do que o xP do segundo.
 */
export function adviseCaptain(xi: Row[], gameday: number): CaptainAdvice {
  const ranking: CaptainPick[] = xi
    .map((row) => {
      const f = row.xp?.fixtures.filter((x) => x.gameday === gameday) ?? [];
      const xp = f.reduce((s, x) => s + x.xp, 0);
      const kickoff = f[0]?.kickoff ?? null;
      return { row, xp, pStart: f[0]?.pStart ?? 0, kickoff, day: dayOf(kickoff) };
    })
    .filter((c) => c.xp > 0)
    .sort((a, b) => capScore(b) - capScore(a));
  const best = ranking[0] ?? null;
  let captain = best;
  let vice = ranking[1] ?? null;
  let plan: CaptainAdvice['plan'] = null;
  if (best?.day) {
    const days = [...new Set(ranking.map((c) => c.day).filter(Boolean))].sort();
    const later = ranking.filter((c) => c.day && c.day > best.day!);
    const earlier = ranking.filter((c) => c.day && c.day < best.day! && capScore(c) >= 0.85 * capScore(best));
    if (best.day === days[0] && later[0]) plan = { start: best, switchTo: later[0], below: Math.ceil(later[0].xp) };
    else if (earlier[0]) {
      // o melhor joga depois: capitão = quem joga antes (quase tão bom); o melhor fica de reserva para a troca
      plan = { start: earlier[0], switchTo: best, below: Math.ceil(best.xp) };
      captain = earlier[0];
      vice = best;
    }
  }
  return { gameday, ranking, captain, vice, plan };
}

function capScore(c: Pick<CaptainPick, 'xp' | 'pStart'>): number {
  return c.xp * (0.75 + 0.25 * c.pStart);
}
