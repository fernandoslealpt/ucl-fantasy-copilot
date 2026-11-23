import type { Http } from '../lib/http.ts';

/**
 * Notícias por equipa via Google News RSS (público, não oficial — usar com moderação).
 * Sem LLM: classificação por palavras-chave e deteção de jogadores pelo apelido no título.
 */
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
  /** duração da lesão lida do título (só quando kind = 'injury') */
  duration?: InjuryDuration;
}

/** 'long' = época/meses (ligamento cruzado, "rest of the season"…); 'weeks' = semanas; 'days' = dias; 'unknown' = sem duração no título. */
export interface InjuryDuration {
  kind: 'long' | 'weeks' | 'days' | 'unknown';
  /** semanas estimadas de ausência (null se desconhecido) */
  weeks: number | null;
}

/** Ausência (semanas) assumida para lesões longas sem prazo explícito (ligamento cruzado: 6–9 meses). */
export const LONG_WEEKS = 26;

const NUM: Record<string, number> = { a: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, few: 3, several: 4, couple: 2 };
const num = (w: string) => (/^\d+$/.test(w) ? Number(w) : (NUM[w] ?? null));

/**
 * Lê a duração de uma lesão a partir do título, sem IA: prazos explícitos (semanas, meses, dias) primeiro;
 * depois lesões que implicam meses (ligamento cruzado, tendão de Aquiles, "season-ending"); cirurgia/fratura = semanas.
 */
export function classifyDuration(title: string): InjuryDuration {
  const t = title.toLowerCase();
  const months = /(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a few|several|a couple of)[- ]+months?/.exec(t);
  if (months) {
    const n = num(months[1]!.replace(/^a couple of$/, 'couple').replace(/^a few$/, 'few')) ?? 3;
    return { kind: 'long', weeks: Math.round(n * 4.3) };
  }
  if (/season[- ]ending|(out|ruled out|sidelined) for (the )?(rest of the |remainder of the |whole |entire )?season|rest of the season|\bacl\b|cruciate|cruzado|achilles|aquiles|months/.test(t)) return { kind: 'long', weeks: LONG_WEEKS };
  const weeks = /(\d+|one|two|three|four|five|six|seven|eight|a few|several|a couple of)[- ]+weeks?/.exec(t);
  if (weeks) {
    const n = num(weeks[1]!.replace(/^a couple of$/, 'couple').replace(/^a few$/, 'few')) ?? 3;
    return { kind: 'weeks', weeks: n };
  }
  if (/a month/.test(t)) return { kind: 'weeks', weeks: 4 };
  const days = /(\d+)[- ]+days?/.exec(t);
  if (days) return { kind: 'days', weeks: Math.max(0.5, Math.round((Number(days[1]) / 7) * 10) / 10) };
  if (/surgery|operation|operado|cirurgia|fractur|broken|ruptur|torn/.test(t)) return { kind: 'weeks', weeks: 8 };
  return { kind: 'unknown', weeks: null };
}

const KEYWORDS = '(injury OR injured OR doubt OR doubtful OR "ruled out" OR sidelined OR surgery OR ACL OR "back in training" OR return OR lesão OR lesionado OR baja OR lesión)';

export function newsUrl(teamName: string): string {
  const q = encodeURIComponent(`"${teamName}" ${KEYWORDS} when:3d`);
  return `https://news.google.com/rss/search?q=${q}&hl=en-GB&gl=GB&ceid=GB:en`;
}

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();

const tag = (xml: string, name: string) => {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`).exec(xml);
  return m ? decode(m[1]!) : '';
};

export function classify(title: string): NewsKind {
  const t = title.toLowerCase();
  // Frases de regresso primeiro ("returns from injury" é regresso, não lesão)
  if (/back in training|returns? (to|from) (training|injury|fitness)|returns? from|fit again|available again|comeback from|regressa|regresa|de volta aos treinos/.test(t))
    return 'return';
  if (/ruled out|sidelined|injur|lesão|lesion|lesión|baja|out for|surgery|operado|fracture|torn|\bacl\b|cruciate|ruptur/.test(t)) return 'injury';
  if (/doubt|fitness|late test|dúvida|duda|knock|race to be fit/.test(t)) return 'doubt';
  return 'other';
}

export const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ø/gi, 'o')
    .toLowerCase();

/** Apelido para procurar no título: último token com 4+ letras (ignora iniciais como "H."). */
export function surname(name: string): string | null {
  const tokens = fold(name)
    .split(/[\s.]+/)
    .filter((t) => t.length >= 4);
  return tokens.at(-1) ?? null;
}

export function parseNewsRss(
  xml: string,
  team: { id: string; name: string },
  roster: { id: string; name: string }[],
): NewsItem[] {
  const items: NewsItem[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const it = m[1]!;
    const rawTitle = tag(it, 'title');
    const source = tag(it, 'source');
    const title = source && rawTitle.endsWith(` - ${source}`) ? rawTitle.slice(0, -source.length - 3) : rawTitle;
    const pub = new Date(tag(it, 'pubDate'));
    if (!title || Number.isNaN(pub.getTime())) continue;
    const words = ` ${fold(title).replace(/[^a-z0-9]+/g, ' ')} `;
    const playerIds = roster
      .filter((p) => {
        const s = surname(p.name);
        return s != null && words.includes(` ${s} `);
      })
      .map((p) => p.id);
    const kind = classify(title);
    items.push({
      id: tag(it, 'guid') || tag(it, 'link'),
      title,
      source,
      url: tag(it, 'link'),
      publishedAt: pub.toISOString(),
      teamId: team.id,
      teamName: team.name,
      kind,
      playerIds,
      ...(kind === 'injury' ? { duration: classifyDuration(title) } : {}),
    });
  }
  return items;
}

export async function fetchTeamNews(
  http: Http,
  team: { id: string; name: string },
  roster: { id: string; name: string }[],
): Promise<NewsItem[]> {
  const xml = await http.getText(newsUrl(team.name), { accept: 'application/rss+xml, application/xml, text/xml' });
  return parseNewsRss(xml, team, roster);
}
