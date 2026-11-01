import { useEffect, useRef } from 'react';
import { useI18n } from '../i18n';
import type { Dataset, Row, XpComponents } from '../types';
import { Difficulty, Opponent, pct, StatusMark, useNote } from './ui';

const COMPONENT_LABEL: Record<keyof XpComponents, 'cAppearance' | 'cGoals' | 'cAssists' | 'cCleanSheet' | 'cRecoveries' | 'cSaves' | 'cMotm' | 'cConceded' | 'cCards'> = {
  appearance: 'cAppearance',
  goals: 'cGoals',
  assists: 'cAssists',
  cleanSheet: 'cCleanSheet',
  recoveries: 'cRecoveries',
  saves: 'cSaves',
  playerOfTheMatch: 'cMotm',
  conceded: 'cConceded',
  cards: 'cCards',
};

export function PlayerSheet({ row, data, onClose }: { row: Row; data: Dataset; onClose: () => void }) {
  const { t, d, num } = useI18n();
  const noteOf = useNote();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dlg = ref.current;
    dlg?.showModal();
    return () => dlg?.close();
  }, []);

  const next = row.xp?.fixtures[0];
  const comps = next
    ? (Object.entries(next.components) as [keyof XpComponents, number][]).filter(([, v]) => Math.abs(v) >= 0.05).sort((a, b) => b[1] - a[1])
    : [];
  const maxComp = Math.max(0.5, ...comps.map(([, v]) => Math.abs(v)));
  const lastGd = Math.max(0, (data.meta.currentGameday ?? 1) - (data.meta.gamedayState === 'finished' ? 0 : 1));
  const hist = Array.from({ length: Math.max(lastGd, ...row.history.map((h) => h.gameday)) }, (_, i) => {
    const gd = i + 1;
    return { gd, line: row.history.find((h) => h.gameday === gd) };
  });
  const maxPts = Math.max(6, ...hist.map((h) => h.line?.points ?? 0));
  const rating = data.ratingById.get(row.teamId);

  return (
    <dialog ref={ref} className="sheet" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-labelledby="sheet-title">
      <div className="sheet-body">
        <header className="sheet-head">
          <div>
            <h2 id="sheet-title">{row.fullName}</h2>
            <p className="muted">
              {row.teamName}, {d.pos[row.position]}, €{num(row.price)}M
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('close')}>
            ✕
          </button>
        </header>

        <p className="sheet-status">
          <StatusMark a={row.availability} label />
          {row.status.note ? <span className="muted"> {noteOf(row.status.note)}</span> : null}
        </p>

        {row.xp ? (
          <>
            <div className="sheet-kpis">
              <div>
                <strong className="kpi">{num(row.xp.xp1)}</strong>
                <span>{t('colXp', { gd: next?.gameday ?? '' })}</span>
              </div>
              <div>
                <strong className="kpi">{num(row.xp.xp3)}</strong>
                <span>{t('colXp3')}</span>
              </div>
              <div>
                <strong className="kpi">{pct(next?.pStart)}</strong>
                <span>{t('colStart')}</span>
              </div>
              <div>
                <strong className="kpi">{d.conf[row.xp.confidence]}</strong>
                <span>{t('confidence', { c: '' }).replace(/[:\s]+$/, '')}</span>
              </div>
            </div>

            <h3>{t('nextGames')}</h3>
            <ul className="fixture-list">
              {row.xp.fixtures.map((f) => {
                const diff = rating?.fixtures.find((x) => x.gameday === f.gameday)?.difficulty ?? 3;
                return (
                  <li key={f.gameday}>
                    <span className="gd">J{f.gameday}</span>
                    <Difficulty n={diff}>
                      <Opponent f={f} />
                    </Difficulty>
                    <span className="num strong">{num(f.xp)}</span>
                  </li>
                );
              })}
            </ul>

            {comps.length ? (
              <>
                <h3>{t('whyXp', { gd: next?.gameday ?? '' })}</h3>
                <ul className="bars">
                  {comps.map(([k, v]) => (
                    <li key={k}>
                      <span>{t(COMPONENT_LABEL[k])}</span>
                      <span className="bar-track">
                        <span className={`bar ${v < 0 ? 'neg' : ''}`} style={{ width: `${(Math.abs(v) / maxComp) * 100}%` }} />
                      </span>
                      <span className="num">{num(v)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        ) : null}

        <h3>{t('history')}</h3>
        <div className="history" role="img" aria-label={hist.map((h) => `J${h.gd}: ${h.line?.points ?? 0}`).join(', ')}>
          {hist.map(({ gd, line }) => (
            <div key={gd} className="history-col">
              <span className="history-pts">{line?.points ?? 0}</span>
              <span className="history-bar" style={{ height: `${(Math.max(0, line?.points ?? 0) / maxPts) * 100}%` }} />
              <span className="history-gd">J{gd}</span>
              <span className="history-min muted">{line?.minutes != null ? `${line.minutes}'` : '—'}</span>
            </div>
          ))}
        </div>

        {row.xp ? (
          <>
            <h3>{t('per90')}</h3>
            <dl className="rates">
              <div>
                <dt>{t('cGoals')}</dt>
                <dd>{num(row.xp.rates.goals90, 2)}</dd>
              </div>
              <div>
                <dt>{t('cAssists')}</dt>
                <dd>{num(row.xp.rates.assists90, 2)}</dd>
              </div>
              <div>
                <dt>{t('cRecoveries')}</dt>
                <dd>{num(row.xp.rates.recoveries90, 1)}</dd>
              </div>
              {row.position === 'GK' ? (
                <div>
                  <dt>{t('cSaves')}</dt>
                  <dd>{num(row.xp.rates.saves90, 1)}</dd>
                </div>
              ) : null}
              <div>
                <dt>{t('colSel')}</dt>
                <dd>{num(row.selectedPct, 0)}%</dd>
              </div>
            </dl>
          </>
        ) : null}
      </div>
    </dialog>
  );
}
