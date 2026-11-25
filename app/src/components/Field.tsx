/**
 * Campo ao estilo da app oficial: jogadores por linhas, rótulo escolhido por baixo (pontos, xP, preço,
 * próximo jogo, adversário), ✕ para retirar, ↺ para recuperar, setas para substituir.
 */
import { useState } from 'react';
import { useI18n } from '../i18n';
import type { Dataset, Position, Row } from '../types';
import { surnameOf, teamCode } from './ui';

export type LabelMode = 'points' | 'xp' | 'price' | 'next' | 'opp' | 'day';
export const LABEL_MODES: LabelMode[] = ['day', 'points', 'xp', 'price', 'next', 'opp'];

export interface FieldSlot {
  key: string;
  pos: Position;
  row: Row | null;
  /** jogador que saiu (lugar vazio) */
  ghost?: Row | null;
  badge?: 'C' | null;
  overlay?: 'remove' | 'restore' | 'subOut' | 'subIn' | null;
  state?: 'selected' | 'target' | 'new' | 'dim' | null;
  /** rótulo do banco (GR, 1, 2, 3) */
  benchLabel?: string;
}

const failedLogos = new Set<string>();

export function Crest({ data, teamId, size = 22 }: { data: Dataset; teamId: string; size?: number }) {
  const t = data.teamById.get(teamId);
  const [failed, setFailed] = useState(() => !t?.logo || failedLogos.has(t.logo));
  const code = t?.code ?? '';
  if (failed || !t?.logo)
    return (
      <span className="crest crest-code" style={{ width: size, height: size }}>
        {code}
      </span>
    );
  return (
    <img
      className="crest"
      src={t.logo}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
      loading="lazy"
      onError={() => {
        failedLogos.add(t.logo!);
        setFailed(true);
      }}
    />
  );
}

/** Texto curto por baixo do jogador, conforme o rótulo escolhido. */
export function useSlotLabel(data: Dataset, gd: number) {
  const { num, lang } = useI18n();
  const loc = lang === 'en' ? 'en-GB' : 'pt-PT';
  return (r: Row, mode: LabelMode, captain = false): { main: string; sub?: string; diff?: number; star?: boolean } => {
    // "jornada em curso": pontos já feitos (e jogador do jogo) para quem já jogou; adversário para quem falta jogar
    if (mode === 'day') {
      const dg = data.meta.gamedayState === 'live' && data.meta.currentGameday != null ? data.meta.currentGameday : gd;
      const fx = r.xp?.fixtures.find((x) => x.gameday === dg);
      const line = r.history.find((h) => h.gameday === dg);
      const started = !!fx?.kickoff && Date.parse(fx.kickoff) <= Date.now();
      if (line) return { main: `${captain ? 2 * line.points : line.points} pts`, star: (line.stats?.playerOfTheMatch ?? 0) > 0 };
      if (started) return { main: '—' };
      const d = fx ? data.ratingById.get(r.teamId)?.fixtures.find((x) => x.gameday === dg && x.opponentId === fx.opponentId)?.difficulty : undefined;
      return { main: fx ? `${fx.home ? '' : '@'}${teamCode(data, fx.opponentId, fx.opponentName)}` : '—', diff: d };
    }
    const f = r.xp?.fixtures.find((x) => x.gameday === gd);
    const diff = f ? data.ratingById.get(r.teamId)?.fixtures.find((x) => x.gameday === gd && x.opponentId === f.opponentId)?.difficulty : undefined;
    switch (mode) {
      case 'points':
        return { main: String(r.stats.points), sub: `${r.form.lastGameday} · ${num(r.form.avgPoints)}` };
      case 'xp': {
        const x = (r.xp?.fixtures ?? []).filter((y) => y.gameday === gd).reduce((a, y) => a + y.xp, 0);
        return { main: r.xp ? num(captain ? 2 * x : x) : '—' };
      }
      case 'price':
        return { main: `€${num(r.price)}M` };
      case 'next':
        return {
          main: f?.kickoff ? new Date(f.kickoff).toLocaleDateString(loc, { weekday: 'short', day: '2-digit', timeZone: 'Europe/Lisbon' }) : '—',
          sub: f?.kickoff ? new Date(f.kickoff).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' }) : undefined,
        };
      case 'opp':
        return { main: f ? `${f.home ? '' : '@'}${teamCode(data, f.opponentId, f.opponentName)}` : '—', diff };
    }
  };
}

