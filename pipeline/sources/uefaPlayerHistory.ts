import type { Http } from '../lib/http.ts';
import type { GamedayLine, GamedayStats } from '../types.ts';

/**
 * Histórico por jornada de cada jogador — o mesmo ficheiro que o site do UCL Fantasy usa no
 * "popup" do jogador. Descoberto em 1 nov 2026 (workflow "Descobrir endpoints").
 * Tour IDs: 60 = 2023/24, 70 = 2024/25, 80 = 2025/26, 90 = 2026/27.
 */
export function fantasyTourId(seasonYear: number): number {
  return (seasonYear - 2018) * 10;
}

export function playerHistoryUrl(tourId: number, playerId: string): string {
  return `https://gaming.uefa.com/en/uclfantasy/services/feeds/popupstats/popupstats_${tourId}_${playerId}.json`;
}

type Row = Record<string, unknown>;
const n = (v: unknown): number => {
  const x = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(x) ? x : 0;
};

const STAT_KEYS: [keyof GamedayStats, string][] = [
  ['goals', 'gS'],
  ['assists', 'gA'],
  ['cleanSheets', 'cS'],
  ['goalsConceded', 'gC'],
  ['saves', 'saves'],
  ['recoveries', 'bR'],
  ['yellowCards', 'yC'],
  ['redCards', 'rC'],
  ['ownGoals', 'oG'],
  ['penaltiesSaved', 'pS'],
  ['penaltiesMissed', 'pM'],
  ['penaltiesEarned', 'pE'],
  ['penaltiesConceded', 'pC'],
  ['goalsOutsideBox', 'gOB'],
  ['playerOfTheMatch', 'mOM'],
];

/** Pontos por categoria (só os diferentes de zero), como na decomposição do site. */
const POINT_KEYS: Record<string, string> = {
  oF: 'appearance',
  gS: 'goals',
  gA: 'assists',
  cS: 'cleanSheet',
  sS: 'saves',
  bR: 'recoveries',
  mOM: 'playerOfTheMatch',
  gC: 'goalsConceded',
  yC: 'yellowCards',
  rC: 'redCards',
  oG: 'ownGoals',
  pE: 'penaltyEarned',
  pS: 'penaltySaved',
  pM: 'penaltyMissed',
  pC: 'penaltyConceded',
  gOB: 'goalOutsideBox',
};

export function parsePlayerHistory(raw: string): { lines: GamedayLine[]; totalPoints: number | null } {
  const value = (JSON.parse(raw) as { data?: { value?: Row } })?.data?.value;
  if (!value || typeof value !== 'object') throw new Error('Histórico do jogador: data.value em falta');
  const stats = Array.isArray(value.matchdayStats) ? (value.matchdayStats as Row[]) : [];
  const points = Array.isArray(value.matchdayPoints) ? (value.matchdayPoints as Row[]) : [];
  const byGd = new Map<number, { s?: Row; p?: Row }>();
  for (const s of stats) byGd.set(n(s.mdId), { ...byGd.get(n(s.mdId)), s });
  for (const p of points) byGd.set(n(p.mdId), { ...byGd.get(n(p.mdId)), p });

  const lines: GamedayLine[] = [];
  for (const [gameday, { s, p }] of [...byGd].sort((a, b) => a[0] - b[0])) {
    if (gameday < 1) continue;
    const st = Object.fromEntries(STAT_KEYS.map(([k, f]) => [k, n(s?.[f])])) as unknown as GamedayStats;
    const breakdown: Record<string, number> = {};
    for (const [f, name] of Object.entries(POINT_KEYS)) {
      const v = n(p?.[f]);
      if (v !== 0) breakdown[name] = v;
    }
    lines.push({
      gameday,
      points: n(p?.tPoints),
      minutes: s ? n(s.oF) : null,
      source: 'uefa',
      stats: st,
      breakdown,
    });
  }
  const overall = value.overallPoints as Row | undefined;
  return { lines, totalPoints: overall ? n(overall.tPoints) : null };
}

/** Corre tarefas com concorrência limitada (cortesia com o servidor da UEFA). */
export async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function fetchPlayerHistory(http: Http, tourId: number, playerId: string) {
  return parsePlayerHistory(await http.getText(playerHistoryUrl(tourId, playerId)));
}
