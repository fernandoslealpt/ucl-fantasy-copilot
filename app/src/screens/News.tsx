import { useState } from 'react';
import { surnameOf, useAgo } from '../components/ui';
import { useI18n } from '../i18n';
import type { MyTeam } from '../team';
import type { Dataset, Row } from '../types';

export function NewsScreen({ data, team, onOpen }: { data: Dataset; team: MyTeam | null; onOpen: (r: Row) => void }) {
  const { t, d } = useI18n();
  const ago = useAgo();
  const [mine, setMine] = useState(!!team);
  const myIds = new Set(team?.players ?? []);
  const myTeams = new Set((team?.players ?? []).map((id) => data.byId.get(id)?.teamId).filter(Boolean));
  const items = data.news.filter((n) => !mine || n.playerIds.some((id) => myIds.has(id)) || myTeams.has(n.teamId));

  return (
    <section className="screen">
      <div className="screen-head">
        <h1>{t('newsTitle')}</h1>
        {team ? (
          <label className="check">
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
            {t('onlyMyTeam')}
          </label>
        ) : null}
      </div>
      {items.length === 0 ? <p className="muted">{t('noNews')}</p> : null}
      <ul className="news">
        {items.map((n) => (
          <li key={n.id} className={`news-item news-${n.kind}`}>
            <span className="news-kind">{d.kind[n.kind]}</span>
            <a href={n.url} target="_blank" rel="noreferrer" className="news-title">
              {n.title}
            </a>
            <span className="news-meta muted">
              {n.teamName}, {n.source}, {ago(n.publishedAt)}
            </span>
            {n.playerIds.length ? (
              <span className="news-players">
                {n.playerIds.map((id) => {
                  const r = data.byId.get(id);
                  return r ? (
                    <button key={id} type="button" className={`chip ${myIds.has(id) ? 'on' : ''}`} onClick={() => onOpen(r)}>
                      {surnameOf(r)}
                    </button>
                  ) : null;
                })}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
