/**
 * As perguntas que a app responde sozinha (sem IA), com a conta à vista.
 */
import { useState } from 'react';
import { adviseTransfers } from '../advice/engine';
import { captainDifferentials, rollAnalysis, whyNot, type RollAnalysis, type SnapshotDiff, type WhyNot } from '../advice/questions';
import { useI18n } from '../i18n';
import { freeTransfersFor, type MyTeam } from '../team';
import type { Dataset, Row } from '../types';
import { pct } from './ui';

const signed = (num: (n: number, d?: number) => string, x: number) => (Math.abs(x) < 0.05 ? num(0) : `${x > 0 ? '+' : '−'}${num(Math.abs(x))}`);

// ———————————————— 1. Porque não este jogador? ————————————————

export function WhyNotPanel({ data, team, gd, row }: { data: Dataset; team: MyTeam | null; gd: number | null; row: Row }) {
  const { t, num } = useI18n();
  const [res, setRes] = useState<WhyNot | null>(null);
  const [busy, setBusy] = useState(false);
  if (!team || gd == null || team.players.includes(row.id)) return null;
  const squad = team.players.map((id) => data.byId.get(id)).filter((r): r is Row => !!r);
  if (squad.length !== 15) return null;
  const run = () => {
    setBusy(true);
    setTimeout(() => {
      const free = freeTransfersFor(team, gd);
      const a = adviseTransfers(data.rows, squad, team.bank, free, gd, new Set(team.keep ?? []));
      setRes(whyNot(a, data.rows, squad, team.bank, free, gd, row));
      setBusy(false);
    }, 20);
  };
  return (
    <section className="question">
      {!res ? (
        <button type="button" className="btn" onClick={run} disabled={busy}>
          {busy ? t('calculating') : `❓ ${t('qWhyNot')}`}
        </button>
      ) : (
        <>
          <h3>❓ {t('qWhyNot')}</h3>
          <ol className="reasons">
            {res.reasons.map((r, i) => (
              <li key={i}>
                {r.code === 'RECOMMENDED'
                  ? t('wnRecommended')
                  : r.code === 'UNAVAILABLE'
                    ? t('wnUnavailable')
                    : r.code === 'NO_GAMES'
                      ? t('wnNoGames')
                      : r.code === 'BUDGET'
                        ? t('wnBudget', { x: num(r.need) })
                        : r.code === 'CLUB_LIMIT'
                          ? t('wnClub', { club: r.club, max: r.max })
                          : r.code === 'LOW_START'
                            ? t('wnLowStart', { p: pct(r.p) })
                            : r.code === 'SPIKY'
                              ? t('wnSpiky', { share: pct(r.share) })
                              : r.code === 'LOW_GAIN'
                                ? t('wnLowGain', { gain: signed(num, res.best?.delta ?? 0), ref: signed(num, res.reference), short: num(res.shortfall) })
                                : t('wnInSquad')}
              </li>
            ))}
            {res.best ? (
              <li>
                {t('wnBestSwap', {
                  out: res.best.swaps[0]!.out.name,
                  gain: signed(num, res.best.delta),
                  now: signed(num, res.best.deltaGd[0] ?? 0),
                  gd,
                })}
              </li>
            ) : null}
          </ol>
          {res.reasons.length === 0 && res.best ? <p className="muted">{t('wnFine')}</p> : null}
        </>
      )}
    </section>
  );
}

// ———————————————— 2. E se eu guardar a transferência? ————————————————

