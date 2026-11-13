// Formas dos ficheiros publicados pelo pipeline (branch data → latest/). Só o que a app usa.

export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';
export type Availability = 'available' | 'doubtful' | 'out' | 'inactive' | 'unknown';
export type GamedayState = 'upcoming' | 'live' | 'finished';
export type Confidence = 'alta' | 'média' | 'baixa';

export interface SourceStatus {
  status: 'ok' | 'failed' | 'skipped';
  lastSuccess: string | null;
  error?: string;
}

export interface Meta {
  generatedAt: string;
  currentGameday: number | null;
  gamedayState: GamedayState | null;
  deadline: string | null;
  sources: Record<string, SourceStatus>;
  model?: {
    version: string;
    targets: number[];
    backtest: { gameday: number; modelMae: number; baselineMae: number; modelTop20: number; baselineTop20: number }[];
  } | null;
}

export interface GamedayStats {
  goals: number;
  assists: number;
  cleanSheets: number;
  goalsConceded: number;
  saves: number;
  recoveries: number;
  yellowCards: number;
  redCards: number;
  playerOfTheMatch: number;
}

export interface GamedayLine {
  gameday: number;
  points: number;
  minutes: number | null;
  source: 'uefa' | 'tracked' | 'feed';
  stats?: GamedayStats;
  breakdown?: Record<string, number>;
}

export interface Player {
  id: string;
  name: string;
  fullName: string;
  teamId: string;
  teamName: string;
  teamCode: string;
  position: Position;
  price: number;
  selectedPct: number;
  availability: Availability;
  status: { code: string; quality: string; note: string; active: boolean };
  stats: { minutes: number; points: number; goals: number; assists: number; cleanSheets: number; recoveries: number; saves: number };
  form: { lastGameday: number; avgPoints: number };
  history: GamedayLine[];
}

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
  /** sinais da próxima jornada: onze provável/confirmado e lesões (RotoWire), notícias recentes */
  signal?: FixtureSignal;
}

export interface FixtureSignal {
  lineup: 'start' | 'bench' | null;
  confirmed: boolean;
  tag: 'OUT' | 'QUES' | 'SUS' | null;
  news: 'injury' | 'doubt' | 'return' | null;
}

export interface XpPlayer {
  id: string;
  xp1: number;
  xp3: number;
  xp5: number;
  valuePerM: number;
  confidence: Confidence;
  fixtures: FixtureXp[];
  rates: { goals90: number; assists90: number; recoveries90: number; saves90: number; motmPerApp: number };
  /** amostra desta época (modelo ≥ 1.3.0) */
  sample?: SampleInfo;
}

export interface SampleInfo {
  apps: number;
  points: number;
  bestGameday: number | null;
  bestPoints: number;
  /** pontos do melhor jogo ÷ pontos totais */
  bestShare: number;
  /** só 1 jogo, ou ≥ 50% dos pontos num só jogo */
  spiky: boolean;
  /** fator já aplicado ao xP (ex.: 0,88 = −12%) */
  adjusted?: number;
}

export interface Team {
  id: string;
  name: string;
  code: string;
  logo: string | null;
  coefficient: number | null;
  coefficientRank: number | null;
  record: { played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; points: number };
}

export interface TeamFixtureRating {
  gameday: number;
  opponentId: string;
  opponentName: string;
  home: boolean;
  goalsFor: number;
  goalsAgainst: number;
  pCleanSheet: number;
  difficulty: number;
}

export interface TeamRating {
  id: string;
  name: string;
  attack: number;
  defense: number;
  fixtures: TeamFixtureRating[];
}

export type NewsKind = 'injury' | 'doubt' | 'return' | 'other';

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  teamId: string;
  teamName: string;
  kind: NewsKind;
  playerIds: string[];
}

/** Jogador com o xP juntado (o que os ecrãs usam). */
export interface Row extends Player {
  xp: XpPlayer | null;
}

export interface Dataset {
  meta: Meta;
  rows: Row[];
  byId: Map<string, Row>;
  teams: Team[];
  teamById: Map<string, Team>;
  ratings: TeamRating[];
  ratingById: Map<string, TeamRating>;
  news: NewsItem[];
  targets: number[];
}
