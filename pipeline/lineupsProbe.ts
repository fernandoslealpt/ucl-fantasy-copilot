/**
 * Sonda (manual): fontes grátis de onzes prováveis, lesões e fóruns, testadas a partir dos runners do GitHub.
 * Para cada candidata: estado HTTP, tamanho, quantos nomes conhecidos aparecem e um excerto à volta do primeiro.
 */
import { USER_AGENT } from './lib/http.ts';

const NAMES = [
  'Yamal', 'Raphinha', 'Kane', 'Mbapp', 'Haaland', 'Saka', 'Salah', 'Vitinha', 'Olise', 'Musiala', 'Bellingham', 'Pedri',
  'Demb', 'Rice', 'Lautaro', 'Wirtz', 'Hakimi', 'Dimarco', 'Timber', 'Barcola', 'Cherki', 'Malen', 'Guéhi', 'Suzuki',
];

const CANDIDATES: { name: string; url: string; headers?: Record<string, string> }[] = [
  { name: 'Fantasy Football Pundit — onzes prováveis UCL', url: 'https://www.fantasyfootballpundit.com/champions-league-predicted-lineups/' },
  { name: 'RotoWire — onzes UCL', url: 'https://www.rotowire.com/soccer/lineups.php?league=UCL' },
  { name: 'Sportsgambler — onzes UCL', url: 'https://www.sportsgambler.com/lineups/football/champions-league/' },
  { name: 'Sportsgambler — onzes (todas)', url: 'https://www.sportsgambler.com/lineups/football/' },
  { name: 'Sportsgambler — lesões UCL', url: 'https://www.sportsgambler.com/injuries/football/champions-league/' },
  { name: 'Sports Mole — UCL', url: 'https://www.sportsmole.co.uk/football/champions-league/' },
  { name: 'Sofascore API — épocas UCL', url: 'https://api.sofascore.com/api/v1/unique-tournament/7/seasons' },
  { name: 'FotMob API — liga UCL', url: 'https://www.fotmob.com/api/leagues?id=42' },
  { name: 'ESPN API — jogos UCL', url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard' },
  { name: 'Reddit JSON — r/UCLFantasy', url: 'https://www.reddit.com/r/UCLFantasy/new.json?limit=5' },
  { name: 'Reddit RSS — r/UCLFantasy', url: 'https://www.reddit.com/r/UCLFantasy/.rss' },
  { name: 'Fantasy Football Scout — UCL', url: 'https://www.fantasyfootballscout.co.uk/category/champions-league/' },
  { name: 'Fantasy Football Reports — UCL', url: 'https://www.fantasyfootballreports.com/category/champions-league/' },
  { name: 'Google News — onzes prováveis UCL', url: 'https://news.google.com/rss/search?q=%22predicted+lineups%22+champions+league&hl=en-GB&gl=GB&ceid=GB:en' },
];

function strip(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/\s+/g, ' ');
}

async function main() {
  const out: string[] = ['# Sonda de onzes prováveis, lesões e fóruns', '', `Data: ${new Date().toISOString()}`, ''];
  for (const c of CANDIDATES) {
    const t0 = Date.now();
    try {
      const res = await fetch(c.url, {
        headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/json,application/xml;q=0.9,*/*;q=0.8', 'accept-language': 'en-GB,en;q=0.9', ...c.headers },
        signal: AbortSignal.timeout(20_000),
        redirect: 'follow',
      });
      const raw = await res.text();
      const text = strip(raw);
      const hits = NAMES.filter((n) => text.includes(n));
      const first = hits[0] ? text.indexOf(hits[0]) : -1;
      const excerpt = first >= 0 ? text.slice(Math.max(0, first - 200), first + 300).trim() : text.slice(0, 300).trim();
      out.push(
        `## ${c.name}`,
        `- URL: ${c.url}`,
        `- Estado: ${res.status} · ${res.headers.get('content-type') ?? '?'} · ${raw.length} bytes · ${Date.now() - t0} ms · final: ${res.url}`,
        `- Nomes encontrados (${hits.length}/${NAMES.length}): ${hits.join(', ') || '—'}`,
        '',
        '```',
        excerpt.slice(0, 600),
        '```',
        '',
      );
    } catch (e) {
      out.push(`## ${c.name}`, `- URL: ${c.url}`, `- ERRO: ${e instanceof Error ? e.message : String(e)} (${Date.now() - t0} ms)`, '');
    }
  }
  console.log(out.join('\n'));
}

await main();
