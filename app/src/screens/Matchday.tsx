/**
 * Jornada: onze, banco ordenado e capitão (só contam nos dias de jogo), como no ecrã da equipa da app oficial.
 * Tocar num jogador: Capitão, Vice, Substituir, Ficha. Substituir: setas e só trocas com formação válida.
 */
import { useMemo, useState } from 'react';
import { Field, LabelPicker, type FieldSlot, type LabelMode } from '../components/Field';
import { ActionList, Sheet } from '../components/Sheet';
import { useI18n } from '../i18n';
import { applySwap, canSwap, defaultLineup, ifAbsent, lineupSuggestion, type Lineup } from '../squad';
import type { Dataset, Position, Row } from '../types';

const ROWS_TOP_DOWN: Position[] = ['FWD', 'MID', 'DEF', 'GK'];

export function MatchdayView({
  data,
  squad,
  gd,
  lineup,
  saved,
  mode,
  onMode,
  captainId,
  viceId,
  xpAt,
  onLineup,
  onCaptain,
  onOpen,
}: {
  data: Dataset;
  squad: Row[];
  gd: number;
  lineup: Lineup;
  saved: boolean;
  mode: LabelMode;
  onMode: (m: LabelMode) => void;
  captainId: string | null;
  viceId: string | null;
  xpAt: (r: Row) => number;
  onLineup: (l: Lineup) => void;
  onCaptain: (id: string, role: 'C' | 'V') => void;
  onOpen: (r: Row) => void;
}) {
  const { t, num } = useI18n();
  const byId = data.byId;
  const [action, setAction] = useState<Row | null>(null);
  const [subFrom, setSubFrom] = useState<string | null>(null);
  const [absent, setAbsent] = useState<ReturnType<typeof ifAbsent> | null>(null);
  const sug = useMemo(() => lineupSuggestion(lineup, squad, xpAt), [lineup, squad, xpAt]);

  const slot = (id: string, bench?: string): FieldSlot => {
    const r = byId.get(id) ?? null;
    const target = subFrom != null && subFrom !== id && canSwap(lineup, subFrom, id, byId);
    return {
      key: id,
      pos: r?.position ?? 'MID',
      row: r,
      badge: id === captainId ? 'C' : id === viceId ? 'V' : null,
      overlay: subFrom == null ? null : id === subFrom ? 'subOut' : target ? 'subIn' : null,
      state: subFrom == null ? null : id === subFrom ? 'selected' : target ? 'target' : 'dim',
      benchLabel: bench,
    };
  };
  const rows = ROWS_TOP_DOWN.map((pos) => lineup.xi.filter((id) => byId.get(id)?.position === pos).map((id) => slot(id)));
  const bench = lineup.bench.map((id, i) => slot(id, i === 0 ? t('pos_GK') : `${i}.`));

  const doSwap = (b: string) => {
    if (!subFrom) return;
    if (canSwap(lineup, subFrom, b, byId)) onLineup(applySwap(lineup, subFrom, b));
    setSubFrom(null);
  };
  const onTap = (s: FieldSlot) => {
    if (!s.row) return;
    if (subFrom) {
      if (s.row.id === subFrom) setSubFrom(null);
      else doSwap(s.row.id);
      return;
    }
    setAction(s.row);
  };
  const onOverlay = (s: FieldSlot) => onTap(s);
  const xiXp = lineup.xi.reduce((a, id) => a + xpAt(byId.get(id)!), 0) + (captainId && lineup.xi.includes(captainId) ? xpAt(byId.get(captainId)!) : 0);

  return (
    <div className="matchday-view">
      <div className="squad-bar">
        <span className="muted">
          {t('xiXp')} <strong>{num(xiXp)}</strong>
        </span>
        <LabelPicker mode={mode} onMode={onMode} />
      </div>
      {!saved ? <p className="hint">{t('lineupNotSaved')}</p> : null}
      {sug.gain >= 0.3 && sug.pairs.length ? (
        <div className="suggest-bar">
          <span>
            💡{' '}
            {t('lineupSuggest', {
              pairs: sug.pairs.map((p) => t('pairInOut', { in: byId.get(p.in)?.name ?? '', out: byId.get(p.out)?.name ?? '' })).join('; '),
              gain: num(sug.gain),
            })}
          </span>
          <button type="button" className="btn small primary" onClick={() => onLineup(defaultLineup(squad, gd, xpAt))}>
            {t('apply')}
          </button>
        </div>
      ) : null}
      {subFrom ? (
        <div className="suggest-bar">
          <span>{t('subPick', { name: byId.get(subFrom)?.name ?? '' })}</span>
          <button type="button" className="btn small" onClick={() => setSubFrom(null)}>
            {t('cancel')}
          </button>
        </div>
      ) : null}
      <Field rows={rows} bench={bench} data={data} gd={gd} mode={mode} onTap={onTap} onOverlay={onOverlay} />
      <p className="muted small-print">{t('benchHelp')}</p>

      {action ? (
        <Sheet
          title={
            <>
              <strong>{action.name}</strong>
              <span className="muted"> · {action.teamName}</span>
            </>
          }
          onClose={() => (setAction(null), setAbsent(null))}
        >
          <p className="muted small-print">{t('xpThisGd', { gd, xp: num(xpAt(action)) })}</p>
          {absent ? (
            <div className="question">
              <h3>❓ {t('qAbsent', { name: action.name })}</h3>
              <ol className="reasons">
                <li>
                  {absent.subIn
                    ? t('abSub', { name: byId.get(absent.subIn)?.name ?? '', xp: num(xpAt(byId.get(absent.subIn)!)) })
                    : lineup.xi.includes(action.id)
                      ? t('abNoSub')
                      : t('abBench')}
                </li>
                {captainId === action.id ? <li>{absent.newCaptain ? t('abVice', { name: byId.get(absent.newCaptain)?.name ?? '' }) : t('abNoVice')}</li> : null}
                <li>{t('abTotal', { before: num(absent.before), after: num(absent.after), diff: `${absent.after - absent.before >= 0 ? '+' : '−'}${num(Math.abs(absent.after - absent.before))}` })}</li>
              </ol>
            </div>
          ) : null}
          <ActionList
            actions={[
              { key: 'c', icon: 'C', label: t('makeCaptain'), disabled: action.id === captainId || !lineup.xi.includes(action.id), onClick: () => (onCaptain(action.id, 'C'), setAction(null)) },
              { key: 'v', icon: 'V', label: t('makeVice'), disabled: action.id === viceId || !lineup.xi.includes(action.id), onClick: () => (onCaptain(action.id, 'V'), setAction(null)) },
              { key: 's', icon: '⇅', label: t('substitute'), onClick: () => (setSubFrom(action.id), setAction(null)) },
              { key: 'a', icon: '?', label: t('qAbsent', { name: action.name }), onClick: () => setAbsent(ifAbsent(lineup, action.id, byId, xpAt, captainId, viceId)) },
              { key: 'f', icon: 'ⓘ', label: t('playerInfo'), onClick: () => (onOpen(action), setAction(null)) },
            ]}
          />
          {!lineup.xi.includes(action.id) ? <p className="muted small-print">{t('captainOnlyXi')}</p> : null}
        </Sheet>
      ) : null}
    </div>
  );
}
