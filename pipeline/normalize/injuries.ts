/**
 * Registo de lesões detetadas nas notícias, com duração e memória entre execuções.
 * O Google News só dá as últimas 72 h; sem este registo, uma lesão longa (ex.: ligamento cruzado) "desaparecia" ao fim de 3 dias.
 * Sem IA: duração lida do título (classifyDuration); "confirmada" com 2+ fontes diferentes (ou 1 fonte + RotoWire OUT);
 * "suspeita" com 1 fonte. Regressos (notícia de regresso posterior) e prazos ultrapassados apagam a entrada.
 */
import type { InjuryDuration, NewsItem } from '../sources/news.ts';
import { LONG_WEEKS } from '../sources/news.ts';
import type { Lineups } from './lineups.ts';
import type { Fixture, Player } from '../types.ts';

export interface InjuryEvidence {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  duration: InjuryDuration;
}

export interface Injury {
  playerId: string;
  name: string;
  teamId: string;
  teamName: string;
  /** data da primeira notícia */
  since: string;
  severity: InjuryDuration['kind'];
  status: 'confirmed' | 'suspected';
  /** regresso estimado (ISO) */
  expectedBack: string;
  /** true = a duração não vem escrita nas notícias (estimativa por tipo de lesão); false = prazo explícito */
  assumed: boolean;
  /** última jornada em que se conta como ausente (null = sem jornadas conhecidas dentro do prazo) */
  outUntilGameday: number | null;
  evidence: InjuryEvidence[];
  /** porquê, em PT-PT */
  basis: string;
}

export interface InjuryRegistry {
  updatedAt: string;
  injuries: Injury[];
}

const DAY = 86_400_000;
/** Notícias de lesão com mais de 14 dias deixam de ser prova nova (a entrada vive até ao regresso estimado). */
const FRESH_MS = 14 * DAY;

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const RANK = { unknown: 0, days: 1, weeks: 2, long: 3 } as const;

function gamedayAt(teamId: string, fixtures: Fixture[], backIso: string): number | null {
  const mine = fixtures.filter((f) => f.gameday != null && f.kickoff && (f.homeId === teamId || f.awayId === teamId));
  const absent = mine.filter((f) => Date.parse(f.kickoff!) < Date.parse(backIso));
  return absent.length ? Math.max(...absent.map((f) => f.gameday!)) : null;
}

const weeksLabel = (w: number) => (w >= 20 ? `${Math.round(w / 4.3)} meses` : `${Math.round(w)} semanas`);

export function updateInjuries(
  prev: InjuryRegistry | null,
  news: NewsItem[],
  players: Pick<Player, 'id' | 'name' | 'teamId' | 'teamName'>[],
  fixtures: Fixture[],
  nowIso: string,
  lineups: Lineups | null = null,
): InjuryRegistry {
  const now = Date.parse(nowIso);
  const byId = new Map(players.map((p) => [p.id, p]));
  const outTags = new Set<string>();
  for (const t of lineups?.teams ?? []) for (const i of t.injuries) if (i.tag === 'OUT') outTags.add(i.id);

  // provas por jogador: as guardadas + as novas (sem duplicados). Notícias com 2+ jogadores no título são ambíguas: ignoradas.
  const ev = new Map<string, Map<string, InjuryEvidence>>();
  const add = (id: string, e: InjuryEvidence) => {
    const m = ev.get(id) ?? new Map<string, InjuryEvidence>();
    m.set(norm(e.title), e);
    ev.set(id, m);
  };
  for (const inj of prev?.injuries ?? []) for (const e of inj.evidence) add(inj.playerId, e);
  const returned = new Map<string, number>();
  for (const n of news) {
    if (n.playerIds.length !== 1) continue;
    const id = n.playerIds[0]!;
    const at = Date.parse(n.publishedAt);
    if (n.kind === 'return') returned.set(id, Math.max(returned.get(id) ?? 0, at));
    else if (n.kind === 'injury')
      add(id, { title: n.title, source: n.source, url: n.url, publishedAt: n.publishedAt, duration: n.duration ?? { kind: 'unknown', weeks: null } });
  }

  const injuries: Injury[] = [];
  for (const [id, m] of ev) {
    const p = byId.get(id);
    if (!p) continue;
    // um regresso posterior à lesão apaga-a
    const evs = [...m.values()].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
    const ret = returned.get(id) ?? 0;
    const live = evs.filter((e) => Date.parse(e.publishedAt) > ret);
    if (!live.length) continue;
    const fresh = live.filter((e) => now - Date.parse(e.publishedAt) <= FRESH_MS);
    const kinds = (fresh.length ? fresh : live).map((e) => e.duration.kind);
    const severity = kinds.reduce<InjuryDuration['kind']>((a, k) => (RANK[k] > RANK[a] ? k : a), 'unknown');
    // sem duração nas notícias não há registo: essas lesões só valem pelo sinal de 72 h (lineups.ts), para não dar alarmes falsos
    if (severity === 'unknown') continue;
    const sources = new Set(live.map((e) => e.source || e.url));
    const status: Injury['status'] = sources.size >= 2 || (sources.size >= 1 && outTags.has(id)) ? 'confirmed' : 'suspected';
    const since = live[0]!.publishedAt;
    const explicit = live.filter((e) => e.duration.kind === severity && e.duration.weeks != null).map((e) => e.duration.weeks!);
    const weeks = explicit.length ? Math.max(...explicit) : LONG_WEEKS;
    // "assumida": o título não traz o prazo (só o tipo de lesão: cruzado, cirurgia…); explícita: "6 semanas", "3 meses"
    const assumed = !live.some((e) => e.duration.kind === severity && e.duration.explicit);
    const expectedBack = new Date(Date.parse(since) + weeks * 7 * DAY).toISOString();
    if (Date.parse(expectedBack) < now) continue; // já deve ter voltado
    const outUntilGameday = gamedayAt(p.teamId, fixtures, expectedBack);
    const lastSrc = live.at(-1)!;
    const basis = `${status === 'confirmed' ? 'Lesão' : 'Possível lesão'} ${severity === 'long' ? 'longa' : severity === 'weeks' ? 'de semanas' : 'curta'} (${sources.size} fonte${sources.size > 1 ? 's' : ''}): ausência ${assumed ? 'estimada' : 'indicada'} de ${weeksLabel(weeks)} — "${lastSrc.title}".`;
    injuries.push({
      playerId: id,
      name: p.name,
      teamId: p.teamId,
      teamName: p.teamName,
      since,
      severity,
      status,
      expectedBack,
      assumed,
      outUntilGameday,
      evidence: live.slice(-6),
      basis,
    });
  }
  injuries.sort((a, b) => RANK[b.severity] - RANK[a.severity] || a.name.localeCompare(b.name));
  return { updatedAt: nowIso, injuries };
}

/** Para o modelo: só lesões com prazo (ausência certa em jornadas concretas). */
export function injuryAbsences(reg: InjuryRegistry | null): Map<string, { outUntilGameday: number; status: 'confirmed' | 'suspected' }> {
  const out = new Map<string, { outUntilGameday: number; status: 'confirmed' | 'suspected' }>();
  for (const i of reg?.injuries ?? []) if (i.outUntilGameday != null) out.set(i.playerId, { outUntilGameday: i.outUntilGameday, status: i.status });
  return out;
}
