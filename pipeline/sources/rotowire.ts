import type { Http } from '../lib/http.ts';

/**
 * Onzes prováveis (e confirmados, perto do jogo) da RotoWire para a Liga dos Campeões.
 * Página pública e grátis; 1 pedido por execução do pipeline. Juntam notícias e conferências de imprensa
 * num onze por jogo, mais a lista de lesionados/dúvidas de cada equipa.
 */
export const ROTOWIRE_UCL = 'https://www.rotowire.com/soccer/lineups.php?league=UCL';

export type RwTag = 'OUT' | 'QUES' | 'SUS';

export interface RwPlayer {
  /** nome como aparece ("D. Riznyk") */
  name: string;
  /** nome completo (atributo title: "Dmytro Riznyk") */
  full: string;
  pos: string;
  tag: RwTag | null;
}

export interface RwSide {
  status: 'predicted' | 'confirmed' | 'unknown';
  starters: RwPlayer[];
  injuries: RwPlayer[];
}

export interface RwMatch {
  home: RwSide;
  visit: RwSide;
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();

const PLAYER =
  /<li class="lineup__player[^"]*">\s*<div class="lineup__pos[^"]*">([^<]*)<\/div>\s*<a\s+title="([^"]*)"[^>]*>([^<]*)<\/a>\s*(?:<span class="lineup__inj">([^<]*)<\/span>)?/g;

function players(html: string): RwPlayer[] {
  const out: RwPlayer[] = [];
  for (const m of html.matchAll(PLAYER)) {
    const tag = decode(m[4] ?? '').toUpperCase();
    out.push({
      pos: decode(m[1]!),
      full: decode(m[2]!),
      name: decode(m[3]!),
      tag: tag === 'OUT' || tag === 'QUES' || tag === 'SUS' ? tag : null,
    });
  }
  return out;
}

function side(ul: string): RwSide {
  const status = /Confirmed Lineup/i.test(ul) ? 'confirmed' : /Predicted Lineup|Expected Lineup/i.test(ul) ? 'predicted' : 'unknown';
  const cut = ul.search(/lineup__title[^"]*">\s*Injuries/i);
  const xi = cut >= 0 ? ul.slice(0, cut) : ul;
  const inj = cut >= 0 ? ul.slice(cut) : '';
  return { status, starters: players(xi), injuries: players(inj) };
}

/** Lê a página: um bloco por jogo, com a equipa da casa e a visitante. */
export function parseRotowire(html: string): RwMatch[] {
  const lists = [...html.matchAll(/<ul class="lineup__list is-(home|visit)">([\s\S]*?)<\/ul>/g)];
  const matches: RwMatch[] = [];
  for (let i = 0; i + 1 < lists.length; i++) {
    if (lists[i]![1] === 'home' && lists[i + 1]![1] === 'visit') {
      matches.push({ home: side(lists[i]![2]!), visit: side(lists[i + 1]![2]!) });
      i++;
    }
  }
  return matches;
}

export async function fetchRotowire(http: Http): Promise<RwMatch[]> {
  const html = await http.getText(ROTOWIRE_UCL, { accept: 'text/html' });
  const matches = parseRotowire(html);
  if (!matches.length) throw new Error('RotoWire: página sem onzes (estrutura mudou?)');
  return matches;
}
