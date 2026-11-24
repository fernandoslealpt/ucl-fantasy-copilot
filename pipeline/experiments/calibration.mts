// Experiência de calibração (não faz parte do pipeline): compara previsão e real em jornadas já jogadas.
// Uso: copiar para a pasta <dados> os ficheiros players, teams, fixtures, matches-2026 (cache), player-prev-80 (cache), team (data/user)
// do branch data, e correr: npx tsx pipeline/experiments/calibration.mts <dados>
// Resultados de 24 nov 2026: ver docs/DECISIONS.md.
import { readFileSync } from 'node:fs';
import { computeXp, PARAMS, applySpikyFactor } from '../model/xp.ts';
import { DEFAULT_RATINGS_PARAMS, fitRatings, matchObservations } from '../model/ratings.ts';
const S = process.argv[2]!;
const j = (f: string) => JSON.parse(readFileSync(`${S}/${f}.json`, 'utf8'));
const players = j('players').players, teams = j('teams').teams;
const fixtures = j('fixtures').fixtures, prevFixtures = j('matches-2026').fixtures, prev = j('player-prev-80').players;
const coefficients = new Map<string, number>(teams.filter((t: any) => t.coefficient != null).map((t: any) => [t.id, t.coefficient]));
const orig = JSON.parse(JSON.stringify(PARAMS));

let FIXED: Set<string> | null = null;
function run(T: number, spikyFactor: number) {
  const firstKick = fixtures.filter((f: any) => f.gameday === T && f.kickoff).map((f: any) => f.kickoff).sort()[0];
  const rp = DEFAULT_RATINGS_PARAMS;
  const obs = matchObservations(fixtures, prevFixtures, { before: firstKick, prevWeight: rp.prevWeight, halfLifeDays: rp.halfLifeDays });
  const ratings = fitRatings(obs, coefficients, { sigma: rp.sigma });
  const trunc = players.map((p: any) => ({ ...p, history: p.history.filter((l: any) => l.gameday < T) }));
  let xp = computeXp({ players: trunc, prev, fixtures, ratings, targets: [T], lastGameday: T - 1, ignoreAvailability: true });
  if (spikyFactor !== 1) xp = applySpikyFactor(xp, spikyFactor);
  const pred = new Map(xp.map((x: any) => [x.id, x.xp1]));
  const out: any[] = [];
  for (const p of players) {
    const line = p.history.find((l: any) => l.gameday === T);
    const act = line?.points ?? 0, played = (line?.minutes ?? 0) > 0;
    const before = p.history.filter((l: any) => l.gameday < T).reduce((a: number, l: any) => a + l.points, 0);
    const apps = p.history.filter((l: any) => l.gameday < T && l.minutes > 0).length;
    const m = (pred.get(p.id) as number) ?? 0;
    const base = (T > 1 ? before / (T - 1) : 0);
    const key = `${T}|${p.id}`;
    if (FIXED) { if (!FIXED.has(key)) continue; } else if (!played && m < 1 && base < 1) continue;
    out.push({ pred: m, act, before, apps, key, id: p.id, pos: p.position } as any);
  }
  return out;
}
function rank(a: number[]) { const idx = a.map((v, i) => [v, i] as [number, number]).sort((x, y) => x[0] - y[0]); const r = new Array(a.length); let i = 0; while (i < idx.length) { let j2 = i; while (j2 + 1 < idx.length && idx[j2 + 1]![0] === idx[i]![0]) j2++; const avg = (i + j2) / 2 + 1; for (let k = i; k <= j2; k++) r[idx[k]![1]] = avg; i = j2 + 1; } return r as number[]; }
function pearson(a: number[], b: number[]) { const ma = a.reduce((s, x) => s + x, 0) / a.length, mb = b.reduce((s, x) => s + x, 0) / b.length; let n = 0, da = 0, db = 0; for (let i = 0; i < a.length; i++) { n += (a[i]! - ma) * (b[i]! - mb); da += (a[i]! - ma) ** 2; db += (b[i]! - mb) ** 2; } return n / Math.sqrt(da * db); }
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
function report(label: string, Ts: number[], spiky: number) {
  const all = Ts.flatMap((T) => run(T, spiky));
  // escalão pelos pontos ANTES da jornada (o que se sabia)
  const byBefore = [...all].sort((a, b) => b.before - a.before);
  const q = (lo: number, hi: number) => byBefore.slice(Math.floor(all.length * lo), Math.floor(all.length * hi));
  const tiers: [string, typeof all][] = [['top 10%', q(0, 0.1)], ['10-30%', q(0.1, 0.3)], ['30-100%', q(0.3, 1)]];
  const mae = mean(all.map((r) => Math.abs(r.pred - r.act)));
  const rmse = Math.sqrt(mean(all.map((r) => (r.pred - r.act) ** 2)));
  const sp = pearson(rank(all.map((r: any) => r.pred)), rank(all.map((r: any) => r.act)));
  console.log(`\n${label}  n=${all.length} MAE ${mae.toFixed(3)} RMSE ${rmse.toFixed(3)} Spearman ${sp.toFixed(3)}`);
  for (const [n, t] of tiers) console.log(`   ${n.padEnd(8)} prev ${mean(t.map((r) => r.pred)).toFixed(2)} real ${mean(t.map((r) => r.act)).toFixed(2)} razão real/prev ${(mean(t.map((r) => r.act)) / mean(t.map((r) => r.pred))).toFixed(2)} (n=${t.length})`);
  return { mae, rmse };
}
const team = j('team').players as string[];
const MIN: any = { DEF: 3, MID: 2, FWD: 1 }, MAX: any = { DEF: 5, MID: 5, FWD: 3 };
function xiBy(sq: any[], score: (r: any) => number) {
  const gk = sq.filter((r) => r.pos === 'GK').sort((a, b) => score(b) - score(a));
  const xi: any[] = [gk[0]]; const rest: any[] = []; const taken: any = { DEF: 0, MID: 0, FWD: 0 };
  for (const pos of ['DEF', 'MID', 'FWD']) sq.filter((r) => r.pos === pos).sort((a, b) => score(b) - score(a)).forEach((r, i) => { if (i < MIN[pos]) { xi.push(r); taken[pos]++; } else rest.push(r); });
  rest.sort((a, b) => score(b) - score(a));
  for (const r of rest) if (xi.length < 11 && taken[r.pos] < MAX[r.pos]) { xi.push(r); taken[r.pos]++; }
  return xi;
}
console.log('\nEquipa ATUAL (15 jogadores): previsão do modelo (só com dados anteriores) vs pontos reais desse mesmo onze, com capitão a dobrar');
for (const T of [2, 3, 4]) {
  const all = run(T, 0.88).concat([]);
  // run() filtra população; para a equipa precisamos de todos os 15: refazer sem filtro
  FIXED = new Set(team.map((id) => `${T}|${id}`));
  const sq = run(T, 0.88).filter((r: any) => team.includes(r.id));
  FIXED = null;
  const xi = xiBy(sq, (r) => r.pred);
  const cap = [...xi].sort((a, b) => b.pred - a.pred)[0];
  const pred = xi.reduce((a, r) => a + r.pred, 0) + cap.pred;
  const act = xi.reduce((a, r) => a + r.act, 0) + cap.act;
  // melhor onze possível a posteriori (teto)
  const xiBest = xiBy(sq, (r) => r.act); const capBest = [...xiBest].sort((a, b) => b.act - a.act)[0];
  const best = xiBest.reduce((a, r) => a + r.act, 0) + capBest.act;
  console.log(`  J${T}: previsto ${pred.toFixed(1)} | real do mesmo onze ${act.toFixed(0)} | teto (melhor onze a posteriori) ${best.toFixed(0)} | jogadores com dados: ${sq.length}/15`);
}

