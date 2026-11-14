/**
 * Conselhos dentro do ecrã Equipa: transferências (J+0, J+1, J+2 e custo do −4) e capitão por dia de jogo.
 * Cada recomendação: 3 razões numeradas + tabela de apoio com o xP decomposto por componente.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  adviseCaptain,
  adviseTransfers,
  captainConfidence,
  componentTable,
  HIT,
  HIT_MARGIN,
  planConfidence,
  planWarnings,
  spikyWarning,
  swapReasons,
  type CaptainAdvice,
  type CaptainPick,
  type Plan,
  type Reason,
  type TransferAdvice,
  type SwapCount,
  SWAP_COUNTS,
  type Warning,
} from '../advice/engine';
import { StatusMark, pct, useSignalText } from '../components/ui';
import { DifferentialTable } from '../components/Questions';
import { useI18n } from '../i18n';
import { bestXI, decisionsFor, type MyTeam } from '../team';
import type { Dataset, Row } from '../types';

/** Jornada para a qual se planeia (a seguinte, se a atual já começou). */
export function targetGameday(data: Dataset): number | null {
  const g = data.meta.currentGameday;
  if (g == null) return null;
  return data.meta.gamedayState === 'upcoming' || data.meta.gamedayState == null ? g : g + 1;
}

export const xpAtGd = (gd: number) => (r: Row) => r.xp?.fixtures.filter((f) => f.gameday === gd).reduce((s, f) => s + f.xp, 0) ?? 0;

/** Calcula os conselhos sem bloquear o primeiro desenho do ecrã. */
export function useTransferAdvice(data: Dataset, team: MyTeam, squad: Row[], gd: number, free: number): TransferAdvice | null {
  const [advice, setAdvice] = useState<TransferAdvice | null>(null);
  const keepKey = (team.keep ?? []).join(',');
  useEffect(() => {
    setAdvice(null);
    const keep = new Set(keepKey ? keepKey.split(',') : []);
    const h = setTimeout(() => setAdvice(adviseTransfers(data.rows, squad, team.bank, free, gd, keep)), 30);
    return () => clearTimeout(h);
  }, [data, squad, team.bank, free, gd, keepKey]);
  return advice;
}

export function useCaptainAdvice(squad: Row[], gd: number): CaptainAdvice {
  return useMemo(() => adviseCaptain(bestXI(squad, xpAtGd(gd)).xi, gd), [squad, gd]);
}

// ———————————————————————————— Transferências ————————————————————————————

