/**
 * Plantel: os 15 por posição, como no ecrã de transferências da app oficial.
 * ✕ retira (o preço volta ao banco), ↺ recupera, lugar vazio abre a lista de jogadores,
 * "Rever transferências" mostra antes/depois (xP por jornada, banco, −4, avisos) antes de confirmar.
 */
import { useEffect, useMemo, useState } from 'react';
import { HIT, makeCtx, planWarnings, squadValue, swapReasons, type Plan } from '../advice/engine';
import { Catalog } from '../components/Catalog';
import { Field, LabelPicker, type FieldSlot, type LabelMode } from '../components/Field';
import { ActionList, Sheet } from '../components/Sheet';
import { pct } from '../components/ui';
import { useI18n } from '../i18n';
import { draftFrom, draftIds, placeInSlot, removeSlot, resetDraft, restoreSlot, summarize, type Draft } from '../squad';
import type { MyTeam } from '../team';
import type { Dataset, Position, Row } from '../types';
import { WarningText } from './Advice';

const ROWS_TOP_DOWN: Position[] = ['FWD', 'MID', 'DEF', 'GK'];

interface Scenario {
  name: string;
  gameday: number;
  savedAt: string;
  swaps: { out: string; in: string }[];
  limitless: boolean;
}
const SC_KEY = 'ucl.scenarios';
const readScenarios = (): Scenario[] => {
  try {
    return JSON.parse(localStorage.getItem(SC_KEY) ?? '[]') as Scenario[];
  } catch {
    return [];
  }
};
const writeScenarios = (xs: Scenario[]) => {
  try {
    localStorage.setItem(SC_KEY, JSON.stringify(xs));
  } catch {
    /* sem armazenamento */
  }
};

