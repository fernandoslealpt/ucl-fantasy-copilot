import { useNow } from '../data';
import { useI18n } from '../i18n';
import type { Meta } from '../types';
import { useAgo } from './ui';

/** O marcador: contagem decrescente até ao fecho da equipa + frescura dos dados. */
export function Scoreboard({ meta, onSettings }: { meta: Meta; onSettings: () => void }) {
  const { t, d } = useI18n();
  const now = useNow(15_000);
  const ago = useAgo();
  const gd = meta.currentGameday ?? '—';
  const deadline = meta.deadline ? Date.parse(meta.deadline) : null;
  const left = deadline ? deadline - now : null;

  let big: string;
  let small: string;
  if (left != null && left > 0) {
    const mins = Math.floor(left / 60_000);
    const dd = Math.floor(mins / 1440);
    const hh = Math.floor((mins % 1440) / 60);
    const mm = mins % 60;
    big = dd > 0 ? `${dd}${d.d} ${hh}${d.h} ${String(mm).padStart(2, '0')}${d.min}` : `${hh}${d.h} ${String(mm).padStart(2, '0')}${d.min}`;
    small = t('deadlineAt', { gd, date: '' }).trim();
  } else if (meta.gamedayState === 'live') {
    big = t('live', { gd });
    small = '';
  } else if (meta.gamedayState === 'finished') {
    big = t('finished', { gd });
    small = '';
  } else {
    big = t('deadlinePassed', { gd });
    small = '';
  }
  const urgent = left != null && left > 0 && left < 6 * 3600_000;
  const failing = Object.entries(meta.sources)
    .filter(([k, s]) => s.status === 'failed' && k !== 'clubElo')
    .map(([k]) => k);
  const deadlineText =
    deadline != null
      ? new Intl.DateTimeFormat(document.documentElement.lang || 'pt-PT', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }).format(deadline)
      : '';

  return (
    <header className={`scoreboard ${urgent ? 'urgent' : ''}`}>
      <div className="scoreboard-inner">
        <div className="clock">
          <span className="clock-big" aria-live="polite">
            {big}
          </span>
          {small ? (
            <span className="clock-small">
              {small} {deadlineText}
            </span>
          ) : null}
        </div>
        <div className="scoreboard-side">
          <span className="fresh">{t('updatedAgo', { t: ago(meta.generatedAt, now) })}</span>
          <button type="button" className="icon-btn" onClick={onSettings} aria-label={t('settings')}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              <path
                fill="currentColor"
                d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7.4 7.4 0 0 0-1.7 1l-2.4-1-2 3.4L6.6 11a7.6 7.6 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.4 7.4 0 0 0 1.7-1l2.4 1 2-3.4zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"
                transform="translate(-1 0)"
              />
            </svg>
          </button>
        </div>
      </div>
      {failing.length ? <p className="source-warning">{t('sourceFailed', { s: failing.join(', ') })}</p> : null}
    </header>
  );
}
