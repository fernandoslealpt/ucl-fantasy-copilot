/**
 * Lógica do Plantel (transferências ao estilo da app oficial) e da Jornada (onze, banco, substituições).
 * Tudo puro e testável; os ecrãs só desenham.
 */
import { bestXI, clubLimit, POSITIONS, type MyTeam } from './team';
import type { Position, Row } from './types';

// ———————————————————————————— Plantel em rascunho ————————————————————————————

export interface Slot {
  pos: Position;
  /** jogador que estava no plantel */
  original: string;
  /** jogador atual no lugar (null = lugar vazio depois do ✕) */
  current: string | null;
}

export interface Draft {
  slots: Slot[];
  limitless: boolean;
}

/** Rascunho a partir da equipa guardada: 15 lugares por posição (GR, DEF, MED, AV). */
export function draftFrom(team: MyTeam, byId: Map<string, Row>): Draft {
  const rows = team.players.map((id) => byId.get(id)).filter((r): r is Row => !!r);
  const slots = POSITIONS.flatMap((pos) => rows.filter((r) => r.position === pos).map((r) => ({ pos, original: r.id, current: r.id })));
  return { slots, limitless: false };
}

export const removeSlot = (d: Draft, i: number): Draft => ({ ...d, slots: d.slots.map((s, k) => (k === i ? { ...s, current: null } : s)) });
export const restoreSlot = (d: Draft, i: number): Draft => ({ ...d, slots: d.slots.map((s, k) => (k === i ? { ...s, current: s.original } : s)) });
export const resetDraft = (d: Draft): Draft => ({ ...d, slots: d.slots.map((s) => ({ ...s, current: s.original })) });

/** Põe `id` no lugar `i` (tem de ser da mesma posição e não estar já no plantel). */
export function placeInSlot(d: Draft, i: number, r: Row): Draft {
  const s = d.slots[i];
  if (!s || s.pos !== r.position) return d;
  if (d.slots.some((x, k) => k !== i && x.current === r.id)) return d;
  return { ...d, slots: d.slots.map((x, k) => (k === i ? { ...x, current: r.id } : x)) };
}

export interface DraftSummary {
  swaps: { out: string; in: string }[];
  /** lugares vazios por preencher */
  empty: number;
  /** dinheiro restante (pode ser negativo, só como referência) */
  bank: number;
  free: number;
  /** transferências pagas (−4 cada); 0 com Limitless */
  hits: number;
  /** clubes acima do limite */
  overClub: string[];
  /** pronto para rever: sem vazios, banco ≥ 0 (ou Limitless) e limite por clube */
  valid: boolean;
}

const round1 = (x: number) => Math.round(x * 10) / 10;

export function summarize(d: Draft, team: MyTeam, byId: Map<string, Row>, free: number, gameday: number): DraftSummary {
  let bank = team.bank;
  const swaps: DraftSummary['swaps'] = [];
  let empty = 0;
  for (const s of d.slots) {
    if (s.current === s.original) continue;
    bank += byId.get(s.original)?.price ?? 0;
    if (s.current == null) {
      empty++;
      continue;
    }
    bank -= byId.get(s.current)?.price ?? 0;
    swaps.push({ out: s.original, in: s.current });
  }
  const perClub = new Map<string, { name: string; n: number }>();
  for (const s of d.slots) {
    const r = s.current ? byId.get(s.current) : null;
    if (!r) continue;
    const c = perClub.get(r.teamId) ?? { name: r.teamName, n: 0 };
    perClub.set(r.teamId, { ...c, n: c.n + 1 });
  }
  const limit = d.limitless ? Infinity : clubLimit(gameday);
  const overClub = [...perClub.values()].filter((c) => c.n > limit).map((c) => c.name);
  const hits = d.limitless ? 0 : Math.max(0, swaps.length - free);
  bank = round1(bank);
  return { swaps, empty, bank, free, hits, overClub, valid: empty === 0 && (d.limitless || bank >= -1e-6) && overClub.length === 0 };
}

/** Ids do plantel atual do rascunho (só lugares preenchidos). */
export const draftIds = (d: Draft) => d.slots.map((s) => s.current).filter((x): x is string => !!x);

// ———————————————————————————— Jornada: onze e banco ————————————————————————————

export interface Lineup {
  gameday: number;
  /** 11 titulares */
  xi: string[];
  /** banco pela ordem das substituições: [GR, 1.º, 2.º, 3.º] */
  bench: string[];
}

const MIN = { GK: 1, DEF: 3, MID: 2, FWD: 1 } as const;
const MAX = { GK: 1, DEF: 5, MID: 5, FWD: 3 } as const;

export function validXI(ids: string[], byId: Map<string, Row>): boolean {
  if (ids.length !== 11) return false;
  const c: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const id of ids) {
    const r = byId.get(id);
    if (!r) return false;
    c[r.position]++;
  }
  return POSITIONS.every((p) => c[p] >= MIN[p] && c[p] <= MAX[p]);
}

