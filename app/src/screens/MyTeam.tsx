import { useMemo, useState } from 'react';
import { Pitch } from '../components/Pitch';
import { SortTable, type Column } from '../components/SortTable';
import { Difficulty, Opponent, pct, StatusMark, surnameOf, teamCode, useNote } from '../components/ui';
import { useI18n } from '../i18n';
import { bestXI, clubLimit, POSITIONS, SQUAD, validate, type MyTeam } from '../team';
import type { Dataset, Position, Row } from '../types';

interface Props {
  data: Dataset;
  team: MyTeam | null;
  onSave: (team: MyTeam) => Promise<string>;
  onOpen: (r: Row) => void;
}

export function MyTeamScreen({ data, team, onSave, onOpen }: Props) {
  const [editing, setEditing] = useState(false);
  const { t } = useI18n();

  if (editing || !team) {
    if (!team && !editing)
      return (
        <section className="empty">
          <h1>{t('noTeamTitle')}</h1>
          <p>{t('noTeamText')}</p>
          <button type="button" className="btn primary" onClick={() => setEditing(true)}>
            {t('addTeam')}
          </button>
        </section>
      );
    return (
      <TeamBuilder
        data={data}
        initial={team}
        onCancel={team ? () => setEditing(false) : undefined}
        onSave={async (tm) => {
          const msg = await onSave(tm);
          setEditing(false);
          return msg;
        }}
      />
    );
  }
  return <TeamView data={data} team={team} onEdit={() => setEditing(true)} onOpen={onOpen} />;
}

