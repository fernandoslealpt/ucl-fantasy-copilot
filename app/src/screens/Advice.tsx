import { useEffect, useMemo, useState } from 'react';
import {
  adviseCaptain,
  adviseTransfers,
  HIT,
  HIT_MARGIN,
  planConfidence,
  swapReasons,
  type CaptainPick,
  type Plan,
  type Reason,
  type TransferAdvice,
} from '../advice/engine';
import { StatusMark, pct } from '../components/ui';
import { useI18n } from '../i18n';
import { bestXI, freeTransfersFor, type MyTeam } from '../team';
import type { Dataset, Row } from '../types';

interface Props {
  data: Dataset;
  team: MyTeam | null;
  onSave: (team: MyTeam) => Promise<string>;
  onOpen: (r: Row) => void;
}

/** Jornada para a qual se planeiam as transferências (a seguinte, se a atual já começou). */
function targetGameday(data: Dataset): number | null {
  const g = data.meta.currentGameday;
  if (g == null) return null;
  return data.meta.gamedayState === 'upcoming' ? g : g + 1;
}

export function AdviceScreen({ data, team, onSave, onOpen }: Props) {
  const { t } = useI18n();
  const gd = targetGameday(data);
  const squad = useMemo(() => (team?.players ?? []).map((id) => data.byId.get(id)).filter((r): r is Row => !!r), [team, data]);

  if (!team || squad.length !== 15 || gd == null)
    return (
      <section className="empty">
        <h1>{t('adviceNoTeamTitle')}</h1>
        <p>{t('adviceNoTeamText')}</p>
        <a className="btn primary" href="#equipa">
          {t('tabTeam')}
        </a>
      </section>
    );
  return <AdviceBody data={data} team={team} squad={squad} gd={gd} onSave={onSave} onOpen={onOpen} />;
}

