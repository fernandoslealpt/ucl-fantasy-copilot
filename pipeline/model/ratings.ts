/**
 * Força das equipas — regressão de Poisson (tipo Dixon-Coles simplificado):
 *   log λ(golos de A contra B) = μ + casa·[A em casa] + (β·zA + atkA) − (γ·zB + defB)
 * z = coeficiente UEFA normalizado (prior de longo prazo); atk/def = desvio aprendido com os
 * resultados (encolhido para 0 com penalização L2 — poucas observações por equipa).
 * Ajuste por Newton coordenada a coordenada (dados pequenos: algumas centenas de jogos).
 */
import type { Fixture } from '../types.ts';

export interface MatchObs {
  homeId: string;
  awayId: string;
  hg: number;
  ag: number;
  weight: number;
  neutral?: boolean;
}

export interface TeamRatings {
  mu: number;
  home: number;
  beta: number;
  gamma: number;
  att: Map<string, number>;
  def: Map<string, number>;
  z: Map<string, number>;
  /** z usado para equipas sem coeficiente */
  zMissing: number;
  observations: number;
}

export interface FitOptions {
  /** desvio-padrão a priori de atk/def (menor = mais encolhimento) */
  sigma?: number;
  sweeps?: number;
}

export function coefficientZ(coefs: Map<string, number>, ids: Iterable<string>): { z: Map<string, number>; zMissing: number } {
  const vals = [...new Set(ids)].map((id) => coefs.get(id)).filter((v): v is number => v != null).map((v) => Math.log1p(v));
  const mean = vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, vals.length - 1)) || 1;
  const z = new Map<string, number>();
  for (const [id, v] of coefs) z.set(id, (Math.log1p(v) - mean) / sd);
  const zs = [...z.values()];
  return { z, zMissing: zs.length ? Math.min(...zs) : 0 };
}

export function fitRatings(
  matches: MatchObs[],
  coefs: Map<string, number>,
  opts: FitOptions = {},
): TeamRatings {
  const sigma = opts.sigma ?? 0.3;
  const sweeps = opts.sweeps ?? 60;
  const ids = new Set(matches.flatMap((m) => [m.homeId, m.awayId]));
  const { z, zMissing } = coefficientZ(coefs, ids);
  const zOf = (id: string) => z.get(id) ?? zMissing;

  // Observações: golos de "scorer" contra "opp"
  const obs = matches.flatMap((m) => [
    { s: m.homeId, o: m.awayId, y: m.hg, w: m.weight, h: m.neutral ? 0 : 1 },
    { s: m.awayId, o: m.homeId, y: m.ag, w: m.weight, h: 0 },
  ]);
  const totalW = obs.reduce((a, x) => a + x.w, 0);
  const meanGoals = obs.reduce((a, x) => a + x.w * x.y, 0) / Math.max(1e-9, totalW);

  const r: TeamRatings = {
    mu: Math.log(Math.max(0.2, meanGoals)),
    home: 0.15,
    beta: 0.2,
    gamma: 0.2,
    att: new Map([...ids].map((id) => [id, 0])),
    def: new Map([...ids].map((id) => [id, 0])),
    z,
    zMissing,
    observations: matches.length,
  };
  if (obs.length === 0) return r;

  const eta = (x: (typeof obs)[number]) =>
    r.mu + r.home * x.h + r.beta * zOf(x.s) + r.att.get(x.s)! - r.gamma * zOf(x.o) - r.def.get(x.o)!;

  /** Passo de Newton para um parâmetro com derivada d(eta)/dθ = c(x); prior N(0, s²) se s dado. */
  const step = (subset: typeof obs, c: (x: (typeof obs)[number]) => number, theta: number, s?: number) => {
    let g = s ? -theta / (s * s) : 0;
    let H = s ? -1 / (s * s) : -1e-6;
    for (const x of subset) {
      const lam = Math.exp(eta(x));
      const cx = c(x);
      g += x.w * cx * (x.y - lam);
      H -= x.w * cx * cx * lam;
    }
    const delta = -g / H;
    return Math.max(-1, Math.min(1, delta));
  };

  const byScorer = new Map<string, typeof obs>();
  const byOpp = new Map<string, typeof obs>();
  for (const x of obs) {
    byScorer.set(x.s, [...(byScorer.get(x.s) ?? []), x]);
    byOpp.set(x.o, [...(byOpp.get(x.o) ?? []), x]);
  }

  for (let it = 0; it < sweeps; it++) {
    r.mu += step(obs, () => 1, r.mu);
    r.home += step(obs, (x) => x.h, r.home, 0.5);
    r.beta += step(obs, (x) => zOf(x.s), r.beta, 1);
    r.gamma += step(obs, (x) => -zOf(x.o), r.gamma, 1);
    for (const id of ids) {
      const a = r.att.get(id)!;
      r.att.set(id, a + step(byScorer.get(id) ?? [], () => 1, a, sigma));
      const d = r.def.get(id)!;
      r.def.set(id, d + step(byOpp.get(id) ?? [], () => -1, d, sigma));
    }
  }
  return r;
}

