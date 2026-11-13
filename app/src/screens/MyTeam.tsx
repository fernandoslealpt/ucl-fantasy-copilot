import { useEffect, useMemo, useRef, useState } from 'react';
import { matchTeam, type ImportResult } from '../importer/match';
import { readLabelMode, writeLabelMode, type LabelMode } from '../components/Field';
import { lineupFor, type Lineup } from '../squad';
import { SquadView } from './Squad';
import { MatchdayView } from './Matchday';
import { SortTable, type Column } from '../components/SortTable';
import { Difficulty, Opponent, pct, StatusMark, surnameOf, teamCode, useNote } from '../components/ui';
import { useI18n } from '../i18n';
import { bestXI, clubLimit, decisionsFor, freeTransfersFor, pendingDecisions, POSITIONS, SQUAD, validate, withDecisions, type MyTeam } from '../team';
import type { Dataset, Position, Row } from '../types';
import type { GdRecord } from '../history';
import { HIT, sameMatchWarnings, type Plan } from '../advice/engine';
import { CaptainSection, targetGameday, TransfersSection, useCaptainAdvice, useTransferAdvice, WarningText, xpAtGd } from './Advice';

export type RecordFn = (gd: number, patch: Partial<Omit<GdRecord, 'gameday' | 'updatedAt'>> | ((cur: GdRecord | undefined) => Partial<Omit<GdRecord, 'gameday' | 'updatedAt'>>)) => void;

interface Props {
  data: Dataset;
  team: MyTeam | null;
  onSave: (team: MyTeam) => Promise<string>;
  onOpen: (r: Row) => void;
  onRecord: RecordFn;
}

export function MyTeamScreen({ data, team, onSave, onOpen, onRecord }: Props) {
  const [editing, setEditing] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const { t } = useI18n();
  const startImport = (f: File) => {
    setImportFile(f);
    setEditing(true);
  };

  if (editing || !team) {
    if (!team && !editing)
      return (
        <section className="empty">
          <h1>{t('noTeamTitle')}</h1>
          <p>{t('noTeamText')}</p>
          <div className="empty-actions">
            <ImportButton onFile={startImport} primary />
            <button type="button" className="btn" onClick={() => setEditing(true)}>
              {t('addTeam')}
            </button>
          </div>
          <p className="muted">{t('importHelp')}</p>
        </section>
      );
    return (
      <TeamBuilder
        data={data}
        initial={team}
        importFile={importFile}
        onCancel={
          team
            ? () => {
                setEditing(false);
                setImportFile(null);
              }
            : undefined
        }
        onSave={async (tm) => {
          const msg = await onSave(tm);
          setEditing(false);
          setImportFile(null);
          return msg;
        }}
      />
    );
  }
  return (
    <TeamView data={data} team={team} onEdit={() => setEditing(true)} onImport={startImport} onOpen={onOpen} onSave={onSave} onRecord={onRecord} />
  );
}

/** Botão que abre a galeria/câmara para escolher a captura de ecrã da equipa. */
function ImportButton({ onFile, primary = false, short = false }: { onFile: (f: File) => void; primary?: boolean; short?: boolean }) {
  const { t } = useI18n();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className={`btn ${primary ? 'primary' : ''}`} onClick={() => ref.current?.click()}>
        {t(short ? 'importShotShort' : 'importShot')}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) onFile(f);
        }}
      />
    </>
  );
}

