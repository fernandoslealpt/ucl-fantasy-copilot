/**
 * Sonda (manual): notícias oficiais da UEFA (team news, Fantasy tips) a partir dos runners do GitHub.
 * Um pedido por endereço, User-Agent identificado, só páginas públicas. Para cada candidata: estado, tamanho,
 * itens (título/data/fonte) quando é RSS, e quantos nomes de jogadores aparecem. Go/no-go decide-se com este relatório.
 */
import { USER_AGENT } from './lib/http.ts';

const NAMES = ['Yamal', 'Raphinha', 'Kane', 'Mbapp', 'Haaland', 'Saka', 'Salah', 'Vitinha', 'Olise', 'Musiala', 'Bellingham', 'Pedri', 'Doué', 'Doue', 'Raya', 'Barcola', 'Cherki', 'Malen'];
const INJURY = /injur|doubt|ruled out|sidelined|team news|fit|suspend|return|lesion|knee|surgery|ACL/i;

const CANDIDATES: { name: string; url: string; kind: 'rss' | 'html' | 'text' }[] = [
  { name: 'robots.txt — www.uefa.com', url: 'https://www.uefa.com/robots.txt', kind: 'text' },
  { name: 'robots.txt — gaming.uefa.com', url: 'https://gaming.uefa.com/robots.txt', kind: 'text' },
  { name: 'Google News RSS — site:uefa.com team news', url: 'https://news.google.com/rss/search?q=site%3Auefa.com+%22team+news%22+when%3A7d&hl=en-GB&gl=GB&ceid=GB%3Aen', kind: 'rss' },
  { name: 'Google News RSS — site:uefa.com fantasy', url: 'https://news.google.com/rss/search?q=site%3Auefa.com+fantasy+when%3A14d&hl=en-GB&gl=GB&ceid=GB%3Aen', kind: 'rss' },
  { name: 'Google News RSS — site:uefa.com injuries', url: 'https://news.google.com/rss/search?q=site%3Auefa.com+%28injury+OR+injured+OR+doubt%29+when%3A7d&hl=en-GB&gl=GB&ceid=GB%3Aen', kind: 'rss' },
  { name: 'UEFA RSS — Champions League (clássico)', url: 'https://www.uefa.com/rssfeed/uefachampionsleague/rss.xml', kind: 'rss' },
  { name: 'UEFA RSS — news', url: 'https://www.uefa.com/rssfeed/news/rss.xml', kind: 'rss' },
  { name: 'UEFA.com — notícias da Champions League', url: 'https://www.uefa.com/uefachampionsleague/news/', kind: 'html' },
  { name: 'UEFA.com — equipa a equipa (team news)', url: 'https://www.uefa.com/uefachampionsleague/news/?filter=team-news', kind: 'html' },
  { name: 'UEFA Fantasy — News & tips', url: 'https://gaming.uefa.com/en/uclfantasy/news-tips', kind: 'html' },
  { name: 'UEFA Fantasy — news', url: 'https://gaming.uefa.com/en/uclfantasy/news', kind: 'html' },
  { name: 'UEFA Fantasy — página inicial', url: 'https://gaming.uefa.com/en/uclfantasy/overview', kind: 'html' },
];

const strip = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/\s+/g, ' ');

const tag = (xml: string, name: string) => {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`).exec(xml);
  return m ? m[1]!.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').trim() : '';
};

async function main() {
  const out: string[] = ['# Sonda: notícias oficiais da UEFA', '', `Data: ${new Date().toISOString()}`, ''];
  for (const c of CANDIDATES) {
    const t0 = Date.now();
    try {
      const res = await fetch(c.url, {
        headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xml,application/rss+xml,text/plain;q=0.9,*/*;q=0.8', 'accept-language': 'en-GB,en;q=0.9' },
        signal: AbortSignal.timeout(20_000),
        redirect: 'follow',
      });
      const raw = await res.text();
      out.push(`## ${c.name}`, `- URL: ${c.url}`, `- Estado: ${res.status} · ${res.headers.get('content-type') ?? '?'} · ${raw.length} bytes · ${Date.now() - t0} ms · final: ${res.url}`);
      if (c.kind === 'text') out.push('', '```', raw.slice(0, 1500), '```', '');
      else if (c.kind === 'rss' && /<item>/.test(raw)) {
        const items = [...raw.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => ({
          title: tag(m[1]!, 'title'),
          date: tag(m[1]!, 'pubDate'),
          source: tag(m[1]!, 'source'),
          link: tag(m[1]!, 'link'),
        }));
        const uefa = items.filter((i) => /uefa/i.test(i.source) || /uefa\.com/i.test(i.link));
        out.push(`- Itens: ${items.length} (da UEFA: ${uefa.length}); com lesões/team news no título: ${items.filter((i) => INJURY.test(i.title)).length}`, '');
        for (const i of items.slice(0, 10)) out.push(`  - ${i.date.slice(0, 22)} | ${i.source || '?'} | ${i.title.slice(0, 110)}`);
        out.push('');
      } else {
        const text = strip(raw);
        const hits = NAMES.filter((n) => text.includes(n));
        const titles = [...raw.matchAll(/<(?:h1|h2|h3)[^>]*>([\s\S]*?)<\/(?:h1|h2|h3)>/gi)].map((m) => strip(m[1]!).trim()).filter((s) => s.length > 15).slice(0, 8);
        out.push(`- Nomes encontrados (${hits.length}): ${hits.join(', ') || '—'}`, `- Títulos na página: ${titles.length ? titles.map((s) => s.slice(0, 80)).join(' · ') : '— (provavelmente carregada por JavaScript)'}`, '', '```', text.slice(0, 400), '```', '');
      }
    } catch (e) {
      out.push(`## ${c.name}`, `- URL: ${c.url}`, `- ERRO: ${e instanceof Error ? e.message : String(e)} (${Date.now() - t0} ms)`, '');
    }
  }
  console.log(out.join('\n'));
}

await main();
