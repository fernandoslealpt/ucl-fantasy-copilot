import { describe, expect, it } from 'vitest';
import type { Position, Row } from '../types';
import { adviseCaptain, adviseTransfers, captainConfidence, componentTable, HIT, makeCtx, planWarnings, sameMatchWarnings, swapReasons } from './engine';

let n = 0;
/** Jogador sintético: xp por jornada (J4, J5, J6). */
function P(pos: Position, club: string, price: number, xps: number[], opts: Partial<Row> & { pStart?: number; day?: string } = {}): Row {
  const id = String(++n);
  const pStart = opts.pStart ?? 0.9;
  return {
    id,
    name: `${pos}${id}`,
    fullName: `Jogador ${id}`,
    teamId: club,
    teamName: club,
    teamCode: club,
    position: pos,
    price,
    selectedPct: 1,
    availability: 'available',
    status: { code: '', quality: '', note: '', active: true },
    stats: { minutes: 0, points: 0, goals: 0, assists: 0, cleanSheets: 0, recoveries: 0, saves: 0 },
    form: { lastGameday: 3, avgPoints: 4 },
    history: [],
    xp: {
      id,
      xp1: xps[0]!,
      xp3: xps.reduce((s, x) => s + x, 0),
      xp5: 0,
      valuePerM: 0,
      confidence: 'alta',
      rates: { goals90: 0.2, assists90: 0.1, recoveries90: 3, saves90: 0, motmPerApp: 0.05 },
      fixtures: xps.map((xp, k) => ({
        gameday: 4 + k,
        opponentId: 'x',
        opponentName: 'X',
        home: true,
        kickoff: k === 0 ? `${opts.day ?? '2026-11-03'}T20:00:00Z` : null,
        xp,
        pPlay: 0.95,
        pStart,
        expMinutes: 80,
        goalsFor: 1.5,
        goalsAgainst: 1.2,
        pCleanSheet: 0.3,
        components: {
          appearance: 2,
          goals: 0,
          assists: 0,
          cleanSheet: 0,
          recoveries: 0,
          saves: 0,
          playerOfTheMatch: 0,
          conceded: 0,
          cards: 0,
        },
      })),
    },
    ...opts,
  } as Row;
}

