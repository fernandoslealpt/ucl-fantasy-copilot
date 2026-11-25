/**
 * "Como correu a J{N}": pontos, minutos e jogador do jogo de cada um dos teus 15 na última jornada com resultados.
 * Provisório enquanto alguma equipa do plantel ainda não jogou nessa jornada (os pontos podem ser corrigidos).
 */
import type { History } from '../history';
import { useI18n } from '../i18n';
import type { MyTeam } from '../team';
import type { Dataset, Row } from '../types';

export function lastResultGameday(squad: Row[]): number {
  let n = 0;
  for (const r of squad) for (const l of r.history) if (l.gameday > n) n = l.gameday;
  return n;
}

/** Pontos do onze guardado, com o capitão a dobrar (só se o capitão está no onze). */
export function gamedayTotal(xi: string[], captain: string | undefined, pts: (id: string) => number): number {
  return xi.reduce((a, id) => a + pts(id), 0) + (captain && xi.includes(captain) ? pts(captain) : 0);
}

export function LastGameday({
  data,
  squad,
  team,
  history,
  onOpen,
}: {
  data: Dataset;
  squad: Row[];
  team: MyTeam;
  history?: History;
  onOpen: (r: Row) => void;
}) {
  const { t, num } = useI18n();
  const N = lastResultGameday(squad);
  if (!N) return null;
  const line = (r: Row) => r.history.find((l) => l.gameday === N);
  const toPlay = (r: Row) => data.teamById.get(r.teamId)?.nextMatch?.gameday === N;
  const provisional = squad.some(toPlay);
  const rows = [...squad].sort((a, b) => (line(b)?.points ?? -99) - (line(a)?.points ?? -99));

  // total do onze guardado (+ capitão a dobrar), só se o onze e o capitão são desta jornada
  const xi = team.lineup?.gameday === N ? team.lineup.xi : null;
  const cap = team.decisions?.gameday === N ? team.decisions.captain : undefined;
  const pts = (id: string) => data.byId.get(id)?.history.find((l) => l.gameday === N)?.points ?? 0;
  const total = xi ? gamedayTotal(xi, cap, pts) : null;
  const predicted = history?.gamedays[String(N)]?.teamXp ?? null;

  return (
    <section className="last-gd" aria-label={t('lastGdTitle', { gd: N })}>
      <div className="section-head">
        <h2>{t('lastGdTitle', { gd: N })}</h2>
        {provisional ? <span className="prov-tag">{t('lastGdProvisional')}</span> : null}
      </div>
      {total != null ? (
        <p className="small-print">
          {t('lastGdTotal', { real: num(total, 0) })}
          {predicted != null ? ` · ${t('lastGdPred', { xp: num(predicted) })}` : ''}
        </p>
      ) : null}
      <div className="table-wrap">
        <table className="table compact">
          <thead>
            <tr>
              <th className="sticky">{t('player')}</th>
              <th className="num">{t('lastGdPts')}</th>
              <th className="num">{t('lastGdMin')}</th>
              <th>{t('lastGdNotes')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const l = line(r);
              const motm = (l?.stats?.playerOfTheMatch ?? 0) > 0;
              const played = (l?.minutes ?? 0) > 0;
              return (
                <tr key={r.id}>
                  <th scope="row" className="sticky">
                    <button type="button" className="link" onClick={() => onOpen(r)}>
                      {r.name}
                    </button>
                  </th>
                  <td className="num">
                    <strong>{l ? l.points : '—'}</strong>
                  </td>
                  <td className="num">{l ? (l.minutes ?? 0) : '—'}</td>
                  <td>
                    {motm ? <span className="motm-tag" title={t('lastGdMotm')}>★ {t('lastGdMotm')}</span> : null}{' '}
                    {l?.stats && l.stats.goals > 0 ? `${t(l.stats.goals === 1 ? 'lastGdGoal' : 'lastGdGoals', { n: l.stats.goals })} ` : ''}
                    {l?.stats && l.stats.assists > 0 ? `${t('lastGdAssists', { n: l.stats.assists })} ` : ''}
                    {!l ? <span className="muted">{toPlay(r) ? t('lastGdToPlay') : t('lastGdNoData')}</span> : !played ? <span className="muted">{t('lastGdNotPlayed')}</span> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small-print">{t('lastGdHelp')}</p>
    </section>
  );
}
