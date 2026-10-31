import type { EloClub } from '../sources/clubElo.ts';
import type { FantasyPlayer } from '../sources/uefaFantasy.ts';
import type { UefaMatch } from '../sources/uefaMatches.ts';
import type { EloMatchKind, Fixture, MatchRef, Player, Team, TeamRecord } from '../types.ts';

// ---------- Jogos ----------

export function fixtureFromUefa(m: UefaMatch): Fixture {
  const seq = m.matchday?.sequenceNumber ?? null;
  const home = m.score?.total?.home;
  const away = m.score?.total?.away;
  return {
    id: m.id,
    gameday: seq !== null && seq >= 1 && seq <= 17 ? seq : null,
    phase: m.matchday?.phase || m.competitionPhase || '',
    round: m.round?.metaData?.name || m.matchday?.longName || m.matchday?.name || '',
    homeId: m.homeTeam.id,
    awayId: m.awayTeam.id,
    homeName: m.homeTeam.internationalName,
    awayName: m.awayTeam.internationalName,
    homeCode: m.homeTeam.teamCode,
    awayCode: m.awayTeam.teamCode,
    kickoff: m.kickOffTime?.dateTime ? new Date(m.kickOffTime.dateTime).toISOString() : null,
    status: m.status || 'UNKNOWN',
    score: home != null && away != null ? { home, away } : null,
    source: 'uefa-matches',
  };
}

/** Jogos da jornada atual/próxima deduzidos do feed fantasy (plano B se a API de jogos falhar). */
export function fixturesFromFantasy(players: FantasyPlayer[], parseDate: (raw: string) => string | null): Fixture[] {
  const byKey = new Map<string, Fixture>();
  for (const p of players) {
    for (const m of [...p.currentMatchesList, ...p.upcomingMatchesList]) {
      const isHome = m.tLoc.toUpperCase() === 'H';
      const homeId = isHome ? m.tId : m.vsTID;
      const awayId = isHome ? m.vsTID : m.tId;
      const key = `${m.mdId}-${homeId}-${awayId}`;
      if (byKey.has(key)) continue;
      byKey.set(key, {
        id: `fantasy-${key}`,
        gameday: m.mdId || null,
        phase: '',
        round: '',
        homeId,
        awayId,
        homeName: isHome ? m.tSCode : m.vsTSCode,
        awayName: isHome ? m.vsTSCode : m.tSCode,
        homeCode: isHome ? m.cCode : m.vsCCode,
        awayCode: isHome ? m.vsCCode : m.cCode,
        kickoff: parseDate(m.matchDate),
        status: 'UNKNOWN',
        score: null,
        source: 'uefa-fantasy',
      });
    }
  }
  return sortFixtures([...byKey.values()]);
}

export function sortFixtures(f: Fixture[]): Fixture[] {
  return f.sort(
    (a, b) => (a.kickoff ?? '9999').localeCompare(b.kickoff ?? '9999') || a.homeName.localeCompare(b.homeName),
  );
}

/** Quantos jogos do feed fantasy existem também na API de jogos (mesma jornada e equipas). */
export function crossCheckFixtures(fantasy: Fixture[], uefa: Fixture[]): { fantasy: number; matched: number } {
  const keys = new Set(uefa.map((f) => `${f.gameday}-${f.homeId}-${f.awayId}`));
  return { fantasy: fantasy.length, matched: fantasy.filter((f) => keys.has(`${f.gameday}-${f.homeId}-${f.awayId}`)).length };
}

export function kickoffLookup(fixtures: Fixture[]) {
  const map = new Map<string, string>();
  for (const f of fixtures) {
    if (f.gameday == null || !f.kickoff) continue;
    map.set(`${f.gameday}-${f.homeId}`, f.kickoff);
    map.set(`${f.gameday}-${f.awayId}`, f.kickoff);
  }
  return (gameday: number, teamId: string) => map.get(`${gameday}-${teamId}`) ?? null;
}

// ---------- Elo ----------

const STOP = new Set([
  'fc', 'cf', 'afc', 'sc', 'ac', 'as', 'ssc', 'sl', 'sv', 'fk', 'sk', 'club', 'cp', 'bv', 'vfb', 'vfl', 'tsg',
  'de', 'the', 'calcio', 'cd', 'ud', 'rcd', 'sad', 'nk', 'hnk', 'gnk', 'pfc', 'bk', 'if', 'ogc', 'osc', 'kv', 'krc',
]);

export function nameTokens(s: string): string[] {
  return s
    .replace(/ø/gi, 'o')
    .replace(/æ/gi, 'ae')
    .replace(/ß/g, 'ss')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function editDistanceAtMost1(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function tokenEq(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))) return true;
  return a.length >= 6 && b.length >= 6 && editDistanceAtMost1(a, b);
}

/** 1 = todos os tokens do nome mais curto aparecem no outro. */
function tokenScore(a: string[], b: string[]): number {
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (short.length === 0) return 0;
  return short.filter((t) => long.some((u) => tokenEq(t, u))).length / short.length;
}

export interface EloMatch {
  club: EloClub;
  kind: EloMatchKind;
}

