/**
 * Quadros das transferências:
 * - CountTable: melhor opção com 0 a 5 trocas, ganho por jornada, custo do −4 e líquido (porquê da recomendação).
 * - LiveSummary: enquanto se fazem experiências no Plantel, xP de quem sai e de quem entra, total na equipa e líquido.
 */
import { countTable, HIT, HIT_MARGIN, squadValue, type Ctx, type Plan, type TransferAdvice } from '../advice/engine';
import { useI18n } from '../i18n';
import type { Row } from '../types';

const signed = (num: (n: number, d?: number) => string, x: number) => (Math.abs(x) < 0.05 ? num(0) : `${x > 0 ? '+' : '−'}${num(Math.abs(x))}`);

export function CountTable({ advice, onTry }: { advice: TransferAdvice; onTry: (p: Plan) => void }) {
  const { t, num } = useI18n();
  const rows = countTable(advice);
  const gds = advice.ctx.gds;
  const rec = rows.find((r) => r.recommended) ?? rows[0]!;
  const next = rows.find((r) => r.n === rec.n + 1 && r.plan);
  const score = (r: (typeof rows)[number]) => r.plan?.score ?? 0;
  const s = (x: number) => signed(num, x);
  return (
    <section className="count-table section">
      <h2>{t('howMany')}</h2>
      <p className="muted small-print">{t('howManyIntro', { free: advice.free })}</p>
      <div className="table-wrap">
        <table className="table compact">
          <thead>
            <tr>
              <th className="sticky">{t('option')}</th>
              <th className="num">{t('netGd', { gd: gds[0]! })}</th>
              <th className="num">{t('netAll', { n: gds.length })}</th>
              <th className="num">{t('hitCost')}</th>
              {gds.map((g, k) => (
                <th key={g} className="num">
                  J{g}
                  {k ? <small> (J+{k})</small> : null}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.n} className={r.recommended ? 'rec-row' : ''}>
                <th scope="row" className="sticky">
                  {r.n === 0 ? t('noTransfers') : t(r.n === 1 ? 'oneSwap' : 'nSwaps', { n: r.n })}
                  <small className="muted"> {r.n === 0 ? '' : r.hits ? `(${r.n - r.hits} ${t('freeWord')} + ${r.hits} ${t(r.hits > 1 ? 'paidPlural' : 'paidWord')})` : `(${t('freeWord')})`}</small>
                  {r.recommended ? <span className="rec-pill">{t('recommended')}</span> : null}
                </th>
                <td className="num">
                  <strong className={r.netNow > 0.05 ? 'pos' : r.netNow < -0.05 ? 'neg' : ''}>{r.plan || r.n === 0 ? s(r.netNow) : '—'}</strong>
                </td>
                <td className="num">
                  <strong className={r.netHorizon > 0.05 ? 'pos' : r.netHorizon < -0.05 ? 'neg' : ''}>{r.plan || r.n === 0 ? s(r.netHorizon) : '—'}</strong>
                </td>
                <td className={`num ${r.hits ? 'neg' : ''}`}>{r.hits ? `−${HIT * r.hits}` : '0'}</td>
                {gds.map((g, k) => (
                  <td key={g} className="num">
                    {r.plan || r.n === 0 ? s(r.deltaGd[k] ?? 0) : '—'}
                  </td>
                ))}
                <td>
                  {r.plan ? (
                    <button type="button" className="btn small" onClick={() => onTry(r.plan!)}>
                      {t('tryIt')}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ol className="reasons">
        <li>{t('whyRule', { hit: HIT, need: HIT + HIT_MARGIN })}</li>
        <li>
          {rec.n === 0
            ? t('whyNone')
            : t('whyRec', { n: rec.n, now: s(rec.deltaGd[0] ?? 0), net: s(rec.netHorizon) })}
        </li>
        {next ? (
          <li>
            {t('whyNotMore', {
              n: next.n,
              now: s((next.deltaGd[0] ?? 0) - (rec.deltaGd[0] ?? 0)),
              later: s(next.deltaGd.slice(1).reduce((a, x) => a + x, 0) - rec.deltaGd.slice(1).reduce((a, x) => a + x, 0)),
              cost: next.hits > rec.hits ? `−${HIT * (next.hits - rec.hits)}` : t('free'),
              val: s(score(next) - score(rec)),
            })}
          </li>
        ) : null}
      </ol>
    </section>
  );
}

export function LiveSummary({
  ctx,
  squad,
  after,
  swaps,
  hits,
  limitless,
}: {
  ctx: Ctx;
  squad: Row[];
  /** plantel do rascunho (null se ainda há lugares vazios) */
  after: Row[] | null;
  swaps: { out: Row; in: Row | null }[];
  hits: number;
  limitless: boolean;
}) {
  const { t, num } = useI18n();
  const g0 = ctx.gds[0]!;
  const xp = (r: Row | null) => (r ? (r.xp?.fixtures ?? []).filter((f) => f.gameday === g0).reduce((a, f) => a + f.xp, 0) : 0);
  const totOut = swaps.reduce((a, s) => a + xp(s.out), 0);
  const totIn = swaps.reduce((a, s) => a + xp(s.in), 0);
  const before = squadValue(ctx, squad);
  const aft = after ? squadValue(ctx, after) : null;
  const team = aft ? aft.perGd.map((v, k) => v - before.perGd[k]!) : null;
  const cost = limitless ? 0 : HIT * hits;
  const s = (x: number) => signed(num, x);
  if (!swaps.length) return null;
  return (
    <div className="live-summary">
      <table className="whatif">
        <caption className="table-caption">{t('liveTitle', { gd: g0 })}</caption>
        <thead>
          <tr>
            <th>{t('swapOut')}</th>
            <th className="num">xP</th>
            <th>{t('swapIn')}</th>
            <th className="num">xP</th>
            <th className="num">Δ</th>
          </tr>
        </thead>
        <tbody>
          {swaps.map((sw) => (
            <tr key={sw.out.id}>
              <td>{sw.out.name}</td>
              <td className="num">{num(xp(sw.out))}</td>
              <td>{sw.in ? sw.in.name : <span className="muted">—</span>}</td>
              <td className="num">{sw.in ? num(xp(sw.in)) : '—'}</td>
              <td className="num">{sw.in ? s(xp(sw.in) - xp(sw.out)) : '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="total">
            <td>{t('total')}</td>
            <td className="num">{num(totOut)}</td>
            <td />
            <td className="num">{num(totIn)}</td>
            <td className="num">
              <strong>{s(totIn - totOut)}</strong>
            </td>
          </tr>
          {team ? (
            <>
              <tr>
                <td colSpan={4}>{t('inTeam', { gd: g0 })}</td>
                <td className="num">
                  <strong>{s(team[0]!)}</strong>
                </td>
              </tr>
              <tr>
                <td colSpan={4}>{limitless ? t('chipLimitless') : t('extraTransfers', { n: hits })}</td>
                <td className={`num ${cost ? 'neg' : ''}`}>{cost ? `−${cost}` : '0'}</td>
              </tr>
              <tr className="total">
                <td colSpan={4}>{t('netGd', { gd: g0 })}</td>
                <td className="num">
                  <strong className={team[0]! - cost >= 0 ? 'pos' : 'neg'}>{s(team[0]! - cost)}</strong>
                </td>
              </tr>
              <tr>
                <td colSpan={4}>{t('netAllLong', { gds: ctx.gds.map((g) => `J${g}`).join('+') })}</td>
                <td className="num">
                  <strong className={team.reduce((a, x) => a + x, 0) - cost >= 0 ? 'pos' : 'neg'}>{s(team.reduce((a, x) => a + x, 0) - cost)}</strong>
                </td>
              </tr>
            </>
          ) : (
            <tr>
              <td colSpan={5} className="muted">
                {t('liveIncomplete')}
              </td>
            </tr>
          )}
        </tfoot>
      </table>
      {team ? <p className="muted small-print">{t('liveExplain')}</p> : null}
    </div>
  );
}
