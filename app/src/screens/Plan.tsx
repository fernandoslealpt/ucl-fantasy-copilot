/**
 * Plano de várias jornadas: transferências de J5, J6 e J7 encadeadas (cada passo parte do anterior, as grátis
 * acumulam), com os pontos esperados SEM cortes. Cada jornada compara com a equipa de hoje sem trocas.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Plan as OldPlan, Swap } from '../advice/engine';
import { evaluatePath, planGamedays, suggestPath, type PathResult } from '../advice/plan';
import { HIT, HIT_MARGIN } from '../advice/engine';
import type { LabelMode } from '../components/Field';
import { useI18n } from '../i18n';
import type { MyTeam } from '../team';
import type { Dataset, Row } from '../types';
import { SquadView } from './Squad';

type Steps = Record<number, { out: string; in: string }[]>;
const KEY = 'ucl.plan.v1';

function load(key: string): Steps {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { key: string; steps: Steps } | null;
    return v?.key === key ? v.steps : {};
  } catch {
    return {};
  }
}
function save(key: string, steps: Steps) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ key, steps }));
  } catch {
    /* sem armazenamento */
  }
}

const signed = (num: (n: number, d?: number) => string, x: number) => (Math.abs(x) < 0.05 ? num(0) : `${x > 0 ? '+' : '−'}${num(Math.abs(x))}`);
const toIds = (sw: Swap[]) => sw.map((s) => ({ out: s.out.id, in: s.in.id }));

