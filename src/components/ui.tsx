import { useEffect, type ReactNode } from 'react'
import { fmtTime, useStore } from '../store'
import type { LogKind, Role } from '../types'

export function Chip({
  tone = 'default',
  children,
  dot,
}: {
  tone?: 'default' | 'ok' | 'bad' | 'warn' | 'info' | 'accent'
  children: ReactNode
  dot?: boolean
}) {
  return (
    <span className={`chip ${tone === 'default' ? '' : tone}`}>
      {dot && <i className="dot" />}
      {children}
    </span>
  )
}

export function Stat({
  label,
  value,
  foot,
  tone = '',
  pct,
}: {
  label: ReactNode
  value: ReactNode
  foot?: ReactNode
  tone?: '' | 'ok' | 'bad' | 'warn'
  pct?: number
}) {
  return (
    <div className={`stat ${tone}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {pct !== undefined && (
        <div className="meter" style={{ marginTop: 8 }}>
          <i style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: tone === 'ok' ? 'var(--ok)' : tone === 'bad' ? 'var(--bad)' : 'var(--accent)' }} />
        </div>
      )}
      {foot && <div className="foot">{foot}</div>}
    </div>
  )
}

export function Panel({
  title,
  hint,
  right,
  children,
  flush,
}: {
  title?: ReactNode
  hint?: ReactNode
  right?: ReactNode
  children: ReactNode
  flush?: boolean
}) {
  return (
    <section className="panel">
      {(title || right) && (
        <header className="panel-head">
          {title && <h3>{title}</h3>}
          {hint && <span className="hint">{hint}</span>}
          {right && <div className="right">{right}</div>}
        </header>
      )}
      <div className={`panel-body ${flush ? 'flush' : ''}`}>{children}</div>
    </section>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <div className="big">∅</div>
      {children}
    </div>
  )
}

export function Modal({
  title,
  children,
  footer,
  onClose,
  wide,
}: {
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
  wide?: boolean
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-wrap" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`}>
        <div className="modal-head">
          <h3>{title}</h3>
          <div className="spacer" />
          <button className="ghost small" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function Drawer({
  title,
  children,
  onClose,
  width,
}: {
  title: ReactNode
  children: ReactNode
  onClose: () => void
  width?: number
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <>
      <div className="scrim" onPointerDown={onClose} />
      <aside className="drawer" style={width ? { width } : undefined}>
        <div className="drawer-head">
          <h3>{title}</h3>
          <div className="spacer" />
          <button className="ghost small" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </>
  )
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts)
  const dismiss = useStore((s) => s.dismissToast)
  useEffect(() => {
    if (!toasts.length) return
    const timers = toasts.map((t) => setTimeout(() => dismiss(t.id), 4200))
    return () => timers.forEach(clearTimeout)
  }, [toasts, dismiss])
  // keep the newest three: a burst of装配 toasts must not bury the panel
  const shown = toasts.slice(-3)
  return (
    <div className="toasts">
      {shown.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`} onPointerDown={() => dismiss(t.id)}>
          <b>{t.title}</b>
          {t.detail && <span>{t.detail}</span>}
        </div>
      ))}
    </div>
  )
}

const LOG_ICON: Record<LogKind, string> = {
  calib: '◎',
  pose: '✎',
  accessory: '⌘',
  submit: '↗',
  review: '✓',
  release: '▣',
  invalidate: '⚠',
  import: '⤓',
  system: '·',
}

export function LogList({ limit }: { limit?: number }) {
  const logs = useStore((s) => s.logs)
  const shown = limit ? logs.slice(0, limit) : logs
  return (
    <div>
      {shown.map((l) => (
        <div className="logline" key={l.id}>
          <div
            className="ico"
            style={{
              color:
                l.kind === 'invalidate'
                  ? 'var(--warn)'
                  : l.kind === 'release'
                    ? 'var(--ok)'
                    : l.kind === 'review'
                      ? 'var(--info)'
                      : 'var(--fg-3)',
            }}
          >
            {LOG_ICON[l.kind]}
          </div>
          <div>
            <div className="t">
              {l.action} <span className="dim">{l.target}</span>
            </div>
            <div className="m">
              {fmtTime(l.at)} · {l.actor}
              {l.detail ? ` · ${l.detail}` : ''}
            </div>
          </div>
        </div>
      ))}
      {!shown.length && <Empty>暂无操作记录</Empty>}
    </div>
  )
}

export function RoleTag({ role }: { role: Role }) {
  const map: Record<Role, string> = { engineer: '结构', prototyper: '原型', qc: '品控' }
  return <Chip>{map[role]}</Chip>
}

export function ArcGauge({
  min,
  max,
  value,
  size = 108,
  lo = 0,
  hi = 0,
  tone,
}: {
  min: number
  max: number
  value: number
  size?: number
  lo?: number
  hi?: number
  tone?: 'ok' | 'warn' | 'bad'
}) {
  const span = Math.max(1e-6, max - min)
  const t = (value - min) / span
  const r = size / 2 - 9
  const cx = size / 2
  const cy = size / 2 + 4
  const start = Math.PI * 0.82
  const end = Math.PI * 2.18
  const arc = end - start
  const pt = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  const [sx, sy] = pt(start)
  const [ex, ey] = pt(end)
  const [vx, vy] = pt(start + arc * Math.max(0, Math.min(1, t)))
  const color = tone === 'bad' ? 'var(--bad)' : tone === 'warn' ? 'var(--warn)' : 'var(--ok)'
  return (
    <svg className="arc" width={size} height={size * 0.78} viewBox={`0 0 ${size} ${size * 0.78}`}>
      <path
        d={`M ${sx} ${sy} A ${r} ${r} 0 1 1 ${ex} ${ey}`}
        fill="none"
        stroke="#232c3a"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d={`M ${sx} ${sy} A ${r} ${r} 0 ${arc * Math.min(1, t) > Math.PI ? 1 : 0} 1 ${vx} ${vy}`}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.9"
      />
      {lo > 0 && (
        <circle cx={pt(start + arc * Math.min(1, lo))[0]} cy={pt(start + arc * Math.min(1, lo))[1]} r="1.8" fill="#5b6a80" />
      )}
      {hi > 0 && (
        <circle cx={pt(start + arc * Math.min(1, hi))[0]} cy={pt(start + arc * Math.min(1, hi))[1]} r="1.8" fill="#5b6a80" />
      )}
      <text x={cx} y={cy - 3} textAnchor="middle" fontSize="15" fill="var(--fg)" fontFamily="var(--mono)">
        {Math.round(value)}°
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="8.5" fill="var(--fg-3)" fontFamily="var(--mono)">
        {min}° / {max}°
      </text>
    </svg>
  )
}
