/** Sugestão a meio da jornada: o capitão já jogou e fez poucos pontos; passar a braçadeira a quem ainda vai jogar. */
import { useI18n } from '../i18n';
import type { CaptainSwitch } from '../advice/live';

export function CaptainSwitchCard({ sw, onDone, onOpen }: { sw: CaptainSwitch; onDone: () => void; onOpen: (r: CaptainSwitch['to']) => void }) {
  const { t, num } = useI18n();
  const time = sw.kickoff ? new Date(sw.kickoff).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' }) : '';
  return (
    <section className="switch-card" aria-label={t('switchTitle', { to: sw.to.name })}>
      <h2>
        ⚠ {t('switchTitle', { to: sw.to.name })}
      </h2>
      <p>
        {t('switchText', {
          from: sw.from.name,
          pts: sw.fromPts,
          dbl: sw.fromPts * 2,
          to: sw.to.name,
          when: time ? t('switchWhen', { time }) : '',
          xp: num(sw.toXp),
          gain: num(sw.gain),
        })}
      </p>
      <div className="plan-actions">
        <button type="button" className="btn primary" onClick={onDone}>
          {t('switchDone')}
        </button>
        <button type="button" className="btn" onClick={() => onOpen(sw.to)}>
          {sw.to.name}
        </button>
      </div>
    </section>
  );
}