console.log('\nONZE IDEAL pela previsão (sem orçamento, sem olhar ao futuro): previsto vs real, com capitão a dobrar');
const orig2 = PARAMS.startPriorStrength;
for (const [label, k, f] of [['ATUAL (K1.5, desc 0,88)', 1.5, 0.88], ['K=1, desc 0,88', 1, 0.88], ['K=1, sem desc', 1, 1]] as [string, number, number][]) {
  PARAMS.startPriorStrength = k;
  const rowsT: string[] = [];
  let sp = 0, sa = 0;
  for (const T of [2, 3, 4]) {
    FIXED = null;
    const all = run(T, f);
    const xi = xiBy(all, (r) => r.pred);
    const cap = [...xi].sort((a, b) => b.pred - a.pred)[0];
    const pred = xi.reduce((a, r) => a + r.pred, 0) + cap.pred;
    const act = xi.reduce((a, r) => a + r.act, 0) + cap.act;
    sp += pred; sa += act;
    rowsT.push(`J${T}: prev ${pred.toFixed(1)} real ${act.toFixed(0)}`);
  }
  console.log(`  ${label.padEnd(26)} ${rowsT.join(' | ')} | média prev ${(sp / 3).toFixed(1)} real ${(sa / 3).toFixed(1)} razão ${(sa / sp).toFixed(2)}`);
}
PARAMS.startPriorStrength = orig2;
