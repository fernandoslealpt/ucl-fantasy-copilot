/**
 * Da leitura (OCR) de uma captura de ecrã da equipa UEFA Fantasy para os 15 jogadores.
 * Sem IA: compara frases lidas com os nomes dos jogadores (com tolerância a erros de leitura)
 * e escolhe os 15 respeitando as regras (2 GR, 5 DEF, 5 MED, 3 AV, máximo por clube).
 */
import { clubLimit, SQUAD } from '../team';
import type { Position, Row } from '../types';

export interface MatchItem {
  id: string;
  /** texto lido que deu origem à correspondência */
  read: string;
  /** 0–1 */
  score: number;
}

export interface ImportResult {
  ids: string[];
  matches: MatchItem[];
  /** palavras que parecem nomes mas não correspondem a ninguém */
  unknown: string[];
  bank: number | null;
}

export const fold = (s: string) =>
  s
    .replace(/ø/gi, 'o')
    .replace(/æ/gi, 'ae')
    .replace(/ß/g, 'ss')
    .replace(/ı/g, 'i')
    .replace(/ł/gi, 'l')
    .replace(/đ/gi, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const clean = (s: string) =>
  fold(s)
    .replace(/[^a-z' -]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Formas como o nome pode aparecer na captura (ex.: "K. Mbappé" → "mbappe", "k mbappe", "kylian mbappe"). */
export function nameKeys(r: Pick<Row, 'name' | 'fullName'>): string[] {
  const keys = new Set<string>();
  const short = clean(r.name);
  const full = clean(r.fullName);
  if (short) keys.add(short);
  if (full) keys.add(full);
  // sem a inicial: "k mbappe" → "mbappe"
  const noInitial = short.replace(/^[a-z] /, '');
  if (noInitial) keys.add(noInitial);
  // apelido(s) do nome completo: últimas 1–2 palavras
  const parts = full.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    keys.add(parts.at(-1)!);
    keys.add(parts.slice(-2).join(' '));
  }
  return [...keys].filter((k) => k.replace(/[^a-z]/g, '').length >= 3);
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
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

/** Semelhança 0–1; nomes curtos têm de ser exatos (evita falsos positivos). */
export function similarity(read: string, key: string): number {
  if (read === key) return 1;
  const len = Math.max(read.length, key.length);
  if (len <= 4) return 0;
  const d = levenshtein(read, key);
  const allowed = len >= 9 ? 2 : 1;
  return d <= allowed ? 1 - d / len : 0;
}

/** Palavras de interface que nunca são nomes de jogadores. */
const STOP = new Set(
  'captain vice bench subs substitutes transfers transfer points pts team pick squad save confirm budget bank remaining value price gameday matchday md gd deadline league leagues home away fixtures stats chips wildcard limitless total average highest rank overall goalkeepers goalkeeper defenders defender midfielders midfielder forwards forward pitch list view my edit reset auto fantasy champions uefa ucl the and vs per'.split(
    ' ',
  ),
);

interface Phrase {
  text: string;
  words: number[];
  /** nome cortado na captura ("Abde Ezzalz...") → comparar pelo início */
  prefix: boolean;
}

/** Frases de 1–3 palavras seguidas na mesma linha. Reticências marcam nomes cortados. */
function phrases(lines: string[]): { list: Phrase[]; words: string[] } {
  const words: string[] = [];
  const list: Phrase[] = [];
  for (const line of lines) {
    // separa em segmentos nas reticências; a última palavra antes delas está cortada
    const segments = line.split(/(\.{2,}|…|,{2,})/);
    for (let s = 0; s < segments.length; s += 2) {
      const toks = clean(segments[s]!).split(' ').filter((t) => t.length > 0);
      const truncated = s + 1 < segments.length;
      const base = words.length;
      words.push(...toks);
      for (let i = 0; i < toks.length; i++)
        for (let n = 1; n <= 3 && i + n <= toks.length; n++) {
          const text = toks.slice(i, i + n).join(' ');
          if (text.replace(/[^a-z]/g, '').length < 3) continue;
          list.push({
            text,
            words: Array.from({ length: n }, (_, k) => base + i + k),
            prefix: truncated && i + n === toks.length,
          });
        }
    }
  }
  return { list, words };
}

/** Semelhança para nomes cortados: o texto lido tem de ser o início do nome (com 1 erro tolerado). */
export function prefixSimilarity(read: string, key: string): number {
  if (read.length < 5 || key.length <= read.length) return 0;
  const head = key.slice(0, read.length);
  if (head === read) return 0.95;
  return levenshtein(head, read) <= 1 && read.length >= 7 ? 0.85 : 0;
}

export function parseBank(text: string): number | null {
  const m = /(bank|banco|in the bank|remaining|restante|budget|or[çc]amento)[^0-9]{0,24}(\d{1,3}(?:[.,]\d{1,2})?)\s*m?/i.exec(text);
  if (!m) return null;
  const v = Number(m[2]!.replace(',', '.'));
  return Number.isFinite(v) && v >= 0 && v <= 120 ? v : null;
}

export function matchTeam(
  lines: string[],
  rows: Row[],
  opts: { gameday?: number | null; current?: string[] } = {},
): ImportResult {
  const { list, words } = phrases(lines);
  const current = new Set(opts.current ?? []);

  // Índice: chave → jogadores
  const byKey = new Map<string, Row[]>();
  for (const r of rows) {
    if (!r.status.active && !current.has(r.id)) continue;
    for (const k of nameKeys(r)) byKey.set(k, [...(byKey.get(k) ?? []), r]);
  }
  const keys = [...byKey.keys()];

  // Candidatos: frase lida × jogador
  type Cand = { p: Phrase; r: Row; score: number; rank: number };
  const cands: Cand[] = [];
  for (const p of list) {
    if (p.words.length === 1 && STOP.has(p.text)) continue;
    const exact = byKey.get(p.text);
    const hits: [string, number][] = exact
      ? [[p.text, 1]]
      : keys
          .map((k) => [k, Math.max(similarity(p.text, k), p.prefix ? prefixSimilarity(p.text, k) : 0)] as [string, number])
          .filter(([, s]) => s >= 0.8);
    for (const [k, s] of hits) {
      const players = byKey.get(k)!;
      for (const r of players) {
        // Desempate entre homónimos: jogador já na equipa, mais escolhido, mais pontos esperados
        const prior =
          (current.has(r.id) ? 0.06 : 0) +
          0.02 * Math.log10(1 + r.selectedPct) +
          0.01 * Math.min(1, (r.xp?.xp3 ?? 0) / 15) -
          (players.length > 1 ? 0.01 : 0);
        // Frases mais longas (nome completo, "K. Mbappé") valem mais do que uma palavra solta
        const rank = s + 0.1 * (p.words.length - 1) + prior;
        cands.push({ p, r, score: s, rank });
      }
    }
  }
  cands.sort((a, b) => b.rank - a.rank);

  const usedWords = new Set<number>();
  const chosen = new Map<string, MatchItem>();
  const counts: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  const perClub = new Map<string, number>();
  const limit = clubLimit(opts.gameday ?? null);
  for (const c of cands) {
    if (chosen.size >= 15) break;
    if (chosen.has(c.r.id)) continue;
    if (c.p.words.some((w) => usedWords.has(w))) continue;
    if (counts[c.r.position] >= SQUAD[c.r.position]) continue;
    if ((perClub.get(c.r.teamId) ?? 0) >= limit) continue;
    chosen.set(c.r.id, { id: c.r.id, read: c.p.text, score: Math.round(c.score * 100) / 100 });
    c.p.words.forEach((w) => usedWords.add(w));
    counts[c.r.position]++;
    perClub.set(c.r.teamId, (perClub.get(c.r.teamId) ?? 0) + 1);
  }

  // Palavras não usadas que parecem apelidos (para o utilizador perceber o que falhou)
  const unknown = [
    ...new Set(
      lines
        .flatMap((l) => l.split(/\s+/))
        .map((w) => w.replace(/[^\p{L}'-]/gu, ''))
        .filter((w) => w.length >= 4 && /^\p{Lu}/u.test(w) && !STOP.has(clean(w))),
    ),
  ].filter((w) => {
    const c = clean(w);
    return !words.some((x, i) => x === c && usedWords.has(i));
  });

  const ids = [...chosen.keys()];
  return {
    ids,
    matches: [...chosen.values()],
    unknown: unknown.slice(0, 12),
    bank: parseBank(lines.join('\n')),
  };
}
