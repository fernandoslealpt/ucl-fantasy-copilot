import { useEffect, useRef, useState } from 'react';
import { useAgo } from '../components/ui';
import { useI18n, type Lang } from '../i18n';
import { getToken, setToken, testToken } from '../sync';

export type Theme = 'auto' | 'light' | 'dark';

interface Props {
  theme: Theme;
  setTheme: (t: Theme) => void;
  lastSync: string | null;
  onSyncNow: () => Promise<string>;
  onClose: () => void;
}

export function SettingsSheet({ theme, setTheme, lastSync, onSyncNow, onClose }: Props) {
  const { t, d, lang, setLang } = useI18n();
  const ago = useAgo();
  const ref = useRef<HTMLDialogElement>(null);
  const [token, setTokenInput] = useState(getToken() ?? '');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const dlg = ref.current;
    dlg?.showModal();
    return () => dlg?.close();
  }, []);

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    try {
      setMsg(await fn());
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog ref={ref} className="sheet" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-labelledby="settings-title">
      <div className="sheet-body">
        <header className="sheet-head">
          <h2 id="settings-title">{t('settings')}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('close')}>
            ✕
          </button>
        </header>

        <fieldset className="segmented">
          <legend>{t('language')}</legend>
          {(['pt', 'en'] as Lang[]).map((l) => (
            <label key={l} className={lang === l ? 'on' : ''}>
              <input type="radio" name="lang" checked={lang === l} onChange={() => setLang(l)} />
              {l === 'pt' ? 'Português' : 'English'}
            </label>
          ))}
        </fieldset>

        <fieldset className="segmented">
          <legend>{t('theme')}</legend>
          {(['auto', 'light', 'dark'] as Theme[]).map((th) => (
            <label key={th} className={theme === th ? 'on' : ''}>
              <input type="radio" name="theme" checked={theme === th} onChange={() => setTheme(th)} />
              {th === 'auto' ? t('themeAuto') : th === 'light' ? t('themeLight') : t('themeDark')}
            </label>
          ))}
        </fieldset>

        <h3>{t('syncTitle')}</h3>
        <p>{t('syncIntro')}</p>
        <ol className="steps">
          {d.syncSteps.map((s, i) => (
            <li key={i}>
              {i === 0 ? (
                <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
                  {s}
                </a>
              ) : (
                s
              )}
            </li>
          ))}
        </ol>
        <label className="field">
          <span>{t('tokenLabel')}</span>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={token}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="github_pat_…"
          />
        </label>
        <div className="row-actions">
          <button
            type="button"
            className="btn primary"
            disabled={!token.trim() || busy}
            onClick={() =>
              run(async () => {
                try {
                  await testToken(token);
                } catch (e) {
                  throw new Error(t('tokenFail', { e: e instanceof Error ? e.message : String(e) }));
                }
                setToken(token);
                return `${t('tokenSaved')} ${t('tokenOk')}`;
              })
            }
          >
            {t('tokenSave')}
          </button>
          <button type="button" className="btn" disabled={busy} onClick={() => run(onSyncNow)}>
            {t('syncNow')}
          </button>
          {getToken() ? (
            <button
              type="button"
              className="link"
              onClick={() => {
                setToken(null);
                setTokenInput('');
                setMsg('');
              }}
            >
              {t('tokenRemove')}
            </button>
          ) : null}
        </div>
        {msg ? (
          <p role="status" className="hint">
            {msg}
          </p>
        ) : null}
        {lastSync ? <p className="muted">{t('syncedAt', { t: ago(lastSync) })}</p> : null}
      </div>
    </dialog>
  );
}
