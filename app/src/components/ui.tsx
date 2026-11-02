import type { ReactNode } from 'react';
import { useI18n } from '../i18n';
import type { Availability, Dataset, FixtureXp, Row, FixtureSignal } from '../types';

/** Código oficial da equipa (ex.: BVB); se não existir, as 3 primeiras letras. */
export function teamCode(data: Dataset, id: string, name: string): string {
  return data.teamById.get(id)?.code || name.slice(0, 3).toUpperCase();
}

/** Estado do jogador como no futebol: verde = disponível, amarelo = dúvida, vermelho = fora. */
export function StatusMark({ a, label = false }: { a: Availability; label?: boolean }) {
  const { d } = useI18n();
  return (
    <span className={`status status-${a}`} title={d.avail[a]}>
      <span className="status-card" aria-hidden />
      {label ? <span>{d.avail[a]}</span> : <span className="sr-only">{d.avail[a]}</span>}
    </span>
  );
}

export function Difficulty({ n, children }: { n: number; children: ReactNode }) {
  return <span className={`diff diff-${n}`}>{children}</span>;
}

export function Opponent({ f, code }: { f: FixtureXp | undefined; code?: string }) {
  const { t } = useI18n();
  if (!f) return <span className="muted">—</span>;
  const name = code ?? f.opponentName;
  return (
    <span>
      {name} <span className="muted">({f.home ? t('home') : t('away')})</span>
    </span>
  );
}

export function useAgo() {
  const { t } = useI18n();
  return (iso: string | null, now = Date.now()) => {
    if (!iso) return '—';
    const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
    if (m < 60) return `${m} ${t('min')}`;
    const h = Math.floor(m / 60);
    if (h < 48) return `${h} ${t('h')}`;
    return `${Math.floor(h / 24)} ${t('d')}`;
  };
}

export function pct(x: number | undefined): string {
  return x == null ? '—' : `${Math.round(x * 100)}%`;
}

/** Notas de estado da UEFA (em inglês) traduzidas quando conhecidas. */
export function useNote() {
  const { d } = useI18n();
  return (note: string) => d.notes[note] ?? note;
}

/** Texto curto para os sinais da próxima jornada ("no onze provável", "lesionado", …); null se não há. */
export function useSignalText() {
  const { t } = useI18n();
  return (s: FixtureSignal | undefined): string | null => {
    if (!s) return null;
    const parts: string[] = [];
    if (s.lineup === 'start') parts.push(t(s.confirmed ? 'sigStartConf' : 'sigStart'));
    if (s.lineup === 'bench') parts.push(t(s.confirmed ? 'sigBenchConf' : 'sigBench'));
    if (s.tag === 'OUT') parts.push(t('sigOut'));
    if (s.tag === 'SUS') parts.push(t('sigSus'));
    if (s.tag === 'QUES') parts.push(t('sigQues'));
    if (!s.lineup && !s.tag && s.news === 'injury') parts.push(t('sigNewsInjury'));
    if (!s.lineup && !s.tag && s.news === 'doubt') parts.push(t('sigNewsDoubt'));
    return parts.length ? parts.join(', ') : null;
  };
}

export function surnameOf(r: Pick<Row, 'name'>): string {
  const parts = r.name.split(' ');
  return parts.length > 1 && parts[0]!.endsWith('.') ? parts.slice(1).join(' ') : r.name;
}
