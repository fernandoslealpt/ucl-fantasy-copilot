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
}

const KEYWORDS = '(injury OR injured OR doubt OR doubtful OR "ruled out" OR sidelined OR "back in training" OR return OR lesão OR lesionado OR baja OR lesión)';

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
  if (/ruled out|sidelined|injur|lesão|lesion|lesión|baja|out for|surgery|operado|fracture|torn/.test(t)) return 'injury';
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
    items.push({
      id: tag(it, 'guid') || tag(it, 'link'),
      title,
      source,
      url: tag(it, 'link'),
      publishedAt: pub.toISOString(),
      teamId: team.id,
      teamName: team.name,
      kind: classify(title),
      playerIds,
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
