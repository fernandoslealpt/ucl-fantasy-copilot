import { z } from 'zod';
import type { Http } from '../lib/http.ts';

/** Feed público (não documentado) do jogo UEFA Champions League Fantasy. */
export const FANTASY_PLAYERS_BASE = 'https://gaming.uefa.com/en/uclfantasy/services/api/Feed/players';

export function fantasyPlayersUrl(gameday?: number): string {
  return gameday ? `${FANTASY_PLAYERS_BASE}?gamedayId=${gameday}&language=en` : `${FANTASY_PLAYERS_BASE}?language=en`;
}

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

/** Campos opcionais: nunca fazem falhar a validação. */
const num = z.unknown().optional().transform(toNum);
const text = z.unknown().optional().transform((v) => (v == null ? '' : String(v).trim()));
const reqId = z.union([z.string().trim().min(1), z.number()]).transform((v) => String(v));

export const FantasyMatchSchema = z.looseObject({
  mdId: z.unknown().optional().transform(toNum),
  tId: reqId,
  vsTID: reqId,
  tLoc: text,
  tSCode: text,
  cCode: text,
  vsTSCode: text,
  vsCCode: text,
  matchDate: text,
});
export type FantasyMatch = z.infer<typeof FantasyMatchSchema>;

const matchList = z.unknown().optional().transform((v): FantasyMatch[] =>
  Array.isArray(v)
    ? v.flatMap((m) => {
        const r = FantasyMatchSchema.safeParse(m);
        return r.success ? [r.data] : [];
      })
    : [],
);

export const FantasyPlayerSchema = z.looseObject({
  id: reqId,
  pDName: z.string().trim().min(1),
  pFName: text,
  tName: z.string().trim().min(1),
  tId: reqId,
  cCode: text,
  skill: z.coerce.number().int().min(1).max(4),
  value: z.coerce.number().positive(),
  isActive: z.unknown().optional().transform((v) => (v == null ? 1 : toNum(v))),
  selPer: num,
  mdId: num,
  totPts: num,
  curGDPts: num,
  lastGdPoints: num,
  avgPlayerPts: num,
  minsPlyd: num,
  gS: num,
  assist: num,
  cS: num,
  gC: num,
  yC: num,
  rC: num,
  oG: num,
  pS: num,
  pC: num,
  pE: num,
  pM: num,
  saves: num,
  bR: num,
  gOB: num,
  mOM: num,
  pStatus: text,
  qStatus: text,
  trained: text,
  mTransferIn: num,
  mTransferOut: num,
  selInPer: num,
  selOutPer: num,
  upcomingMatchesList: matchList,
  currentMatchesList: matchList,
});
export type FantasyPlayer = z.infer<typeof FantasyPlayerSchema>;

export interface ParsedFeed {
  players: FantasyPlayer[];
  invalid: number;
  invalidSamples: string[];
  /** Jornada a que o feed se refere (moda de mdId). */
  gameday: number | null;
}

export function parseFantasyFeed(raw: string): ParsedFeed {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`Feed fantasy não é JSON válido (início: ${raw.slice(0, 120)})`);
  }
  const list = (json as { data?: { value?: { playerList?: unknown } } })?.data?.value?.playerList;
  if (!Array.isArray(list)) throw new Error('Feed fantasy com formato inesperado: data.value.playerList em falta');

  const players: FantasyPlayer[] = [];
  const invalidSamples: string[] = [];
  let invalid = 0;
  for (const item of list) {
    const r = FantasyPlayerSchema.safeParse(item);
    if (r.success) players.push(r.data);
    else {
      invalid++;
      if (invalidSamples.length < 3) {
        const issue = r.error.issues[0];
        invalidSamples.push(`${issue?.path.join('.') ?? '?'}: ${issue?.message ?? '?'}`);
      }
    }
  }

  const counts = new Map<number, number>();
  for (const p of players) if (p.mdId > 0) counts.set(p.mdId, (counts.get(p.mdId) ?? 0) + 1);
  let gameday: number | null = null;
  let best = 0;
  for (const [gd, c] of counts) if (c > best) [gameday, best] = [gd, c];

  return { players, invalid, invalidSamples, gameday };
}

export async function fetchFantasyFeed(http: Http, gameday?: number): Promise<ParsedFeed> {
  return parseFantasyFeed(await http.getText(fantasyPlayersUrl(gameday)));
}
