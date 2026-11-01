import { useCallback, useEffect, useState } from 'react';
import { PlayerSheet } from './components/PlayerSheet';
import { Scoreboard } from './components/Scoreboard';
import { TabBar, type Tab } from './components/TabBar';
import { useDataset } from './data';
import { useI18n } from './i18n';
import { AdviceScreen } from './screens/Advice';
import { FixturesScreen } from './screens/Fixtures';
import { MyTeamScreen } from './screens/MyTeam';
import { NewsScreen } from './screens/News';
import { PlayersScreen } from './screens/Players';
import { SettingsSheet, type Theme } from './screens/Settings';
import { getToken, newest, readRemoteTeam, writeRemoteTeam } from './sync';
import { loadLocalTeam, saveLocalTeam, type MyTeam } from './team';
import type { Row } from './types';

const TABS: Tab[] = ['equipa', 'conselhos', 'jogadores', 'calendario', 'noticias'];
const tabFromHash = (): Tab => {
  const h = location.hash.replace('#', '') as Tab;
  return TABS.includes(h) ? h : 'equipa';
};

function readTheme(): Theme {
  try {
    const v = localStorage.getItem('ucl.theme');
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function App() {
  const { t } = useI18n();
  const [state, reload] = useDataset();
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [open, setOpen] = useState<Row | null>(null);
  const [settings, setSettings] = useState(false);
  const [theme, setThemeState] = useState<Theme>(readTheme);
  const [team, setTeam] = useState<MyTeam | null>(loadLocalTeam);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('ucl.theme', theme);
    } catch {
      /* sem armazenamento */
    }
  }, [theme]);

  /** Junta a equipa local com a sincronizada: fica a mais recente. */
  const sync = useCallback(async (): Promise<string> => {
    const local = loadLocalTeam();
    const remote = await readRemoteTeam();
    const best = newest(local, remote);
    if (best && best === remote && remote !== local) {
      saveLocalTeam(remote);
      setTeam(remote);
    }
    if (best && best === local && getToken() && (!remote || remote.updatedAt !== local.updatedAt)) await writeRemoteTeam(local);
    const at = new Date().toISOString();
    setLastSync(at);
    return best === remote && remote && (!local || remote.updatedAt !== local.updatedAt) ? t('syncedRemote') : t('savedSynced');
  }, [t]);

  useEffect(() => {
    const local = loadLocalTeam();
    readRemoteTeam()
      .then((remote) => {
        const best = newest(local, remote);
        if (best && remote && best === remote && (!local || remote.updatedAt !== local.updatedAt)) {
          saveLocalTeam(remote);
          setTeam(remote);
          setNotice(t('syncedRemote'));
        }
        setLastSync(new Date().toISOString());
      })
      .catch(() => undefined);
    // só no arranque
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveTeam = async (tm: MyTeam): Promise<string> => {
    saveLocalTeam(tm);
    setTeam(tm);
    if (!getToken()) return t('savedNotSynced');
    try {
      await writeRemoteTeam(tm);
      setLastSync(new Date().toISOString());
      return t('savedSynced');
    } catch (e) {
      return t('syncFailed', { e: e instanceof Error ? e.message : String(e) });
    }
  };

  if (state.status === 'loading')
    return (
      <div className="splash" role="status">
        <span className="splash-mark" aria-hidden />
        <p>{t('loading')}</p>
      </div>
    );
  if (state.status === 'error')
    return (
      <div className="splash" role="alert">
        <p>{t('loadError')}</p>
        <p className="muted">{state.error}</p>
        <button type="button" className="btn primary" onClick={reload}>
          {t('retry')}
        </button>
      </div>
    );

  const data = state.data;
  const mine = new Set(team?.players ?? []);
  const recentNews = data.news.filter(
    (n) => n.kind !== 'other' && Date.now() - Date.parse(n.publishedAt) < 24 * 3600_000 && n.playerIds.some((id) => mine.has(id)),
  ).length;
  return (
    <div className="app">
      <Scoreboard meta={data.meta} onSettings={() => setSettings(true)} />
      <TabBar tab={tab} onTab={setTab} newsCount={recentNews} />
      <main className="main">
        {notice ? (
          <p className="notice" role="status">
            {notice}
            <button type="button" className="link" onClick={() => setNotice('')} aria-label={t('close')}>
              ✕
            </button>
          </p>
        ) : null}
        {tab === 'equipa' ? <MyTeamScreen data={data} team={team} onSave={saveTeam} onOpen={setOpen} /> : null}
        {tab === 'conselhos' ? <AdviceScreen data={data} team={team} onSave={saveTeam} onOpen={setOpen} /> : null}
        {tab === 'jogadores' ? <PlayersScreen data={data} onOpen={setOpen} /> : null}
        {tab === 'calendario' ? <FixturesScreen data={data} /> : null}
        {tab === 'noticias' ? <NewsScreen data={data} team={team} onOpen={setOpen} /> : null}
      </main>
      {open ? <PlayerSheet row={open} data={data} onClose={() => setOpen(null)} /> : null}
      {settings ? (
        <SettingsSheet theme={theme} setTheme={setThemeState} lastSync={lastSync} onSyncNow={sync} onClose={() => setSettings(false)} />
      ) : null}
    </div>
  );
}