export function matchTeamToElo(
  team: { id: string; name: string; country: string | null },
  clubs: EloClub[],
  aliases: Record<string, string>,
): EloMatch | null {
  const alias = aliases[team.id];
  if (alias) {
    const club = clubs.find((c) => c.club.toLowerCase() === alias.toLowerCase());
    if (club) return { club, kind: 'alias' };
  }
  const byCountry = team.country ? clubs.filter((c) => c.country.toUpperCase() === team.country!.toUpperCase()) : [];
  const pool = byCountry.length > 0 ? byCountry : clubs;
  const target = nameTokens(team.name);
  const best = (cands: EloClub[]) => cands.reduce((a, b) => (b.elo > a.elo ? b : a));

  // Exatos e aproximados competem juntos: entre homónimos ("Paris" → Paris SG / Paris FC),
  // a equipa da Champions é quase sempre a de Elo mais alto no seu país.
  const exact = new Set(pool.filter((c) => nameTokens(c.club).join(' ') === target.join(' ')));
  const cands = pool.filter((c) => exact.has(c) || tokenScore(target, nameTokens(c.club)) === 1);
  if (cands.length === 0) return null;
  const club = best(cands);
  return { club, kind: exact.has(club) ? 'exact' : 'fuzzy' };
}

// ---------- Equipas ----------

const emptyRecord = (): TeamRecord => ({ played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });

export function teamRecords(fixtures: Fixture[]): Map<string, TeamRecord> {
  const rec = new Map<string, TeamRecord>();
  const get = (id: string) => rec.get(id) ?? (rec.set(id, emptyRecord()), rec.get(id)!);
  for (const f of fixtures) {
    if (f.status !== 'FINISHED' || !f.score) continue;
    const h = get(f.homeId);
    const a = get(f.awayId);
    const { home, away } = f.score;
    h.played++;
    a.played++;
    h.goalsFor += home;
    h.goalsAgainst += away;
    a.goalsFor += away;
    a.goalsAgainst += home;
    if (home > away) {
      h.won++;
      a.lost++;
      h.points += 3;
    } else if (home < away) {
      a.won++;
      h.lost++;
      a.points += 3;
    } else {
      h.drawn++;
      a.drawn++;
      h.points++;
      a.points++;
    }
  }
  return rec;
}

export interface TeamInfo {
  country: string | null;
  logo: string | null;
  name: string;
  code: string;
}

export function teamInfoFromMatches(matches: UefaMatch[]): Map<string, TeamInfo> {
  const info = new Map<string, TeamInfo>();
  for (const m of matches) {
    for (const t of [m.homeTeam, m.awayTeam]) {
      if (info.has(t.id)) continue;
      info.set(t.id, {
        country: t.countryCode || null,
        logo: t.logoUrl || null,
        name: t.internationalName,
        code: t.teamCode,
      });
    }
  }
  return info;
}

export function nextMatchForTeam(teamId: string, fixtures: Fixture[], nowIso: string): MatchRef | null {
  const f = fixtures.find(
    (x) =>
      (x.homeId === teamId || x.awayId === teamId) &&
      x.status !== 'FINISHED' &&
      x.gameday != null &&
      (x.kickoff == null || x.kickoff >= nowIso || x.status === 'LIVE'),
  );
  if (!f || f.gameday == null) return null;
  const home = f.homeId === teamId;
  return {
    gameday: f.gameday,
    opponentId: home ? f.awayId : f.homeId,
    opponentName: home ? f.awayName : f.homeName,
    opponentCode: home ? f.awayCode : f.homeCode,
    home,
    kickoff: f.kickoff,
  };
}

export interface BuildTeamsInput {
  players: Player[];
  fixtures: Fixture[];
  info: Map<string, TeamInfo>;
  clubs: EloClub[] | null;
  aliases: Record<string, string>;
  nowIso: string;
}

export function buildTeams(input: BuildTeamsInput): { teams: Team[]; unmatchedElo: string[] } {
  const { players, fixtures, info, clubs, aliases, nowIso } = input;
  const records = teamRecords(fixtures);
  const grouped = new Map<string, Player[]>();
  for (const p of players) grouped.set(p.teamId, [...(grouped.get(p.teamId) ?? []), p]);

  const teams: Team[] = [];
  const unmatchedElo: string[] = [];
  for (const [id, squad] of grouped) {
    const first = squad[0]!;
    const meta = info.get(id);
    const name = meta?.name || first.teamName;
    const country = meta?.country ?? null;
    const elo = clubs ? matchTeamToElo({ id, name, country }, clubs, aliases) : null;
    if (clubs && !elo) unmatchedElo.push(`${name} (${id}${country ? `, ${country}` : ''})`);
    teams.push({
      id,
      name,
      code: first.teamCode || meta?.code || '',
      country,
      logo: meta?.logo ?? null,
      elo: elo?.club.elo ?? null,
      eloClub: elo?.club.club ?? null,
      eloMatch: elo?.kind ?? null,
      players: squad.length,
      record: records.get(id) ?? emptyRecord(),
      fantasyPoints: squad.reduce((a, p) => a + p.stats.points, 0),
      nextMatch: nextMatchForTeam(id, fixtures, nowIso) ?? squad.find((p) => p.nextMatch)?.nextMatch ?? null,
    });
  }
  teams.sort((a, b) => (b.elo ?? 0) - (a.elo ?? 0) || a.name.localeCompare(b.name));
  return { teams, unmatchedElo };
}