function AdviceBody({
  data,
  team,
  squad,
  gd,
  onSave,
  onOpen,
}: {
  data: Dataset;
  team: MyTeam;
  squad: Row[];
  gd: number;
  onSave: (team: MyTeam) => Promise<string>;
  onOpen: (r: Row) => void;
}) {
  const { t, num } = useI18n();
  const free = freeTransfersFor(team, gd);
  const [advice, setAdvice] = useState<TransferAdvice | null>(null);
  const [count, setCount] = useState<1 | 2 | 3>(1);
  const [msg, setMsg] = useState('');
  const keepIds = team.keep ?? [];
  const keepKey = keepIds.join(',');

  // o cálculo demora meio segundo: deixa o ecrã aparecer primeiro
  useEffect(() => {
    setAdvice(null);
    const keep = new Set(keepKey ? keepKey.split(',') : []);
    const h = setTimeout(() => setAdvice(adviseTransfers(data.rows, squad, team.bank, free, gd, keep)), 30);
    return () => clearTimeout(h);
  }, [data, squad, team.bank, free, gd, keepKey]);

  const captain = useMemo(() => {
    const xpAt = (r: Row) => r.xp?.fixtures.filter((f) => f.gameday === gd).reduce((s, f) => s + f.xp, 0) ?? 0;
    return adviseCaptain(bestXI(squad, xpAt).xi, gd);
  }, [squad, gd]);

  const setKeep = (ids: string[]) => void onSave({ ...team, keep: ids, updatedAt: new Date().toISOString() });
  const keepPlayer = (id: string) => setKeep([...new Set([...keepIds, id])]);
  const setFree = (v: number) =>
    void onSave({ ...team, freeTransfers: Math.max(0, Math.min(5, v)), ftGameday: gd, updatedAt: new Date().toISOString() });

  const apply = async (p: Plan) => {
    const names = p.swaps.map((s) => `${s.out.name} → ${s.in.name}`).join(', ');
    if (!confirm(t('applyConfirm', { swaps: names }))) return;
    const outs = new Set(p.swaps.map((s) => s.out.id));
    const players = [...team.players.filter((id) => !outs.has(id)), ...p.swaps.map((s) => s.in.id)];
    const m = await onSave({
      ...team,
      players,
      bank: p.bankAfter,
      freeTransfers: Math.max(0, free - p.swaps.length),
      ftGameday: gd,
      updatedAt: new Date().toISOString(),
    });
    setMsg(`${t('applied')} ${m}`);
  };

  return (
    <section>
      <div className="screen-head">
        <h1>{t('adviceTitle', { gd })}</h1>
      </div>
      {data.meta.gamedayState && data.meta.gamedayState !== 'upcoming' ? <p className="hint">{t('adviceNextGd', { gd })}</p> : null}

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
      {msg ? (
        <p className="notice" role="status">
          {msg}
        </p>
      ) : null}

      <h2>{t('transfersTitle')}</h2>
      {!advice ? (
        <p className="muted" role="status">
          {t('calculating')}
        </p>
      ) : (
        <>
          {advice.recommended ? (
            <PlanCard
              plan={advice.recommended}
              advice={advice}
              data={data}
              recommended
              onApply={apply}
              onOpen={onOpen}
              onKeep={keepPlayer}
            />
          ) : (
            <div className="plan-card">
              <p className="plan-head">
                <strong>{t('noMove')}</strong>
              </p>
              <p>{advice.bestFree ? t('noMoveWhy', { x: num(advice.bestFree.delta), n: advice.ctx.gds.length }) : t('noMoveNone')}</p>
            </div>
          )}
          <p className="muted small-print">{t('hitRule', { hit: HIT, need: HIT + HIT_MARGIN })}</p>

          <h3>{t('otherOptions')}</h3>
          <div className="chips" role="group">
            {([1, 2, 3] as const).map((c) => (
              <button
                key={c}
                type="button"
                className={`chip ${count === c ? 'on' : ''}`}
                aria-pressed={count === c}
                onClick={() => setCount(c)}
              >
                {t(c === 1 ? 'oneSwap' : 'nSwaps', { n: c })}
                {c > free ? ` (−${HIT * (c - free)})` : ''}
              </button>
            ))}
          </div>
          {advice.byCount[count].length === 0 ? <p className="muted">{t('noOptions')}</p> : null}
          {advice.byCount[count].map((p) => (
            <PlanCard
              key={p.swaps.map((s) => s.in.id).join('-')}
              plan={p}
              advice={advice}
              data={data}
              onApply={apply}
              onOpen={onOpen}
              onKeep={keepPlayer}
            />
          ))}
        </>
      )}

      <h2>{t('captainTitle')}</h2>
      <CaptainCard c={captain} onOpen={onOpen} />
    </section>
  );
}

