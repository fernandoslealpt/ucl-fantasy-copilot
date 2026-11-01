/**
 * Modelo de pontos esperados (xP) — docs/MODEL.md.
 * Princípio: valor = pontos esperados com minutos garantidos.
 *   xP(jogo) = P(joga)·1 + P(60')·1 + golos + assistências + clean sheet + recuperações
 *              + defesas (GR) + Jogador do Jogo − golos sofridos (GR/DEF) − cartões
 * Taxas por 90' com encolhimento para a média da posição (amostras pequenas); golos/assistências
 * ajustados pela força do adversário (golos esperados da equipa neste jogo vs. a sua média).
 */
import type { PrevSeasonPlayer } from '../prevSeason.ts';
import type { Fixture, GamedayLine, Player, Position } from '../types.ts';
import { expectedFloorDiv, pZero } from './poisson.ts';
import { expectedGoals, type TeamRatings } from './ratings.ts';
import { SCORING } from './scoring.ts';

export const MODEL_VERSION = '1.0.0';

/** Parâmetros (ver docs/MODEL.md). */
export const PARAMS = {
  /** peso da época anterior face à atual */
  prevWeight: 0.5,
  /** decaimento por jornada no modelo de minutos (mais recente pesa mais) */
  minutesDecay: 0.7,
  /** pseudo-jornadas do prior de titularidade */
  startPriorStrength: 1.5,
  /** minutos a priori no encolhimento das taxas por 90' */
  priorMinutes: { goals: 360, assists: 360, recoveries: 180, saves: 180, cards: 450 },
  /** aparições a priori para o Jogador do Jogo */
  priorAppsMotm: 4,
  /** minutos médios: titular (60+) e suplente utilizado */
  minutesIfStart: 86,
  minutesIfSub: 22,
};

export type Confidence = 'alta' | 'média' | 'baixa';

export interface XpComponents {
  appearance: number;
  goals: number;
  assists: number;
  cleanSheet: number;
  recoveries: number;
  saves: number;
  playerOfTheMatch: number;
  conceded: number;
  cards: number;
}

export interface FixtureXp {
  gameday: number;
  opponentId: string;
  opponentName: string;
  home: boolean;
  kickoff: string | null;
  xp: number;
  pPlay: number;
  pStart: number;
  expMinutes: number;
  goalsFor: number;
  goalsAgainst: number;
  pCleanSheet: number;
  components: XpComponents;
}

export interface PlayerXp {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  position: Position;
  price: number;
  availability: Player['availability'];
  xp1: number;
  xp3: number;
  xp5: number;
  /** xP das próximas 3 jornadas por €M */
  valuePerM: number;
  confidence: Confidence;
  fixtures: FixtureXp[];
  rates: { goals90: number; assists90: number; recoveries90: number; saves90: number; motmPerApp: number };
}

