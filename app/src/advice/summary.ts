/**
 * Resumo em texto (Markdown) para colar no projeto "UCL Fantasy" do claude.ai:
 * os mesmos números que a app mostra, com as regras que a app usa. Sem IA na app.
 */
import type { History } from '../history';
import type { MyTeam } from '../team';
import type { Dataset, Row } from '../types';
import { countTable, HIT, HIT_MARGIN, type CaptainAdvice, type TransferAdvice } from './engine';

const f1 = (x: number) => (Math.round(x * 10) / 10).toFixed(1);
const pc = (x: number | undefined) => (x == null ? '—' : `${Math.round(x * 100)}%`);

export function buildSummary(opts: {
  data: Dataset;
  team: MyTeam;
  squad: Row[];
  gd: number;
  free: number;
  advice: TransferAdvice | null;
  captain: CaptainAdvice;
  lineup: { xi: string[]; bench: string[] };
  captainId: string | null;
  viceId: string | null;
  history: History | null;
}): string {
  const { data, team, squad, gd, free, advice, captain, lineup, captainId, viceId, history } = opts;
  const gds = advice?.ctx.gds ?? [gd, gd + 1, gd + 2];
  const name = (id: string | null) => (id ? data.byId.get(id)?.name ?? id : '—');
  const xpAt = (r: Row, g: number) => (r.xp?.fixtures ?? []).filter((f) => f.gameday === g).reduce((a, f) => a + f.xp, 0);
  const L: string[] = [];
  L.push(`# UCL Fantasy — contexto da app (J${gd})`);
  L.push(`Dados de ${new Date(data.meta.generatedAt).toLocaleString('pt-PT')} · fecho da J${gd}: ${data.meta.deadline ? new Date(data.meta.deadline).toLocaleString('pt-PT') : '—'}`);
  L.push('');
  L.push('## Regras que a app usa');
  L.push(`- Pontuação UEFA 2026/27; ${free} transferências grátis; cada extra −${HIT}. Perfil conservador: troca paga só se acrescentar > ${HIT + HIT_MARGIN} pontos esperados; ganho das jornadas seguintes conta metade.`);
  L.push('- xP = pontos esperados (modelo próprio: força das equipas, titularidade, onzes prováveis). Penáltis NÃO modelados. Jogadores com ≥50% dos pontos num só jogo têm desconto de ~12%.');
  L.push('');
  L.push(`## A minha equipa (banco €${f1(team.bank)}M · Wildcard: ${team.chips?.wildcard != null ? 'usado' : 'disponível'} · Limitless: ${team.chips?.limitless != null ? 'usado' : 'disponível'})`);
  L.push(`| Pos | Jogador | Clube | €M | ${gds.map((g) => `xP J${g}`).join(' | ')} | Titular J${gd} | Estado | Onze |`);
  L.push(`|---|---|---|---|${gds.map(() => '---').join('|')}|---|---|---|`);
  const order = { GK: 0, DEF: 1, MID: 2, FWD: 3 } as const;
  for (const r of [...squad].sort((a, b) => order[a.position] - order[b.position])) {
    const where = lineup.xi.includes(r.id) ? (r.id === captainId ? 'C' : r.id === viceId ? 'V' : 'onze') : (lineup.bench.indexOf(r.id) === 0 ? 'banco (GR)' : `banco ${lineup.bench.indexOf(r.id)}`);
    const flags = [r.availability !== 'available' ? r.availability : '', r.xp?.sample?.spiky ? 'pontos de 1 jogo' : ''].filter(Boolean).join(', ') || 'ok';
    L.push(
      `| ${r.position} | ${r.name} | ${r.teamName} | ${f1(r.price)} | ${gds.map((g) => f1(xpAt(r, g))).join(' | ')} | ${pc(r.xp?.fixtures.find((x) => x.gameday === gd)?.pStart)} | ${flags} | ${where} |`,
    );
  }
  L.push('');
  if (advice) {
    L.push('## Quantas transferências? (melhor opção de cada tamanho)');
    L.push(`| Trocas | Trocas propostas | ${gds.map((g) => `Δ J${g}`).join(' | ')} | Custo | Líquido J${gd} | Líquido ${gds.length}J |`);
    L.push(`|---|---|${gds.map(() => '---').join('|')}|---|---|---|`);
    for (const r of countTable(advice)) {
      const sw = r.plan ? r.plan.swaps.map((s) => `${s.out.name} → ${s.in.name}`).join('; ') : '—';
      L.push(
        `| ${r.n}${r.recommended ? ' (recomendado)' : ''} | ${sw} | ${gds.map((_, k) => f1(r.deltaGd[k] ?? 0)).join(' | ')} | ${r.hits ? `−${HIT * r.hits}` : '0'} | ${f1(r.netNow)} | ${f1(r.netHorizon)} |`,
      );
    }
    L.push('');
  }
  L.push(`## Capitão (J${gd})`);
  L.push(`Sugerido: ${name(captain.captain?.row.id ?? null)} · vice ${name(captain.vice?.row.id ?? null)} · escolhido por mim: ${captainId ? name(captainId) : 'ainda não'}`);
  for (const c of captain.ranking.slice(0, 5)) L.push(`- ${c.row.name}: xP ${f1(c.xp)}, titular ${pc(c.pStart)}, ${c.kickoff ? new Date(c.kickoff).toLocaleString('pt-PT', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}, ${Math.round(c.row.selectedPct)}% das equipas`);
  L.push('');
  const past = history ? Object.values(history.gamedays).filter((r) => r.officialPoints != null).sort((a, b) => a.gameday - b.gameday) : [];
  if (past.length) {
    L.push('## Histórico');
    for (const r of past) L.push(`- J${r.gameday}: ${r.officialPoints} pontos (xP previsto ${r.teamXp != null ? f1(r.teamXp) : '—'})`);
    L.push('');
  }
  L.push('---');
  L.push('A minha pergunta: ');
  return L.join('\n');
}
