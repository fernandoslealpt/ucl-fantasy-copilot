/**
 * Fase 0 — sonda das fontes de dados, corrida a partir dos runners do GitHub.
 * Faz 1 pedido por candidato e regista estado, tamanho, tempo e estrutura (sem dados pessoais).
 */
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { writeJson, writeText } from './lib/files.ts';
import { USER_AGENT } from './lib/http.ts';
import { isoDate, uefaSeasonYear } from './lib/time.ts';

interface Candidate {
  name: string;
  url: string;
  headers?: Record<string, string>;
  note?: string;
}

interface ProbeResult {
  name: string;
  url: string;
  ok: boolean;
  status: number | null;
  contentType: string | null;
  bytes: number;
  ms: number;
  shape: string;
  error?: string;
  note?: string;
}

function describe(text: string, contentType: string | null): string {
  try {
    const json = JSON.parse(text) as unknown;
    const walk = (v: unknown, depth: number): string => {
      if (Array.isArray(v)) return `[${v.length}]${v.length && depth < 3 ? ` of ${walk(v[0], depth + 1)}` : ''}`;
      if (v && typeof v === 'object') {
        const keys = Object.keys(v);
        if (depth >= 3) return `{${keys.slice(0, 8).join(',')}${keys.length > 8 ? ',…' : ''}}`;
        return `{${keys
          .slice(0, 10)
          .map((k) => `${k}:${walk((v as Record<string, unknown>)[k], depth + 1)}`)
          .join(', ')}${keys.length > 10 ? ', …' : ''}}`;
      }
      return typeof v;
    };
    return walk(json, 0).slice(0, 600);
  } catch {
    const firstLine = text.split(/\r?\n/)[0] ?? '';
    return `${contentType ?? 'texto'} · 1.ª linha: ${firstLine.slice(0, 200)}`;
  }
}

export function candidates(now: Date, apiFootballKey?: string): Candidate[] {
  const season = uefaSeasonYear(now);
  const fantasy = 'https://gaming.uefa.com/en/uclfantasy/services/api/Feed';
  const list: Candidate[] = [
    { name: 'uefa-fantasy players (atual)', url: `${fantasy}/players?language=en` },
    { name: 'uefa-fantasy players (J1)', url: `${fantasy}/players?gamedayId=1&language=en` },
    { name: 'uefa-fantasy fixtures?', url: `${fantasy}/fixtures?language=en`, note: 'palpite' },
    { name: 'uefa-fantasy gamedays?', url: `${fantasy}/gamedays?language=en`, note: 'palpite' },
    { name: 'uefa-fantasy teams?', url: `${fantasy}/teams?language=en`, note: 'palpite' },
    {
      name: 'uefa match API (fase de liga)',
      url: `https://match.uefa.com/v5/matches?competitionId=1&seasonYear=${season}&fromDate=${season - 1}-09-01&toDate=${season}-06-30&limit=50&offset=0&order=ASC`,
    },
    {
      name: 'uefa match API (limit=100)',
      url: `https://match.uefa.com/v5/matches?competitionId=1&seasonYear=${season}&fromDate=${season - 1}-09-01&toDate=${season}-06-30&limit=100&offset=0&order=ASC`,
    },
    { name: 'uefa standings', url: `https://standings.uefa.com/v1/standings?competitionId=1&seasonYear=${season}` },
    { name: 'clubelo ranking (http)', url: `http://api.clubelo.com/${isoDate(now)}` },
    { name: 'clubelo ranking (https)', url: `https://api.clubelo.com/${isoDate(now)}` },
    { name: 'clubelo fixtures', url: 'http://api.clubelo.com/Fixtures' },
    { name: 'google news rss', url: 'https://news.google.com/rss/search?q=%22Champions+League%22+lesão&hl=pt-PT&gl=PT&ceid=PT:pt-150' },
  ];
  if (apiFootballKey) {
    const h = { 'x-apisports-key': apiFootballKey };
    list.push(
      { name: 'api-football status', url: 'https://v3.football.api-sports.io/status', headers: h },
      { name: 'api-football UCL fixtures', url: `https://v3.football.api-sports.io/fixtures?league=2&season=${season - 1}`, headers: h },
      { name: 'api-football UCL injuries', url: `https://v3.football.api-sports.io/injuries?league=2&season=${season - 1}`, headers: h },
    );
  } else {
    list.push({ name: 'api-football', url: '', note: 'sem chave API_FOOTBALL_KEY — não testado' });
  }
  return list;
}

async function probeOne(c: Candidate): Promise<ProbeResult> {
  if (!c.url) return { name: c.name, url: '', ok: false, status: null, contentType: null, bytes: 0, ms: 0, shape: '—', note: c.note };
  const t0 = Date.now();
  try {
    const res = await fetch(c.url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json, text/csv, application/xml, */*', ...c.headers },
      signal: AbortSignal.timeout(30_000),
    });
    const text = await res.text();
    const contentType = res.headers.get('content-type');
    let shape = describe(text, contentType);
    if (c.headers?.['x-apisports-key']) shape = shape.replace(c.headers['x-apisports-key'], '***');
    return {
      name: c.name,
      url: c.url,
      ok: res.ok,
      status: res.status,
      contentType,
      bytes: text.length,
      ms: Date.now() - t0,
      shape,
      note: c.note,
    };
  } catch (e) {
    return {
      name: c.name,
      url: c.url,
      ok: false,
      status: null,
      contentType: null,
      bytes: 0,
      ms: Date.now() - t0,
      shape: '—',
      error: e instanceof Error ? `${e.message}${e.cause instanceof Error ? ` (${e.cause.message})` : ''}` : String(e),
      note: c.note,
    };
  }
}

export async function runProbe(outDir: string, now = new Date()): Promise<ProbeResult[]> {
  const results: ProbeResult[] = [];
  for (const c of candidates(now, process.env.API_FOOTBALL_KEY || undefined)) {
    results.push(await probeOne(c));
    await new Promise((r) => setTimeout(r, 500));
  }
  const md = [
    `# Sonda de fontes — ${now.toISOString()}`,
    '',
    '| Fonte | OK | HTTP | Tamanho | ms | Estrutura / erro |',
    '|---|---|---|---|---|---|',
    ...results.map(
      (r) =>
        `| ${r.name}${r.note ? ` _(${r.note})_` : ''} | ${r.ok ? '✅' : '❌'} | ${r.status ?? '—'} | ${r.bytes} | ${r.ms} | ${(r.error ?? r.shape).replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`,
    ),
  ].join('\n');
  writeJson(join(outDir, 'probe', 'report.json'), { generatedAt: now.toISOString(), results });
  writeText(join(outDir, 'probe', 'report.md'), md);
  console.log(md);
  return results;
}

if (process.argv[1]?.endsWith('probe.ts')) {
  const { values } = parseArgs({ options: { out: { type: 'string', default: 'out' } } });
  runProbe(values.out!).catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
