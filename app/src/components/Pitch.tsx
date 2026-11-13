import { useI18n } from '../i18n';
import type { Dataset, Position, Row } from '../types';
import { surnameOf, teamCode } from './ui';

function Token({ r, data, onOpen, gd, badge }: { r: Row; data: Dataset; onOpen: (r: Row) => void; gd?: number; badge?: 'C' | 'V' | null }) {
  const { num, t } = useI18n();
  const fs = (r.xp?.fixtures ?? []).filter((x) => (gd == null ? true : x.gameday === gd));
  const f = gd == null ? r.xp?.fixtures[0] : fs[0];
  const xp = gd == null ? r.xp?.xp1 : fs.reduce((a, x) => a + x.xp, 0);
  const diff = f ? (data.ratingById.get(r.teamId)?.fixtures.find((x) => x.gameday === f.gameday)?.difficulty ?? 3) : 3;
  return (
    <button
      type="button"
      className={`token token-${r.availability}`}
      onClick={() => onOpen(r)}
      aria-label={badge ? `${r.name} (${badge === 'C' ? t('captain') : t('viceCaptain')})` : r.name}
    >
      {badge ? <span className={`token-badge ${badge === 'V' ? 'vice' : ''}`}>{badge}</span> : null}
      <span className="token-xp">{r.xp && xp != null ? num(badge === 'C' ? xp * 2 : xp) : '—'}</span>
      <span className="token-name">{surnameOf(r)}</span>
      <span className={`token-opp diff-${diff}`}>
        {f ? `${f.home ? '' : '@'}${teamCode(data, f.opponentId, f.opponentName)}` : '—'}
      </span>
    </button>
  );
}

const ROWS: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

/** Relvado visto de cima: GR em baixo, avançados em cima. Banco por baixo do relvado. */
export function Pitch({
  xi,
  bench,
  data,
  onOpen,
  gd,
  captainId = null,
  viceId = null,
}: {
  xi: Row[];
  bench: Row[];
  data: Dataset;
  onOpen: (r: Row) => void;
  gd?: number;
  captainId?: string | null;
  viceId?: string | null;
}) {
  const badge = (r: Row) => (r.id === captainId ? 'C' : r.id === viceId ? 'V' : null);
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
                <Token key={r.id} r={r} data={data} onOpen={onOpen} gd={gd} badge={badge(r)} />
              ))}
          </div>
        ))}
      </div>
      <div className="bench" aria-label={t('bench')}>
        <span className="bench-label">{t('bench')}</span>
        <div className="bench-row">
          {bench.map((r) => (
            <Token key={r.id} r={r} data={data} onOpen={onOpen} gd={gd} />
          ))}
        </div>
      </div>
    </div>
  );
}
