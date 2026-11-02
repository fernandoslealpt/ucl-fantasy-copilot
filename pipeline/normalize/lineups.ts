/**
 * Liga os onzes prováveis da RotoWire aos jogadores e jogos da UEFA.
 * A equipa de cada lado decide-se pela maioria dos nomes reconhecidos; depois cada nome é procurado só dentro dessa equipa.
 */
import type { RwMatch, RwPlayer, RwSide, RwTag } from '../sources/rotowire.ts';
import type { Fixture, Player } from '../types.ts';

export interface TeamLineup {
  teamId: string;
  teamName: string;
  gameday: number;
  status: 'predicted' | 'confirmed';
  /** IDs UEFA dos 11 (os que foi possível reconhecer) */
  starters: string[];
  injuries: { id: string; tag: RwTag }[];
  /** nomes da RotoWire sem correspondência (para diagnóstico) */
  unmatched: string[];
}

export interface Lineups {
  fetchedAt: string;
  source: 'rotowire';
  teams: TeamLineup[];
  stats: { matches: number; sides: number; listed: number; matched: number };
}

/** Sinal para a probabilidade de ser titular na próxima jornada. */
export interface StartSignal {
  gameday: number;
  /** 'start' = no onze; 'bench' = a equipa tem onze e ele não está; null = sem informação */
  lineup: 'start' | 'bench' | null;
  confirmed: boolean;
  tag: RwTag | null;
  news: 'injury' | 'doubt' | 'return' | null;
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ø/gi, 'o')
    .replace(/æ/gi, 'ae')
    .replace(/ß/g, 'ss')
    .replace(/ł/gi, 'l')
    .replace(/ı/g, 'i')
    .toLowerCase()
    .replace(/[^a-z' -]+/g, ' ')
    .replace(/[-']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokens = (s: string) => fold(s).split(' ').filter((t) => t.length >= 2);

function lev(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length]!;
}

/** Procura um nome da RotoWire entre os jogadores de uma equipa (ou de todas). */
export function findPlayer(rw: Pick<RwPlayer, 'name' | 'full'>, pool: Player[]): Player | null {
  const full = fold(rw.full);
  const short = fold(rw.name);
  const exact = pool.filter((p) => fold(p.fullName) === full || fold(p.name) === full || fold(p.name) === short);
  if (exact.length === 1) return exact[0]!;
  const rt = tokens(rw.full).filter((t) => t.length >= 3);
  if (!rt.length) return null;
  const pt = (p: Player) => new Set([...tokens(p.fullName), ...tokens(p.name)]);
  // todas as palavras do nome RotoWire aparecem no nome UEFA
  const all = pool.filter((p) => {
    const s = pt(p);
    return rt.every((t) => s.has(t));
  });
  if (all.length === 1) return all[0]!;
  // o apelido (última palavra) aparece e a inicial bate certo
  const last = rt.at(-1)!;
  const initial = fold(rw.full)[0];
  const bySurname = pool.filter((p) => pt(p).has(last));
  if (bySurname.length === 1) return bySurname[0]!;
  const withInitial = bySurname.filter((p) => fold(p.fullName)[0] === initial || fold(p.name)[0] === initial);
  if (withInitial.length === 1) return withInitial[0]!;
  // apelido com 1 letra diferente (grafias: "Matviyenko"/"Matviienko")
  if (last.length >= 6) {
    const near = pool.filter((p) => [...pt(p)].some((t) => t.length >= 6 && lev(t, last) <= 1));
    if (near.length === 1) return near[0]!;
  }
  return null;
}

function teamOf(sideData: RwSide, players: Player[]): string | null {
  const votes = new Map<string, number>();
  for (const rw of [...sideData.starters, ...sideData.injuries]) {
    const p = findPlayer(rw, players);
    if (p) votes.set(p.teamId, (votes.get(p.teamId) ?? 0) + 1);
  }
  const best = [...votes].sort((a, b) => b[1] - a[1])[0];
  return best && best[1] >= 3 ? best[0] : null;
}

export function matchLineups(matches: RwMatch[], players: Player[], fixtures: Fixture[], fetchedAt: string): Lineups {
  const active = players.filter((p) => p.status.active || p.availability !== 'inactive');
  const teams: TeamLineup[] = [];
  let listed = 0;
  let matched = 0;
  for (const m of matches) {
    const homeId = teamOf(m.home, active);
    const visitId = teamOf(m.visit, active);
    if (!homeId || !visitId) continue;
    // o jogo destas duas equipas no calendário (na fase de liga há só um)
    const fx = fixtures
      .filter((f) => f.gameday != null && ((f.homeId === homeId && f.awayId === visitId) || (f.homeId === visitId && f.awayId === homeId)))
      .sort((a, b) => (a.gameday ?? 0) - (b.gameday ?? 0))
      .find((f) => f.status !== 'FINISHED' && !f.score) ?? null;
    if (!fx || fx.gameday == null) continue;
    for (const [teamId, s] of [
      [homeId, m.home],
      [visitId, m.visit],
    ] as const) {
      if (s.status === 'unknown' || !s.starters.length) continue;
      const pool = active.filter((p) => p.teamId === teamId);
      const starters: string[] = [];
      const injuries: { id: string; tag: RwTag }[] = [];
      const unmatched: string[] = [];
      for (const rw of s.starters) {
        listed++;
        const p = findPlayer(rw, pool);
        if (p) {
          matched++;
          starters.push(p.id);
        } else unmatched.push(rw.full);
      }
      for (const rw of s.injuries) {
        listed++;
        const p = findPlayer(rw, pool);
        if (p && rw.tag) {
          matched++;
          injuries.push({ id: p.id, tag: rw.tag });
        } else if (!p) unmatched.push(rw.full);
      }
      teams.push({
        teamId,
        teamName: pool[0]?.teamName ?? teamId,
        gameday: fx.gameday,
        status: s.status,
        starters,
        injuries,
        unmatched,
      });
    }
  }
  return { fetchedAt, source: 'rotowire', teams, stats: { matches: matches.length, sides: teams.length, listed, matched } };
}

/**
 * Sinais por jogador para a próxima jornada: onze provável/confirmado + lesões da RotoWire + notícias recentes.
 * Notícias só contam nas últimas 72 h e só quando não há onze nem estado na RotoWire.
 */
export function startSignals(
  lineups: Lineups | null,
  news: { publishedAt: string; kind: 'injury' | 'doubt' | 'return' | 'other'; playerIds: string[] }[],
  players: Pick<Player, 'id' | 'teamId'>[],
  nowIso: string,
  gameday: number,
): Map<string, StartSignal> {
  const out = new Map<string, StartSignal>();
  const get = (id: string) => {
    let s = out.get(id);
    if (!s) {
      s = { gameday, lineup: null, confirmed: false, tag: null, news: null };
      out.set(id, s);
    }
    return s;
  };
  const byTeam = new Map<string, TeamLineup>();
  for (const t of lineups?.teams ?? []) if (t.gameday === gameday && t.starters.length >= 9) byTeam.set(t.teamId, t);
  for (const p of players) {
    const t = byTeam.get(p.teamId);
    if (!t) continue;
    Object.assign(get(p.id), { lineup: t.starters.includes(p.id) ? 'start' : 'bench', confirmed: t.status === 'confirmed' });
  }
  for (const t of byTeam.values()) for (const i of t.injuries) get(i.id).tag = i.tag;
  const now = Date.parse(nowIso);
  const recent = news
    .filter((n) => n.kind !== 'other' && now - Date.parse(n.publishedAt) <= 72 * 3600_000)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  for (const n of recent)
    for (const id of n.playerIds) {
      const s = get(id);
      if (s.news == null) s.news = n.kind as StartSignal['news'];
    }
  return out;
}