export function RollCard({ data, team, squad, gd, free }: { data: Dataset; team: MyTeam; squad: Row[]; gd: number; free: number }) {
  const { t, num } = useI18n();
  const [res, setRes] = useState<RollAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const run = () => {
    setBusy(true);
    setTimeout(() => {
      setRes(rollAnalysis(data.rows, squad, team.bank, free, gd, new Set(team.keep ?? [])));
      setBusy(false);
    }, 20);
  };
  const names = (p: { swaps: { out: Row; in: Row }[] } | null) => (p && p.swaps.length ? p.swaps.map((s) => `${s.out.name} → ${s.in.name}`).join(', ') : t('noTransfers'));
  return (
    <section className="section question">
      <h2>{t('qRoll')}</h2>
      {!res ? (
        <>
          <p className="muted small-print">{t('qRollIntro', { free })}</p>
          <button type="button" className="btn" onClick={run} disabled={busy}>
            {busy ? t('calculating') : t('calculate')}
          </button>
        </>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table compact">
              <thead>
                <tr>
                  <th className="sticky">{t('rollNow', { gd })}</th>
                  <th className="num">{t('total')}</th>
                  <th className="num">{t('rollGainNow')}</th>
                  <th className="num">{t('rollGainNext', { gd: res.next })}</th>
                </tr>
              </thead>
              <tbody>
                {res.options.map((o) => (
                  <tr key={o.now} className={o.best ? 'rec-row' : ''}>
                    <th scope="row" className="sticky">
                      {o.now === 0 ? t('rollKeepAll') : t(o.now === 1 ? 'oneSwap' : 'nSwaps', { n: o.now })}
                      <small className="muted">
                        {' '}
                        {t('rollThenFree', { n: o.nextFree, gd: res.next })}
                      </small>
                      {o.best ? <span className="rec-pill">{t('recommended')}</span> : null}
                    </th>
                    <td className="num">
                      <strong>{signed(num, o.total)}</strong>
                    </td>
                    <td className="num">{signed(num, o.gainNow)}</td>
                    <td className="num">{signed(num, o.gainNext)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="plain small-print">
            {res.options.map((o) => (
              <li key={o.now}>
                <strong>{o.now === 0 ? t('rollKeepAll') : t(o.now === 1 ? 'oneSwap' : 'nSwaps', { n: o.now })}:</strong> J{gd}: {names(o.planNow)} · J{res.next}: {names(o.planNext)}
              </li>
            ))}
          </ul>
          <p className="muted small-print">{t('rollExplain')}</p>
        </>
      )}
    </section>
  );
}

// ———————————————— 4. Capitão diferencial ————————————————

export function DifferentialTable({ xi, gd, onOpen }: { xi: Row[]; gd: number; onOpen: (r: Row) => void }) {
  const { t, num } = useI18n();
  const rows = captainDifferentials(xi, gd).slice(0, 5);
  if (!rows.length) return null;
  return (
    <section className="question">
      <h3>{t('qDiff')}</h3>
      <p className="muted small-print">{t('qDiffIntro')}</p>
      <div className="table-wrap">
        <table className="table compact">
          <thead>
            <tr>
              <th className="sticky">{t('player')}</th>
              <th className="num">xP</th>
              <th className="num">{t('edgeCol')}</th>
              <th className="num">{t('riskCol')}</th>
              <th className="num">{t('ownedCol')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.row.id}>
                <td className="sticky">
                  <button type="button" className="link" onClick={() => onOpen(o.row)}>
                    {o.row.name}
                  </button>
                </td>
                <td className="num">{num(o.xp)}</td>
                <td className="num">
                  <strong>{num(o.edge)}</strong>
                </td>
                <td className={`num ${o.cost > 0.05 ? 'neg' : ''}`}>{o.cost > 0.05 ? `−${num(o.cost)}` : '0'}</td>
                <td className="num">{num(o.owned, 0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small-print">{t('qDiffExplain')}</p>
    </section>
  );
}

// ———————————————— 5. O que mudou desde a última visita? ————————————————

export function ChangesCard({ diff, data, onClose }: { diff: SnapshotDiff; data: Dataset; onClose: () => void }) {
  const { t, num, lang } = useI18n();
  const name = (id: string) => data.byId.get(id)?.name ?? id;
  const when = new Date(diff.since).toLocaleString(lang === 'en' ? 'en-GB' : 'pt-PT', { weekday: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  return (
    <div className="changes-card" role="status">
      <div className="section-head">
        <strong>🔄 {t('qChanges', { when })}</strong>
        <button type="button" className="link" onClick={onClose} aria-label={t('close')}>
          ✕
        </button>
      </div>
      <ul className="plain">
        {diff.recChanged ? (
          <li>
            {t('chRec', {
              before: diff.before.length ? diff.before.join(', ') : t('noTransfers'),
              after: diff.after.length ? diff.after.join(', ') : t('noTransfers'),
            })}
          </li>
        ) : null}
        {diff.captainChanged ? <li>{t('chCap', { before: diff.captainBefore ? name(diff.captainBefore) : '—', after: diff.captainAfter ? name(diff.captainAfter) : '—' })}</li> : null}
        {diff.moves.map((m) => (
          <li key={m.id}>
            {name(m.id)}: {num(m.before)} → <strong className={m.after > m.before ? 'pos' : 'neg'}>{num(m.after)}</strong> xP
          </li>
        ))}
      </ul>
    </div>
  );
}