function PlanCard({
  plan,
  advice,
  data,
  recommended = false,
  onApply,
  onOpen,
  onKeep,
}: {
  plan: Plan;
  advice: TransferAdvice;
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
  const sign = (x: number) => `${x >= 0 ? '+' : '−'}${num(Math.abs(x))}`;
  return (
    <article className={`plan-card ${recommended ? 'rec' : ''}`}>
      {recommended ? <p className="rec-label">{t('recommended')}</p> : null}
      <ul className="swaps">
        {plan.swaps.map((s) => (
          <li key={s.out.id}>
            <div className="swap-row">
              <button type="button" className="swap-p out" onClick={() => onOpen(s.out)}>
                <span className="swap-tag">{t('swapOut')}</span>
                <span className="swap-name">
                  <StatusMark a={s.out.availability} />
                  <span className="player-name">{s.out.name}</span>
                </span>
                <span className="muted">€{num(s.out.price)}M</span>
              </button>
              <span className="swap-arrow" aria-hidden>
                →
              </span>
              <button type="button" className="swap-p in" onClick={() => onOpen(s.in)}>
                <span className="swap-tag">{t('swapIn')}</span>
                <span className="swap-name">
                  <StatusMark a={s.in.availability} />
                  <span className="player-name">{s.in.name}</span>
                </span>
                <span className="muted">
                  {s.in.teamName} · €{num(s.in.price)}M
                </span>
              </button>
            </div>
            <ul className="reasons">
              {swapReasons(ctx, data, s).map((r, i) => (
                <li key={i}>
                  <ReasonText r={r} />
                </li>
              ))}
            </ul>
            <button type="button" className="link keep-btn" onClick={() => onKeep(s.out.id)}>
              {t('keepPlayer', { name: s.out.name })}
            </button>
          </li>
        ))}
      </ul>
      <div className="plan-kpis">
        <span>
          <strong className="kpi">{sign(plan.delta)}</strong>
          <span className="muted">{t('ptsHorizon', { n: ctx.gds.length })}</span>
        </span>
        <span>
          <strong className="kpi">{sign(plan.deltaGd[0] ?? 0)}</strong>
          <span className="muted">{t('ptsGd', { gd: ctx.gds[0]! })}</span>
        </span>
        <span>
          <strong className="kpi">€{num(plan.bankAfter)}M</strong>
          <span className="muted">{t('bankAfter')}</span>
        </span>
      </div>
      {plan.hits ? <p className="hint">{t('hitNote', { n: plan.hits, pts: HIT * plan.hits, net: sign(plan.net) })}</p> : null}
      <p className="muted">{t('confidence', { c: conf })}</p>
      <div className="plan-actions">
        <button type="button" className="btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? t('hideDetail') : t('whatIf')}
        </button>
        <button type="button" className="btn primary" onClick={() => onApply(plan)}>
          {t('didIt')}
        </button>
      </div>
      {open ? (
        <table className="whatif">
          <thead>
            <tr>
              <th>{t('gdShort')}</th>
              <th>{t('teamNow')}</th>
              <th>{t('teamAfter')}</th>
              <th>Δ</th>
            </tr>
          </thead>
          <tbody>
            {ctx.gds.map((g, k) => (
              <tr key={g}>
                <td>J{g}</td>
                <td>{num(advice.base.perGd[k]!)}</td>
                <td>{num(advice.base.perGd[k]! + plan.deltaGd[k]!)}</td>
                <td>
                  <strong>{sign(plan.deltaGd[k]!)}</strong>
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

function ReasonText({ r }: { r: Reason }) {
  const { t, num } = useI18n();
  const v = r.v as Record<string, number | string>;
  const n = (k: string, digits = 1) => num(Number(v[k]), digits);
  const p = (k: string) => pct(Number(v[k]));
  switch (r.code) {
    case 'OUT_STATUS':
      return <>{r.v.status === 'out' ? t('rOut', { name: r.v.name }) : t('rDoubt', { name: r.v.name, p: p('p') })}</>;
    case 'START':
      return <>{t('rStart', { in: r.v.inName, inP: p('inP'), out: r.v.outName, outP: p('outP') })}</>;
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

function CaptainCard({ c, onOpen }: { c: ReturnType<typeof adviseCaptain>; onOpen: (r: Row) => void }) {
  const { t, num, lang } = useI18n();
  const day = (x: CaptainPick) =>
    x.day
      ? new Date(`${x.day}T12:00:00`).toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT', {
          weekday: 'long',
          day: '2-digit',
          month: '2-digit',
        })
      : '—';
  if (!c.captain) return <p className="muted">{t('noCaptain')}</p>;
  const plan = c.plan;
  return (
    <div className="plan-card">
      <div className="captain-row">
        <button type="button" className="cap-pick" onClick={() => onOpen(c.captain!.row)}>
          <span className="cap-badge">C</span>
          <span>
            <span className="player-name">{c.captain.row.name}</span>
            <span className="muted">
              {num(c.captain.xp)} xP · {day(c.captain)} · {pct(c.captain.pStart)} {t('starterShort')}
            </span>
          </span>
        </button>
        {c.vice ? (
          <button type="button" className="cap-pick" onClick={() => onOpen(c.vice!.row)}>
            <span className="cap-badge vice">V</span>
            <span>
              <span className="player-name">{c.vice.row.name}</span>
              <span className="muted">
                {num(c.vice.xp)} xP · {day(c.vice)}
              </span>
            </span>
          </button>
        ) : null}
      </div>
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
      <table className="whatif">
        <thead>
          <tr>
            <th>{t('player')}</th>
            <th>xP</th>
            <th>{t('starterShort')}</th>
            <th>{t('day')}</th>
          </tr>
        </thead>
        <tbody>
          {c.ranking.slice(0, 5).map((x) => (
            <tr key={x.row.id}>
              <td>{x.row.name}</td>
              <td>{num(x.xp)}</td>
              <td>{pct(x.pStart)}</td>
              <td>{day(x)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