/** Equipa base: 15 jogadores de clubes diferentes (A..O), 3 pontos por jornada, €6M cada = €90M. */
function squad(): Row[] {
  const shape: Position[] = ['GK', 'GK', 'DEF', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD'];
  return shape.map((pos, i) => P(pos, `C${i}`, 6, [3, 3, 3]));
}

const ids = (rows: Row[]) => new Set(rows.map((r) => r.id));

describe('transferências', () => {
  it('respeita orçamento, posição e máximo por clube em todas as opções', () => {
    const s = squad();
    const star = P('FWD', 'BIG', 12, [12, 12, 12]); // caro demais com €1M no banco e saídas de €6M
    const good = P('FWD', 'BIG', 7, [8, 8, 8]);
    const sameClub = [P('MID', 'C7', 5, [9, 9, 9])]; // o clube C7 já tem 1; não passa de 3 mas testa a contagem
    const full = [P('DEF', 'Z', 5, [1, 1, 1]), P('DEF', 'Z', 5, [1, 1, 1]), P('DEF', 'Z', 5, [1, 1, 1])];
    const zFan = P('MID', 'Z', 5, [9.5, 9.5, 9.5]);
    const mySquad = [...s.slice(0, 2), ...full, ...s.slice(5)]; // 3 jogadores do clube Z
    const rows = [...mySquad, star, good, ...sameClub, zFan];
    const a = adviseTransfers(rows, mySquad, 1, 2, 4);
    const all = [...a.byCount[1], ...a.byCount[2], ...a.byCount[3]];
    expect(all.length).toBeGreaterThan(0);
    for (const p of all) {
      expect(p.bankAfter).toBeGreaterThanOrEqual(0);
      for (const sw of p.swaps) expect(sw.in.position).toBe(sw.out.position);
      const after = [...mySquad.filter((r) => !p.swaps.some((x) => x.out.id === r.id)), ...p.swaps.map((x) => x.in)];
      const perClub = new Map<string, number>();
      after.forEach((r) => perClub.set(r.teamId, (perClub.get(r.teamId) ?? 0) + 1));
      expect(Math.max(...perClub.values())).toBeLessThanOrEqual(3);
      expect(p.swaps.some((x) => x.in.id === star.id)).toBe(false);
      // o 4.º do clube Z só entra se sair um do Z
      if (p.swaps.some((x) => x.in.id === zFan.id)) expect(p.swaps.some((x) => x.out.teamId === 'Z')).toBe(true);
    }
  });

  it('nunca sugere jogadores lesionados, castigados ou inativos', () => {
    const s = squad();
    const hurt = P('FWD', 'H', 5, [20, 20, 20], { availability: 'out' });
    const gone = P('FWD', 'G', 5, [20, 20, 20], { status: { code: '', quality: '', note: '', active: false } });
    const a = adviseTransfers([...s, hurt, gone], s, 5, 2, 4);
    const ins = [...a.byCount[1], ...a.byCount[2], ...a.byCount[3]].flatMap((p) => p.swaps.map((x) => x.in.id));
    expect(ins).not.toContain(hurt.id);
    expect(ins).not.toContain(gone.id);
  });

  it('conta o -4 por cada troca além das grátis', () => {
    const s = squad();
    const ups = [P('FWD', 'U1', 6, [9, 9, 9]), P('FWD', 'U2', 6, [9, 9, 9]), P('FWD', 'U3', 6, [9, 9, 9])];
    const a = adviseTransfers([...s, ...ups], s, 0, 1, 4);
    const three = a.byCount[3][0]!;
    expect(three.hits).toBe(2);
    expect(three.net).toBeCloseTo(three.delta - 2 * HIT, 5);
    expect(a.byCount[1][0]!.hits).toBe(0);
  });

  it('só recomenda pagar −4 quando o ganho já nesta jornada o justifica', () => {
    const s = squad();
    // grande ganho só nas jornadas seguintes → esperar pelas grátis da próxima jornada
    const later = [P('MID', 'L1', 6, [3.5, 9, 9]), P('MID', 'L2', 6, [3.5, 9, 9]), P('MID', 'L3', 6, [3.5, 9, 9])];
    const a = adviseTransfers([...s, ...later], s, 0, 2, 4);
    expect(a.recommended?.hits ?? 0).toBe(0);
    // grande ganho já nesta jornada → o −4 compensa
    const now = [P('MID', 'N1', 6, [16, 3, 3]), P('MID', 'N2', 6, [16, 3, 3]), P('MID', 'N3', 6, [16, 3, 3])];
    const b = adviseTransfers([...s, ...now], s, 0, 2, 4);
    expect(b.recommended?.swaps.length).toBe(3);
    expect(b.recommended?.hits).toBe(1);
  });

  it('nunca vende quem o Fernando quer manter', () => {
    const s = squad();
    const up = P('FWD', 'U', 6, [12, 12, 12]);
    const fwd = s.filter((r) => r.position === 'FWD').map((r) => r.id);
    const a = adviseTransfers([...s, up], s, 0, 2, 4, new Set(fwd));
    const outs = [...a.byCount[1], ...a.byCount[2], ...a.byCount[3]].flatMap((p) => p.swaps.map((x) => x.out.id));
    for (const id of fwd) expect(outs).not.toContain(id);
  });

  it('não recomenda trocas quando o ganho é pequeno', () => {
    const s = squad();
    const meh = P('MID', 'M', 6, [3.05, 3.05, 3.05]);
    const a = adviseTransfers([...s, meh], s, 0, 1, 4);
    expect(a.recommended).toBeNull();
    expect(a.bestFree).not.toBeNull();
  });

  it('cada troca recomendada tem 3 razões com números', () => {
    const s = squad();
    const up = P('FWD', 'U', 6, [9, 9, 9], { pStart: 0.95 });
    const out = s.find((r) => r.position === 'FWD')!;
    out.availability = 'doubtful';
    const a = adviseTransfers([...s, up], s, 0, 2, 4);
    const reasons = swapReasons(a.ctx, { ratingById: new Map() }, a.recommended!.swaps[0]!);
    expect(reasons).toHaveLength(3);
    for (const r of reasons) expect(Object.values(r.v).some((v) => typeof v === 'number')).toBe(true);
  });

  it('a equipa recomendada mantém os 15 com 2/5/5/3', () => {
    const s = squad();
    const extra = [P('DEF', 'D1', 5, [8, 8, 8]), P('GK', 'G1', 5, [7, 7, 7])];
    const a = adviseTransfers([...s, ...extra], s, 2, 2, 4);
    const p = a.recommended!;
    const after = [...s.filter((r) => !p.swaps.some((x) => x.out.id === r.id)), ...p.swaps.map((x) => x.in)];
    const count = (pos: Position) => after.filter((r) => r.position === pos).length;
    expect([count('GK'), count('DEF'), count('MID'), count('FWD')]).toEqual([2, 5, 5, 3]);
    expect(ids(after).size).toBe(15);
  });
});

describe('capitão', () => {
  it('escolhe o maior xP e penaliza dúvida de titularidade', () => {
    const a = P('FWD', 'A', 10, [8, 0, 0], { pStart: 0.4 });
    const b = P('FWD', 'B', 10, [7, 0, 0], { pStart: 0.95 });
    const c = adviseCaptain([a, b], 4);
    expect(c.captain?.row.id).toBe(b.id);
    expect(c.vice?.row.id).toBe(a.id);
  });

  it('plano a meio da jornada: começa com quem joga primeiro e troca se fizer menos que o xP do outro', () => {
    const tue = P('MID', 'T', 10, [6.5, 0, 0], { day: '2026-11-03' });
    const wed = P('FWD', 'W', 10, [7.4, 0, 0], { day: '2026-11-04' });
    const c = adviseCaptain([tue, wed], 4);
    // começa com quem joga primeiro; o melhor fica como vice e alvo da troca
    expect(c.captain?.row.id).toBe(tue.id);
    expect(c.vice?.row.id).toBe(wed.id);
    expect(c.ranking[0]?.row.id).toBe(wed.id);
    expect(c.plan?.start.row.id).toBe(tue.id);
    expect(c.plan?.switchTo.row.id).toBe(wed.id);
    expect(c.plan?.below).toBe(8);
  });
});

describe('avisos e tabela de apoio', () => {
  const spiky = { apps: 4, points: 37, bestGameday: 4, bestPoints: 20, bestShare: 0.54, spiky: true };

  it('quem entra com pontos de um só jogo gera aviso e a forma não serve de razão', () => {
    const s = squad();
    const hot = P('FWD', 'HOT', 6, [8, 8, 8], { form: { lastGameday: 20, avgPoints: 9.3 } });
    hot.xp!.sample = spiky;
    const a = adviseTransfers([...s, hot], s, 0, 2, 4);
    const p = a.byCount[1].find((x) => x.swaps[0]!.in.id === hot.id)!;
    expect(p).toBeTruthy();
    const w = planWarnings(a.ctx, s, p);
    expect(w.some((x) => x.code === 'SPIKY')).toBe(true);
    const reasons = swapReasons(a.ctx, { ratingById: new Map() }, p.swaps[0]!, 5);
    expect(reasons.some((r) => r.code === 'FORM')).toBe(false);
  });

  it('avisa quando o onze tem mais de 2 jogadores do mesmo jogo', () => {
    const s = squad();
    // 3 titulares no jogo C2 vs C3 (dois do C2, um do C3)
    const xi = [s[2]!, s[3]!, s[4]!];
    xi[1]!.teamId = 'C2';
    xi[2]!.teamId = 'C3';
    for (const r of xi) r.xp!.fixtures[0]!.opponentId = r.teamId === 'C2' ? 'C3' : 'C2';
    const w = sameMatchWarnings(xi, 4);
    expect(w).toHaveLength(1);
    expect(w[0]!.code === 'SAME_MATCH' && w[0]!.v.n).toBe(3);
    expect(sameMatchWarnings(xi.slice(0, 2), 4)).toHaveLength(0);
  });

  it('a tabela de componentes soma o xP de quem sai e de quem entra', () => {
    const a = P('MID', 'A', 6, [5, 5, 5]);
    const b = P('MID', 'B', 6, [7, 7, 7]);
    b.xp!.fixtures[0]!.components = { ...b.xp!.fixtures[0]!.components, goals: 3, assists: 1 };
    const rows = componentTable({ out: a, in: b }, 4);
    const total = rows.find((r) => r.key === 'total')!;
    expect(total.out).toBeCloseTo(2, 5);
    expect(total.in).toBeCloseTo(6, 5);
    expect(rows.find((r) => r.key === 'goals')!.diff).toBeCloseTo(3, 5);
  });

  it('confiança no capitão: alta só com titularidade alta e margem para o segundo', () => {
    const s = squad();
    s[12]!.xp!.fixtures[0]!.xp = 9;
    const c = adviseCaptain(s.slice(0, 11).concat(s[12]!), 4);
    expect(captainConfidence(c)).toBe('alta');
    const s2 = squad();
    const c2 = adviseCaptain(s2.slice(0, 11), 4);
    expect(captainConfidence(c2)).toBe('média');
  });

  it('o horizonte usa as jornadas J+0, J+1 e J+2 com jogos', () => {
    const ctx = makeCtx(squad(), 4);
    expect(ctx.gds).toEqual([4, 5, 6]);
  });
});