function TeamView({ data, team, onEdit, onOpen }: { data: Dataset; team: MyTeam; onEdit: () => void; onOpen: (r: Row) => void }) {
  const { t, d, num } = useI18n();
  const noteOf = useNote();
  const squad = team.players.map((id) => data.byId.get(id)).filter((r): r is Row => !!r);
  const { xi, bench } = useMemo(() => bestXI(squad), [squad]);
  const gd = data.targets[0] ?? data.meta.currentGameday ?? '';
  const xiTotal = xi.reduce((a, r) => a + (r.xp?.xp1 ?? 0), 0);
  const value = squad.reduce((a, r) => a + r.price, 0);

  const alerts = useMemo(() => {
    const out: { level: 'red' | 'yellow'; text: string; row: Row }[] = [];
    const recent = Date.now() - 24 * 3600_000;
    for (const r of squad) {
      const name = surnameOf(r);
      const note = r.status.note ? noteOf(r.status.note) : d.avail[r.availability];
      if (r.availability === 'inactive') out.push({ level: 'red', row: r, text: t('alertInactive', { p: name }) });
      else if (r.availability === 'out') out.push({ level: 'red', row: r, text: t('alertOut', { p: name, note }) });
      else if (r.availability === 'doubtful' || r.availability === 'unknown')
        out.push({ level: 'yellow', row: r, text: t('alertDoubt', { p: name, note }) });
      else {
        const f = r.xp?.fixtures[0];
        const usualStarter = xi.includes(r);
        if (f && usualStarter && f.pStart < 0.6) out.push({ level: 'yellow', row: r, text: t('alertLowStart', { p: name, pct: pct(f.pStart) }) });
      }
      const news = data.news.find((n) => n.playerIds.includes(r.id) && Date.parse(n.publishedAt) > recent && n.kind !== 'other');
      if (news) out.push({ level: news.kind === 'injury' ? 'red' : 'yellow', row: r, text: t('alertNews', { p: name, title: news.title }) });
    }
    return out.sort((a, b) => (a.level === b.level ? 0 : a.level === 'red' ? -1 : 1));
  }, [squad, xi, data.news, t, d, noteOf]);

  const cols: Column<Row>[] = [
    { key: 'name', label: t('colPlayer'), sticky: true, value: (r) => r.name, render: (r) => <PlayerCell r={r} /> },
    { key: 'pos', label: t('colPos'), value: (r) => POSITIONS.indexOf(r.position), render: (r) => d.pos[r.position] },
    { key: 'xp1', label: t('colXp', { gd }), tip: t('tipXp'), numeric: true, value: (r) => r.xp?.xp1 ?? 0, render: (r) => <strong>{num(r.xp?.xp1 ?? 0)}</strong> },
    { key: 'xp3', label: t('colXp3'), tip: t('tipXp3'), numeric: true, value: (r) => r.xp?.xp3 ?? 0, render: (r) => num(r.xp?.xp3 ?? 0) },
    { key: 'start', label: t('colStart'), tip: t('tipStart'), numeric: true, value: (r) => r.xp?.fixtures[0]?.pStart ?? 0, render: (r) => pct(r.xp?.fixtures[0]?.pStart) },
    {
      key: 'opp',
      label: t('colOpp'),
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
    { key: 'price', label: t('colPrice'), numeric: true, value: (r) => r.price, render: (r) => num(r.price) },
  ];

  return (
    <section className="screen">
      <div className="screen-head">
        <h1>{t('bestXi', { gd })}</h1>
        <button type="button" className="btn" onClick={onEdit}>
          {t('editTeam')}
        </button>
      </div>
      <dl className="summary">
        <div>
          <dt>{t('xiTotal')}</dt>
          <dd className="kpi">{num(xiTotal)}</dd>
        </div>
        <div>
          <dt>{t('teamValue')}</dt>
          <dd className="kpi">€{num(value)}M</dd>
        </div>
        <div>
          <dt>{t('bank')}</dt>
          <dd className="kpi">€{num(team.bank)}M</dd>
        </div>
      </dl>

      <Pitch xi={xi} bench={bench} data={data} onOpen={onOpen} />

      <h2>{t('alerts')}</h2>
      {alerts.length ? (
        <ul className="alerts">
          {alerts.map((a, i) => (
            <li key={i} className={`alert alert-${a.level}`}>
              <button type="button" onClick={() => onOpen(a.row)}>
                {a.text}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{t('noAlerts')}</p>
      )}

      <SortTable
        rows={squad}
        columns={cols}
        rowKey={(r) => r.id}
        initialSort={{ key: 'pos', dir: 'asc' }}
        onRowClick={onOpen}
        caption={t('builderTitle')}
      />
    </section>
  );
}

function PlayerCell({ r, pos = false }: { r: Row; pos?: boolean }) {
  const { d } = useI18n();
  return (
    <span className="player-cell">
      <StatusMark a={r.availability} />
      <span>
        <span className="player-name">{r.name}</span>
        <span className="player-team">
          {r.teamName}
          {pos ? `, ${d.pos[r.position]}` : ''}
        </span>
      </span>
    </span>
  );
}

function TeamBuilder({
  data,
  initial,
  onSave,
  onCancel,
}: {
  data: Dataset;
  initial: MyTeam | null;
  onSave: (t: MyTeam) => Promise<string>;
  onCancel?: () => void;
}) {
  const { t, d, num } = useI18n();
  const [ids, setIds] = useState<string[]>(initial?.players ?? []);
  const [bank, setBank] = useState<string>(initial ? String(initial.bank) : '0');
  const [query, setQuery] = useState('');
  const [pos, setPos] = useState<Position | 'ALL'>('ALL');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const v = validate(ids, data.byId, data.meta.currentGameday);
  const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = fold(query.trim());
  const picked = new Set(ids);
  const results = data.rows
    .filter((r) => !picked.has(r.id) && r.status.active)
    .filter((r) => pos === 'ALL' || r.position === pos)
    .filter((r) => !q || fold(`${r.fullName} ${r.name} ${r.teamName}`).includes(q))
    .sort((a, b) => (b.xp?.xp3 ?? 0) - (a.xp?.xp3 ?? 0))
    .slice(0, 30);

  const add = (r: Row) => {
    if (v.counts[r.position] >= SQUAD[r.position]) return;
    setIds((x) => [...x, r.id]);
  };
  const remove = (id: string) => setIds((x) => x.filter((y) => y !== id));

  const save = async () => {
    setBusy(true);
    try {
      const m = await onSave({ version: 1, updatedAt: new Date().toISOString(), players: ids, bank: Number(bank.replace(',', '.')) || 0 });
      setMsg(m);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="screen builder">
      <div className="screen-head">
        <h1>{t('builderTitle')}</h1>
        {onCancel ? (
          <button type="button" className="btn" onClick={onCancel}>
            {t('cancel')}
          </button>
        ) : null}
      </div>

      <div className="chips counts" role="group" aria-label={t('search')}>
        <button type="button" className={`chip ${pos === 'ALL' ? 'on' : ''}`} onClick={() => setPos('ALL')} aria-pressed={pos === 'ALL'}>
          {t('all')} {ids.length}/15
        </button>
        {POSITIONS.map((p) => (
          <button
            key={p}
            type="button"
            className={`chip ${pos === p ? 'on' : ''} ${v.counts[p] === SQUAD[p] ? 'done' : ''}`}
            onClick={() => setPos(p)}
            aria-pressed={pos === p}
          >
            {d.pos[p]} {v.counts[p]}/{SQUAD[p]}
          </button>
        ))}
      </div>

      <input type="search" placeholder={t('search')} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t('search')} />
      <ul className="results">
        {results.map((r) => {
          const full = v.counts[r.position] >= SQUAD[r.position];
          return (
            <li key={r.id}>
              <PlayerCell r={r} pos />
              <span className="result-nums">
                <span className="num">€{num(r.price)}M</span>
                <span className="num muted">xP {num(r.xp?.xp3 ?? 0)}</span>
              </span>
              <button
                type="button"
                className="btn small add"
                disabled={full}
                onClick={() => add(r)}
                aria-label={`${t('add')} ${r.name}`}
                title={full ? t('full') : t('add')}
              >
                +
              </button>
            </li>
          );
        })}
      </ul>

      <h2>{t('mySelection')}</h2>
      <div className="squad">
        {POSITIONS.map((p) => {
          const rows = ids.map((id) => data.byId.get(id)).filter((r): r is Row => !!r && r.position === p);
          const left = SQUAD[p] - rows.length;
          return (
            <div key={p} className="squad-pos">
              <h3>
                {d.pos[p]} <span className="muted">{rows.length}/{SQUAD[p]}</span>
              </h3>
              <ul>
                {rows.map((r) => (
                  <li key={r.id}>
                    <PlayerCell r={r} />
                    <span className="num">€{num(r.price)}M</span>
                    <button type="button" className="link" onClick={() => remove(r.id)} aria-label={`${t('remove')} ${r.name}`}>
                      {t('remove')}
                    </button>
                  </li>
                ))}
                {left > 0 ? <li className="muted">{t('slotsLeft', { n: left })}</li> : null}
              </ul>
            </div>
          );
        })}
      </div>

      <label className="field">
        <span>{t('bank')}</span>
        <input inputMode="decimal" value={bank} onChange={(e) => setBank(e.target.value)} />
      </label>

      <div className="builder-actions">
        <button type="button" className="btn primary" disabled={!v.valid || busy} onClick={save}>
          {t('save')} ({ids.length}/15)
        </button>
        {!v.complete && ids.length > 0 ? <span className="hint">{t('ruleCounts')}</span> : null}
        {v.overClub.length ? <span className="hint error">{t('ruleClub', { max: clubLimit(data.meta.currentGameday), clubs: v.overClub.join(', ') })}</span> : null}
        {msg ? <span role="status">{msg}</span> : null}
      </div>
    </section>
  );
}
