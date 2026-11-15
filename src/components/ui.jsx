import { useEffect, useRef, useState } from 'react';
import { LEVELS, STATUSES } from '../lib/trailMath.js';

export function StatusPill({ status }) {
  const s = STATUSES[status] || STATUSES.draft;
  return (
    <span className="status-pill" style={{ color: s.color, background: s.bg, borderColor: `${s.color}44` }}>
      <span className="d" />
      {s.label}
    </span>
  );
}

export function LevelDot({ level, size = 8 }) {
  const l = LEVELS[level] || LEVELS.intermediate;
  return (
    <span
      className="level-dot"
      style={{ width: size, height: size, background: l.color, color: l.color }}
      title={l.label}
    />
  );
}

export function LevelTag({ level }) {
  const l = LEVELS[level] || LEVELS.intermediate;
  return (
    <span className="chip" style={{ color: l.color, borderColor: `${l.color}3d`, background: `${l.color}14` }}>
      {l.label}
    </span>
  );
}

export function Icon({ name, size = 14, stroke = 1.6 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: stroke,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  switch (name) {
    case 'mountain':
      return (
        <svg {...common}>
          <path d="M3 19l6-11 4 7 2-3.5L21 19H3z" />
          <path d="M8.4 9.4l1.6 2.1 1.4-1.5" />
        </svg>
      );
    case 'layers':
      return (
        <svg {...common}>
          <path d="M12 3l9 5-9 5-9-5 9-5z" />
          <path d="M3 13l9 5 9-5" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common}>
          <path d="M4 12l5 5L20 6" />
        </svg>
      );
    case 'alert':
      return (
        <svg {...common}>
          <path d="M12 3l9 16H3L12 3z" />
          <path d="M12 9v5M12 17.5v.5" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...common}>
          <path d="M4 20V9M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );
    case 'split':
      return (
        <svg {...common}>
          <path d="M6 3v6a5 5 0 005 5h2a5 5 0 015 5v2" />
          <path d="M6 3v18" opacity=".4" />
          <path d="M18 21l2-2-2-2" />
        </svg>
      );
    case 'snow':
      return (
        <svg {...common}>
          <path d="M12 2v20M3.5 7l17 10M20.5 7l-17 10" />
          <path d="M9.5 4l2.5 2 2.5-2M9.5 20l2.5-2 2.5 2" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'x':
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case 'pen':
      return (
        <svg {...common}>
          <path d="M4 20h4l10-10-4-4L4 16v4z" />
          <path d="M14 6l4 4" />
        </svg>
      );
    case 'doc':
      return (
        <svg {...common}>
          <path d="M6 3h8l4 4v14H6V3z" />
          <path d="M14 3v4h4M9 12h6M9 16h6" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case 'pin':
      return (
        <svg {...common}>
          <path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case 'refresh':
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 0115.5-6.2M21 12a9 9 0 01-15.5 6.2" />
          <path d="M3 4v5h5M21 20v-5h-5" />
        </svg>
      );
    case 'chevron':
      return (
        <svg {...common}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...common}>
          <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
        </svg>
      );
    default:
      return null;
  }
}

export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const push = (msg, kind = 'ok') => {
    idRef.current += 1;
    const id = idRef.current;
    setToasts((t) => [...t, { id, msg, kind }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  };
  return { toasts, push };
}

export function ToastStack({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div className={`toast ${t.kind}`} key={t.id}>
          <span style={{ color: t.kind === 'ok' ? 'var(--teal)' : t.kind === 'warn' ? 'var(--amber)' : 'var(--red)', marginTop: 1 }}>
            <Icon name={t.kind === 'ok' ? 'check' : 'alert'} size={13} />
          </span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

export function Modal({ title, children, footer, onClose, width }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={width ? { width } : undefined}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="btn ghost sm" onClick={onClose} aria-label="关闭">
            <Icon name="x" size={13} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}
