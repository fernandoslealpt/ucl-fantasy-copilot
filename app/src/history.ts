/**
 * Diário: por jornada, o que a app recomendou, o que o Fernando fez, o xP previsto e os pontos reais.
 * Guardado no dispositivo e sincronizado em data/user/history.json (mesma chave do GitHub da equipa).
 * Os pontos reais de cada jogador vêm dos dados oficiais (histórico por jornada); os pontos oficiais da
 * equipa são escritos pelo Fernando (a app não lê a conta UEFA).
 */
import type { Row } from './types';

export interface SwapIds {
  out: string;
  in: string;
}

export interface GdRecord {
  gameday: number;
  updatedAt: string;
  /** o que a app recomendou (última versão antes do fecho) */
  recommended?: {
    swaps: SwapIds[];
    /** ganho esperado nesta jornada e no horizonte */
    deltaNow: number;
    delta: number;
    hits: number;
    captain: string | null;
    vice: string | null;
  };
  /** 1.º passo do plano de várias jornadas (sem cortes), calculado pela app */
  recommendedNoCut?: { swaps: SwapIds[]; hits: number; net: number };
  /** o que o Fernando fez */
  done?: {
    swaps: SwapIds[];
    hits: number;
    noMove?: boolean;
    captain?: string;
    vice?: string;
    chip?: 'wildcard' | 'limitless' | null;
  };
  /** plantel e xP previsto por jogador nesta jornada (última gravação antes do fecho) */
  squad?: string[];
  xp?: Record<string, number>;
  /** xP previsto do onze (com capitão a dobrar) */
  teamXp?: number;
  /** pontos oficiais da equipa na jornada (escritos pelo Fernando) */
  officialPoints?: number | null;
}

export interface History {
  version: 1;
  updatedAt: string;
  gamedays: Record<string, GdRecord>;
}

export const emptyHistory = (): History => ({ version: 1, updatedAt: new Date(0).toISOString(), gamedays: {} });

const KEY = 'ucl.history';

export function loadLocalHistory(): History {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as History) : emptyHistory();
  } catch {
    return emptyHistory();
  }
}

export function saveLocalHistory(h: History): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(h));
  } catch {
    /* sem armazenamento */
  }
}

/** Junta duas versões (telemóvel e PC): por jornada fica a mais recente. Nunca perde jornadas. */
export function mergeHistory(a: History | null, b: History | null): History {
  if (!a) return b ?? emptyHistory();
  if (!b) return a;
  const gamedays: Record<string, GdRecord> = { ...a.gamedays };
  for (const [k, r] of Object.entries(b.gamedays)) {
    const cur = gamedays[k];
    if (!cur || Date.parse(r.updatedAt) > Date.parse(cur.updatedAt)) gamedays[k] = r;
  }
  return { version: 1, updatedAt: a.updatedAt > b.updatedAt ? a.updatedAt : b.updatedAt, gamedays };
}

/** Atualiza a jornada `gd`; depois do fecho já não muda (exceto os pontos oficiais). */
export function updateGameday(
  h: History,
  gd: number,
  deadline: string | null,
  patch: Partial<Omit<GdRecord, 'gameday' | 'updatedAt'>>,
  now = new Date(),
): History {
  const closed = deadline != null && now.getTime() > Date.parse(deadline);
  const keys = Object.keys(patch);
  if (closed && keys.some((k) => k !== 'officialPoints')) {
    if (!('officialPoints' in patch)) return h;
    patch = { officialPoints: patch.officialPoints };
  }
  const cur = h.gamedays[String(gd)] ?? { gameday: gd, updatedAt: now.toISOString() };
  const next: GdRecord = { ...cur, ...patch, gameday: gd, updatedAt: now.toISOString() };
  if (JSON.stringify({ ...cur, updatedAt: '' }) === JSON.stringify({ ...next, updatedAt: '' })) return h;
  return { version: 1, updatedAt: now.toISOString(), gamedays: { ...h.gamedays, [String(gd)]: next } };
}

// ———————————————— Avaliação: o que resultou ————————————————

export interface SwapResult {
  out: string;
  in: string;
  /** pontos reais na jornada (null = ainda não jogou / sem dados) */
  outPts: number | null;
  inPts: number | null;
  gain: number | null;
}

export interface GdEvaluation {
  gameday: number;
  played: boolean;
  done: SwapResult[];
  recommended: SwapResult[];
  noCut: SwapResult[];
  noCutGain: number | null;
  /** ganho real das trocas feitas, já com o custo das pagas */
  doneGain: number | null;
  recommendedGain: number | null;
  captain: { id: string; pts: number | null } | null;
  recommendedCaptain: { id: string; pts: number | null } | null;
  /** melhor capitão possível no plantel (a posteriori) */
  bestCaptain: { id: string; pts: number } | null;
  teamXp: number | null;
  officialPoints: number | null;
}

export function pointsIn(r: Row | undefined, gd: number): number | null {
  const l = r?.history.find((x) => x.gameday === gd);
  return l ? l.points : null;
}

const swapResults = (swaps: SwapIds[], gd: number, byId: Map<string, Row>): SwapResult[] =>
  swaps.map((s) => {
    const outPts = pointsIn(byId.get(s.out), gd);
    const inPts = pointsIn(byId.get(s.in), gd);
    return { ...s, outPts, inPts, gain: outPts != null && inPts != null ? inPts - outPts : null };
  });

const total = (xs: SwapResult[], hits: number): number | null =>
  xs.length === 0 ? 0 : xs.some((x) => x.gain == null) ? null : xs.reduce((a, x) => a + x.gain!, 0) - 4 * hits;

export function evaluateGameday(rec: GdRecord, byId: Map<string, Row>): GdEvaluation {
  const gd = rec.gameday;
  const done = swapResults(rec.done?.swaps ?? [], gd, byId);
  const recommended = swapResults(rec.recommended?.swaps ?? [], gd, byId);
  const noCut = swapResults(rec.recommendedNoCut?.swaps ?? [], gd, byId);
  const squadPts = (rec.squad ?? []).map((id) => ({ id, pts: pointsIn(byId.get(id), gd) })).filter((x): x is { id: string; pts: number } => x.pts != null);
  const played = squadPts.length > 0;
  const cap = rec.done?.captain ?? null;
  const recCap = rec.recommended?.captain ?? null;
  const best = squadPts.reduce<{ id: string; pts: number } | null>((b, x) => (!b || x.pts > b.pts ? x : b), null);
  return {
    gameday: gd,
    played,
    done,
    recommended,
    noCut,
    noCutGain: rec.recommendedNoCut ? total(noCut, rec.recommendedNoCut.hits) : null,
    doneGain: rec.done ? total(done, rec.done.hits) : null,
    recommendedGain: rec.recommended ? total(recommended, rec.recommended.hits) : null,
    captain: cap ? { id: cap, pts: pointsIn(byId.get(cap), gd) } : null,
    recommendedCaptain: recCap ? { id: recCap, pts: pointsIn(byId.get(recCap), gd) } : null,
    bestCaptain: played ? best : null,
    teamXp: rec.teamXp ?? null,
    officialPoints: rec.officialPoints ?? null,
  };
}
