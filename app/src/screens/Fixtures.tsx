import { useI18n } from '../i18n';
import type { Dataset } from '../types';
import { Difficulty, teamCode } from '../components/ui';

export function FixturesScreen({ data }: { data: Dataset }) {
  const { t, num } = useI18n();
  const targets = data.targets;
  const rows = [...data.ratings]
    .map((r) => ({
      r,
      team: data.teamById.get(r.id),
      score: r.fixtures.slice(0, 3).reduce((a, f) => a + f.difficulty, 0) + r.fixtures.slice(0, 3).reduce((a, f) => a + f.goalsAgainst - f.goalsFor, 0) / 10,
    }))
    .sort((a, b) => a.score - b.score);

  return (
    <section className="screen">
      <div className="screen-head">
        <h1>{t('fixturesTitle')}</h1>
      </div>
      <p className="muted">{t('fixturesHelp')}</p>
      <div className="legend" aria-hidden>
        <span>{t('easy')}</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`diff diff-${n}`}>
            {n}
          </span>
        ))}
        <span>{t('hard')}</span>
      </div>
      <div className="table-wrap">
        <table className="table fixtures">
          <thead>
            <tr>
              <th className="sticky">{t('colTeam')}</th>
              {targets.map((g) => (
                <th key={g}>J{g}</th>
              ))}
              <th className="num">{t('colRecord')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ r, team }) => (
              <tr key={r.id}>
                <th scope="row" className="sticky team-cell">
                  {r.name}
                </th>
                {targets.map((g) => {
                  const f = r.fixtures.find((x) => x.gameday === g);
                  return (
                    <td key={g} className="fx-cell">
                      {f ? (
                        <Difficulty n={f.difficulty}>
                          <span className="fx-opp">
                            {`${f.home ? '' : '@'}${teamCode(data, f.opponentId, f.opponentName)}`}
                          </span>
                          <span className="fx-cs" title={t('cCleanSheet')}>
                            {Math.round(f.pCleanSheet * 100)}%
                          </span>
                        </Difficulty>
                      ) : (
                        '—'
                      )}
                    </td>
                  );
                })}
                <td className="num">{team ? `${team.record.won}-${team.record.drawn}-${team.record.lost}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.meta.model?.backtest.length ? (
        <>
          <h2>{t('modelTitle')}</h2>
          <p className="muted">
            {t('modelText', {
              m: num(data.meta.model.backtest.reduce((a, b) => a + b.modelTop20, 0) / data.meta.model.backtest.length),
              b: num(data.meta.model.backtest.reduce((a, b) => a + b.baselineTop20, 0) / data.meta.model.backtest.length),
            })}
          </p>
        </>
      ) : null}
    </section>
  );
}
