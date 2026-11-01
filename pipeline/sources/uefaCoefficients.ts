import { z } from 'zod';
import type { Http } from '../lib/http.ts';

/**
 * Coeficientes UEFA de clubes (5 épocas), API pública do uefa.com.
 * Alternativa ao Elo: o ClubElo não responde a partir dos runners do GitHub (1 nov 2026).
 * `member.id` = ID UEFA da equipa (igual ao feed fantasy e à API de jogos).
 */
export function uefaCoefficientsUrl(seasonYear: number): string {
  return `https://comp.uefa.com/v2/coefficients?coefficientRange=OVERALL&coefficientType=MEN_CLUB&language=EN&page=1&pagesize=500&seasonYear=${seasonYear}`;
}

const num = z.unknown().optional().transform((v) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
});

const MemberSchema = z.looseObject({
  member: z.looseObject({ id: z.union([z.string().min(1), z.number()]).transform(String) }),
  overallRanking: z.looseObject({ position: num, totalValue: num }).optional(),
});

export interface Coefficient {
  value: number;
  rank: number | null;
}

export function parseUefaCoefficients(raw: string): Map<string, Coefficient> {
  const members = (JSON.parse(raw) as { data?: { members?: unknown } })?.data?.members;
  if (!Array.isArray(members)) throw new Error('Coeficientes UEFA: data.members em falta');
  const out = new Map<string, Coefficient>();
  for (const m of members) {
    const r = MemberSchema.safeParse(m);
    if (!r.success) continue;
    const value = r.data.overallRanking?.totalValue;
    if (value == null) continue;
    out.set(r.data.member.id, { value, rank: r.data.overallRanking?.position ?? null });
  }
  return out;
}

export async function fetchUefaCoefficients(http: Http, seasonYear: number): Promise<Map<string, Coefficient>> {
  return parseUefaCoefficients(await http.getText(uefaCoefficientsUrl(seasonYear)));
}
