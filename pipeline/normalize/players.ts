import type { FantasyPlayer, ParsedFeed } from '../sources/uefaFantasy.ts';
import type { Availability, GamedayLine, GamedayStatsFile, MatchRef, Player, Position, SnapTuple } from '../types.ts';

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

export function feedToSnapshot(feed: ParsedFeed): Record<string, SnapTuple> {
  const out: Record<string, SnapTuple> = {};
  for (const p of feed.players) out[p.id] = [p.totPts, p.minsPlyd, p.curGDPts];
  return out;
}

/** Acrescenta/atualiza o snapshot da jornada atual (o `start` só é gravado no 1.º contacto). */
export function updateGamedayStats(
  prev: GamedayStatsFile | null,
  season: number,
  gameday: number,
  feed: ParsedFeed,
  nowIso: string,
  beforeDeadline: boolean,
): GamedayStatsFile {
  const valid = prev && prev.version === 2 && prev.season === season;
  const stats: GamedayStatsFile = valid
    ? { ...prev, gamedays: { ...prev.gamedays } }
    : { version: 2, season, updatedAt: nowIso, gamedays: {} };
  for (const gd of Object.keys(stats.gamedays)) if (Number(gd) > gameday) delete stats.gamedays[gd];
  const snap = feedToSnapshot(feed);
  const existing = stats.gamedays[String(gameday)];
  stats.gamedays[String(gameday)] = existing
    ? { ...existing, updatedAt: nowIso, latest: snap }
    : { firstSeen: nowIso, startBeforeDeadline: beforeDeadline, start: snap, updatedAt: nowIso, latest: snap };
  stats.updatedAt = nowIso;
  return stats;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export interface HistoryResult {
  history: Map<string, GamedayLine[]>;
  check: { checked: number; mismatches: number };
  coverage: { tracked: number[]; fromFeed: number | null; unavailable: number[] };
}

/**
 * Pontos e minutos por jornada.
 * - Jornadas seguidas por nós: diferença entre snapshots (base = `start` se gravado antes do fecho,
 *   senão o `latest` da jornada anterior).
 * - Jornada anterior à atual: os pontos oficiais vêm de `lastGdPoints` (têm prioridade); os minutos
 *   vêm do nosso snapshot, se existir.
 * - Verificação: os nossos pontos vs. o valor oficial (`lastGdPoints` ou `curGDPts`).
 */
export function buildHistory(
  stats: GamedayStatsFile,
  players: FantasyPlayer[],
  gameday: number,
  currentPlayed: boolean,
): HistoryResult {
  const history = new Map<string, GamedayLine[]>();
  const push = (id: string, line: GamedayLine) => history.set(id, [...(history.get(id) ?? []), line]);
  const feedPlayers = new Map(players.map((p) => [p.id, p]));
  const tracked: number[] = [];
  const prevGd = gameday - 1;
  let checked = 0;
  let mismatches = 0;

  const gds = Object.keys(stats.gamedays)
    .map(Number)
    .filter((g) => g < gameday || (g === gameday && currentPlayed))
    .sort((a, b) => a - b);
  for (const g of gds) {
    const snap = stats.gamedays[String(g)]!;
    const base = snap.startBeforeDeadline ? snap.start : stats.gamedays[String(g - 1)]?.latest;
    if (!base) continue;
    tracked.push(g);
    for (const [id, [tot, min, gdPts]] of Object.entries(snap.latest)) {
      const [bTot, bMin] = base[id] ?? [0, 0, 0];
      const ours = round1(tot - bTot);
      const official = g === prevGd ? feedPlayers.get(id)?.lastGdPoints : gdPts;
      if (official !== undefined) {
        checked++;
        if (Math.abs(official - ours) > 0.01) mismatches++;
      }
      const points = g === prevGd && official !== undefined ? official : ours;
      push(id, { gameday: g, points, minutes: Math.max(0, min - bMin), source: 'tracked' });
    }
  }

  let fromFeed: number | null = null;
  if (prevGd >= 1 && !tracked.includes(prevGd)) {
    fromFeed = prevGd;
    for (const p of players) push(p.id, { gameday: prevGd, points: p.lastGdPoints, minutes: null, source: 'feed' });
  }
  for (const lines of history.values()) lines.sort((a, b) => a.gameday - b.gameday);

  const lastWithData = currentPlayed ? gameday : gameday - 1;
  const unavailable: number[] = [];
  for (let g = 1; g <= lastWithData; g++) if (!tracked.includes(g) && g !== fromFeed) unavailable.push(g);
  return { history, check: { checked, mismatches }, coverage: { tracked, fromFeed, unavailable } };
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
