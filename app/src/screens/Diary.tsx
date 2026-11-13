/**
 * Diário: por jornada, o que a app recomendou, o que o Fernando fez, xP previsto e pontos reais.
 * Serve para aprender o que resulta (trocas, capitão) e acompanhar a evolução da equipa.
 */
import { useState } from 'react';
import { evaluateGameday, type GdEvaluation, type History, type SwapResult } from '../history';
import { useI18n } from '../i18n';
import type { Dataset } from '../types';
import type { RecordFn } from './MyTeam';

export function DiaryScreen({ data, history, onRecord }: { data: Dataset; history: History; onRecord: RecordFn }) {
  const { t, num } = useI18n();
  const recs = Object.values(history.gamedays).sort((a, b) => b.gameday - a.gameday);
  const evals = recs.map((r) => ({ rec: r, ev: evaluateGameday(r, data.byId) }));
  const played = evals.filter((e) => e.ev.played);
  const sum = (xs: (number | null)[]) => xs.reduce<number>((a, x) => a + (x ?? 0), 0);
  const capHits = played.filter((e) => e.ev.captain && e.ev.bestCaptain && e.ev.captain.pts === e.ev.bestCaptain.pts).length;

  if (!recs.length)
    return (
      <section className="empty">
        <h1>{t('diaryTitle')}</h1>
        <p>{t('diaryEmpty')}</p>
      </section>
    );

  return (
    <section className="screen">
      <div className="screen-head">
        <h1>{t('diaryTitle')}</h1>
      </div>
      <p className="muted">{t('diaryIntro')}</p>
      {played.length ? (
        <dl className="summary">
          <div>
            <dt>{t('diaryGds')}</dt>
            <dd className="kpi">{played.length}</dd>
          </div>
          <div>
            <dt>{t('diaryDoneGain')}</dt>
            <dd className="kpi">{signed(num, sum(played.map((e) => e.ev.doneGain)))}</dd>
          </div>
          <div>
            <dt>{t('diaryRecGain')}</dt>
            <dd className="kpi">{signed(num, sum(played.map((e) => e.ev.recommendedGain)))}</dd>
          </div>
          <div>
            <dt>{t('diaryCapHits')}</dt>
            <dd className="kpi">
              {capHits}/{played.filter((e) => e.ev.captain).length}
            </dd>
          </div>
        </dl>
      ) : null}
      {played.some((e) => e.ev.officialPoints != null) ? <PointsChart evals={played.map((e) => e.ev)} /> : null}
      {evals.map(({ rec, ev }) => (
        <GamedayCard key={rec.gameday} ev={ev} data={data} onPoints={(p) => onRecord(rec.gameday, { officialPoints: p })} />
      ))}
    </section>
  );
}

const signed = (num: (n: number, d?: number) => string, x: number) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${num(Math.abs(x), 0)}`;

function PointsChart({ evals }: { evals: GdEvaluation[] }) {
  const { t, num } = useI18n();
  const xs = [...evals].sort((a, b) => a.gameday - b.gameday);
  const max = Math.max(1, ...xs.map((e) => Math.max(e.officialPoints ?? 0, e.teamXp ?? 0)));
  return (
    <figure className="chart">
      <figcaption>{t('diaryChart')}</figcaption>
      <div className="bars">
        {xs.map((e) => (
          <div key={e.gameday} className="bar-col">
            <div className="bar-pair">
              <span className="bar xp" style={{ height: `${((e.teamXp ?? 0) / max) * 100}%` }} title={`xP ${num(e.teamXp ?? 0)}`} />
              <span className="bar real" style={{ height: `${((e.officialPoints ?? 0) / max) * 100}%` }} title={`${e.officialPoints ?? '—'}`} />
            </div>
            <span className="bar-label">J{e.gameday}</span>
            <span className="bar-value">{e.officialPoints ?? '—'}</span>
          </div>
        ))}
      </div>
      <p className="legend-row">
        <span className="dot xp" /> {t('diaryLegendXp')} <span className="dot real" /> {t('diaryLegendReal')}
      </p>
    </figure>
  );
}

function GamedayCard({ ev, data, onPoints }: { ev: GdEvaluation; data: Dataset; onPoints: (p: number | null) => void }) {
  const { t, num } = useI18n();
  const name = (id: string) => data.byId.get(id)?.name ?? id;
  const [input, setInput] = useState(ev.officialPoints != null ? String(ev.officialPoints) : '');
  const [err, setErr] = useState('');
  const save = () => {
    const v = input.trim();
    if (v === '') return onPoints(null);
    const n = Number(v);
    if (!Number.isInteger(n) || n < -50 || n > 400) return setErr(t('diaryPointsInvalid'));
    setErr('');
    onPoints(n);
  };
  const pts = (x: number | null) => (x == null ? '—' : String(x));
  const swapList = (xs: SwapResult[]) =>
    xs.map((s) => (
      <li key={`${s.out}>${s.in}`}>
        {name(s.out)} ({pts(s.outPts)}) → <strong>{name(s.in)}</strong> ({pts(s.inPts)})
        {s.gain != null ? <span className={s.gain >= 0 ? 'pos' : 'neg'}> {signed(num, s.gain)}</span> : null}
      </li>
    ));
  return (
    <article className="plan-card diary-card">
      <div className="section-head">
        <h2>J{ev.gameday}</h2>
        <span className="muted">
          {t('diaryXp')} {ev.teamXp != null ? num(ev.teamXp) : '—'}
          {ev.officialPoints != null ? ` · ${t('diaryReal')} ${ev.officialPoints}` : ''}
        </span>
      </div>
      <div className="diary-grid">
        <div>
          <h3>{t('diaryYouDid')}</h3>
          {ev.done.length ? <ul className="plain">{swapList(ev.done)}</ul> : <p className="muted">{t('diaryNoSwaps')}</p>}
          {ev.captain ? (
            <p>
              {t('captain')}: <strong>{name(ev.captain.id)}</strong> ({pts(ev.captain.pts)} × 2)
            </p>
          ) : null}
        </div>
        <div>
          <h3>{t('diaryAppSaid')}</h3>
          {ev.recommended.length ? <ul className="plain">{swapList(ev.recommended)}</ul> : <p className="muted">{t('diaryNoSwapsRec')}</p>}
          {ev.recommendedCaptain ? (
            <p>
              {t('captain')}: <strong>{name(ev.recommendedCaptain.id)}</strong> ({pts(ev.recommendedCaptain.pts)} × 2)
            </p>
          ) : null}
        </div>
      </div>
      {ev.played && ev.bestCaptain ? (
        <p className="muted">{t('diaryBestCap', { name: name(ev.bestCaptain.id), pts: ev.bestCaptain.pts })}</p>
      ) : (
        <p className="muted">{t('diaryNotPlayed')}</p>
      )}
      <div className="diary-points">
        <label>
          {t('diaryOfficial')}
          <input inputMode="numeric" value={input} onChange={(e) => setInput(e.target.value)} placeholder="—" aria-invalid={!!err} />
        </label>
        <button type="button" className="btn small" onClick={save}>
          {t('saveShort')}
        </button>
        <span className="muted small-print">{t('diaryOfficialHelp')}</span>
        {err ? <span className="hint error">{err}</span> : null}
      </div>
    </article>
  );
}
