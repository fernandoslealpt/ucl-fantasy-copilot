import { useEffect, useRef, useState } from 'react';
import { DATA_BASE, useNow } from '../data';
import { useI18n } from '../i18n';
import { requestDataUpdate } from '../sync';
import type { Meta } from '../types';
import { useAgo } from './ui';

type Pending = 'team' | 'transfers' | 'captain';

/** O marcador: contagem decrescente até ao fecho, o que falta decidir e frescura dos dados (com botão para atualizar). */
export function Scoreboard({
  meta,
  pending,
  onSettings,
  onReload,
}: {
  meta: Meta;
  pending: Pending[];
  onSettings: () => void;
  onReload: () => void;
}) {
  const { t, d } = useI18n();
  const [upd, setUpd] = useState<{ state: 'idle' | 'busy' | 'error'; msg?: string }>({ state: 'idle' });
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => void (poll.current && clearInterval(poll.current)), []);
  const refresh = async () => {
    if (upd.state === 'busy') return;
    try {
      await requestDataUpdate();
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      setUpd({
        state: 'error',
        msg: code === 'no-token' ? t('refreshNoToken') : code === 'no-actions-permission' ? t('refreshNoPerm') : code === 'bad-token' ? t('refreshBadToken') : t('refreshFail', { e: code }),
      });
      return;
    }
    setUpd({ state: 'busy', msg: t('refreshBusy') });
    const started = Date.now();
    const before = meta.generatedAt;
    poll.current = setInterval(async () => {
      try {
        const r = await fetch(`${DATA_BASE}meta.json?t=${Date.now()}`, { cache: 'no-store' });
        const m = (await r.json()) as Meta;
        if (m.generatedAt !== before) {
          clearInterval(poll.current!);
          setUpd({ state: 'idle' });
          onReload();
          return;
        }
      } catch {
        /* tenta outra vez */
      }
      if (Date.now() - started > 10 * 60_000) {
        clearInterval(poll.current!);
        setUpd({ state: 'error', msg: t('refreshSlow') });
      }
    }, 30_000);
  };
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
          <button
            type="button"
            className={`fresh fresh-btn ${now - Date.parse(meta.generatedAt) > 3 * 3600_000 ? 'stale' : ''}`}
            onClick={refresh}
            disabled={upd.state === 'busy'}
            title={t('refreshTitle')}
          >
            <span aria-hidden className={upd.state === 'busy' ? 'spin' : ''}>
              ⟳
            </span>{' '}
            {t('updatedAgo', { t: ago(meta.generatedAt, now) })}
          </button>
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
      {left != null && left > 0 ? (
        <p className={`pending-line ${pending.length ? '' : 'ok'}`}>
          {pending.length ? `${t('pendingPrefix')} ${pending.map((p) => t(p === 'team' ? 'pendTeam' : p === 'transfers' ? 'pendTransfers' : 'pendCaptain')).join(' · ')}` : `✓ ${t('pendingNone', { gd })}`}
        </p>
      ) : null}
      {upd.msg ? (
        <p className={`source-warning ${upd.state === 'busy' ? 'info' : ''}`} role="status">
          {upd.msg}
          {upd.state === 'error' ? (
            <button type="button" className="link" onClick={() => setUpd({ state: 'idle' })} aria-label={t('close')}>
              {' '}
              ✕
            </button>
          ) : null}
        </p>
      ) : null}
      {failing.length ? <p className="source-warning">{t('sourceFailed', { s: failing.join(', ') })}</p> : null}
    </header>
  );
}
