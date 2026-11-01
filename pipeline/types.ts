// Modelos normalizados publicados em latest/*.json (consumidos pela app).

export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

/** Disponibilidade derivada (heurística) dos campos de estado do feed UEFA. */
export type Availability = 'available' | 'doubtful' | 'out' | 'inactive' | 'unknown';

export interface MatchRef {
  gameday: number;
  opponentId: string;
  opponentName: string;
  opponentCode: string;
  home: boolean;
  /** ISO UTC */
  kickoff: string | null;
}

export interface PlayerStats {
  minutes: number;
  points: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  goalsConceded: number;
  yellowCards: number;
  redCards: number;
  ownGoals: number;
  penaltiesSaved: number;
  penaltiesConceded: number;
  penaltiesEarned: number;
  penaltiesMissed: number;
  saves: number;
  recoveries: number;
  goalsOutsideBox: number;
  playerOfTheMatch: number;
}

export interface GamedayLine {
  gameday: number;
  points: number;
  /** null quando só temos os pontos (jornada anterior lida do feed, sem snapshot nosso). */
  minutes: number | null;
  /** tracked = diferença entre snapshots nossos; feed = `lastGdPoints` do feed UEFA. */
  source: 'tracked' | 'feed';
}

export interface Player {
  id: string;
  name: string;
  fullName: string;
  teamId: string;
  teamName: string;
  teamCode: string;
  position: Position;
  /** Preço em €M */
  price: number;
  /** % de equipas que o selecionaram */
  selectedPct: number;
  availability: Availability;
  status: { code: string; quality: string; note: string; active: boolean };
  stats: PlayerStats;
  form: { lastGameday: number; avgPoints: number };
  transfers: { inGameday: number; outGameday: number; inPct: number; outPct: number };
  nextMatch: MatchRef | null;
  history: GamedayLine[];
}

export interface TeamRecord {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export type EloMatchKind = 'alias' | 'exact' | 'fuzzy';

export interface Team {
  id: string;
  name: string;
  code: string;
  country: string | null;
  logo: string | null;
  elo: number | null;
  eloClub: string | null;
  eloMatch: EloMatchKind | null;
  /** Coeficiente UEFA de clubes (5 épocas) e posição no ranking. */
  coefficient: number | null;
  coefficientRank: number | null;
  players: number;
  record: TeamRecord;
  fantasyPoints: number;
  nextMatch: MatchRef | null;
}

export interface Fixture {
  id: string;
  gameday: number | null;
  phase: string;
  round: string;
  homeId: string;
  awayId: string;
  homeName: string;
  awayName: string;
  homeCode: string;
  awayCode: string;
  /** ISO UTC */
  kickoff: string | null;
  status: string;
  score: { home: number; away: number } | null;
  source: 'uefa-matches' | 'uefa-fantasy';
}

/** Snapshot de um jogador: [pontos acumulados, minutos acumulados, pontos da jornada (curGDPts)]. */
export type SnapTuple = [number, number, number];

/**
 * O feed UEFA só dá o estado atual (pedir `gamedayId` de uma jornada passada devolve o mesmo).
 * Por isso o histórico é construído para a frente: snapshot no 1.º contacto com a jornada
 * (`start`, idealmente antes do fecho) e o mais recente (`latest`). Pontos da jornada = diferença.
 */
export interface GamedaySnapshot {
  firstSeen: string;
  startBeforeDeadline: boolean;
  start: Record<string, SnapTuple>;
  updatedAt: string;
  latest: Record<string, SnapTuple>;
}

export interface GamedayStatsFile {
  version: 2;
  /** Época UEFA (2026/27 → 2027); a cache é descartada quando muda. */
  season: number;
  updatedAt: string;
  gamedays: Record<string, GamedaySnapshot>;
}

export type SourceState = 'ok' | 'failed' | 'skipped';

export interface SourceStatus {
  status: SourceState;
  lastAttempt: string;
  lastSuccess: string | null;
  requests: number;
  records?: number;
  error?: string;
}

export type GamedayState = 'upcoming' | 'live' | 'finished';

export interface Meta {
  schemaVersion: 1;
  generatedAt: string;
  currentGameday: number | null;
  gamedayState: GamedayState | null;
  /** Fecho da equipa (1.º jogo da jornada), ISO UTC */
  deadline: string | null;
  sources: Record<string, SourceStatus>;
  counts: { players: number; teams: number; fixtures: number; teamsWithElo: number; teamsWithCoefficient: number };
  checks: {
    invalidPlayers: number;
    /** Pontos por jornada calculados por nós vs. valor oficial do feed (curGDPts / lastGdPoints). */
    pointsHistory: { checked: number; mismatches: number };
    /** Jornadas com histórico: seguidas por snapshot, lidas do feed, sem dados. */
    history: { tracked: number[]; fromFeed: number | null; unavailable: number[] };
    fixturesCrossCheck: { fantasy: number; matched: number } | null;
  };
  /** Frequência dos valores de estado do feed (para afinar a heurística de disponibilidade). */
  statusValues: Record<string, number>;
  warnings: string[];
  durationMs: number;
}