/** Golos esperados de cada equipa num jogo. */
export function expectedGoals(
  r: TeamRatings,
  homeId: string,
  awayId: string,
  neutral = false,
): { home: number; away: number } {
  const zOf = (id: string) => r.z.get(id) ?? r.zMissing;
  const atk = (id: string) => r.beta * zOf(id) + (r.att.get(id) ?? 0);
  const def = (id: string) => r.gamma * zOf(id) + (r.def.get(id) ?? 0);
  return {
    home: Math.exp(r.mu + (neutral ? 0 : r.home) + atk(homeId) - def(awayId)),
    away: Math.exp(r.mu + atk(awayId) - def(homeId)),
  };
}

/** Converte jogos terminados em observações (época atual peso 1; anterior peso `prevWeight`).
 * Com `halfLifeDays`, cada jogo pesa ainda ½ por cada meia-vida de antiguidade (em relação a `before`/`asOf`). */
export function matchObservations(
  current: Fixture[],
  previous: Fixture[] | null,
  opts: { before?: string; asOf?: string; prevWeight?: number; halfLifeDays?: number } = {},
): MatchObs[] {
  const prevWeight = opts.prevWeight ?? 0.5;
  const ref = Date.parse(opts.before ?? opts.asOf ?? '') || null;
  const finished = (f: Fixture) => f.status === 'FINISHED' && f.score != null && (!opts.before || (f.kickoff ?? '') < opts.before);
  const decay = (f: Fixture) => {
    if (!opts.halfLifeDays || !Number.isFinite(opts.halfLifeDays) || ref == null || !f.kickoff) return 1;
    const days = Math.max(0, (ref - Date.parse(f.kickoff)) / 86_400_000);
    return 0.5 ** (days / opts.halfLifeDays);
  };
  const toObs = (f: Fixture, weight: number): MatchObs => ({
    homeId: f.homeId,
    awayId: f.awayId,
    hg: f.score!.home,
    ag: f.score!.away,
    weight: weight * decay(f),
    neutral: /final/i.test(f.round) && !/semi|quarter/i.test(f.round),
  });
  return [
    ...current.filter(finished).map((f) => toObs(f, 1)),
    ...(previous ?? []).filter(finished).map((f) => toObs(f, prevWeight)),
  ];
}

// ———————————————— Afinação por backtest ————————————————

export interface RatingsParams {
  sigma: number;
  halfLifeDays: number;
  prevWeight: number;
}

export const DEFAULT_RATINGS_PARAMS: RatingsParams = { sigma: 0.3, halfLifeDays: Infinity, prevWeight: 0.5 };

export interface RatingsTuning {
  chosen: RatingsParams;
  /** jornadas usadas para escolher (jogos previstos só com resultados anteriores) */
  gamedays: number[];
  matches: number;
  /** log-verosimilhança média por golo-observação (maior = melhor) e erro médio dos golos */
  chosenScore: { logLik: number; mae: number; meanPred: number; meanActual: number } | null;
  defaultScore: { logLik: number; mae: number; meanPred: number; meanActual: number } | null;
  grid: { params: RatingsParams; logLik: number; mae: number }[];
}

const logFact = (k: number) => {
  let s = 0;
  for (let i = 2; i <= k; i++) s += Math.log(i);
  return s;
};

