import type { FantasyPlayer, ParsedFeed } from '../sources/uefaFantasy.ts';
import type { Availability, GamedayLine, GamedayStatsFile, GamedayTuple, MatchRef, Player, Position } from '../types.ts';

const POSITIONS: Record<number, Position> = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };

export function positionFromSkill(skill: number): Position {
  const p = POSITIONS[skill];
  if (!p) throw new Error(`Posição desconhecida (skill=${skill})`);
  return p;
}

/**
 * Heurística conservadora a partir dos campos de estado do feed
 * (isActive, pStatus, qStatus, trained). Afinar com meta.statusValues.
 */
export function deriveAvailability(p: Pick<FantasyPlayer, 'isActive' | 'pStatus' | 'qStatus' | 'trained'>): Availability {
  if (p.isActive === 0) return 'inactive';
  // Códigos vistos no feed real (31 out 2026): "I" = lesionado, "NIS" = fora da convocatória.
  const code = p.pStatus.trim().toUpperCase();
  if (code === 'I' || code === 'S' || code === 'NIS' || code === 'SUS') return 'out';
  if (code === 'D') return 'doubtful';
  const s = `${p.pStatus} | ${p.qStatus} | ${p.trained}`.toLowerCase();
  if (/suspen/.test(s)) return 'out';
  if (/not in contention|ruled out|injur|lesion|\bout\b|unavailable|illness|\bill\b|not in squad/.test(s)) return 'out';
  if (/unlikely|doubt|\d+\s?%|fitness|knock|late test/.test(s)) return 'doubtful';
  if (/in contention|available|fit\b/.test(s) || s.replace(/[|\s]/g, '') === '') return 'available';
  return 'unknown';
}

export function statusKey(p: Pick<FantasyPlayer, 'pStatus' | 'qStatus' | 'trained'>): string {
  return `pStatus=${p.pStatus || '∅'} · qStatus=${p.qStatus || '∅'} · trained=${p.trained || '∅'}`;
}

export function feedToTuples(feed: ParsedFeed): Record<string, GamedayTuple> {
  const out: Record<string, GamedayTuple> = {};
  for (const p of feed.players) out[p.id] = [p.curGDPts, p.minsPlyd, p.totPts];
  return out;
}

/** Linhas por jornada (pontos e minutos dessa jornada) a partir da cache de jornadas. */
export function buildHistory(stats: GamedayStatsFile, lastGameday: number): Map<string, GamedayLine[]> {
  const history = new Map<string, GamedayLine[]>();
  const prevMinutes = new Map<string, number>();
  for (let gd = 1; gd <= lastGameday; gd++) {
    const entry = stats.gamedays[String(gd)];
    if (!entry) continue;
    for (const [id, [pts, cumMin]] of Object.entries(entry.players)) {
      const minutes = Math.max(0, cumMin - (prevMinutes.get(id) ?? 0));
      prevMinutes.set(id, cumMin);
      const lines = history.get(id) ?? [];
      lines.push({ gameday: gd, points: pts, minutes });
      history.set(id, lines);
    }
  }
  return history;
}

/** Confirma que a soma dos pontos por jornada bate com o total acumulado do feed. */
export function checkPointsHistory(
  players: FantasyPlayer[],
  history: Map<string, GamedayLine[]>,
): { checked: number; mismatches: number } {
  let checked = 0;
  let mismatches = 0;
  for (const p of players) {
    const lines = history.get(p.id);
    if (!lines) continue;
    checked++;
    const sum = lines.reduce((a, l) => a + l.points, 0);
    if (Math.abs(sum - p.totPts) > 0.01) mismatches++;
  }
  return { checked, mismatches };
}

export type KickoffLookup = (gameday: number, teamId: string) => string | null;

export function nextMatchFromFeed(
  p: FantasyPlayer,
  currentGameday: number,
  kickoff: KickoffLookup,
  parseDate: (raw: string) => string | null,
): MatchRef | null {
  const list = [...p.currentMatchesList, ...p.upcomingMatchesList]
    .filter((m) => m.mdId >= currentGameday)
    .sort((a, b) => a.mdId - b.mdId);
  const m = list[0];
  if (!m) return null;
  return {
    gameday: m.mdId,
    opponentId: m.vsTID,
    opponentName: m.vsTSCode,
    opponentCode: m.vsCCode,
    home: m.tLoc.toUpperCase() === 'H',
    kickoff: kickoff(m.mdId, p.tId) ?? parseDate(m.matchDate),
  };
}

export function normalizePlayer(
  p: FantasyPlayer,
  history: GamedayLine[],
  nextMatch: MatchRef | null,
): Player {
  return {
    id: p.id,
    name: p.pDName,
    fullName: p.pFName || p.pDName,
    teamId: p.tId,
    teamName: p.tName,
    teamCode: p.cCode,
    position: positionFromSkill(p.skill),
    price: Math.round(p.value * 10) / 10,
    selectedPct: p.selPer,
    availability: deriveAvailability(p),
    status: { code: p.pStatus, quality: p.qStatus, note: p.trained, active: p.isActive !== 0 },
    stats: {
      minutes: p.minsPlyd,
      points: p.totPts,
      goals: p.gS,
      assists: p.assist,
      cleanSheets: p.cS,
      goalsConceded: p.gC,
      yellowCards: p.yC,
      redCards: p.rC,
      ownGoals: p.oG,
      penaltiesSaved: p.pS,
      penaltiesConceded: p.pC,
      penaltiesEarned: p.pE,
      penaltiesMissed: p.pM,
      saves: p.saves,
      recoveries: p.bR,
      goalsOutsideBox: p.gOB,
      playerOfTheMatch: p.mOM,
    },
    form: { lastGameday: p.lastGdPoints, avgPoints: p.avgPlayerPts },
    transfers: { inGameday: p.mTransferIn, outGameday: p.mTransferOut, inPct: p.selInPer, outPct: p.selOutPer },
    nextMatch,
    history,
  };
}

export function sortPlayers(players: Player[]): Player[] {
  return players.sort(
    (a, b) => b.stats.points - a.stats.points || b.price - a.price || a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  );
}
