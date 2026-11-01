/**
 * Descoberta de endpoints do jogo UCL Fantasy (corre no GitHub Actions).
 * 1) Descarrega a página do jogo e os seus ficheiros JS.
 * 2) Extrai todos os caminhos `services/...` e `feeds/...` que o site usa.
 * 3) Testa candidatos de estatísticas por jogador (pontos por jornada) com um jogador conhecido.
 * Só leitura de páginas e feeds públicos; nada é publicado.
 */
import { USER_AGENT } from './lib/http.ts';

const BASE = 'https://gaming.uefa.com';
const GAME = `${BASE}/en/uclfantasy`;
const PLAYER = process.env.PLAYER_ID ?? '250016833'; // H. Kane

async function get(url: string): Promise<{ status: number; text: string; type: string }> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
      signal: AbortSignal.timeout(30_000),
      redirect: 'follow',
    });
    return { status: res.status, text: await res.text(), type: res.headers.get('content-type') ?? '' };
  } catch (e) {
    return { status: 0, text: String(e), type: '' };
  }
}

function shape(text: string): string {
  try {
    const walk = (v: unknown, d: number): string => {
      if (Array.isArray(v)) return `[${v.length}]${v.length && d < 4 ? ` of ${walk(v[0], d + 1)}` : ''}`;
      if (v && typeof v === 'object') {
        const k = Object.keys(v);
        if (d >= 4) return `{${k.slice(0, 12).join(',')}}`;
        return `{${k.slice(0, 14).map((x) => `${x}:${walk((v as Record<string, unknown>)[x], d + 1)}`).join(', ')}}`;
      }
      return JSON.stringify(v)?.slice(0, 40) ?? 'null';
    };
    return walk(JSON.parse(text), 0).slice(0, 1500);
  } catch {
    return text.slice(0, 200).replace(/\s+/g, ' ');
  }
}

async function dumpPopup() {
  const r = await get(`${GAME}/services/feeds/popupstats/popupstats_90_${PLAYER}.json`);
  console.log(`# popupstats_90_${PLAYER}: HTTP ${r.status}, ${r.text.length} bytes\n`);
  const v = (JSON.parse(r.text) as { data: { value: Record<string, unknown> } }).data.value;
  for (const [k, val] of Object.entries(v)) {
    if (Array.isArray(val)) {
      console.log(`## ${k}: array[${val.length}]`);
      for (const item of val.slice(0, 3)) console.log(JSON.stringify(item).slice(0, 2500));
    } else if (val && typeof val === 'object') {
      console.log(`## ${k}: ${JSON.stringify(val).slice(0, 2500)}`);
    } else console.log(`- ${k} = ${JSON.stringify(val)}`);
  }
}

async function main() {
  if (process.env.DUMP_POPUP) return dumpPopup();
  const out: string[] = ['# Descoberta de endpoints UCL Fantasy', ''];

  // 1) Página + scripts
  const page = await get(`${GAME}/`);
  out.push(`Página do jogo: HTTP ${page.status}, ${page.text.length} bytes`, '');
  const scripts = new Set<string>();
  for (const m of page.text.matchAll(/<script[^>]+src=["']([^"']+)["']/g)) scripts.add(new URL(m[1]!, `${GAME}/`).href);
  for (const m of page.text.matchAll(/["']([^"']+\.js)["']/g)) {
    try {
      scripts.add(new URL(m[1]!, `${GAME}/`).href);
    } catch {
      /* ignora */
    }
  }
  out.push(`Scripts encontrados: ${scripts.size}`);

  // 2) Caminhos de API nos scripts (inclui chunks referidos dentro dos próprios scripts)
  const endpoints = new Map<string, string>();
  const seen = new Set<string>();
  const queue = [...scripts].filter((s) => s.includes('uefa'));
  const grab = (text: string) => {
    for (const m of text.matchAll(/["'`]([^"'`\s]{0,80}(?:services\/(?:api|feeds)|\/api\/)[^"'`\s]{2,160})["'`]/g)) {
      const path = m[1]!;
      if (!endpoints.has(path)) {
        const i = m.index ?? 0;
        endpoints.set(path, text.slice(Math.max(0, i - 80), i + path.length + 80).replace(/\s+/g, ' '));
      }
    }
    for (const m of text.matchAll(/["']((?:\.\/|\/)?[\w./-]*?chunk[\w.-]*\.js|static\/js\/[\w.-]+\.js)["']/g)) {
      try {
        const u = new URL(m[1]!, `${GAME}/`).href;
        if (!seen.has(u)) queue.push(u);
      } catch {
        /* ignora */
      }
    }
  };
  grab(page.text);
  while (queue.length && seen.size < 60) {
    const url = queue.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);
    const js = await get(url);
    out.push(`- ${js.status} ${js.text.length}B ${url}`);
    if (js.status === 200) grab(js.text);
  }
  out.push('', `## Caminhos de API encontrados (${endpoints.size})`, '');
  for (const [p, ctx] of endpoints) out.push(`- \`${p}\`  ← …${ctx}…`);

  // 3) Candidatos de estatísticas por jogador
  const candidates = [
    `${GAME}/services/api/Feed/popupstats?playerId=${PLAYER}&language=en`,
    `${GAME}/services/api/Feed/playerstats?playerId=${PLAYER}&language=en`,
    `${GAME}/services/api/Feed/PlayerStats?playerId=${PLAYER}&language=en`,
    `${GAME}/services/api/Feed/playerdetails?playerId=${PLAYER}&language=en`,
    `${GAME}/services/api/Feed/player?playerId=${PLAYER}&language=en`,
    `${GAME}/services/api/Feed/popupstats/${PLAYER}?language=en`,
    `${GAME}/services/api/Stats/player?playerId=${PLAYER}&language=en`,
    ...[60, 70, 80, 90, 100, 110, 120].map((t) => `${GAME}/services/feeds/popupstats/popupstats_${t}_${PLAYER}.json`),
    `${GAME}/services/feeds/popupstats/popupstats_${PLAYER}.json`,
  ];
  // + qualquer endpoint encontrado que pareça ser de jogador/estatísticas
  for (const p of endpoints.keys()) {
    if (!/popup|stat|player|history|gameday|point/i.test(p)) continue;
    const filled = p.replace(/\{[^}]*\}|\$\{[^}]*\}/g, PLAYER);
    try {
      candidates.push(new URL(filled, `${GAME}/`).href);
    } catch {
      /* ignora */
    }
  }
  out.push('', '## Candidatos testados', '', '| HTTP | Tamanho | URL | Estrutura |', '|---|---|---|---|');
  for (const url of [...new Set(candidates)].slice(0, 60)) {
    const r = await get(url);
    out.push(`| ${r.status} | ${r.text.length} | ${url.replace(GAME, '…')} | ${shape(r.text).replace(/\|/g, '\\|')} |`);
    await new Promise((res) => setTimeout(res, 300));
  }
  console.log(out.join('\n'));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
