import { useI18n } from '../i18n';
import type { Dataset, Position, Row } from '../types';
import { surnameOf, teamCode } from './ui';

function Token({ r, data, onOpen }: { r: Row; data: Dataset; onOpen: (r: Row) => void }) {
  const { num } = useI18n();
  const f = r.xp?.fixtures[0];
  const diff = f ? (data.ratingById.get(r.teamId)?.fixtures.find((x) => x.gameday === f.gameday)?.difficulty ?? 3) : 3;
  return (
    <button type="button" className={`token token-${r.availability}`} onClick={() => onOpen(r)}>
      <span className="token-xp">{r.xp ? num(r.xp.xp1) : '—'}</span>
      <span className="token-name">{surnameOf(r)}</span>
      <span className={`token-opp diff-${diff}`}>
        {f ? `${f.home ? '' : '@'}${teamCode(data, f.opponentId, f.opponentName)}` : '—'}
      </span>
    </button>
  );
}

const ROWS: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

/** Relvado visto de cima: GR em baixo, avançados em cima. Banco por baixo do relvado. */
export function Pitch({ xi, bench, data, onOpen }: { xi: Row[]; bench: Row[]; data: Dataset; onOpen: (r: Row) => void }) {
  const { t } = useI18n();
  return (
    <div className="pitch-wrap">
      <div className="pitch" role="group" aria-label="Onze">
        <div className="pitch-lines" aria-hidden>
          <span className="pitch-half" />
          <span className="pitch-circle" />
          <span className="pitch-box top" />
          <span className="pitch-box bottom" />
        </div>
        {[...ROWS].reverse().map((pos) => (
          <div key={pos} className="pitch-row">
            {xi
              .filter((r) => r.position === pos)
              .map((r) => (
                <Token key={r.id} r={r} data={data} onOpen={onOpen} />
              ))}
          </div>
        ))}
      </div>
      <div className="bench" aria-label={t('bench')}>
        <span className="bench-label">{t('bench')}</span>
        <div className="bench-row">
          {bench.map((r) => (
            <Token key={r.id} r={r} data={data} onOpen={onOpen} />
          ))}
        </div>
      </div>
    </div>
  );
}
