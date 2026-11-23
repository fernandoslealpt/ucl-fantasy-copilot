import type { Http } from '../lib/http.ts';

/**
 * "Leituras da UEFA": artigos do site oficial (dicas do Fantasy, team news, antevisões da Champions League)
 * encontrados pela pesquisa pública do Google News restrita a uefa.com (RSS). Só título, link e data: o conteúdo
 * dos artigos não é lido nem copiado. Os sites da UEFA carregam o texto por JavaScript e não têm RSS próprio.
 */
export interface UefaRead {
  id: string;
  title: string;
  url: string;
  publishedAt: string;
  kind: 'fantasy' | 'team-news' | 'preview';
}

const QUERY = 'site:uefa.com (fantasy OR "team news" OR "what to look out for" OR "key stats" OR injuries) "Champions League" when:10d';

export const uefaReadsUrl = () => `https://news.google.com/rss/search?q=${encodeURIComponent(QUERY)}&hl=en-GB&gl=GB&ceid=GB:en`;

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();

const tag = (xml: string, name: string) => {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`).exec(xml);
  return m ? decode(m[1]!) : '';
};

/** Fora: competições femininas, seleções, Liga Europa/Conferência, jovens, qualificação. */
const EXCLUDE = /women|nations league|conference league|europa league|under[- ]?\d|futsal|beach|youth|euro 20|qualif|super cup/i;

/** Só interessa o que ajuda a decidir a equipa: Fantasy, notícias de equipas/lesões e antevisões de jornada. */
const USEFUL = /fantasy|team news|injur|doubt|suspend|ruled out|matchday \d|key stats|look out for|facts|form guide|predicted|line-?ups?/i;
/** Mesmo com palavras úteis, não serve: calendário, classificação, tática, "melhores momentos", apresentações. */
const NOISE = /fixtures|results|standings|tactical|reaction saves|meet the|how teams|history|greatest|classic|best goals|top scorers table/i;

export function classifyRead(title: string): UefaRead['kind'] {
  if (/fantasy/i.test(title)) return 'fantasy';
  if (/team news|injur|doubt|suspend|ruled out|return/i.test(title)) return 'team-news';
  return 'preview';
}

export function parseUefaReads(xml: string, now: Date, maxAgeDays = 10, max = 12): UefaRead[] {
  const seen = new Set<string>();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map((m) => {
      const raw = tag(m[1]!, 'title');
      const source = tag(m[1]!, 'source');
      const title = raw.replace(/\s+[-|]\s+(UEFA\.com|UEFA Gaming|UEFA Champions League)\s*$/i, '').replace(source ? ` - ${source}` : '', '').trim();
      const pub = new Date(tag(m[1]!, 'pubDate'));
      return { title, source, url: tag(m[1]!, 'link'), pub };
    })
    .filter((i) => i.title && !Number.isNaN(i.pub.getTime()) && /uefa/i.test(i.source) && /champions league|fantasy/i.test(i.title) && !EXCLUDE.test(i.title) && USEFUL.test(i.title) && !NOISE.test(i.title))
    .filter((i) => now.getTime() - i.pub.getTime() <= maxAgeDays * 86_400_000 && i.pub.getTime() <= now.getTime() + 3_600_000)
    .sort((a, b) => b.pub.getTime() - a.pub.getTime())
    .filter((i) => {
      const k = i.title.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, max)
    .map((i) => ({ id: i.url || i.title, title: i.title, url: i.url, publishedAt: i.pub.toISOString(), kind: classifyRead(i.title) }));
}

export async function fetchUefaReads(http: Http, now: Date): Promise<UefaRead[]> {
  return parseUefaReads(await http.getText(uefaReadsUrl(), { accept: 'application/rss+xml, application/xml, text/xml' }), now);
}
