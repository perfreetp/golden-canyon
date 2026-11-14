import React, { useEffect } from 'react';
import {
  AlertTriangle,
  Check,
  CircleCheck,
  Info,
  X,
} from 'lucide-react';
import type { DeviceStatus, Role, Toast } from '../types';

export function StatusChip({ status }: { status: DeviceStatus }) {
  const map: Record<DeviceStatus, { label: string; cls: string }> = {
    draft: { label: '草稿', cls: 'chip-draft' },
    pending: { label: '待审核', cls: 'chip-pending' },
    approved: { label: '已发布', cls: 'chip-approved' },
    rejected: { label: '已退回', cls: 'chip-rejected' },
  };
  const m = map[status];
  return (
    <span className={`chip ${m.cls}`}>
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: 99,
          background: 'currentColor',
          display: 'inline-block',
        }}
      />
      {m.label}
    </span>
  );
}

export function RoleChip({ role }: { role: Role }) {
  const map: Record<Role, string> = {
    therapist: '治疗师',
    reviewer: '审核人',
    supervisor: '主管',
    patient: '患者端',
  };
  return <span className="chip chip-neutral">{map[role]}</span>;
}

export function Switch({
  on,
  onChange,
  disabled,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={`switch ${on ? 'on' : ''}`}
      style={disabled ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
      onClick={() => !disabled && onChange(!on)}
      aria-pressed={on}
      type="button"
    />
  );
}

export function Seg<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="seg" style={disabled ? { opacity: 0.5, pointerEvents: 'none' } : undefined}>
      {options.map((o) => (
        <button key={o.value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)} type="button">
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div style={{ flex: 1 }}>
            <div className="modal-title">{title}</div>
            {subtitle && <div className="modal-sub">{subtitle}</div>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="关闭">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} onClick={() => onDismiss(t.id)}>
          <span className="ico">
            {t.kind === 'success' ? <Check size={13} /> : t.kind === 'error' ? <AlertTriangle size={13} /> : <Info size={13} />}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, hint, icon }: { title: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="empty">
      {icon}
      <div style={{ fontWeight: 600, color: '#7b8f8a' }}>{title}</div>
      {hint && <div style={{ fontSize: 11.5 }}>{hint}</div>}
    </div>
  );
}

export function ToggleRow({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint?: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
        {hint && <div style={{ fontSize: 10.5, color: '#94a3a0', marginTop: 1 }}>{hint}</div>}
      </div>
      <Switch on={on} onChange={onChange} />
    </div>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 9,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: '#7b8f8a', textTransform: 'uppercase' }}>
        {children}
      </div>
      {right}
    </div>
  );
}

export function ProgressBar({ value, color = '#0f766e', height = 6, bg = '#eef4f2' }: { value: number; color?: string; height?: number; bg?: string }) {
  return (
    <div style={{ height, background: bg, borderRadius: 99, overflow: 'hidden' }}>
      <div
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          height: '100%',
          background: color,
          borderRadius: 99,
          transition: 'width .35s cubic-bezier(.2,.9,.3,1)',
        }}
      />
    </div>
  );
}

export function IconBubble({ children, color, bg, size = 30 }: { children: React.ReactNode; color: string; bg: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        background: bg,
        color,
        display: 'grid',
        placeItems: 'center',
        flex: '0 0 auto',
      }}
    >
      {children}
    </div>
  );
}

export function ConfirmNote({
  value,
  onChange,
  placeholder,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: string;
}) {
  return (
    <div className="field">
      <label className="field-label">审核意见</label>
      <textarea
        className="textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={error ? { borderColor: '#fca5a5' } : undefined}
      />
      {error ? (
        <div style={{ fontSize: 11, color: '#dc2626', display: 'flex', gap: 4, alignItems: 'center' }}>
          <AlertTriangle size={12} /> {error}
        </div>
      ) : (
        <div className="field-hint">退回时必填，将展示给提交人</div>
      )}
    </div>
  );
}

export function Metric({ label, value, unit, color }: { label: string; value: string | number; unit?: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: '#869894' }}>{label}</div>
      <div className="mono" style={{ fontSize: 17, fontWeight: 700, color: color ?? '#0b2b27', marginTop: 2 }}>
        {value}
        {unit && <span style={{ fontSize: 10.5, fontWeight: 600, color: '#869894', marginLeft: 2 }}>{unit}</span>}
      </div>
    </div>
  );
}

export function InfoBanner({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warn' | 'danger' | 'success' }) {
  const map = {
    info: { bg: '#f0f9ff', border: '#bae6fd', color: '#075985', icon: <Info size={15} /> },
    warn: { bg: '#fffbeb', border: '#fde68a', color: '#92400e', icon: <AlertTriangle size={15} /> },
    danger: { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', icon: <AlertTriangle size={15} /> },
    success: { bg: '#ecfdf5', border: '#a7f3d0', color: '#065f46', icon: <CircleCheck size={15} /> },
  }[tone];
  return (
    <div
      style={{
        display: 'flex',
        gap: 9,
        padding: '10px 12px',
        borderRadius: 10,
        background: map.bg,
        border: `1px solid ${map.border}`,
        color: map.color,
        fontSize: 11.8,
        lineHeight: 1.6,
        alignItems: 'flex-start',
      }}
    >
      <span style={{ flex: '0 0 auto', marginTop: 1 }}>{map.icon}</span>
      <div>{children}</div>
    </div>
  );
}
