import { useEffect, type ReactNode } from 'react';
import { useI18n } from '../i18n';

/** Painel que sobe do fundo no telemóvel e aparece ao centro/lado no computador. Fecha com Esc ou fora. */
export function Sheet({ title, onClose, children, wide = false }: { title: ReactNode; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const { t } = useI18n();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="bsheet-backdrop" onClick={onClose}>
      <div className={`bsheet ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="bsheet-head">
          <div className="bsheet-title">{title}</div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('close')}>
            ✕
          </button>
        </div>
        <div className="bsheet-body">{children}</div>
      </div>
    </div>
  );
}

/** Lista de ações para um jogador (como ao tocar num jogador na app oficial). */
export function ActionList({ actions }: { actions: { key: string; label: string; icon: string; onClick: () => void; disabled?: boolean }[] }) {
  return (
    <div className="action-list">
      {actions.map((a) => (
        <button key={a.key} type="button" className="action-btn" onClick={a.onClick} disabled={a.disabled}>
          <span className="action-icon" aria-hidden>
            {a.icon}
          </span>
          {a.label}
        </button>
      ))}
    </div>
  );
}
