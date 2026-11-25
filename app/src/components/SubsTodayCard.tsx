/**
 * Substituições de hoje: o que ainda se pode mexer (só jogadores que ainda não jogaram) e se compensa.
 * Responde sempre, também quando a resposta é "nenhuma compensa".
 */
import { useI18n } from '../i18n';
import { kickoffOf } from '../advice/live';
import { applySwap, type Lineup } from '../squad';
import type { Row } from '../types';

export const SUB_MIN_GAIN = 0.3;

export function SubsTodayCard({
  gd,
  lineup,
  saved,
  byId,
  pairs,
  gain,
  locked,
  xpAt,
  onSaveLineup,
  bare = false,
}: {
  bare?: boolean;
  gd: number;
  lineup: Lineup;
  saved: boolean;
  byId: Map<string, Row>;
  pairs: { out: string; in: string }[];
  gain: number;
  locked: ReadonlySet<string>;
  xpAt: (r: Row) => number;
  onSaveLineup: (l: Lineup) => void;
}) {
  const { t, num } = useI18n();
  const row = (id: string) => byId.get(id)!;
  const worth = pairs.length > 0 && gain >= SUB_MIN_GAIN;
  const time = (() => {
    const ks = pairs.flatMap((p) => [kickoffOf(row(p.out), gd), kickoffOf(row(p.in), gd)]).filter((k): k is string => !!k).sort();
    return ks[0] ? new Date(ks[0]).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' }) : '';
  })();
  // para explicar o "nenhuma compensa": melhor suplente e titular mais fraco, ambos por jogar
  const benchLeft = lineup.bench.map(row).filter((r) => r && !locked.has(r.id) && r.position !== 'GK');
  const xiLeft = lineup.xi.map(row).filter((r) => r && !locked.has(r.id) && r.position !== 'GK');
  const bestBench = [...benchLeft].sort((a, b) => xpAt(b) - xpAt(a))[0];
  const worstXi = [...xiLeft].sort((a, b) => xpAt(a) - xpAt(b))[0];

  return (
    <section className={bare ? '' : 'subs-card'} aria-label={t('subsTitle', { gd })}>
      {bare ? null : <h2>{t('subsTitle', { gd })}</h2>}
      {worth ? (
        <>
          <ul className="plain">
            {pairs.map((p) => (
              <li key={`${p.out}>${p.in}`}>
                {t('subsSuggest', { out: row(p.out).name, xout: num(xpAt(row(p.out))), in: row(p.in).name, xin: num(xpAt(row(p.in))) })}
              </li>
            ))}
          </ul>
          <p>{t('subsGain', { gain: num(gain), time: time || '—' })}</p>
          <div className="plan-actions">
            <button
              type="button"
              className="btn primary"
              onClick={() => onSaveLineup(pairs.reduce((l, p) => applySwap(l, p.out, p.in), lineup))}
            >
              {t('subsDone')}
            </button>
          </div>
        </>
      ) : (
        <>
          <p>
            <strong>{t('subsNone')}</strong>
          </p>
          {bestBench && worstXi ? (
            <p className="muted small-print">
              {t('subsNoneWhy', { in: bestBench.name, xin: num(xpAt(bestBench)), out: worstXi.name, xout: num(xpAt(worstXi)) })}
            </p>
          ) : null}
        </>
      )}
      {!saved ? (
        <p className="muted small-print">
          {t('subsLineupNote', { gd })}{' '}
          <button type="button" className="link" onClick={() => onSaveLineup(lineup)}>
            {t('subsSave')}
          </button>
        </p>
      ) : null}
      <p className="muted small-print">{t('subsRecheck')}</p>
    </section>
  );
}
