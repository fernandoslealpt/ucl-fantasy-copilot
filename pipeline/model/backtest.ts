/**
 * Backtest: para cada jornada T já jogada, prevê T só com dados anteriores a T e compara com
 * os pontos reais e com o baseline ingénuo (média de pontos por jornada até T-1).
 */
import type { PrevSeasonPlayer } from '../prevSeason.ts';
import type { Fixture, Player } from '../types.ts';
import { DEFAULT_RATINGS_PARAMS, fitRatings, matchObservations, type RatingsParams } from './ratings.ts';
import { computeXp } from './xp.ts';

export interface BacktestMetrics {
  n: number;
  mae: number;
  rmse: number;
  spearman: number;
  /** pontos reais médios dos 20/50 melhores segundo a previsão */
  top20Actual: number;
  top50Actual: number;
  /** média prevista vs. média real (calibração) */
  meanPred: number;
  meanActual: number;
}

export interface BacktestRow {
  gameday: number;
  model: BacktestMetrics;
  baseline: BacktestMetrics;
  /** jogadores avaliados: tiveram minutos na jornada ou previsão ≥ 1 ponto (em qualquer método) */
  population: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function ranks(v: number[]): number[] {
  const idx = v.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array<number>(v.length);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1]![0] === idx[i]![0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k]![1]] = avg;
    i = j + 1;
  }
  return r;
}

export function spearman(a: number[], b: number[]): number {
  const ra = ranks(a);
  const rb = ranks(b);
  const n = a.length;
  const ma = ra.reduce((x, y) => x + y, 0) / n;
  const mb = rb.reduce((x, y) => x + y, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    num += (ra[i]! - ma) * (rb[i]! - mb);
    da += (ra[i]! - ma) ** 2;
    db += (rb[i]! - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

export function metrics(pred: number[], actual: number[]): BacktestMetrics {
  const n = pred.length;
  const err = pred.map((p, i) => p - actual[i]!);
  const order = pred.map((p, i) => [p, i] as const).sort((a, b) => b[0] - a[0]);
  const topAvg = (k: number) => order.slice(0, k).reduce((a, [, i]) => a + actual[i]!, 0) / Math.max(1, Math.min(k, n));
  return {
    n,
    mae: r2(err.reduce((a, e) => a + Math.abs(e), 0) / Math.max(1, n)),
    rmse: r2(Math.sqrt(err.reduce((a, e) => a + e * e, 0) / Math.max(1, n))),
    spearman: r2(spearman(pred, actual)),
    top20Actual: r2(topAvg(20)),
    top50Actual: r2(topAvg(50)),
    meanPred: r2(pred.reduce((a, b) => a + b, 0) / Math.max(1, n)),
    meanActual: r2(actual.reduce((a, b) => a + b, 0) / Math.max(1, n)),
  };
}

export interface BacktestInput {
  players: Player[];
  prev: Record<string, PrevSeasonPlayer | null>;
  fixtures: Fixture[];
  prevFixtures: Fixture[] | null;
  coefficients: Map<string, number>;
  ratingsParams?: RatingsParams;
  /** jornadas a avaliar (têm de estar jogadas) */
  gamedays: number[];
}

export function backtest(input: BacktestInput): BacktestRow[] {
  const rows: BacktestRow[] = [];
  for (const T of input.gamedays) {
    const firstKick = input.fixtures
      .filter((f) => f.gameday === T && f.kickoff)
      .map((f) => f.kickoff!)
      .sort()[0];
    const rp = input.ratingsParams ?? DEFAULT_RATINGS_PARAMS;
    const obs = matchObservations(input.fixtures, input.prevFixtures, { before: firstKick, prevWeight: rp.prevWeight, halfLifeDays: rp.halfLifeDays });
    const ratings = fitRatings(obs, input.coefficients, { sigma: rp.sigma });
    // Só o que se sabia antes de T: histórico até T-1; estado de disponibilidade ignorado.
    const truncated = input.players.map((p) => ({ ...p, history: p.history.filter((l) => l.gameday < T) }));
    const xp = computeXp({
      players: truncated,
      prev: input.prev,
      fixtures: input.fixtures,
      ratings,
      targets: [T],
      lastGameday: T - 1,
      ignoreAvailability: true,
    });
    const predModel = new Map(xp.map((x) => [x.id, x.xp1]));

    const pm: number[] = [];
    const pb: number[] = [];
    const act: number[] = [];
    for (const p of input.players) {
      const line = p.history.find((l) => l.gameday === T);
      const actual = line?.points ?? 0;
      const played = (line?.minutes ?? 0) > 0;
      const past = p.history.filter((l) => l.gameday < T).reduce((a, l) => a + l.points, 0);
      const base = T > 1 ? past / (T - 1) : (input.prev[p.id]?.points ?? 0) / Math.max(1, input.prev[p.id]?.gamedays ?? 1);
      const model = predModel.get(p.id) ?? 0;
      if (!played && model < 1 && base < 1) continue;
      pm.push(model);
      pb.push(base);
      act.push(actual);
    }
    rows.push({
      gameday: T,
      model: metrics(pm, act),
      baseline: metrics(pb, act),
      population: 'jogadores com minutos na jornada ou previsão ≥ 1 ponto',
    });
  }
  return rows;
}