export function SquadView({
  data,
  team,
  gd,
  free,
  mode,
  onMode,
  captainId,
  viceId,
  recommended,
  onConfirm,
  onCaptain,
  onOpen,
}: {
  data: Dataset;
  team: MyTeam;
  gd: number;
  free: number;
  mode: LabelMode;
  onMode: (m: LabelMode) => void;
  captainId: string | null;
  viceId: string | null;
  recommended: Plan | null;
  onConfirm: (swaps: { out: Row; in: Row }[], bankAfter: number, hits: number, limitless: boolean) => Promise<void>;
  onCaptain: (id: string, role: 'C' | 'V') => void;
  onOpen: (r: Row) => void;
}) {
  const { t, num } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(team, data.byId));
  const [pick, setPick] = useState<number | null>(null);
  const [action, setAction] = useState<Row | null>(null);
  const [review, setReview] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>(readScenarios);
  const [busy, setBusy] = useState(false);

  const sum = summarize(draft, team, data.byId, free, gd);
  const byId = data.byId;
  const playersKey = team.players.join(',');
  useEffect(() => {
    if (!editing) setDraft(draftFrom(team, byId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playersKey, byId]);

  const start = (removeId?: string) => {
    let d = draftFrom(team, byId);
    if (removeId) d = removeSlot(d, d.slots.findIndex((s) => s.original === removeId));
    setDraft(d);
    setEditing(true);
  };
  const cancel = () => {
    setEditing(false);
    setDraft(draftFrom(team, byId));
  };
  const loadPlan = (swaps: { out: string; in: string }[], limitless = false) => {
    let d = { ...draftFrom(team, byId), limitless };
    for (const s of swaps) {
      const i = d.slots.findIndex((x) => x.original === s.out);
      const r = byId.get(s.in);
      if (i >= 0 && r) d = placeInSlot(removeSlot(d, i), i, r);
    }
    setDraft(d);
    setEditing(true);
  };

  const slotsOf = (pos: Position): FieldSlot[] =>
    draft.slots
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.pos === pos)
      .map(({ s, i }) => {
        const row = s.current ? byId.get(s.current) ?? null : null;
        const changed = s.current !== s.original;
        return {
          key: `${i}`,
          pos,
          row,
          ghost: byId.get(s.original) ?? null,
          badge: !editing && row ? (row.id === captainId ? 'C' : row.id === viceId ? 'V' : null) : null,
          overlay: !editing ? null : row ? (changed ? 'restore' : 'remove') : 'restore',
          state: changed && row ? 'new' : null,
        } satisfies FieldSlot;
      });
  const rows = ROWS_TOP_DOWN.map(slotsOf);
  const idx = (k: string) => Number(k);

  const onTap = (s: FieldSlot) => {
    if (editing) {
      if (!s.row) setPick(idx(s.key));
      else setAction(s.row);
      return;
    }
    if (s.row) setAction(s.row);
  };
  const onOverlay = (s: FieldSlot) => {
    const i = idx(s.key);
    const slot = draft.slots[i]!;
    if (slot.current === slot.original) setDraft(removeSlot(draft, i));
    else setDraft(restoreSlot(draft, i));
  };

  // revisão: antes/depois
  const draftRows = draftIds(draft).map((id) => byId.get(id)).filter((r): r is Row => !!r);
  const squadRows = team.players.map((id) => byId.get(id)).filter((r): r is Row => !!r);
  const ctx = useMemo(() => makeCtx(data.rows, gd), [data.rows, gd]);
  const before = useMemo(() => squadValue(ctx, squadRows), [ctx, squadRows]);
  const after = review && sum.empty === 0 ? squadValue(ctx, draftRows) : null;
  const swapRows = sum.swaps.map((s) => ({ out: byId.get(s.out)!, in: byId.get(s.in)! }));
  const pseudoPlan = { swaps: swapRows } as unknown as Plan;
  const warnings = review ? planWarnings(ctx, squadRows, pseudoPlan) : [];
  const deltaGd = after ? after.perGd.map((v, k) => v - before.perGd[k]!) : [];
  const netNow = (deltaGd[0] ?? 0) - HIT * sum.hits;

  const pickSlot = pick != null ? draft.slots[pick] : null;
  const others = pick != null ? draft.slots.filter((_, k) => k !== pick).map((s) => (s.current ? byId.get(s.current) : null)).filter((r): r is Row => !!r) : [];
  const inSquad = new Set(draftIds(draft));

  const saveScenario = () => {
    const name = prompt(t('scenarioName'), `J${gd} · ${sum.swaps.map((s) => byId.get(s.in)?.name).join(', ')}`);
    if (!name) return;
    const xs = [{ name, gameday: gd, savedAt: new Date().toISOString(), swaps: sum.swaps, limitless: draft.limitless }, ...scenarios].slice(0, 12);
    setScenarios(xs);
    writeScenarios(xs);
  };

  return (
    <div className="squad-view">
      <div className="squad-bar">
        {!editing ? (
          <>
            <button type="button" className="btn primary" onClick={() => start()}>
              ⇄ {t('makeTransfers')}
            </button>
            <LabelPicker mode={mode} onMode={onMode} />
          </>
        ) : (
          <>
            <button type="button" className="btn" onClick={cancel}>
              ← {t('cancel')}
            </button>
            <button
              type="button"
              className={`btn ${draft.limitless ? 'primary' : ''}`}
              aria-pressed={draft.limitless}
              disabled={team.chips?.limitless != null && team.chips.limitless !== gd}
              onClick={() => setDraft({ ...draft, limitless: !draft.limitless })}
              title={t('limitlessHelp')}
            >
              ∞ {t('chipLimitless')}
            </button>
            <LabelPicker mode={mode} onMode={onMode} />
          </>
        )}
      </div>

      <Field rows={rows} data={data} gd={gd} mode={mode} onTap={onTap} onOverlay={onOverlay} />

      {editing ? (
        <div className="transfer-foot">
          <div className="tf-kpis">
            <span>
              <small>{t('transfersWord')}</small>
              <strong>
                {draft.limitless ? '∞' : `${Math.max(0, free - sum.swaps.length)} ${t('freeWord')}`}
                {sum.hits ? <em className="neg"> · −{HIT * sum.hits}</em> : null}
              </strong>
            </span>
            <span>
              <small>{t('remaining')}</small>
              <strong className={sum.bank < 0 && !draft.limitless ? 'neg' : ''}>€{num(sum.bank)}M</strong>
            </span>
          </div>
          <div className="tf-actions">
            <button type="button" className="btn" onClick={() => setDraft(resetDraft(draft))} aria-label={t('resetAll')} title={t('resetAll')}>
              ↺
            </button>
            {recommended ? (
              <button type="button" className="btn" onClick={() => loadPlan(recommended.swaps.map((s) => ({ out: s.out.id, in: s.in.id })))} title={t('autoFill')}>
                ⭐ {t('autoFillShort')}
              </button>
            ) : null}
            <button type="button" className="btn primary" disabled={!sum.valid || sum.swaps.length === 0} onClick={() => setReview(true)}>
              {t('reviewTransfers')}
            </button>
          </div>
          {sum.empty ? <p className="hint">{t('emptySlots', { n: sum.empty })}</p> : null}
          {sum.bank < 0 && !draft.limitless ? <p className="hint error">{t('overBudget', { x: num(-sum.bank) })}</p> : null}
          {sum.overClub.length ? <p className="hint error">{t('ruleClub', { max: 3, clubs: sum.overClub.join(', ') })}</p> : null}
          {sum.hits && !draft.limitless ? <p className="hint">{t('hitWarn', { n: sum.hits, pts: HIT * sum.hits })}</p> : null}
        </div>
      ) : null}

      {!editing && scenarios.filter((s) => s.gameday === gd).length ? (
        <div className="scenarios">
          <h3>{t('scenarios')}</h3>
          <ul className="plain">
            {scenarios
              .filter((s) => s.gameday === gd)
              .map((s, i) => (
                <li key={s.savedAt}>
                  <button type="button" className="link" onClick={() => loadPlan(s.swaps, s.limitless)}>
                    {s.name}
                  </button>{' '}
                  <button
                    type="button"
                    className="link muted"
                    onClick={() => {
                      const xs = scenarios.filter((_, k) => k !== i);
                      setScenarios(xs);
                      writeScenarios(xs);
                    }}
                    aria-label={t('remove')}
                  >
                    ✕
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      {action ? (
        <Sheet
          title={
            <>
              <strong>{action.name}</strong>
              <span className="muted"> · {action.teamName} · €{num(action.price)}M</span>
            </>
          }
          onClose={() => setAction(null)}
        >
          <p className="muted small-print">
            {t('ptsLine', { tot: action.stats.points, last: action.form.lastGameday, avg: num(action.form.avgPoints) })} · {pct(action.selectedPct / 100)}{' '}
            {t('selectedWord')}
          </p>
          <ActionList
            actions={[
              {
                key: 'tr',
                icon: '⇄',
                label: t('transferOut'),
                onClick: () => {
                  const i = draft.slots.findIndex((s) => s.current === action.id);
                  if (editing && i >= 0) setDraft(removeSlot(draft, i));
                  else start(action.id);
                  setAction(null);
                },
              },
              ...(!editing
                ? [
                    { key: 'c', icon: 'C', label: t('makeCaptain'), disabled: action.id === captainId, onClick: () => (onCaptain(action.id, 'C'), setAction(null)) },
                    { key: 'v', icon: 'V', label: t('makeVice'), disabled: action.id === viceId, onClick: () => (onCaptain(action.id, 'V'), setAction(null)) },
                  ]
                : []),
              { key: 'f', icon: 'ⓘ', label: t('playerInfo'), onClick: () => (onOpen(action), setAction(null)) },
            ]}
          />
        </Sheet>
      ) : null}

      {pick != null && pickSlot ? (
        <Sheet title={t('pickTitle', { pos: t(`pos_${pickSlot.pos}`) })} onClose={() => setPick(null)} wide>
          <Catalog
            data={data}
            pos={pickSlot.pos}
            gd={gd}
            others={others}
            replaced={byId.get(pickSlot.original) ?? null}
            inSquad={inSquad}
            bankLeft={draft.limitless ? 999 : sum.bank}
            onPick={(r) => {
              setDraft(placeInSlot(draft, pick, r));
              setPick(null);
            }}
          />
        </Sheet>
      ) : null}

      {review && after ? (
        <Sheet title={t('reviewTransfers')} onClose={() => setReview(false)} wide>
          <ul className="swaps review-swaps">
            {swapRows.map((s) => (
              <li key={s.out.id}>
                <div className="swap-row">
                  <div className="swap-p out">
                    <span className="swap-tag">{t('swapOut')}</span>
                    <span className="player-name">{s.out.name}</span>
                    <span className="muted">€{num(s.out.price)}M</span>
                  </div>
                  <span className="swap-arrow" aria-hidden>
                    →
                  </span>
                  <div className="swap-p in">
                    <span className="swap-tag">{t('swapIn')}</span>
                    <span className="player-name">{s.in.name}</span>
                    <span className="muted">
                      {s.in.teamName} · €{num(s.in.price)}M
                    </span>
                  </div>
                </div>
                <ol className="reasons">
                  {swapReasons(ctx, data, s).map((r, i) => (
                    <li key={i}>
                      <ReasonLine r={r} />
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
          <table className="whatif">
            <caption className="table-caption">{t('beforeAfter')}</caption>
            <thead>
              <tr>
                <th>{t('gdShort')}</th>
                <th className="num">{t('teamNow')}</th>
                <th className="num">{t('teamAfter')}</th>
                <th className="num">Δ</th>
              </tr>
            </thead>
            <tbody>
              {ctx.gds.map((g, k) => (
                <tr key={g}>
                  <td>
                    J{g} {k === 0 ? `(${t('now')})` : `(J+${k})`}
                  </td>
                  <td className="num">{num(before.perGd[k]!)}</td>
                  <td className="num">{num(after.perGd[k]!)}</td>
                  <td className="num">
                    <strong className={deltaGd[k]! >= 0 ? 'pos' : 'neg'}>
                      {deltaGd[k]! >= 0 ? '+' : ''}
                      {num(deltaGd[k]!)}
                    </strong>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>{t('hitCost')}</td>
                <td colSpan={2} className="num">
                  {draft.limitless ? t('chipLimitless') : sum.hits ? `${sum.hits} × −${HIT}` : t('free')}
                </td>
                <td className="num">
                  <strong className={sum.hits ? 'neg' : ''}>{sum.hits ? `−${HIT * sum.hits}` : '0'}</strong>
                </td>
              </tr>
              <tr>
                <td>{t('netNow', { gd })}</td>
                <td colSpan={2} />
                <td className="num">
                  <strong className={netNow >= 0 ? 'pos' : 'neg'}>
                    {netNow >= 0 ? '+' : ''}
                    {num(netNow)}
                  </strong>
                </td>
              </tr>
              <tr>
                <td>{t('bankAfter')}</td>
                <td className="num">€{num(team.bank)}M</td>
                <td className="num">€{num(sum.bank)}M</td>
                <td />
              </tr>
            </tfoot>
          </table>
          {draft.limitless ? <p className="hint">{t('limitlessNote')}</p> : null}
          {warnings.length ? (
            <ul className="warnings">
              {warnings.map((w, i) => (
                <li key={i}>
                  <WarningText w={w} />
                </li>
              ))}
            </ul>
          ) : null}
          <p className="muted small-print">⚠ {t('penaltyNote')}</p>
          <div className="plan-actions">
            <button type="button" className="btn" onClick={() => setReview(false)}>
              ← {t('back')}
            </button>
            <button type="button" className="btn" onClick={saveScenario}>
              {t('saveScenario')}
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={busy}
              onClick={async () => {
                if (!confirm(t('applyConfirm', { swaps: swapRows.map((s) => `${s.out.name} → ${s.in.name}`).join(', ') }))) return;
                setBusy(true);
                await onConfirm(swapRows, sum.bank, sum.hits, draft.limitless);
                setBusy(false);
                setReview(false);
                setEditing(false);
              }}
            >
              ✓ {t('confirmDone')}
            </button>
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}

function ReasonLine({ r }: { r: ReturnType<typeof swapReasons>[number] }) {
  const { t, num } = useI18n();
  const v = r.v as Record<string, number | string>;
  switch (r.code) {
    case 'OUT_STATUS':
      return <>{r.v.status === 'out' ? t('rOut', { name: r.v.name }) : t('rDoubt', { name: r.v.name, p: pct(r.v.p) })}</>;
    case 'START':
      return <>{t('rStart', { in: r.v.inName, inP: pct(r.v.inP), inS: '', out: r.v.outName, outP: pct(r.v.outP), outS: '' })}</>;
    case 'FIXTURES':
      return <>{t('rFixtures', { inAvg: num(Number(v.inAvg)), outAvg: num(Number(v.outAvg)), n: r.v.n })}</>;
    case 'ATTACK':
      return <>{t('rAttack', { in: r.v.inName, inR: num(r.v.inRate, 2), out: r.v.outName, outR: num(r.v.outRate, 2) })}</>;
    case 'CLEAN_SHEET':
      return <>{t('rCs', { inP: pct(r.v.inP), outP: pct(r.v.outP) })}</>;
    case 'FORM':
      return <>{t('rForm', { in: r.v.inName, inAvg: num(r.v.inAvg), out: r.v.outName, outAvg: num(r.v.outAvg) })}</>;
    case 'XP_NOW':
      return <>{t('rXpNow', { gd: r.v.gd, in: r.v.inName, inXp: num(r.v.inXp), out: r.v.outName, outXp: num(r.v.outXp) })}</>;
    case 'BUDGET':
      return <>{r.v.diff > 0 ? t('rFrees', { x: num(r.v.diff) }) : r.v.diff < 0 ? t('rCosts', { x: num(-r.v.diff) }) : t('rSamePrice')}</>;
  }
}