function TeamView({
  data,
  team,
  onEdit,
  onImport,
  onOpen,
  onSave,
  onRecord,
}: {
  data: Dataset;
  team: MyTeam;
  onEdit: () => void;
  onImport: (f: File) => void;
  onOpen: (r: Row) => void;
  onSave: (team: MyTeam) => Promise<string>;
  onRecord: RecordFn;
}) {
  const { t, d, num } = useI18n();
  const noteOf = useNote();
  const playersKey = team.players.join(',');
  const squad = useMemo(
    () => playersKey.split(',').map((id) => data.byId.get(id)).filter((r): r is Row => !!r),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playersKey, data],
  );
  const gd = targetGameday(data) ?? data.targets[0] ?? 0;
  const xpAt = useMemo(() => xpAtGd(gd), [gd]);
  const { xi, bench } = useMemo(() => bestXI(squad, xpAt), [squad, xpAt]);
  const xiTotal = xi.reduce((a, r) => a + xpAt(r), 0);
  const value = squad.reduce((a, r) => a + r.price, 0);
  const free = freeTransfersFor(team, gd);
  const complete = squad.length === 15;
  const advice = useTransferAdvice(data, team, squad, gd, free);
  const captain = useCaptainAdvice(squad, gd);
  const dec = decisionsFor(team, gd);
  const capId = dec?.captain ?? captain.captain?.row.id ?? null;
  const viceId = dec?.captain ? dec.vice ?? null : captain.vice?.row.id ?? null;
  const pending = pendingDecisions(team, gd);
  const [msg, setMsg] = useState('');

  // Diário: guarda a recomendação e o xP previsto (a última antes do fecho fica)
  useEffect(() => {
    if (!advice || !complete) return;
    const rec = advice.recommended;
    const xp: Record<string, number> = {};
    for (const r of squad) xp[r.id] = Math.round(xpAt(r) * 100) / 100;
    onRecord(gd, {
      recommended: {
        swaps: (rec?.swaps ?? []).map((s) => ({ out: s.out.id, in: s.in.id })),
        deltaNow: Math.round((rec?.deltaGd[0] ?? 0) * 100) / 100,
        delta: Math.round((rec?.delta ?? 0) * 100) / 100,
        hits: rec?.hits ?? 0,
        captain: captain.captain?.row.id ?? null,
        vice: captain.vice?.row.id ?? null,
      },
      squad: [...team.players],
      xp,
      teamXp: Math.round((advice.base.perGd[0] ?? 0) * 100) / 100,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advice, captain]);

  const apply = async (p: Plan) => {
    const names = p.swaps.map((s) => `${s.out.name} → ${s.in.name}`).join(', ');
    if (!confirm(t('applyConfirm', { swaps: names }))) return;
    const outs = new Set(p.swaps.map((s) => s.out.id));
    const players = [...team.players.filter((id) => !outs.has(id)), ...p.swaps.map((s) => s.in.id)];
    const next = withDecisions(
      { ...team, players, bank: p.bankAfter, freeTransfers: Math.max(0, free - p.swaps.length), ftGameday: gd },
      gd,
      { transfers: true },
    );
    onRecord(gd, (cur) => ({
      done: {
        ...(cur?.done ?? {}),
        swaps: [...(cur?.done?.swaps ?? []), ...p.swaps.map((s) => ({ out: s.out.id, in: s.in.id }))],
        hits: (cur?.done?.hits ?? 0) + p.hits,
        noMove: false,
      },
      squad: players,
    }));
    setMsg(`${t('applied')} ${await onSave(next)}`);
  };
  const noMove = async () => {
    onRecord(gd, (cur) => ({ done: { ...(cur?.done ?? {}), swaps: cur?.done?.swaps ?? [], hits: cur?.done?.hits ?? 0, noMove: !(cur?.done?.swaps?.length) } }));
    setMsg(await onSave(withDecisions(team, gd, { transfers: true })));
  };
  const confirmCaptain = async (c: string, v: string | null) => {
    onRecord(gd, (cur) => ({ done: { ...(cur?.done ?? { swaps: [], hits: 0 }), captain: c, ...(v ? { vice: v } : {}) } }));
    setMsg(await onSave(withDecisions(team, gd, { captain: c, ...(v ? { vice: v } : {}) })));
  };
  const toggleChip = (chip: 'wildcard' | 'limitless') => {
    const used = team.chips?.[chip] != null;
    if (!confirm(t(used ? 'chipUndoConfirm' : 'chipUseConfirm', { chip: t(chip === 'wildcard' ? 'chipWildcard' : 'chipLimitless'), gd }))) return;
    void onSave({ ...team, chips: { ...(team.chips ?? {}), [chip]: used ? null : gd }, updatedAt: new Date().toISOString() }).then(setMsg);
    if (!used) onRecord(gd, (cur) => ({ done: { ...(cur?.done ?? { swaps: [], hits: 0 }), chip } }));
  };
  const [view, setView] = useState<'plantel' | 'jornada'>('plantel');
  const [label, setLabelState] = useState<LabelMode>(readLabelMode);
  const setLabel = (m: LabelMode) => {
    setLabelState(m);
    writeLabelMode(m);
  };
  const { lineup, saved: lineupSaved } = useMemo(() => lineupFor(team, squad, gd, xpAt, data.byId), [team, squad, gd, xpAt, data.byId]);
  const saveLineup = async (l: Lineup) => setMsg(await onSave({ ...team, lineup: { ...l, gameday: gd }, updatedAt: new Date().toISOString() }));
  const setRole = (id: string, role: 'C' | 'V') => {
    const c = role === 'C' ? id : capId === id ? viceId : capId;
    const v = role === 'V' ? id : viceId === id ? capId : viceId;
    if (c) void confirmCaptain(c, v && v !== c ? v : null);
  };
  const confirmTransfers = async (swaps: { out: Row; in: Row }[], bankAfter: number, hits: number, limitless: boolean) => {
    const outs = new Set(swaps.map((s) => s.out.id));
    const players = [...team.players.filter((id) => !outs.has(id)), ...swaps.map((s) => s.in.id)];
    const next = withDecisions(
      {
        ...team,
        players,
        bank: bankAfter,
        freeTransfers: limitless ? free : Math.max(0, free - swaps.length),
        ftGameday: gd,
        ...(limitless ? { chips: { ...(team.chips ?? {}), limitless: gd } } : {}),
      },
      gd,
      { transfers: true },
    );
    onRecord(gd, (cur) => ({
      done: {
        ...(cur?.done ?? {}),
        swaps: [...(cur?.done?.swaps ?? []), ...swaps.map((s) => ({ out: s.out.id, in: s.in.id }))],
        hits: (cur?.done?.hits ?? 0) + hits,
        noMove: false,
        ...(limitless ? { chip: 'limitless' as const } : {}),
      },
      squad: players,
    }));
    setMsg(`${t('applied')} ${await onSave(next)}`);
  };
  const sameMatch = useMemo(() => sameMatchWarnings(lineup.xi.map((id) => data.byId.get(id)).filter((r): r is Row => !!r), gd), [lineup, data.byId, gd]);

  const alerts = useMemo(() => {
    const out: { level: 'red' | 'yellow'; text: string; row: Row }[] = [];
    const recent = Date.now() - 24 * 3600_000;
    for (const r of squad) {
      const name = surnameOf(r);
      const note = r.status.note ? noteOf(r.status.note) : d.avail[r.availability];
      if (r.availability === 'inactive')
        out.push({
          level: 'red',
          row: r,
          text: t('alertInactive', { p: name }),
        });
      else if (r.availability === 'out')
        out.push({
          level: 'red',
          row: r,
          text: t('alertOut', { p: name, note }),
        });
      else if (r.availability === 'doubtful' || r.availability === 'unknown')
        out.push({
          level: 'yellow',
          row: r,
          text: t('alertDoubt', { p: name, note }),
        });
      else {
        const f = r.xp?.fixtures[0];
        const usualStarter = xi.includes(r);
        if (f?.signal?.tag === 'OUT' || f?.signal?.tag === 'SUS')
          out.push({ level: 'red', row: r, text: t('alertRwOut', { p: name, s: t(f.signal.tag === 'OUT' ? 'sigOut' : 'sigSus') }) });
        else if (f && usualStarter && f.signal?.lineup === 'bench')
          out.push({
            level: f.signal.confirmed ? 'red' : 'yellow',
            row: r,
            text: t(f.signal.confirmed ? 'alertBenchConf' : 'alertBench', { p: name, pct: pct(f.pStart) }),
          });
        else if (f && usualStarter && f.pStart < 0.6)
          out.push({
            level: 'yellow',
            row: r,
            text: t('alertLowStart', { p: name, pct: pct(f.pStart) }),
          });
      }
      const news = data.news.find((n) => n.playerIds.includes(r.id) && Date.parse(n.publishedAt) > recent && n.kind !== 'other');
      if (news)
        out.push({
          level: news.kind === 'injury' ? 'red' : 'yellow',
          row: r,
          text: t('alertNews', { p: name, title: news.title }),
        });
    }
    return out.sort((a, b) => (a.level === b.level ? 0 : a.level === 'red' ? -1 : 1));
  }, [squad, xi, data.news, t, d, noteOf]);

  const cols: Column<Row>[] = [
    {
      key: 'name',
      label: t('colPlayer'),
      sticky: true,
      value: (r) => r.name,
      render: (r) => <PlayerCell r={r} />,
    },
    {
      key: 'pos',
      label: t('colPos'),
      value: (r) => POSITIONS.indexOf(r.position),
      render: (r) => d.pos[r.position],
    },
    {
      key: 'xp1',
      label: t('colXp', { gd }),
      tip: t('tipXp'),
      numeric: true,
      value: (r) => r.xp?.xp1 ?? 0,
      render: (r) => <strong>{num(r.xp?.xp1 ?? 0)}</strong>,
    },
    {
      key: 'xp3',
      label: t('colXp3'),
      tip: t('tipXp3'),
      numeric: true,
      value: (r) => r.xp?.xp3 ?? 0,
      render: (r) => num(r.xp?.xp3 ?? 0),
    },
    {
      key: 'start',
      label: t('colStart'),
      tip: t('tipStart'),
      numeric: true,
      value: (r) => r.xp?.fixtures[0]?.pStart ?? 0,
      render: (r) => pct(r.xp?.fixtures[0]?.pStart),
    },
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
    {
      key: 'price',
      label: t('colPrice'),
      numeric: true,
      value: (r) => r.price,
      render: (r) => num(r.price),
    },
  ];

  return (
    <section className="screen">
      <div className="screen-head">
        <h1>{t('teamTitle', { gd })}</h1>
        <div className="head-actions">
          <ImportButton onFile={onImport} short />
          <button type="button" className="btn" onClick={onEdit}>
            {t('editTeam')}
          </button>
        </div>
      </div>
      {msg ? (
        <p className="notice" role="status">
          {msg}
          <button type="button" className="link" onClick={() => setMsg('')} aria-label={t('close')}>
            ✕
          </button>
        </p>
      ) : null}

      <div className="todo-card" aria-label={t('todoTitle', { gd })}>
        <h2 className="todo-title">{pending.length ? t('todoTitle', { gd }) : t('todoDone', { gd })}</h2>
        <ol className="todo">
          <li className={dec?.transfers ? 'done' : ''}>
            <a href="#transferencias" onClick={(e) => (e.preventDefault(), document.getElementById('transferencias')?.scrollIntoView({ behavior: 'smooth' }))}>
              <span className="todo-k">{t('transfersTitle')}</span>
              <span className="todo-v">
                {!advice
                  ? t('calculating')
                  : advice.recommended
                    ? `${advice.recommended.swaps.map((s) => `${s.out.name} → ${s.in.name}`).join(' · ')} (${advice.recommended.deltaGd[0]! >= 0 ? '+' : ''}${num(advice.recommended.deltaGd[0]!)} J${gd}${advice.recommended.hits ? ` · −${HIT * advice.recommended.hits}` : ''})`
                    : t('noMoveShort', { n: free })}
              </span>
              <span className="todo-s">{dec?.transfers ? '✓' : t('pending')}</span>
            </a>
          </li>
          <li className={dec?.captain ? 'done' : ''}>
            <a href="#capitao" onClick={(e) => (e.preventDefault(), document.getElementById('capitao')?.scrollIntoView({ behavior: 'smooth' }))}>
              <span className="todo-k">{t('captainTitle')}</span>
              <span className="todo-v">
                {capId ? `${data.byId.get(capId)?.name ?? capId}${viceId ? ` · V: ${data.byId.get(viceId)?.name ?? viceId}` : ''}` : '—'}
              </span>
              <span className="todo-s">{dec?.captain ? '✓' : t('pending')}</span>
            </a>
          </li>
          <li className="chips-line">
            <span className="todo-k">{t('chips')}</span>
            <span className="todo-v">
              {(['wildcard', 'limitless'] as const).map((c) => (
                <button key={c} type="button" className={`chip ${team.chips?.[c] != null ? 'used' : ''}`} onClick={() => toggleChip(c)}>
                  {t(c === 'wildcard' ? 'chipWildcard' : 'chipLimitless')}:{' '}
                  {team.chips?.[c] != null ? (team.chips[c] ? t('chipUsedAt', { gd: team.chips[c]! }) : t('chipUsed')) : t('chipAvailable')}
                </button>
              ))}
            </span>
          </li>
        </ol>
      </div>


      {complete ? (
        <>
          <div className="seg" role="tablist" aria-label={t('teamTitle', { gd })}>
            <button type="button" role="tab" aria-selected={view === 'plantel'} className={view === 'plantel' ? 'on' : ''} onClick={() => setView('plantel')}>
              {t('viewSquad')}
            </button>
            <button type="button" role="tab" aria-selected={view === 'jornada'} className={view === 'jornada' ? 'on' : ''} onClick={() => setView('jornada')}>
              {t('viewMatchday', { gd })}
            </button>
          </div>
          {view === 'plantel' ? (
            <SquadView
              data={data}
              team={team}
              gd={gd}
              free={free}
              mode={label}
              onMode={setLabel}
              captainId={capId}
              viceId={viceId}
              advice={advice}
              onConfirm={confirmTransfers}
              onCaptain={setRole}
              onOpen={onOpen}
            />
          ) : (
            <MatchdayView
              data={data}
              squad={squad}
              gd={gd}
              lineup={lineup}
              saved={lineupSaved}
              mode={label}
              onMode={setLabel}
              captainId={capId}
              viceId={viceId}
              xpAt={xpAt}
              onLineup={saveLineup}
              onCaptain={setRole}
              onOpen={onOpen}
            />
          )}
        </>
      ) : null}

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

      {complete ? (
        <>
          {view === 'plantel' ? (
          <TransfersSection
            data={data}
            team={team}
            squad={squad}
            gd={gd}
            free={free}
            advice={advice}
            onApply={apply}
            onNoMove={noMove}
            onSave={onSave}
            onOpen={onOpen}
          />
          ) : (
          <CaptainSection c={captain} team={team} gd={gd} onConfirm={confirmCaptain} onOpen={onOpen} />
          )}
        </>
      ) : (
        <p className="hint">{t('adviceNoTeamText')}</p>
      )}

      <h2>{t('alerts')}</h2>
      {sameMatch.length ? (
        <ul className="warnings">
          {sameMatch.map((w, i) => (
            <li key={i}>
              <WarningText w={w} />
            </li>
          ))}
        </ul>
      ) : null}
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

type ImportState =
  | { stage: 'idle' }
  | { stage: 'reading'; progress: number; loading: boolean }
  | { stage: 'done'; result: ImportResult }
  | { stage: 'error'; error: string };

function TeamBuilder({
  data,
  initial,
  importFile,
  onSave,
  onCancel,
}: {
  data: Dataset;
  initial: MyTeam | null;
  importFile?: File | null;
  onSave: (t: MyTeam) => Promise<string>;
  onCancel?: () => void;
}) {
  const { t, d, num } = useI18n();
  const [ids, setIds] = useState<string[]>(initial?.players ?? []);
  const [bank, setBank] = useState<string>(initial ? String(initial.bank) : '0');
  const [imp, setImp] = useState<ImportState>({ stage: 'idle' });
  const [free, setFree] = useState<number | null>(null);

  const runImport = async (file: File) => {
    setImp({ stage: 'reading', progress: 0, loading: true });
    try {
      const { readScreenshot } = await import('../importer/ocr');
      const lines = await readScreenshot(file, (f, stage) => setImp({ stage: 'reading', progress: f, loading: stage !== 'read' }));
      const result = matchTeam(lines, data.rows, {
        gameday: data.meta.currentGameday,
        current: initial?.players,
      });
      (window as unknown as { __ocrLines?: string[][] }).__ocrLines = lines; // ajuda a diagnosticar leituras falhadas
      setIds(result.ids);
      if (result.bank != null) setBank(String(result.bank));
      if (result.freeTransfers != null) setFree(result.freeTransfers);
      setImp({ stage: 'done', result });
    } catch (e) {
      setImp({
        stage: 'error',
        error: e instanceof Error ? e.message : String(e),
      });
    }
  };
  const started = useRef(false);
  useEffect(() => {
    if (importFile && !started.current) {
      started.current = true;
      void runImport(importFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importFile]);
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
      const m = await onSave({
        version: 1,
        updatedAt: new Date().toISOString(),
        players: ids,
        bank: Number(bank.replace(',', '.')) || 0,
        ...(free != null
          ? { freeTransfers: free, ftGameday: data.meta.currentGameday ?? undefined }
          : initial?.freeTransfers != null
            ? { freeTransfers: initial.freeTransfers, ftGameday: initial.ftGameday }
            : {}),
      });
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

      <div className="import-box">
        <ImportButton onFile={(f) => void runImport(f)} />
        {imp.stage === 'idle' ? <p className="muted">{t('importHelp')}</p> : null}
        {imp.stage === 'reading' ? (
          <div className="import-progress" role="status">
            <span>{imp.loading ? t('importLoading') : t('importing', { pct: `${Math.round(imp.progress * 100)}%` })}</span>
            <span className="bar-track">
              <span className="bar" style={{ width: `${Math.max(4, imp.progress * 100)}%` }} />
            </span>
          </div>
        ) : null}
        {imp.stage === 'error' ? <p className="hint error">{t('importFail', { e: imp.error })}</p> : null}
        {imp.stage === 'done' ? (
          <div className="import-result" role="status">
            <p>
              <strong>{t('importResult', { n: imp.result.ids.length })}</strong>
            </p>
            {imp.result.matches.some((m) => m.score < 0.9) ? (
              <>
                <p>{t('importDoubt')}</p>
                <ul>
                  {imp.result.matches
                    .filter((m) => m.score < 0.9)
                    .map((m) => (
                      <li key={m.id}>
                        {data.byId.get(m.id)?.name} <span className="muted">{t('importRead', { r: m.read })}</span>
                      </li>
                    ))}
                </ul>
              </>
            ) : null}
            {imp.result.ids.length < 15 && imp.result.unknown.length ? (
              <p className="muted">{t('importUnknown', { w: imp.result.unknown.join(', ') })}</p>
            ) : null}
          </div>
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
                {d.pos[p]}{' '}
                <span className="muted">
                  {rows.length}/{SQUAD[p]}
                </span>
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
        {v.overClub.length ? (
          <span className="hint error">
            {t('ruleClub', {
              max: clubLimit(data.meta.currentGameday),
              clubs: v.overClub.join(', '),
            })}
          </span>
        ) : null}
        {msg ? <span role="status">{msg}</span> : null}
      </div>
    </section>
  );
}
