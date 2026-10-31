import type { Http } from '../lib/http.ts';

/** ClubElo: ranking Elo de clubes europeus, CSV público (api.clubelo.com). */
export const CLUBELO_BASES = ['http://api.clubelo.com', 'https://api.clubelo.com'];

export interface EloClub {
  club: string;
  country: string;
  level: number | null;
  elo: number;
}

export function parseClubEloCsv(csv: string): EloClub[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== '');
  const header = lines[0]?.split(',').map((h) => h.trim().toLowerCase()) ?? [];
  const idx = (name: string) => header.indexOf(name);
  const [iClub, iCountry, iLevel, iElo] = [idx('club'), idx('country'), idx('level'), idx('elo')];
  if (iClub < 0 || iElo < 0) throw new Error(`ClubElo: cabeçalho inesperado (${lines[0]?.slice(0, 80)})`);

  const clubs: EloClub[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(',');
    const elo = Number(cols[iElo]);
    const club = cols[iClub]?.trim();
    if (!club || !Number.isFinite(elo)) continue;
    const level = iLevel >= 0 ? Number(cols[iLevel]) : NaN;
    clubs.push({
      club,
      country: iCountry >= 0 ? (cols[iCountry]?.trim() ?? '') : '',
      level: Number.isFinite(level) ? level : null,
      elo: Math.round(elo),
    });
  }
  return clubs;
}

export async function fetchClubElo(http: Http, date: string): Promise<EloClub[]> {
  let lastError: unknown;
  for (const base of CLUBELO_BASES) {
    try {
      const clubs = parseClubEloCsv(await http.getText(`${base}/${date}`, { accept: 'text/csv, text/plain, */*' }));
      if (clubs.length > 0) return clubs;
      lastError = new Error('ClubElo: lista vazia');
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
