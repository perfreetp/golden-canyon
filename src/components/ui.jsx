// 通用小组件
import { useEffect, useRef } from 'react'

export function Icon({ name, size = 16 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (name) {
    case 'terrace':
      return (
        <svg {...common}>
          <path d="M3 18h5v-4h5v-4h5V6" />
          <path d="M2 21h20" />
        </svg>
      )
    case 'fishpit':
      return (
        <svg {...common}>
          <path d="M4 8c3 0 3 4 6 4s3-4 6-4 3 4 5 4" />
          <ellipse cx="8" cy="16" rx="2.4" ry="1.6" />
          <ellipse cx="16" cy="17" rx="2.4" ry="1.6" />
        </svg>
      )
    case 'checkdam':
      return (
        <svg {...common}>
          <path d="M4 6l6 12h4L20 6" />
          <path d="M8.5 12h7" />
        </svg>
      )
    case 'ditch':
      return (
        <svg {...common}>
          <path d="M3 14h18" />
          <path d="M6 14l3 4h6l3-4" />
          <path d="M8 7l4 4 4-4" />
        </svg>
      )
    case 'forest':
      return (
        <svg {...common}>
          <path d="M12 21v-7" />
          <path d="M12 14l-4-4h2.4L12 6l1.6 4H16z" />
          <path d="M6 21h12" />
        </svg>
      )
    case 'grass':
      return (
        <svg {...common}>
          <path d="M7 20c0-5-1-7-3-9" />
          <path d="M12 20c0-7 0-9 0-13" />
          <path d="M17 20c0-5 1-7 3-9" />
        </svg>
      )
    case 'draw':
      return (
        <svg {...common}>
          <path d="M4 20l3-1 11-11-2-2L5 17z" />
          <path d="M15 5l4 4" />
        </svg>
      )
    case 'zoom':
      return (
        <svg {...common}>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="M15.5 15.5L21 21" />
        </svg>
      )
    case 'alert':
      return (
        <svg {...common}>
          <path d="M12 3l9.5 17H2.5z" />
          <path d="M12 10v4M12 17.5v.5" />
        </svg>
      )
    default:
      return null
  }
}

export function SlopeBars({ shares, compact }) {
  const labels = ['<5°', '5–15°', '15–25°', '>25°']
  const colors = ['#6d9b68', '#c8b45c', '#cd8948', '#b44f3e']
  return (
    <div className="slope-bars">
      {shares.map((s, i) => (
        <div className="slope-bar-row" key={i} style={compact ? { gridTemplateColumns: '52px 1fr 38px' } : undefined}>
          <span className="label">{labels[i]}</span>
          <span className="slope-bar-track">
            <span className="slope-bar-fill" style={{ width: `${Math.max(0, Math.min(100, s * 100))}%`, background: colors[i] }} />
          </span>
          <span className="pct">{(s * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  )
}

// 横向堆叠条形（用于表格内紧凑显示坡度占比）
export function SlopeStack({ shares, width = 168, showText = true }) {
  const colors = ['#6d9b68', '#c8b45c', '#cd8948', '#b44f3e']
  const safe = shares || [0, 0, 0, 0]
  return (
    <div>
      <div style={{ display: 'flex', height: 9, width, borderRadius: 2, overflow: 'hidden', background: '#ece7db' }}>
        {safe.map((v, i) => (
          <span key={i} style={{ width: `${Math.max(0, v) * 100}%`, background: colors[i] }} title={`${(v * 100).toFixed(1)}%`} />
        ))}
      </div>
      {showText && (
        <div style={{ display: 'flex', justifyContent: 'space-between', width, fontSize: 9.5, color: 'var(--ink-3)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
          {safe.map((v, i) => <span key={i}>{(v * 100).toFixed(0)}%</span>)}
        </div>
      )}
    </div>
  )
}

export function Modal({ open, title, onClose, children, footer, width = 520 }) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} onCancel={(e) => { e.preventDefault(); onClose?.() }} style={{ width }}>
      <div className="modal-head">
        <h3>{title}</h3>
      </div>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-foot">{footer}</div>}
    </dialog>
  )
}

export function Field({ label, unit, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="row">
        {children}
        {unit && <span className="unit">{unit}</span>}
      </div>
    </div>
  )
}

export const fmtM = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '—')
export const fmtArea = (v) => {
  if (!Number.isFinite(v)) return '—'
  if (v >= 10000) return `${(v / 10000).toFixed(2)} hm²`
  return `${v.toFixed(0)} m²`
}
export const fmtNum = (v, d = 0) => (Number.isFinite(v) ? v.toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—')