/** Onze com mais xP (formação válida) e banco: GR primeiro, depois por xP. */
export function defaultLineup(squad: Row[], gameday: number, xpAt: (r: Row) => number): Lineup {
  const { xi, bench } = bestXI(squad, xpAt);
  const gk = bench.filter((r) => r.position === 'GK');
  const out = bench.filter((r) => r.position !== 'GK');
  return { gameday, xi: xi.map((r) => r.id), bench: [...gk, ...out].map((r) => r.id) };
}

/**
 * Onze da jornada: o guardado se ainda bate com o plantel; jogadores que saíram por transferência são
 * substituídos por quem entrou (mesmo lugar). Sem nada guardado, o onze com mais xP.
 */
export function lineupFor(team: MyTeam, squad: Row[], gameday: number, xpAt: (r: Row) => number, byId: Map<string, Row>): { lineup: Lineup; saved: boolean } {
  const saved = team.lineup;
  const ids = new Set(squad.map((r) => r.id));
  if (!saved) return { lineup: defaultLineup(squad, gameday, xpAt), saved: false };
  const all = [...saved.xi, ...saved.bench];
  const missing = all.filter((id) => !ids.has(id));
  const newcomers = squad.filter((r) => !all.includes(r.id));
  if (missing.length !== newcomers.length) return { lineup: defaultLineup(squad, gameday, xpAt), saved: false };
  const pool = [...newcomers];
  const swap = (id: string) => {
    if (ids.has(id)) return id;
    const pos = byId.get(id)?.position;
    const k = pool.findIndex((r) => r.position === pos);
    if (k < 0) return null;
    return pool.splice(k, 1)[0]!.id;
  };
  const xi = saved.xi.map(swap);
  const bench = saved.bench.map(swap);
  if (xi.some((x) => !x) || bench.some((x) => !x) || !validXI(xi as string[], byId)) return { lineup: defaultLineup(squad, gameday, xpAt), saved: false };
  return { lineup: { gameday, xi: xi as string[], bench: bench as string[] }, saved: saved.gameday === gameday };
}

/** Pode trocar `a` com `b`? (titular↔suplente com formação válida, ou dois suplentes de campo para mudar a ordem) */
export function canSwap(l: Lineup, a: string, b: string, byId: Map<string, Row>): boolean {
  if (a === b) return false;
  const inXi = (id: string) => l.xi.includes(id);
  const ra = byId.get(a);
  const rb = byId.get(b);
  if (!ra || !rb) return false;
  if (inXi(a) && inXi(b)) return false;
  if (!inXi(a) && !inXi(b)) return ra.position !== 'GK' && rb.position !== 'GK';
  if ((ra.position === 'GK') !== (rb.position === 'GK')) return false;
  return validXI(applySwap(l, a, b).xi, byId);
}

export function applySwap(l: Lineup, a: string, b: string): Lineup {
  const sw = (id: string) => (id === a ? b : id === b ? a : id);
  return { ...l, xi: l.xi.map(sw), bench: l.bench.map(sw) };
}

/** Sugestão para o onze: trocas titular↔suplente que o onze com mais xP faria, e o ganho. */
export function lineupSuggestion(l: Lineup, squad: Row[], xpAt: (r: Row) => number): { pairs: { out: string; in: string }[]; gain: number } {
  const best = bestXI(squad, xpAt).xi.map((r) => r.id);
  const byId = new Map(squad.map((r) => [r.id, r]));
  const val = (ids: string[]) => ids.reduce((a, id) => a + xpAt(byId.get(id)!), 0);
  const gain = val(best) - val(l.xi);
  const outs = l.xi.filter((id) => !best.includes(id));
  const ins = best.filter((id) => !l.xi.includes(id));
  return { pairs: outs.map((o, i) => ({ out: o, in: ins[i]! })).filter((p) => p.in), gain };
}

/**
 * E se o jogador `id` não jogar? Substituição automática pela ordem do banco (GR por GR; de campo, o primeiro
 * do banco que mantenha a formação válida) e, se era capitão, o vice passa a contar a dobrar.
 */
export function ifAbsent(
  l: Lineup,
  id: string,
  byId: Map<string, Row>,
  xpAt: (r: Row) => number,
  captainId: string | null,
  viceId: string | null,
): { before: number; after: number; subIn: string | null; newCaptain: string | null } {
  const val = (xi: string[], cap: string | null) => xi.reduce((a, x) => a + xpAt(byId.get(x)!), 0) + (cap && xi.includes(cap) ? xpAt(byId.get(cap)!) : 0);
  const before = val(l.xi, captainId);
  if (!l.xi.includes(id)) return { before, after: before, subIn: null, newCaptain: captainId };
  const r = byId.get(id)!;
  const rest = l.xi.filter((x) => x !== id);
  let subIn: string | null = null;
  const cands = r.position === 'GK' ? l.bench.filter((b) => byId.get(b)?.position === 'GK') : l.bench.filter((b) => byId.get(b)?.position !== 'GK');
  for (const b of cands) {
    if (validXI([...rest, b], byId)) {
      subIn = b;
      break;
    }
  }
  const xi = subIn ? [...rest, subIn] : rest;
  const newCaptain = captainId === id ? (viceId && xi.includes(viceId) ? viceId : null) : captainId;
  return { before, after: val(xi, newCaptain), subIn, newCaptain };
}
