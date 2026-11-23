/**
 * Lesão detetada pela app nas notícias: duração estimada, jornadas em que o jogador conta como ausente e as fontes.
 */
import { useI18n } from '../i18n';
import type { Injury, Row } from '../types';

export function injuryHeadline(t: ReturnType<typeof useI18n>['t'], i: Injury): string {
  return t(i.severity === 'long' ? 'injLong' : i.severity === 'weeks' ? 'injWeeks' : 'injDays');
}

export function InjuryBlock({ row }: { row: Row }) {
  const { t, lang } = useI18n();
  const i = row.injury;
  if (!i) return null;
  const loc = lang === 'en' ? 'en-GB' : 'pt-PT';
  const back = new Date(i.expectedBack).toLocaleDateString(loc, { day: '2-digit', month: 'short', year: 'numeric' });
  const day = (iso: string) => new Date(iso).toLocaleString(loc, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  return (
    <section className="injury-block" role="note">
      <h3>
        🩹 {injuryHeadline(t, i)} · {i.status === 'confirmed' ? t('injConfirmed') : t('injSuspected')}
      </h3>
      <p>
        {i.outUntilGameday != null ? t('injOutUntil', { gd: i.outUntilGameday, back }) : t('injBack', { back })} {i.assumed ? t('injAssumed') : ''}
      </p>
      <p className="muted small-print">{i.status === 'confirmed' ? t('injModelOut') : t('injModelReduced')}</p>
      <ul className="plain">
        {i.evidence
          .slice()
          .reverse()
          .map((e) => (
            <li key={e.url + e.title}>
              <a href={e.url} target="_blank" rel="noreferrer">
                {e.title}
              </a>{' '}
              <span className="muted">
                {e.source} · {day(e.publishedAt)}
              </span>
            </li>
          ))}
      </ul>
    </section>
  );
}
