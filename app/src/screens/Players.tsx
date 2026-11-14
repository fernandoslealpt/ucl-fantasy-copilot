import { useMemo, useState } from 'react';
import { SortTable, type Column } from '../components/SortTable';
import { Crest } from '../components/Field';
import { Difficulty, Opponent, pct, StatusMark, teamCode } from '../components/ui';
import { useI18n } from '../i18n';
import { POSITIONS } from '../team';
import type { Dataset, Position, Row } from '../types';

const PRICES = [5, 6, 7, 8, 10];

export function PlayersScreen({ data, onOpen }: { data: Dataset; onOpen: (r: Row) => void }) {
  const { t, d, num } = useI18n();
  const [pos, setPos] = useState<Position | 'ALL'>('ALL');
  const [team, setTeam] = useState('');
  const [maxPrice, setMaxPrice] = useState(0);
  const [onlyAvail, setOnlyAvail] = useState(true);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(60);
  const gd = data.targets[0] ?? data.meta.currentGameday ?? '';

  const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const rows = useMemo(() => {
    const q = fold(query.trim());
    return data.rows.filter(
      (r) =>
        (pos === 'ALL' || r.position === pos) &&
        (!team || r.teamId === team) &&
        (!maxPrice || r.price <= maxPrice) &&
        (!onlyAvail || r.availability === 'available' || r.availability === 'doubtful') &&
        (!q || fold(`${r.fullName} ${r.name} ${r.teamName}`).includes(q)),
    );
  }, [data.rows, pos, team, maxPrice, onlyAvail, query]);

  const cols: Column<Row>[] = [
    {
      key: 'name',
      label: t('colPlayer'),
      tip: t('tipPlayer'),
      sticky: true,
      value: (r) => r.name,
      render: (r) => (
        <span className="player-cell">
          <StatusMark a={r.availability} />
          <Crest data={data} teamId={r.teamId} size={20} />
          <span>
            <span className="player-name">{r.name}</span>
            <span className="player-team">
              {r.teamName}, {d.pos[r.position]}
            </span>
          </span>
        </span>
      ),
    },
    { key: 'price', label: t('colPrice'), tip: t('tipPrice'), numeric: true, value: (r) => r.price, render: (r) => num(r.price) },
    { key: 'xp1', label: t('colXp', { gd }), tip: t('tipXp'), numeric: true, value: (r) => r.xp?.xp1 ?? 0, render: (r) => <strong>{num(r.xp?.xp1 ?? 0)}</strong> },
    { key: 'xp3', label: t('colXp3'), tip: t('tipXp3'), numeric: true, value: (r) => r.xp?.xp3 ?? 0, render: (r) => num(r.xp?.xp3 ?? 0) },
    { key: 'value', label: t('colValue'), tip: t('tipValue'), numeric: true, value: (r) => r.xp?.valuePerM ?? 0, render: (r) => num(r.xp?.valuePerM ?? 0, 2) },
    { key: 'start', label: t('colStart'), tip: t('tipStart'), numeric: true, value: (r) => r.xp?.fixtures[0]?.pStart ?? 0, render: (r) => pct(r.xp?.fixtures[0]?.pStart) },
    {
      key: 'opp',
      label: t('colOpp'),
      tip: t('tipOpp'),
      render: (r) => {
        const f = r.xp?.fixtures[0];
        const diff = f ? (data.ratingById.get(r.teamId)?.fixtures.find((x) => x.gameday === f.gameday)?.difficulty ?? 3) : 3;
        return f ? (
          <Difficulty n={diff}>
            <Opponent f={f} code={teamCode(data, f.opponentId, f.opponentName)} />
          </Difficulty>
        ) : (
          '—'
        );
      },
    },
    { key: 'pts', label: t('colPts'), tip: t('tipPts'), numeric: true, value: (r) => r.stats.points, render: (r) => r.stats.points },
    { key: 'min', label: t('colMin'), tip: t('tipMin'), numeric: true, value: (r) => r.stats.minutes, render: (r) => r.stats.minutes },
    { key: 'g90', label: t('colG90'), tip: t('tipG90'), numeric: true, value: (r) => r.xp?.rates.goals90 ?? 0, render: (r) => num(r.xp?.rates.goals90 ?? 0, 2) },
    { key: 'a90', label: t('colA90'), tip: t('tipA90'), numeric: true, value: (r) => r.xp?.rates.assists90 ?? 0, render: (r) => num(r.xp?.rates.assists90 ?? 0, 2) },
    { key: 'r90', label: t('colR90'), tip: t('tipR90'), numeric: true, value: (r) => r.xp?.rates.recoveries90 ?? 0, render: (r) => num(r.xp?.rates.recoveries90 ?? 0, 1) },
    { key: 'sel', label: t('colSel'), tip: t('tipSel'), numeric: true, value: (r) => r.selectedPct, render: (r) => num(r.selectedPct, 0) },
  ];

  const teams = [...data.teams].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <section className="screen">
      <div className="filters">
        <input type="search" placeholder={t('search')} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t('search')} />
        <div className="chips" role="group">
          {(['ALL', ...POSITIONS] as const).map((p) => (
            <button key={p} type="button" className={`chip ${pos === p ? 'on' : ''}`} onClick={() => setPos(p)} aria-pressed={pos === p}>
              {p === 'ALL' ? t('all') : d.pos[p]}
            </button>
          ))}
        </div>
        <div className="filter-row">
          <select value={team} onChange={(e) => setTeam(e.target.value)} aria-label={t('allTeams')}>
            <option value="">{t('allTeams')}</option>
            {teams.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.name}
              </option>
            ))}
          </select>
          <select value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} aria-label={t('anyPrice')}>
            <option value={0}>{t('anyPrice')}</option>
            {PRICES.map((p) => (
              <option key={p} value={p}>
                {t('maxPrice', { p })}
              </option>
            ))}
          </select>
          <label className="check">
            <input type="checkbox" checked={onlyAvail} onChange={(e) => setOnlyAvail(e.target.checked)} />
            {t('onlyAvailable')}
          </label>
        </div>
      </div>
      <SortTable
        rows={rows}
        columns={cols}
        rowKey={(r) => r.id}
        initialSort={{ key: 'xp1', dir: 'desc' }}
        limit={limit}
        onRowClick={onOpen}
        caption={t('tabPlayers')}
        footer={
          rows.length > limit ? (
            <button type="button" className="btn more" onClick={() => setLimit((l) => l + 100)}>
              {t('showMore')} ({rows.length - limit})
            </button>
          ) : null
        }
      />
    </section>
  );
}