function Token({
  s,
  data,
  gd,
  mode,
  onTap,
  onOverlay,
}: {
  s: FieldSlot;
  data: Dataset;
  gd: number;
  mode: LabelMode;
  onTap: (s: FieldSlot) => void;
  onOverlay: (s: FieldSlot) => void;
}) {
  const { t } = useI18n();
  const label = useSlotLabel(data, gd);
  const r = s.row;
  if (!r) {
    const g = s.ghost;
    return (
      <div className={`ftoken is-empty ${s.state ?? ''}`}>
        <button type="button" className="ftoken-body" onClick={() => onTap(s)} aria-label={t('pickPlayer', { pos: t(`pos_${s.pos}`) })}>
          <span className="ftoken-plus" aria-hidden>
            +
          </span>
          <span className="ftoken-name">{g ? surnameOf(g) : t(`pos_${s.pos}`)}</span>
          <span className="ftoken-label out">{t('outLabel')}</span>
        </button>
        {s.overlay === 'restore' ? (
          <button type="button" className="ftoken-ov restore" onClick={() => onOverlay(s)} aria-label={t('restorePlayer', { name: g?.name ?? '' })}>
            ↺
          </button>
        ) : null}
      </div>
    );
  }
  const l = label(r, mode, s.badge === 'C');
  return (
    <div className={`ftoken token-${r.availability} ${s.state ?? ''}`}>
      <button type="button" className="ftoken-body" onClick={() => onTap(s)} aria-label={r.name}>
        <Crest data={data} teamId={r.teamId} />
        <span className="ftoken-name">{surnameOf(r)}</span>
        <span className={`ftoken-label ${l.diff ? `diff-${l.diff}` : ''}`}>
          <strong>{l.main}</strong>
          {l.sub ? <small>{l.sub}</small> : null}
        </span>
      </button>
      {s.badge ? <span className="ftoken-badge">{s.badge}</span> : null}
      {l.star ? (
        <span className="ftoken-star" title={t('lastGdMotm')} aria-label={t('lastGdMotm')}>
          ★
        </span>
      ) : null}
      {s.overlay ? (
        <button
          type="button"
          className={`ftoken-ov ${s.overlay}`}
          onClick={() => onOverlay(s)}
          aria-label={s.overlay === 'remove' ? t('removePlayer', { name: r.name }) : s.overlay === 'subIn' ? t('subInto', { name: r.name }) : t('subOutOf', { name: r.name })}
        >
          {s.overlay === 'remove' ? '✕' : s.overlay === 'subIn' ? '↑' : s.overlay === 'subOut' ? '↓' : '↺'}
        </button>
      ) : null}
    </div>
  );
}

export function Field({
  rows,
  bench,
  data,
  gd,
  mode,
  onTap,
  onOverlay,
}: {
  rows: FieldSlot[][];
  bench?: FieldSlot[];
  data: Dataset;
  gd: number;
  mode: LabelMode;
  onTap: (s: FieldSlot) => void;
  onOverlay: (s: FieldSlot) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="field-wrap">
      <div className="pitch field" role="group" aria-label={t('fieldLabel')}>
        <div className="pitch-lines" aria-hidden>
          <span className="pitch-half" />
          <span className="pitch-circle" />
          <span className="pitch-box top" />
          <span className="pitch-box bottom" />
        </div>
        {rows.map((row, i) => (
          <div key={i} className="pitch-row">
            {row.map((s) => (
              <Token key={s.key} s={s} data={data} gd={gd} mode={mode} onTap={onTap} onOverlay={onOverlay} />
            ))}
          </div>
        ))}
      </div>
      {bench ? (
        <div className="bench" aria-label={t('bench')}>
          <div className="bench-row">
            {bench.map((s) => (
              <div key={s.key} className="bench-slot">
                <Token s={s} data={data} gd={gd} mode={mode} onTap={onTap} onOverlay={onOverlay} />
                <span className="bench-label">{s.benchLabel}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Escolha do rótulo por baixo dos jogadores (guardada no dispositivo). */
export function LabelPicker({ mode, onMode }: { mode: LabelMode; onMode: (m: LabelMode) => void }) {
  const { t } = useI18n();
  return (
    <label className="label-picker">
      <span>{t('showUnder')}</span>
      <select value={mode} onChange={(e) => onMode(e.target.value as LabelMode)}>
        {LABEL_MODES.map((m) => (
          <option key={m} value={m}>
            {t(`label_${m}`)}
          </option>
        ))}
      </select>
    </label>
  );
}

const LABEL_KEY = 'ucl.fieldLabel';
export function hasStoredLabelMode(): boolean {
  try {
    return localStorage.getItem(LABEL_KEY) != null;
  } catch {
    return false;
  }
}

export function readLabelMode(): LabelMode {
  try {
    const v = localStorage.getItem(LABEL_KEY) as LabelMode | null;
    return v && LABEL_MODES.includes(v) ? v : 'points';
  } catch {
    return 'points';
  }
}
export function writeLabelMode(m: LabelMode) {
  try {
    localStorage.setItem(LABEL_KEY, m);
  } catch {
    /* sem armazenamento */
  }
}
