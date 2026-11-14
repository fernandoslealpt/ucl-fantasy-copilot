/**
 * Lista de jogadores para preencher um lugar vazio (como na app oficial): filtros por equipa e preço,
 * pesquisa, colunas ordenáveis e as sugestões da app (⭐) no topo, com o ganho de xP contra quem saiu.
 */
import { useMemo, useState } from 'react';
import { makeCtx, squadValue } from '../advice/engine';
import { useI18n } from '../i18n';
import type { Dataset, Position, Row } from '../types';
import { StatusMark, teamCode } from './ui';

type SortKey = 'gain' | 'price' | 'points' | 'last' | 'avg' | 'xp' | 'xp3' | 'sel' | 'ppm';

export function Catalog({
  data,
  pos,
  gd,
  others,
  replaced,
  inSquad,
  bankLeft,
  onPick,
}: {
  data: Dataset;
  pos: Position;
  gd: number;
  /** os outros 14 do plantel (para calcular o ganho) */
  others: Row[];
  /** quem estava no lugar (referência do ganho) */
  replaced: Row | null;
  inSquad: Set<string>;
  /** dinheiro disponível para este lugar */
  bankLeft: number;
  onPick: (r: Row) => void;
}) {
  const { t, num, d } = useI18n();
  const [q, setQ] = useState('');
  const [team, setTeam] = useState('');
  const [maxPrice, setMaxPrice] = useState(0);
  const [onlyAvail, setOnlyAvail] = useState(true);
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'points', dir: -1 });
  const [limit, setLimit] = useState(40);

  const ctx = useMemo(() => makeCtx(data.rows, gd), [data.rows, gd]);
  const base = useMemo(() => (replaced ? squadValue(ctx, [...others, replaced]).total : squadValue(ctx, others).total), [ctx, others, replaced]);
  const gainOf = useMemo(() => {
    const cache = new Map<string, number>();
    return (r: Row) => {
      let g = cache.get(r.id);
      if (g == null) {
        g = squadValue(ctx, [...others, r]).total - base;
        cache.set(r.id, g);
      }
      return g;
    };
  }, [ctx, others, base]);

  const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const xpAt = (r: Row) => (r.xp?.fixtures ?? []).filter((f) => f.gameday === gd).reduce((a, f) => a + f.xp, 0);
  const val = (r: Row, k: SortKey): number => {
    switch (k) {
      case 'gain':
        return gainOf(r);
      case 'price':
        return r.price;
      case 'points':
        return r.stats.points;
      case 'last':
        return r.form.lastGameday;
      case 'avg':
        return r.form.avgPoints;
      case 'xp':
        return xpAt(r);
      case 'xp3':
        return r.xp?.xp3 ?? 0;
      case 'sel':
        return r.selectedPct;
      case 'ppm':
        return r.price ? r.stats.points / r.price : 0;
    }
  };

  const all = useMemo(
    () => data.rows.filter((r) => r.position === pos && r.status.active),
    [data.rows, pos],
  );
  // sugestões: os 3 com mais ganho entre os disponíveis que cabem no orçamento
  const suggestions = useMemo(
    () =>
      all
        .filter((r) => !inSquad.has(r.id) && r.availability !== 'out' && r.availability !== 'inactive' && r.price <= bankLeft + 1e-6)
        .map((r) => ({ r, g: gainOf(r) }))
        .sort((a, b) => b.g - a.g)
        .slice(0, 3)
        .filter((x) => x.g > 0.1),
    [all, inSquad, bankLeft, gainOf],
  );
  const qf = fold(q.trim());
  const rows = all
    .filter(
      (r) =>
        (!team || r.teamId === team) &&
        (!maxPrice || r.price <= maxPrice) &&
        (!onlyAvail || r.availability === 'available' || r.availability === 'doubtful') &&
        (!qf || fold(`${r.fullName} ${r.name} ${r.teamName}`).includes(qf)),
    )
    .sort((a, b) => (val(a, sort.k) - val(b, sort.k)) * sort.dir);
  const shown = rows.slice(0, limit);
  const teams = [...data.teams].sort((a, b) => a.name.localeCompare(b.name));
  const cols: { k: SortKey; label: string; tip: string }[] = [
    { k: 'price', label: '€M', tip: t('tipPrice') },
    { k: 'points', label: t('colPts'), tip: t('tipPts') },
    { k: 'last', label: t('colLast'), tip: t('tipLast') },
    { k: 'avg', label: t('colAvg'), tip: t('tipAvg') },
    { k: 'xp', label: `xP J${gd}`, tip: t('tipXp') },
    { k: 'gain', label: t('colGain'), tip: t('tipGain') },
    { k: 'sel', label: '%', tip: t('tipSel') },
  ];
  const cell = (r: Row, k: SortKey) => {
    switch (k) {
      case 'price':
        return <span className={r.price > bankLeft + 1e-6 ? 'neg' : ''}>{num(r.price)}</span>;
      case 'gain': {
        const g = gainOf(r);
        return <strong className={g > 0.05 ? 'pos' : g < -0.05 ? 'neg' : ''}>{`${g > 0 ? '+' : ''}${num(g)}`}</strong>;
      }
      case 'xp':
        return num(xpAt(r));
      case 'avg':
        return num(r.form.avgPoints);
      case 'sel':
        return num(r.selectedPct, 0);
      case 'points':
        return r.stats.points;
      case 'last':
        return r.form.lastGameday;
      default:
        return num(val(r, k));
    }
  };
  const nameCell = (r: Row) => {
    const f = r.xp?.fixtures.find((x) => x.gameday === gd);
    return (
      <span className="player-cell">
        <StatusMark a={r.availability} />
        <span>
          <span className="player-name">
            {r.name}
            {r.xp?.sample?.spiky ? <span title={t('spikyShort')}> ⚠</span> : null}
          </span>
          <span className="player-team">
            {teamCode(data, r.teamId, r.teamName)} {f ? `${f.home ? 'v' : '@'} ${teamCode(data, f.opponentId, f.opponentName)}` : ''}
          </span>
        </span>
      </span>
    );
  };

  return (
    <div className="catalog">
      <p className="muted small-print">
        {t('catalogFor', { pos: d.pos[pos], bank: num(bankLeft) })}
        {replaced ? ` · ${t('gainVs', { name: replaced.name })}` : ''}
      </p>
      {suggestions.length ? (
        <div className="suggest">
          <p className="suggest-title">⭐ {t('suggestTitle')}</p>
          {suggestions.map(({ r, g }) => (
            <button key={r.id} type="button" className="suggest-row" onClick={() => onPick(r)}>
              {nameCell(r)}
              <span className="num">€{num(r.price)}M</span>
              <strong className="pos num">+{num(g)}</strong>
            </button>
          ))}
          <p className="muted small-print">{t('gainExplain')}</p>
        </div>
      ) : null}
      <div className="filters">
        <input type="search" placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('search')} />
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
            {[4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 9, 10, 11, 12].map((p) => (
              <option key={p} value={p}>
                {t('maxPrice', { p: num(p) })}
              </option>
            ))}
          </select>
          <label className="check">
            <input type="checkbox" checked={onlyAvail} onChange={(e) => setOnlyAvail(e.target.checked)} />
            {t('onlyAvailable')}
          </label>
        </div>
      </div>
      <div className="table-wrap">
        <table className="table catalog-table">
          <thead>
            <tr>
              <th className="sticky">{t('colPlayer')}</th>
              {cols.map((c) => (
                <th key={c.k} className="num" aria-sort={sort.k === c.k ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
                  <button
                    type="button"
                    className={sort.k === c.k ? 'active' : ''}
                    onClick={() => setSort((s) => (s.k === c.k ? { k: c.k, dir: (s.dir * -1) as 1 | -1 } : { k: c.k, dir: -1 }))}
                    aria-label={`${c.label}: ${c.tip}`}
                  >
                    {c.label}
                    <span className="sort-arrow" aria-hidden>
                      {sort.k === c.k ? (sort.dir === 1 ? '▲' : '▼') : ''}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const mine = inSquad.has(r.id);
              return (
                <tr key={r.id} className={mine ? 'mine' : 'clickable'} onClick={mine ? undefined : () => onPick(r)} tabIndex={mine ? undefined : 0} onKeyDown={(e) => !mine && e.key === 'Enter' && onPick(r)}>
                  <td className="sticky">{nameCell(r)}</td>
                  {cols.map((c) => (
                    <td key={c.k} className="num">
                      {mine && c.k === 'gain' ? '—' : cell(r, c.k)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length > limit ? (
          <button type="button" className="btn more" onClick={() => setLimit((l) => l + 60)}>
            {t('showMore')} ({rows.length - limit})
          </button>
        ) : null}
      </div>
      <details className="col-help">
        <summary>{t('colHelp')}</summary>
        <dl>
          {cols.map((c) => (
            <div key={c.k}>
              <dt>{c.label}</dt>
              <dd>{c.tip}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