export function PlanView({
  data,
  team,
  squad,
  gd,
  free,
  mode,
  onMode,
  oldRecommended,
  onOpen,
  onSuggested,
}: {
  data: Dataset;
  team: MyTeam;
  squad: Row[];
  gd: number;
  free: number;
  mode: LabelMode;
  onMode: (m: LabelMode) => void;
  /** recomendação da vista "Como está" (para comparar) */
  oldRecommended: OldPlan | null;
  onOpen: (r: Row) => void;
  /** guarda no Diário o 1.º passo sugerido pelo plano */
  onSuggested?: (res: PathResult) => void;
}) {
  const { t, num } = useI18n();
  const key = `${gd}|${team.players.slice().sort().join(',')}|${team.bank}|${free}`;
  const [steps, setSteps] = useState<Steps>(() => load(key));
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState<{ step: number; of: number } | null>(null);
  const [suggested, setSuggested] = useState<PathResult | null>(null);
  const [nonce, setNonce] = useState(0);
  const ran = useRef<string>('');
  const keepKey = (team.keep ?? []).join(',');

  const gds = useMemo(() => planGamedays(data.rows, gd), [data.rows, gd]);
  const byId = data.byId;
  const swapsOf = (g: number): Swap[] =>
    (steps[g] ?? []).map((s) => ({ out: byId.get(s.out)!, in: byId.get(s.in)! })).filter((s) => s.out && s.in);
  const path = useMemo(
    () => evaluatePath(data.rows, squad, team.bank, free, gd, gds.map((g) => ({ gameday: g, swaps: swapsOf(g) }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.rows, squad, team.bank, free, gd, steps],
  );

  const setAll = (s: Steps) => {
    setSteps(s);
    save(key, s);
    setNonce((n) => n + 1);
  };
  const setStep = (g: number, swaps: { out: string; in: string }[]) => {
    const s = { ...steps, [g]: swaps };
    setSteps(s);
    save(key, s);
  };

  const run = async () => {
    setBusy({ step: 1, of: gds.length });
    const res = await suggestPath(data.rows, squad, team.bank, free, gd, new Set(keepKey ? keepKey.split(',') : []), setBusy);
    setBusy(null);
    setSuggested(res);
    onSuggested?.(res);
    return res;
  };
  // ao abrir, calcula uma vez a sugestão (para comparar com "Como está" e registar no Diário)
  useEffect(() => {
    if (ran.current === key + data.meta.generatedAt) return;
    ran.current = key + data.meta.generatedAt;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, data.meta.generatedAt]);

  const applySuggestion = () => {
    if (!suggested) return;
    const s: Steps = {};
    for (const r of suggested.rows) s[r.gameday] = toIds(r.swaps);
    setAll(s);
  };

  const invalid = path.rows.filter((r) => !r.legal).map((r) => r.gameday);
  const row = path.rows[active] ?? path.rows[0];
  const vTeam: MyTeam | null = row ? { ...team, players: row.squadBefore.map((r) => r.id), bank: row.bankBefore } : null;
  const stepKey = row ? `${row.gameday}-${nonce}-${row.squadBefore.map((r) => r.id).sort().join('')}` : 'x';

  // as duas vistas concordam?
  const oldIds = (oldRecommended?.swaps ?? []).map((s) => `${s.out.id}>${s.in.id}`).sort().join('|');
  const newFirst = suggested?.rows[0];
  const newIds = (newFirst?.swaps ?? []).map((s) => `${s.out.id}>${s.in.id}`).sort().join('|');
  const names = (sw: { out: Row; in: Row }[]) => (sw.length ? sw.map((s) => `${s.out.name} → ${s.in.name}`).join(', ') : t('noTransfers'));

  const sumGain = path.rows.reduce((a, r) => a + r.gain, 0);

  return (
    <div className="plan-view">
      <p className="muted small-print">{t('planIntro')}</p>

      <div className="plan-actions plan-top">
        <button type="button" className="btn primary" onClick={async () => (await run(), undefined)} disabled={!!busy}>
          ✨ {busy ? t('planCalc', { s: busy.step, n: busy.of }) : t('planSuggest')}
        </button>
        <button type="button" className="btn" onClick={applySuggestion} disabled={!suggested || !!busy}>
          {t('planApply')}
        </button>
        <button type="button" className="btn" onClick={() => setAll({})} disabled={!Object.values(steps).some((x) => x.length)}>
          {t('planClear')}
        </button>
      </div>

      {suggested && newFirst ? (
        <div className={`suggest-bar ${oldIds === newIds ? 'agree' : ''}`}>
          <span>
            {oldIds === newIds
              ? t('planAgree', { gd: gds[0]!, swaps: names(newFirst.swaps) })
              : t('planDiverge', {
                  gd: gds[0]!,
                  old: names((oldRecommended?.swaps ?? []).map((s) => ({ out: s.out, in: s.in }))),
                  new: names(newFirst.swaps),
                })}
          </span>
        </div>
      ) : null}
      {invalid.length ? <p className="hint error">{t('planInvalid', { gd: invalid.map((g) => `J${g}`).join(', ') })}</p> : null}

      <dl className="summary plan-kpis">
        <div>
          <dt>{t('planNet')}</dt>
          <dd className={`kpi ${path.net >= 0 ? 'pos' : 'neg'}`}>{signed(num, path.net)}</dd>
        </div>
        <div>
          <dt>{t('planSumGain')}</dt>
          <dd className="kpi">{signed(num, sumGain)}</dd>
        </div>
        <div>
          <dt>{t('planCostAll', { n: path.hits })}</dt>
          <dd className={`kpi ${path.hits ? 'neg' : ''}`}>{path.hits ? `−${HIT * path.hits}` : '0'}</dd>
        </div>
      </dl>
      {path.hits ? <p className="muted small-print">{t('planScore', { m: HIT_MARGIN })}: {signed(num, path.score)}</p> : null}

      <div className="table-wrap">
        <table className="table compact plan-table">
          <caption className="table-caption">{t('planTableTitle')}</caption>
          <thead>
            <tr>
              <th className="sticky">{t('gdShort')}</th>
              <th className="num">{t('gainVsNone')}</th>
              <th className="num">{t('planTrocas')}</th>
              <th className="num">{t('hitCost')}</th>
              <th className="num">{t('planFree')}</th>
              <th className="num">{t('bank')}</th>
              <th className="num">{t('planXi')}</th>
              <th className="num">{t('planBase')}</th>
            </tr>
          </thead>
          <tbody>
            {path.rows.map((r, k) => (
              <tr key={r.gameday} className={k === active ? 'rec-row' : ''}>
                <th scope="row" className="sticky">
                  <button type="button" className="link" onClick={() => setActive(k)}>
                    J{r.gameday}
                  </button>
                  <small className="muted"> {k === 0 ? '' : k === 1 ? t('planEstimate') : t('planEstimate2')}</small>
                </th>
                <td className="num">
                  <strong className={r.gain > 0.05 ? 'pos' : r.gain < -0.05 ? 'neg' : ''}>{signed(num, r.gain)}</strong>
                </td>
                <td className="num">{r.swaps.length}</td>
                <td className={`num ${r.hits ? 'neg' : ''}`}>{r.hits ? `−${HIT * r.hits}` : '0'}</td>
                <td className="num">{r.free}</td>
                <td className="num">€{num(r.bankAfter)}M</td>
                <td className="num">{num(r.value)}</td>
                <td className="num">{num(r.base)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {path.rows.map((r) =>
        r.swaps.length ? (
          <p key={r.gameday} className="small-print">
            <strong>J{r.gameday}:</strong> {names(r.swaps)}
          </p>
        ) : null,
      )}

      <div className="seg" role="tablist" aria-label={t('planSteps')}>
        {path.rows.map((r, k) => (
          <button key={r.gameday} type="button" role="tab" aria-selected={k === active} className={k === active ? 'on' : ''} onClick={() => setActive(k)}>
            {t('planStep', { gd: r.gameday })}
          </button>
        ))}
      </div>
      {row && vTeam ? (
        <>
          <p className="muted small-print">{t('planStepHelp', { gd: row.gameday, free: row.free, bank: num(row.bankBefore) })}</p>
          <SquadView
            key={stepKey}
            data={data}
            team={vTeam}
            gd={row.gameday}
            free={row.free}
            mode={mode}
            onMode={onMode}
            captainId={null}
            viceId={null}
            advice={null}
            onConfirm={async () => undefined}
            onCaptain={() => undefined}
            onOpen={onOpen}
            plan={{
              initial: steps[row.gameday] ?? [],
              onSave: (sw) => {
                setStep(row.gameday, toIds(sw));
                if (active < path.rows.length - 1) setActive(active + 1);
              },
            }}
          />
        </>
      ) : null}

      <details className="how-read">
        <summary>{t('planHowTitle')}</summary>
        <ul className="plain">
          <li>{t('planHow1')}</li>
          <li>{t('planHow2')}</li>
          <li>{t('planHow3', { hit: HIT, m: HIT_MARGIN })}</li>
          <li>{t('planHow4')}</li>
          <li>{t('planHow5')}</li>
        </ul>
      </details>
    </div>
  );
}