export function TransfersSection({
  data,
  team,
  squad,
  gd,
  free,
  advice,
  onApply,
  onNoMove,
  onSave,
  onOpen,
}: {
  data: Dataset;
  team: MyTeam;
  squad: Row[];
  gd: number;
  free: number;
  advice: TransferAdvice | null;
  onApply: (p: Plan) => void;
  onNoMove: () => void;
  onSave: (team: MyTeam) => Promise<string>;
  onOpen: (r: Row) => void;
}) {
  const { t, num } = useI18n();
  const [count, setCount] = useState<SwapCount>(1);
  const keepIds = team.keep ?? [];
  const decided = decisionsFor(team, gd)?.transfers;
  const setKeep = (ids: string[]) => void onSave({ ...team, keep: ids, updatedAt: new Date().toISOString() });
  const keepPlayer = (id: string) => setKeep([...new Set([...keepIds, id])]);
  const setFree = (v: number) =>
    void onSave({ ...team, freeTransfers: Math.max(0, Math.min(5, v)), ftGameday: gd, updatedAt: new Date().toISOString() });

  return (
    <section id="transferencias" className="section">
      <div className="section-head">
        <h2>{t('suggestTitle')}</h2>
        {decided ? <span className="done-chip">✓ {t('decided')}</span> : null}
      </div>
      <div className="advice-bar">
        <span>
          {t('bankNow')} <strong>€{num(team.bank)}M</strong>
        </span>
        <span className="stepper" role="group" aria-label={t('freeTransfers')}>
          {t('freeTransfers')}
          <button type="button" className="btn small" onClick={() => setFree(free - 1)} aria-label="−">
            −
          </button>
          <strong>{free}</strong>
          <button type="button" className="btn small" onClick={() => setFree(free + 1)} aria-label="+">
            +
          </button>
        </span>
      </div>
      {keepIds.length ? (
        <p className="keep-row">
          {t('keeping')}
          {keepIds.map((id) => (
            <button
              key={id}
              type="button"
              className="chip on"
              onClick={() => setKeep(keepIds.filter((x) => x !== id))}
              aria-label={t('unkeep', { name: data.byId.get(id)?.name ?? id })}
            >
              {data.byId.get(id)?.name ?? id} ✕
            </button>
          ))}
        </p>
      ) : null}

      {!advice ? (
        <p className="muted" role="status">
          {t('calculating')}
        </p>
      ) : (
        <>
          {advice.recommended ? (
            <PlanCard plan={advice.recommended} advice={advice} squad={squad} data={data} recommended onApply={onApply} onOpen={onOpen} onKeep={keepPlayer} />
          ) : (
            <div className="plan-card rec">
              <p className="rec-label">{t('recommended')}</p>
              <p className="plan-head">
                <strong>{t('noMove')}</strong>
              </p>
              <p>{advice.bestFree ? t('noMoveWhy', { x: num(advice.bestFree.delta), n: advice.ctx.gds.length }) : t('noMoveNone')}</p>
              {!decided ? (
                <div className="plan-actions">
                  <button type="button" className="btn primary" onClick={onNoMove}>
                    {t('noMoveConfirm')}
                  </button>
                </div>
              ) : null}
            </div>
          )}
          {advice.recommended && !decided ? (
            <p className="small-print">
              <button type="button" className="link" onClick={onNoMove}>
                {t('noMoveAnyway')}
              </button>
            </p>
          ) : null}
          <p className="muted small-print">{t('hitRule', { hit: HIT, need: HIT + HIT_MARGIN })}</p>
          <p className="muted small-print">⚠ {t('penaltyNote')}</p>

          <details className="more-options">
            <summary>{t('otherOptions')}</summary>
          <div className="chips" role="group">
            {SWAP_COUNTS.map((c) => (
              <button key={c} type="button" className={`chip ${count === c ? 'on' : ''}`} aria-pressed={count === c} onClick={() => setCount(c)}>
                {t(c === 1 ? 'oneSwap' : 'nSwaps', { n: c })}
                {c > free ? ` (−${HIT * (c - free)})` : ''}
              </button>
            ))}
          </div>
          {advice.byCount[count].length === 0 ? <p className="muted">{t('noOptions')}</p> : null}
          {advice.byCount[count].map((p) => (
            <PlanCard
              key={p.swaps.map((s) => `${s.out.id}>${s.in.id}`).join('-')}
              plan={p}
              advice={advice}
              squad={squad}
              data={data}
              onApply={onApply}
              onOpen={onOpen}
              onKeep={keepPlayer}
            />
          ))}
          </details>
        </>
      )}
    </section>
  );
}

const sign = (num: (n: number, d?: number) => string, x: number) => (Math.abs(x) < 0.05 ? num(0) : `${x > 0 ? '+' : '−'}${num(Math.abs(x))}`);

