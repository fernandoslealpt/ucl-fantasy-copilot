import { z } from 'zod';
import type { Http } from '../lib/http.ts';

/** API pública de jogos usada pelo uefa.com (horas em UTC, resultados, estado). */
export const UEFA_MATCHES_BASE = 'https://match.uefa.com/v5/matches';

export function uefaMatchesUrl(seasonYear: number, offset: number, limit: number): string {
  const from = `${seasonYear - 1}-09-01`;
  const to = `${seasonYear}-06-30`;
  return `${UEFA_MATCHES_BASE}?competitionId=1&seasonYear=${seasonYear}&fromDate=${from}&toDate=${to}&limit=${limit}&offset=${offset}&order=ASC`;
}

const text = z.unknown().optional().transform((v) => (v == null ? '' : String(v).trim()));
const optNum = z.unknown().optional().transform((v) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
});

const TeamSchema = z.looseObject({
  id: z.union([z.string().min(1), z.number()]).transform(String),
  internationalName: text,
  teamCode: text,
  countryCode: text,
  logoUrl: text,
});

export const UefaMatchSchema = z.looseObject({
  id: z.union([z.string().min(1), z.number()]).transform(String),
  homeTeam: TeamSchema,
  awayTeam: TeamSchema,
  status: text,
  competitionPhase: text,
  kickOffTime: z.looseObject({ dateTime: text }).optional(),
  matchday: z
    .looseObject({ sequenceNumber: optNum, name: text, phase: text, type: text, longName: text })
    .optional(),
  round: z.looseObject({ metaData: z.looseObject({ name: text }).optional() }).optional(),
  score: z
    .looseObject({ total: z.looseObject({ home: optNum, away: optNum }).optional() })
    .optional(),
});
export type UefaMatch = z.infer<typeof UefaMatchSchema>;

export function parseUefaMatches(raw: string): { matches: UefaMatch[]; invalid: number } {
  const json = JSON.parse(raw) as unknown;
  if (!Array.isArray(json)) throw new Error('API de jogos UEFA: esperava uma lista');
  const matches: UefaMatch[] = [];
  let invalid = 0;
  for (const m of json) {
    const r = UefaMatchSchema.safeParse(m);
    if (r.success) matches.push(r.data);
    else invalid++;
  }
  return { matches, invalid };
}

export function isQualifying(m: UefaMatch): boolean {
  return m.competitionPhase === 'QUALIFYING' || m.matchday?.phase === 'QUALIFYING';
}

export async function fetchUefaMatches(
  http: Http,
  seasonYear: number,
  pageSize = 50,
  maxPages = 12,
): Promise<{ matches: UefaMatch[]; invalid: number }> {
  const all: UefaMatch[] = [];
  let invalid = 0;
  for (let page = 0; page < maxPages; page++) {
    const raw = await http.getText(uefaMatchesUrl(seasonYear, page * pageSize, pageSize));
    const parsed = parseUefaMatches(raw);
    all.push(...parsed.matches);
    invalid += parsed.invalid;
    if (parsed.matches.length + parsed.invalid < pageSize) break;
  }
  const seen = new Set<string>();
  const unique = all.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
  return { matches: unique.filter((m) => !isQualifying(m)), invalid };
}
