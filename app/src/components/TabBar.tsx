import { useI18n } from '../i18n';

export type Tab = 'equipa' | 'jogadores' | 'calendario' | 'noticias';

const ICONS: Record<Tab, string> = {
  // camisola
  equipa: 'M8 3l-5 3 2 4 2-1v12h10V9l2 1 2-4-5-3c0 2-1.5 3-3 3S8 5 8 3z',
  // lista
  jogadores: 'M4 5h2v2H4zm4 0h12v2H8zM4 11h2v2H4zm4 0h12v2H8zM4 17h2v2H4zm4 0h12v2H8z',
  // calendário
  calendario: 'M7 2v2H4v17h16V4h-3V2h-2v2H9V2zm-1 7h12v10H6zm2 2v2h2v-2zm4 0v2h2v-2z',
  // jornal
  noticias: 'M3 5h14v14H5a2 2 0 0 1-2-2zm16 3h2v9a2 2 0 0 1-2 2zM6 8v3h8V8zm0 5v2h8v-2z',
};

export function TabBar({ tab, onTab, newsCount }: { tab: Tab; onTab: (t: Tab) => void; newsCount: number }) {
  const { t } = useI18n();
  const labels: Record<Tab, string> = {
    equipa: t('tabTeam'),
    jogadores: t('tabPlayers'),
    calendario: t('tabFixtures'),
    noticias: t('tabNews'),
  };
  return (
    <nav className="tabbar" aria-label="Secções">
      {(Object.keys(labels) as Tab[]).map((k) => (
        <a key={k} href={`#${k}`} className={tab === k ? 'active' : ''} aria-current={tab === k ? 'page' : undefined} onClick={() => onTab(k)}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <path fill="currentColor" d={ICONS[k]} />
          </svg>
          <span>{labels[k]}</span>
          {k === 'noticias' && newsCount > 0 ? <span className="badge">{newsCount}</span> : null}
        </a>
      ))}
    </nav>
  );
}
