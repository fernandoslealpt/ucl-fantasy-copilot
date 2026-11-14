import { useMemo, useState, type ReactNode } from 'react';
import { useI18n } from '../i18n';

export interface Column<T> {
  key: string;
  label: ReactNode;
  /** Explicação curta (tooltip) em linguagem simples */
  tip?: string;
  value?: (row: T) => number | string;
  render: (row: T) => ReactNode;
  numeric?: boolean;
  /** Fica fixa à esquerda no scroll horizontal (telemóvel) */
  sticky?: boolean;
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  limit?: number;
  onRowClick?: (row: T) => void;
  footer?: ReactNode;
  caption?: string;
}

export function SortTable<T>({ rows, columns, rowKey, initialSort, limit, onRowClick, footer, caption }: Props<T>) {
  const { t } = useI18n();
  const [sort, setSort] = useState(initialSort ?? null);
  const [tip, setTip] = useState<string | null>(null);
  const tipCol = columns.find((c) => c.key === tip);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.value) return rows;
    const v = col.value;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = v(a);
      const y = v(b);
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * dir;
    });
  }, [rows, columns, sort]);
  const shown = limit ? sorted.slice(0, limit) : sorted;

  const toggle = (c: Column<T>) => {
    if (!c.value) return;
    setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key: c.key, dir: c.numeric ? 'desc' : 'asc' }));
  };

  return (
    <>
      {tipCol?.tip ? (
        <p className="tip-bar" role="status">
          <strong>{tipCol.label}:</strong> {tipCol.tip}
          <button type="button" className="link" onClick={() => setTip(null)} aria-label={t('close')}>
            ✕
          </button>
        </p>
      ) : null}
    <div className="table-wrap">
      <table className="table">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  className={`${c.numeric ? 'num' : ''} ${c.sticky ? 'sticky' : ''}`}
                  aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  title={c.tip}
                >
                  {c.value ? (
                    <button type="button" onClick={() => toggle(c)} className={active ? 'active' : ''}>
                      {c.label}
                      <span className="sort-arrow" aria-hidden>
                        {active ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
                      </span>
                    </button>
                  ) : (
                    c.label
                  )}
                  {c.tip ? (
                    <button
                      type="button"
                      className="tip-btn"
                      aria-label={`${t('tipHelp')} (${typeof c.label === 'string' ? c.label : c.key})`}
                      aria-expanded={tip === c.key}
                      onClick={() => setTip(tip === c.key ? null : c.key)}
                    >
                      ⓘ
                    </button>
                  ) : null}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => (
            <tr
              key={rowKey(r)}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={onRowClick ? 'clickable' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(r) : undefined}
            >
              {columns.map((c) => (
                <td key={c.key} className={`${c.numeric ? 'num' : ''} ${c.sticky ? 'sticky' : ''}`}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {footer}
    </div>
    </>
  );
}