/** Avalia parâmetros: para cada jornada T, ajusta com os jogos anteriores e mede os golos de T. */
export function scoreRatingsParams(
  current: Fixture[],
  previous: Fixture[] | null,
  coefs: Map<string, number>,
  params: RatingsParams,
  gamedays: number[],
): { logLik: number; mae: number; meanPred: number; meanActual: number; n: number } {
  let ll = 0;
  let ae = 0;
  let sp = 0;
  let sa = 0;
  let n = 0;
  for (const T of gamedays) {
    const games = current.filter((f) => f.gameday === T && f.status === 'FINISHED' && f.score && f.kickoff);
    if (!games.length) continue;
    const before = games.map((f) => f.kickoff!).sort()[0]!;
    const r = fitRatings(matchObservations(current, previous, { before, prevWeight: params.prevWeight, halfLifeDays: params.halfLifeDays }), coefs, {
      sigma: params.sigma,
    });
    for (const f of games) {
      const eg = expectedGoals(r, f.homeId, f.awayId);
      for (const [lam, y] of [
        [eg.home, f.score!.home],
        [eg.away, f.score!.away],
      ] as const) {
        ll += y * Math.log(lam) - lam - logFact(y);
        ae += Math.abs(lam - y);
        sp += lam;
        sa += y;
        n++;
      }
    }
  }
  const d = Math.max(1, n);
  return { logLik: ll / d, mae: ae / d, meanPred: sp / d, meanActual: sa / d, n };
}

const r3 = (x: number) => Math.round(x * 1000) / 1000;

/**
 * Escolhe sigma (encolhimento), meia-vida (peso dos jogos recentes) e peso da época anterior
 * pela melhor previsão dos golos nas jornadas já jogadas desta época. Com menos de 2 jornadas avaliáveis
 * fica o valor por defeito.
 */
export function tuneRatings(current: Fixture[], previous: Fixture[] | null, coefs: Map<string, number>): RatingsTuning {
  const playedGds = (fx: Fixture[]) =>
    [...new Set(fx.filter((f) => f.status === 'FINISHED' && f.score && f.gameday).map((f) => f.gameday!))].sort((a, b) => a - b).filter((g) => g >= 2);
  const gds = playedGds(current);
  // a época anterior também serve de teste (prevista só com os seus próprios jogos anteriores): mais jogos, escolha mais estável
  const prevGds = previous ? playedGds(previous).filter((g) => g >= 3) : [];
  const sc = (p: RatingsParams) => {
    const a = scoreRatingsParams(current, previous, coefs, p, gds);
    const b = previous ? scoreRatingsParams(previous, null, coefs, p, prevGds) : { logLik: 0, mae: 0, meanPred: 0, meanActual: 0, n: 0 };
    const n = a.n + b.n;
    const mix = (x: number, y: number) => (n ? (x * a.n + y * b.n) / n : 0);
    return { logLik: mix(a.logLik, b.logLik), mae: mix(a.mae, b.mae), meanPred: mix(a.meanPred, b.meanPred), meanActual: mix(a.meanActual, b.meanActual), n };
  };
  if (gds.length < 2 && prevGds.length < 2)
    return { chosen: DEFAULT_RATINGS_PARAMS, gamedays: gds, matches: 0, chosenScore: null, defaultScore: null, grid: [] };
  const def = sc(DEFAULT_RATINGS_PARAMS);
  const grid: RatingsTuning['grid'] = [];
  let best: { p: RatingsParams; s: ReturnType<typeof sc> } = { p: DEFAULT_RATINGS_PARAMS, s: def };
  for (const sigma of [0.15, 0.2, 0.3, 0.45])
    for (const halfLifeDays of [45, 90, 180, 365, Infinity])
      for (const prevWeight of [0.25, 0.5, 1]) {
        const p = { sigma, halfLifeDays, prevWeight };
        const s = sc(p);
        grid.push({ params: p, logLik: r3(s.logLik), mae: r3(s.mae) });
        if (s.logLik > best.s.logLik + 1e-9) best = { p, s };
      }
  // só sai do valor por defeito com ganho claro (evita escolher ao acaso com poucos jogos)
  if (best.s.logLik - def.logLik < MIN_TUNING_GAIN) best = { p: DEFAULT_RATINGS_PARAMS, s: def };
  const pick = (s: ReturnType<typeof sc>) => ({ logLik: r3(s.logLik), mae: r3(s.mae), meanPred: r3(s.meanPred), meanActual: r3(s.meanActual) });
  return {
    chosen: best.p,
    gamedays: gds,
    matches: best.s.n / 2,
    chosenScore: pick(best.s),
    defaultScore: pick(def),
    grid: grid.sort((a, b) => b.logLik - a.logLik).slice(0, 10),
  };
}

/** Ganho mínimo de log-verosimilhança média (por observação) para trocar os parâmetros por defeito. */
export const MIN_TUNING_GAIN = 0.005;