function PlanCard({
  plan,
  advice,
  squad,
  data,
  recommended = false,
  onApply,
  onOpen,
  onKeep,
}: {
  plan: Plan;
  advice: TransferAdvice;
  squad: Row[];
  data: Dataset;
  recommended?: boolean;
  onApply: (p: Plan) => void;
  onOpen: (r: Row) => void;
  onKeep: (id: string) => void;
}) {
  const { t, num } = useI18n();
  const [open, setOpen] = useState(false);
  const { ctx } = advice;
  const conf = planConfidence(ctx, plan);
  const warnings = useMemo(() => planWarnings(ctx, squad, plan), [ctx, squad, plan]);
  const s = (x: number) => sign(num, x);
  return (
    <article className={`plan-card ${recommended ? 'rec' : ''}`}>
      {recommended ? <p className="rec-label">{t('recommended')}</p> : null}
      <ul className="swaps">
        {plan.swaps.map((sw) => (
          <li key={sw.out.id}>
            <div className="swap-row">
              <button type="button" className="swap-p out" onClick={() => onOpen(sw.out)}>
                <span className="swap-tag">{t('swapOut')}</span>
                <span className="swap-name">
                  <StatusMark a={sw.out.availability} />
                  <span className="player-name">{sw.out.name}</span>
                </span>
                <span className="muted">
                  {sw.out.teamName} · €{num(sw.out.price)}M
                </span>
              </button>
              <span className="swap-arrow" aria-hidden>
                →
              </span>
              <button type="button" className="swap-p in" onClick={() => onOpen(sw.in)}>
                <span className="swap-tag">{t('swapIn')}</span>
                <span className="swap-name">
                  <StatusMark a={sw.in.availability} />
                  <span className="player-name">{sw.in.name}</span>
                </span>
                <span className="muted">
                  {sw.in.teamName} · €{num(sw.in.price)}M
                </span>
              </button>
            </div>
            <ol className="reasons">
              {swapReasons(ctx, data, sw).map((r, i) => (
                <li key={i}>
                  <ReasonText r={r} />
                </li>
              ))}
            </ol>
            {open ? <ComponentTable swap={sw} gd={ctx.gds[0]!} /> : null}
            <button type="button" className="link keep-btn" onClick={() => onKeep(sw.out.id)}>
              {t('keepPlayer', { name: sw.out.name })}
            </button>
          </li>
        ))}
      </ul>

      <div className="horizon" role="table" aria-label={t('horizonLabel')}>
        {ctx.gds.map((g, k) => (
          <div key={g} role="row" className="horizon-cell">
            <span role="cell" className="muted">
              J{g} {k === 0 ? `(${t('now')})` : `(J+${k})`}
            </span>
            <strong role="cell" className={plan.deltaGd[k]! >= 0 ? 'pos' : 'neg'}>
              {s(plan.deltaGd[k]!)}
            </strong>
          </div>
        ))}
        <div role="row" className="horizon-cell cost">
          <span role="cell" className="muted">
            {t('hitCost')}
          </span>
          <strong role="cell" className={plan.hits ? 'neg' : ''}>
            {plan.hits ? `−${HIT * plan.hits}` : t('free')}
          </strong>
        </div>
        <div role="row" className="horizon-cell">
          <span role="cell" className="muted">
            {t('bankAfter')}
          </span>
          <strong role="cell">€{num(plan.bankAfter)}M</strong>
        </div>
      </div>
      <p className="muted small-print">
        {t('netGain', { n: ctx.gds.length, net: s(plan.deltaGd.reduce((a, x) => a + x, 0) - HIT * plan.hits) })} · {t('confidence', { c: conf })}
      </p>
      {warnings.length ? (
        <ul className="warnings">
          {warnings.map((w, i) => (
            <li key={i}>
              <WarningText w={w} />
            </li>
          ))}
        </ul>
      ) : null}
      <div className="plan-actions">
        <button type="button" className="btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? t('hideTable') : t('whyDetail')}
        </button>
        <button type="button" className="btn primary" onClick={() => onApply(plan)}>
          {t('didIt')}
        </button>
      </div>
      {open ? (
        <table className="whatif">
          <caption className="table-caption">{t('beforeAfter')}</caption>
          <thead>
            <tr>
              <th>{t('gdShort')}</th>
              <th className="num">{t('teamNow')}</th>
              <th className="num">{t('teamAfter')}</th>
              <th className="num">Δ</th>
            </tr>
          </thead>
          <tbody>
            {ctx.gds.map((g, k) => (
              <tr key={g}>
                <td>J{g}</td>
                <td className="num">{num(advice.base.perGd[k]!)}</td>
                <td className="num">{num(advice.base.perGd[k]! + plan.deltaGd[k]!)}</td>
                <td className="num">
                  <strong>{s(plan.deltaGd[k]!)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="muted">
                {t('whatIfNote')}
              </td>
            </tr>
          </tfoot>
        </table>
      ) : null}
    </article>
  );
}

function ComponentTable({ swap, gd }: { swap: { out: Row; in: Row }; gd: number }) {
  const { t, num, d } = useI18n();
  const rows = componentTable(swap, gd);
  return (
    <table className="whatif components">
      <caption className="table-caption">{t('componentsTitle', { gd })}</caption>
      <thead>
        <tr>
          <th>{t('component')}</th>
          <th className="num">{swap.out.name}</th>
          <th className="num">{swap.in.name}</th>
          <th className="num">Δ</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className={r.key === 'total' ? 'total' : ''}>
            <td>{r.key === 'total' ? t('total') : d.components[r.key]}</td>
            <td className="num">{num(r.out)}</td>
            <td className="num">{num(r.in)}</td>
            <td className="num">
              <strong>{sign(num, r.diff)}</strong>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function WarningText({ w }: { w: Warning }) {
  const { t } = useI18n();
  if (w.code === 'SPIKY')
    return (
      <>
        {w.v.apps <= 1
          ? t('wOneGame', { name: w.v.name })
          : t('wSpiky', { name: w.v.name, share: pct(w.v.share), gd: w.v.gd, pts: w.v.pts })}
        {w.v.adjusted != null && w.v.adjusted < 1 ? ` ${t('wAdjusted', { p: pct(1 - w.v.adjusted) })}` : ''}
      </>
    );
  return <>{t('wSameMatch', { n: w.v.n, a: w.v.teamA, b: w.v.teamB, gd: w.v.gd, names: w.v.names.join(', ') })}</>;
}

function ReasonText({ r }: { r: Reason }) {
  const { t, num } = useI18n();
  const sig = useSignalText();
  const v = r.v as Record<string, number | string>;
  const n = (k: string, digits = 1) => num(Number(v[k]), digits);
  const p = (k: string) => pct(Number(v[k]));
  switch (r.code) {
    case 'OUT_STATUS':
      return <>{r.v.status === 'out' ? t('rOut', { name: r.v.name }) : t('rDoubt', { name: r.v.name, p: p('p') })}</>;
    case 'START': {
      const sg = (x: typeof r.v.inSig) => (x?.lineup ? ` (${sig(x)})` : '');
      return <>{t('rStart', { in: r.v.inName, inP: p('inP'), inS: sg(r.v.inSig), out: r.v.outName, outP: p('outP'), outS: sg(r.v.outSig) })}</>;
    }
    case 'FIXTURES':
      return <>{t('rFixtures', { inAvg: n('inAvg'), outAvg: n('outAvg'), n: r.v.n })}</>;
    case 'ATTACK':
      return <>{t('rAttack', { in: r.v.inName, inR: n('inRate', 2), out: r.v.outName, outR: n('outRate', 2) })}</>;
    case 'CLEAN_SHEET':
      return <>{t('rCs', { inP: p('inP'), outP: p('outP') })}</>;
    case 'FORM':
      return <>{t('rForm', { in: r.v.inName, inAvg: n('inAvg'), out: r.v.outName, outAvg: n('outAvg') })}</>;
    case 'XP_NOW':
      return <>{t('rXpNow', { gd: r.v.gd, in: r.v.inName, inXp: n('inXp'), out: r.v.outName, outXp: n('outXp') })}</>;
    case 'BUDGET':
      return <>{r.v.diff > 0 ? t('rFrees', { x: num(r.v.diff) }) : r.v.diff < 0 ? t('rCosts', { x: num(-r.v.diff) }) : t('rSamePrice')}</>;
  }
}

// ———————————————————————————— Capitão ————————————————————————————

export function CaptainSection({
  c,
  team,
  gd,
  onConfirm,
  onOpen,
}: {
  c: CaptainAdvice;
  team: MyTeam;
  gd: number;
  onConfirm: (captain: string, vice: string | null) => void;
  onOpen: (r: Row) => void;
}) {
  const { t, num, lang } = useI18n();
  const dec = decisionsFor(team, gd);
  const loc = lang === 'en' ? 'en-GB' : 'pt-PT';
  const when = (x: CaptainPick) =>
    x.kickoff
      ? new Date(x.kickoff).toLocaleString(loc, { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' })
      : '—';
  const day = (x: CaptainPick) =>
    x.kickoff ? new Date(x.kickoff).toLocaleDateString(loc, { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'Europe/Lisbon' }) : '—';
  if (!c.captain)
    return (
      <section id="capitao" className="section">
        <h2>{t('captainTitle')}</h2>
        <p className="muted">{t('noCaptain')}</p>
      </section>
    );
  const conf = captainConfidence(c);
  const plan = c.plan;
  const chosen = dec?.captain ? c.ranking.find((x) => x.row.id === dec.captain)?.row.name ?? dec.captain : null;
  // ranking agrupado por dia de jogo
  const days = [...new Set(c.ranking.map((x) => x.day ?? '—'))].sort();
  return (
    <section id="capitao" className="section">
      <div className="section-head">
        <h2>{t('captainTitle')}</h2>
        {chosen ? <span className="done-chip">✓ {chosen}</span> : null}
      </div>
      <div className="plan-card rec">
        <p className="rec-label">{t('recommended')}</p>
        <div className="captain-row">
          <button type="button" className="cap-pick" onClick={() => onOpen(c.captain!.row)}>
            <span className="cap-badge">C</span>
            <span>
              <span className="player-name">{c.captain.row.name}</span>
              <span className="muted">
                {num(c.captain.xp)} xP · {when(c.captain)} · {pct(c.captain.pStart)} {t('starterShort')}
              </span>
            </span>
          </button>
          {c.vice ? (
            <button type="button" className="cap-pick" onClick={() => onOpen(c.vice!.row)}>
              <span className="cap-badge vice">V</span>
              <span>
                <span className="player-name">{c.vice.row.name}</span>
                <span className="muted">
                  {num(c.vice.xp)} xP · {when(c.vice)}
                </span>
              </span>
            </button>
          ) : null}
        </div>
        <ol className="reasons">
          {captainReasons(c, t, num).map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ol>
        {spikyWarning(c.captain.row) ? (
          <ul className="warnings">
            <li>
              <WarningText w={spikyWarning(c.captain.row)!} />
            </li>
          </ul>
        ) : null}
        <p className="muted small-print">
          {t('confidence', { c: conf ?? '—' })} · ⚠ {t('penaltyNote')}
        </p>
        {plan ? (
          <div className="cap-plan">
            <p>
              <strong>{t('capPlanTitle')}</strong>
            </p>
            <p>
              {t('capPlan', {
                a: plan.start.row.name,
                dayA: day(plan.start),
                below: plan.below,
                b: plan.switchTo.row.name,
                dayB: day(plan.switchTo),
                xpB: num(plan.switchTo.xp),
              })}
            </p>
            <p className="muted">{t('capPlanWhy')}</p>
          </div>
        ) : null}
        <div className="plan-actions">
          <button
            type="button"
            className="btn primary"
            onClick={() => onConfirm(c.captain!.row.id, c.vice?.row.id ?? null)}
            disabled={dec?.captain === c.captain.row.id}
          >
            {dec?.captain === c.captain.row.id ? `✓ ${t('captainSet')}` : t('captainConfirm')}
          </button>
        </div>
      </div>
      <DifferentialTable xi={c.ranking.map((x) => x.row)} gd={gd} onOpen={onOpen} />
      <div className="table-wrap">
        <table className="whatif">
          <caption className="table-caption">{t('captainByDay')}</caption>
          <thead>
            <tr>
              <th>{t('player')}</th>
              <th className="num">xP</th>
              <th className="num">{t('starterShort')}</th>
              <th>{t('kickoff')}</th>
              <th />
            </tr>
          </thead>
          {days.map((dd) => (
            <tbody key={dd}>
              <tr className="group-row">
                <th colSpan={5}>{dd === '—' ? '—' : new Date(`${dd}T12:00:00`).toLocaleDateString(loc, { weekday: 'long', day: '2-digit', month: '2-digit' })}</th>
              </tr>
              {c.ranking
                .filter((x) => (x.day ?? '—') === dd)
                .slice(0, 4)
                .map((x) => (
                  <tr key={x.row.id}>
                    <td>
                      <button type="button" className="link" onClick={() => onOpen(x.row)}>
                        {x.row.name}
                      </button>
                    </td>
                    <td className="num">{num(x.xp)}</td>
                    <td className="num">{pct(x.pStart)}</td>
                    <td>{x.kickoff ? new Date(x.kickoff).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' }) : '—'}</td>
                    <td>
                      {dec?.captain !== x.row.id ? (
                        <button type="button" className="btn small" onClick={() => onConfirm(x.row.id, c.captain!.row.id === x.row.id ? c.vice?.row.id ?? null : c.captain!.row.id)}>
                          C
                        </button>
                      ) : (
                        <span className="cap-badge">C</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  );
}

/** 3 razões numeradas para o capitão, com números. */
function captainReasons(c: CaptainAdvice, t: ReturnType<typeof useI18n>['t'], num: ReturnType<typeof useI18n>['num']): string[] {
  const a = c.captain!;
  const second = c.ranking.find((x) => x.row.id !== a.row.id);
  const out: string[] = [];
  out.push(
    second
      ? t('cBest', { name: a.row.name, xp: num(a.xp), other: second.row.name, xp2: num(second.xp) })
      : t('cOnly', { name: a.row.name, xp: num(a.xp) }),
  );
  out.push(t('cStart', { name: a.row.name, p: pct(a.pStart) }));
  const f = a.row.xp?.fixtures.find((x) => x.gameday === c.gameday);
  if (f) out.push(t('cMatch', { opp: f.opponentName, home: f.home ? t('home') : t('away'), gf: num(f.goalsFor), cs: pct(f.pCleanSheet) }));
  return out.slice(0, 3);
}