interface Rates {
  goals90: number;
  assists90: number;
  recoveries90: number;
  saves90: number;
  yellow90: number;
  red90: number;
  motmPerApp: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

interface Sample {
  minutes: number;
  apps: number;
  goals: number;
  assists: number;
  recoveries: number;
  saves: number;
  yellow: number;
  red: number;
  motm: number;
}

function sampleFromLines(lines: GamedayLine[]): Sample {
  const s: Sample = { minutes: 0, apps: 0, goals: 0, assists: 0, recoveries: 0, saves: 0, yellow: 0, red: 0, motm: 0 };
  for (const l of lines) {
    const m = l.minutes ?? 0;
    s.minutes += m;
    if (m > 0) s.apps++;
    if (!l.stats) continue;
    s.goals += l.stats.goals;
    s.assists += l.stats.assists;
    s.recoveries += l.stats.recoveries;
    s.saves += l.stats.saves;
    s.yellow += l.stats.yellowCards;
    s.red += l.stats.redCards;
    s.motm += l.stats.playerOfTheMatch;
  }
  return s;
}

function sampleFromPrev(p: PrevSeasonPlayer | null | undefined, w: number): Sample {
  if (!p) return { minutes: 0, apps: 0, goals: 0, assists: 0, recoveries: 0, saves: 0, yellow: 0, red: 0, motm: 0 };
  return {
    minutes: p.minutes * w,
    apps: p.apps * w,
    goals: p.goals * w,
    assists: p.assists * w,
    recoveries: p.recoveries * w,
    saves: p.saves * w,
    yellow: p.yellowCards * w,
    red: p.redCards * w,
    motm: p.playerOfTheMatch * w,
  };
}

const add = (a: Sample, b: Sample): Sample => ({
  minutes: a.minutes + b.minutes,
  apps: a.apps + b.apps,
  goals: a.goals + b.goals,
  assists: a.assists + b.assists,
  recoveries: a.recoveries + b.recoveries,
  saves: a.saves + b.saves,
  yellow: a.yellow + b.yellow,
  red: a.red + b.red,
  motm: a.motm + b.motm,
});

/** Médias por posição (prior do encolhimento), a partir de todos os jogadores. */
export function positionPriors(samples: { position: Position; s: Sample }[]): Record<Position, Rates> {
  const out = {} as Record<Position, Rates>;
  for (const pos of ['GK', 'DEF', 'MID', 'FWD'] as Position[]) {
    const tot = samples.filter((x) => x.position === pos).reduce((a, x) => add(a, x.s), sampleFromPrev(null, 0));
    const per90 = (v: number) => (tot.minutes > 0 ? (v / tot.minutes) * 90 : 0);
    out[pos] = {
      goals90: per90(tot.goals),
      assists90: per90(tot.assists),
      recoveries90: per90(tot.recoveries),
      saves90: per90(tot.saves),
      yellow90: per90(tot.yellow),
      red90: per90(tot.red),
      motmPerApp: tot.apps > 0 ? tot.motm / tot.apps : 0,
    };
  }
  return out;
}

function shrunkRates(s: Sample, prior: Rates): Rates {
  const pm = PARAMS.priorMinutes;
  const rate = (events: number, priorRate: number, m0: number) => ((events + (priorRate * m0) / 90) / (s.minutes + m0)) * 90;
  return {
    goals90: rate(s.goals, prior.goals90, pm.goals),
    assists90: rate(s.assists, prior.assists90, pm.assists),
    recoveries90: rate(s.recoveries, prior.recoveries90, pm.recoveries),
    saves90: rate(s.saves, prior.saves90, pm.saves),
    yellow90: rate(s.yellow, prior.yellow90, pm.cards),
    red90: rate(s.red, prior.red90, pm.cards),
    motmPerApp: (s.motm + prior.motmPerApp * PARAMS.priorAppsMotm) / (s.apps + PARAMS.priorAppsMotm),
  };
}

export interface MinutesPrior {
  /** P(60+) e P(joga) médios por faixa de preço (calculados com os dados da época) */
  byPrice: { maxPrice: number; p60: number; pApp: number }[];
}

export function priceBucket(price: number): number {
  return price < 4.5 ? 4.4 : price < 5.5 ? 5.4 : price < 6.5 ? 6.4 : price < 8 ? 7.9 : 99;
}

export function minutesPrior(
  players: Player[],
  playedGamedays: Map<string, number[]>,
  lastGameday: number,
): MinutesPrior {
  const acc = new Map<number, { n: number; s60: number; app: number }>();
  for (const p of players) {
    if (!p.status.active) continue;
    const gds = (playedGamedays.get(p.teamId) ?? []).filter((g) => g <= lastGameday);
    const b = priceBucket(p.price);
    const a = acc.get(b) ?? { n: 0, s60: 0, app: 0 };
    for (const g of gds) {
      const m = p.history.find((l) => l.gameday === g)?.minutes ?? 0;
      a.n++;
      if (m >= 60) a.s60++;
      if (m > 0) a.app++;
    }
    acc.set(b, a);
  }
  const byPrice = [4.4, 5.4, 6.4, 7.9, 99].map((maxPrice) => {
    const a = acc.get(maxPrice);
    return a && a.n >= 20
      ? { maxPrice, p60: a.s60 / a.n, pApp: a.app / a.n }
      : { maxPrice, p60: clamp((maxPrice - 4) / 6, 0.1, 0.8), pApp: clamp((maxPrice - 3.5) / 5, 0.15, 0.9) };
  });
  return { byPrice };
}

/** Multiplicadores de disponibilidade para a jornada atual (j=0) e seguintes. */
export function availabilityFactor(p: Player, j: number): { play: number; start: number } {
  const note = p.status.note.toLowerCase();
  switch (p.availability) {
    case 'inactive':
      return { play: 0, start: 0 };
    case 'out':
      return [{ play: 0, start: 0 }, { play: 0.5, start: 0.45 }, { play: 0.8, start: 0.75 }][j] ?? { play: 0.9, start: 0.85 };
    case 'doubtful':
      return [{ play: 0.6, start: 0.45 }, { play: 0.9, start: 0.85 }][j] ?? { play: 0.95, start: 0.95 };
    case 'unknown':
      return j === 0 ? { play: 0.85, start: 0.8 } : { play: 0.95, start: 0.95 };
    default:
      if (/unlikely to start/.test(note)) return j === 0 ? { play: 0.75, start: 0.35 } : { play: 0.9, start: 0.8 };
      return { play: 1, start: 1 };
  }
}

export interface XpInput {
  players: Player[];
  prev: Record<string, PrevSeasonPlayer | null>;
  fixtures: Fixture[];
  ratings: TeamRatings;
  /** jornadas a prever, por ordem (ex.: [4,5,6,7,8]) */
  targets: number[];
  /** última jornada jogada considerada no histórico */
  lastGameday: number;
  /** ignora a disponibilidade atual (backtest: não sabemos o estado na altura) */
  ignoreAvailability?: boolean;
}

export function computeXp(input: XpInput): PlayerXp[] {
  const { players, prev, fixtures, ratings, targets, lastGameday } = input;

  // Jornadas em que cada equipa jogou (para contar 0 minutos quando o jogador não jogou)
  const playedGamedays = new Map<string, number[]>();
  for (const f of fixtures) {
    if (f.gameday == null || f.gameday > lastGameday) continue;
    for (const t of [f.homeId, f.awayId]) playedGamedays.set(t, [...(playedGamedays.get(t) ?? []), f.gameday]);
  }

  // Média de golos esperados de cada equipa nos seus jogos da época (para o ajuste por adversário)
  const teamAvgFor = new Map<string, number>();
  const sums = new Map<string, { s: number; n: number }>();
  for (const f of fixtures) {
    if (f.gameday == null) continue;
    const g = expectedGoals(ratings, f.homeId, f.awayId);
    for (const [t, v] of [
      [f.homeId, g.home],
      [f.awayId, g.away],
    ] as const) {
      const x = sums.get(t) ?? { s: 0, n: 0 };
      sums.set(t, { s: x.s + v, n: x.n + 1 });
    }
  }
  for (const [t, x] of sums) teamAvgFor.set(t, x.s / x.n);
  const leagueAvgAgainst = [...teamAvgFor.values()].reduce((a, b) => a + b, 0) / Math.max(1, teamAvgFor.size);

  const linesUpTo = (p: Player) => p.history.filter((l) => l.gameday <= lastGameday);
  const samples = players.map((p) => ({
    p,
    s: add(sampleFromLines(linesUpTo(p)), sampleFromPrev(prev[p.id], PARAMS.prevWeight)),
  }));
  const priors = positionPriors(samples.map((x) => ({ position: x.p.position, s: x.s })));
  const mPrior = minutesPrior(players, playedGamedays, lastGameday);

  const fixtureFor = (teamId: string, gd: number) =>
    fixtures.find((f) => f.gameday === gd && (f.homeId === teamId || f.awayId === teamId)) ?? null;

  return samples.map(({ p, s }) => {
    const rates = shrunkRates(s, priors[p.position]);

    // Minutos: jornadas recentes pesam mais; prior pela época anterior ou pelo preço.
    const gds = (playedGamedays.get(p.teamId) ?? []).sort((a, b) => a - b);
    let w = 0;
    let w60 = 0;
    let wApp = 0;
    for (const g of gds) {
      const wt = PARAMS.minutesDecay ** (lastGameday - g);
      const m = p.history.find((l) => l.gameday === g)?.minutes ?? 0;
      w += wt;
      if (m >= 60) w60 += wt;
      if (m > 0) wApp += wt;
    }
    const pp = prev[p.id];
    const bucket = mPrior.byPrice.find((b) => p.price <= b.maxPrice) ?? mPrior.byPrice.at(-1)!;
    const prior60 = pp && pp.gamedays >= 2 ? (pp.starts60 + 2 * bucket.p60) / (pp.gamedays + 2) : bucket.p60;
    const priorApp = pp && pp.gamedays >= 2 ? (pp.apps + 2 * bucket.pApp) / (pp.gamedays + 2) : bucket.pApp;
    const K = PARAMS.startPriorStrength;
    const base60 = (w60 + K * prior60) / (w + K);
    const baseApp = Math.max(base60, (wApp + K * priorApp) / (w + K));

    const out: FixtureXp[] = [];
    targets.forEach((gd, j) => {
      const f = fixtureFor(p.teamId, gd);
      if (!f) return;
      const home = f.homeId === p.teamId;
      const neutral = /final/i.test(f.round) && !/semi|quarter/i.test(f.round);
      const eg = expectedGoals(ratings, f.homeId, f.awayId, neutral);
      const goalsFor = home ? eg.home : eg.away;
      const goalsAgainst = home ? eg.away : eg.home;

      const av = input.ignoreAvailability ? { play: 1, start: 1 } : availabilityFactor(p, j);
      const pStart = clamp(base60 * av.start, 0, 1);
      const pPlay = clamp(Math.max(pStart, baseApp * av.play), 0, 1);
      const expMinutes = pStart * PARAMS.minutesIfStart + (pPlay - pStart) * PARAMS.minutesIfSub;
      const f90 = expMinutes / 90;
      const attackAdj = goalsFor / (teamAvgFor.get(p.teamId) ?? goalsFor);
      const minsIfPlay = pPlay > 0 ? expMinutes / pPlay : 0;

      const pos = p.position;
      const c: XpComponents = {
        appearance: pPlay * SCORING.appearance + pStart * SCORING.sixtyMinutes,
        goals: rates.goals90 * f90 * attackAdj * SCORING.goal[pos],
        assists: rates.assists90 * f90 * attackAdj * SCORING.assist,
        cleanSheet: pStart * pZero(goalsAgainst) * SCORING.cleanSheet[pos],
        recoveries: pPlay * expectedFloorDiv((rates.recoveries90 * minsIfPlay) / 90, SCORING.recoveriesPer),
        saves:
          pos === 'GK'
            ? pPlay *
              expectedFloorDiv(((rates.saves90 * minsIfPlay) / 90) * (goalsAgainst / Math.max(0.1, leagueAvgAgainst)), SCORING.savesPer)
            : 0,
        playerOfTheMatch: pPlay * rates.motmPerApp * SCORING.playerOfTheMatch * clamp(attackAdj, 0.6, 1.6),
        conceded: pStart * expectedFloorDiv(goalsAgainst, SCORING.concededPer) * SCORING.concededPenalty[pos],
        cards: f90 * (rates.yellow90 * SCORING.yellow + rates.red90 * SCORING.red),
      };
      const xp = Object.values(c).reduce((a, b) => a + b, 0);
      out.push({
        gameday: gd,
        opponentId: home ? f.awayId : f.homeId,
        opponentName: home ? f.awayName : f.homeName,
        home,
        kickoff: f.kickoff,
        xp: r2(xp),
        pPlay: r2(pPlay),
        pStart: r2(pStart),
        expMinutes: Math.round(expMinutes),
        goalsFor: r2(goalsFor),
        goalsAgainst: r2(goalsAgainst),
        pCleanSheet: r2(pZero(goalsAgainst)),
        components: Object.fromEntries(Object.entries(c).map(([k, v]) => [k, r2(v)])) as unknown as XpComponents,
      });
    });

    const sumFirst = (k: number) => r2(out.slice(0, k).reduce((a, x) => a + x.xp, 0));
    const curApps = gds.filter((g) => (p.history.find((l) => l.gameday === g)?.minutes ?? 0) > 0).length;
    const certain = base60 > 0.8 || baseApp < 0.15;
    const confidence: Confidence =
      p.availability === 'doubtful' || p.availability === 'unknown' || (gds.length === 0 && !pp)
        ? 'baixa'
        : certain && (curApps >= 2 || gds.length >= 2) && p.availability === 'available'
          ? 'alta'
          : 'média';
    const xp3 = sumFirst(3);
    return {
      id: p.id,
      name: p.name,
      teamId: p.teamId,
      teamName: p.teamName,
      position: p.position,
      price: p.price,
      availability: p.availability,
      xp1: sumFirst(1),
      xp3,
      xp5: sumFirst(5),
      valuePerM: r2(xp3 / Math.max(1, p.price)),
      confidence,
      fixtures: out,
      rates: {
        goals90: r2(rates.goals90),
        assists90: r2(rates.assists90),
        recoveries90: r2(rates.recoveries90),
        saves90: r2(rates.saves90),
        motmPerApp: r2(rates.motmPerApp),
      },
    };
  });
}
