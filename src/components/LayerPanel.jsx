import { LAYERS } from '../lib/data.js'

const hex = (n) => '#' + n.toString(16).padStart(6, '0')

export default function LayerPanel({ visibility, onToggle, counts, disabled = false, hint }) {
  return (
    <div className="panel">
      <div className="panel-title">
        图层组织（五类）
        {hint && <span className="panel-hint">{hint}</span>}
      </div>
      {LAYERS.map((l) => {
        const on = visibility[l.id]
        return (
          <div key={l.id} className={`layer-row ${on ? '' : 'off'} ${disabled ? 'locked' : ''}`}>
            <label className="switch">
              <input type="checkbox" checked={on} disabled={disabled}
                onChange={() => !disabled && onToggle(l.id)} />
              <span className="slider" style={{ background: on ? hex(l.color) : undefined }} />
            </label>
            <span className="layer-dot" style={{ background: hex(l.color) }} />
            <div className="layer-info">
              <div className="layer-name">{l.name}</div>
              <div className="layer-desc">{l.desc}</div>
            </div>
            <span className="layer-count">{counts?.[l.id] ?? '—'}</span>
          </div>
        )
      })}
      {disabled && <div className="lock-note">🔒 考核答题中，图层已按题干要求锁定</div>}
    </div>
  )
}
