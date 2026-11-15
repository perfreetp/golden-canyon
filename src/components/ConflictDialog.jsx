// 措施冲突弹窗：范围重叠、谷坊间距不满足时自动列出
import { useEffect, useRef, useState } from 'react'
import { MEASURE_TYPES } from '../lib/measures.js'

export default function ConflictDialog({ conflicts, onLocate, onDelete, onClose, muted, setMuted, forceOpen }) {
  const ref = useRef(null)
  const [dismissed, setDismissed] = useState(new Set())
  const closeBtn = () => onClose?.()
  const ids = conflicts.map((c) => c.id)
  const prevIds = useRef(null)
  const prevOpen = useRef(false)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (prevIds.current === null) {
      prevIds.current = ids
      return
    }
    const before = new Set(prevIds.current)
    const fresh = ids.filter((id) => !before.has(id))
    // 仅在新增冲突时弹窗；处理掉冲突不弹
    if (fresh.length && ids.length > prevIds.current.length && !muted) {
      setDismissed(new Set())
      if (!d.open) d.showModal()
    }
    if (!ids.length && d.open) d.close()
    prevIds.current = ids
  }, [ids.join('|'), muted])

  // 外部强制打开（如提交被拦截时）
  useEffect(() => {
    const d = ref.current
    if (!d || !forceOpen) return
    setDismissed(new Set())
    if (!d.open) d.showModal()
  }, [forceOpen])

  const visible = conflicts.filter((c) => !dismissed.has(c.id))

  return (
    <dialog
      ref={ref}
      className="conflict"
      onCancel={(e) => { e.preventDefault(); onClose?.() }}
      style={{ width: 560 }}
    >
      <div className="modal-head" style={{ background: '#f7e9e5', borderBottomColor: '#e8c3ba' }}>
        <h3 style={{ color: '#8c2c20' }}>检测到 {visible.length} 项措施冲突</h3>
      </div>
      <div className="modal-body" style={{ maxHeight: '58vh', overflowY: 'auto' }}>
        <p className="tiny-note" style={{ marginTop: 0, marginBottom: 10 }}>
          以下措施范围相互重叠或谷坊间距不满足回水衔接要求，请逐项处理后再提交复核。
        </p>
        {visible.map((c) => (
          <div className="msg error" key={c.id} style={{ alignItems: 'center' }}>
            <div className="grow">
              <div className="title">{c.title}</div>
              {c.message}
              <div style={{ marginTop: 5, display: 'flex', gap: 10 }}>
                {c.measureId && <button className="link-btn" onClick={() => onLocate(c.measureId)}>定位到「{MEASURE_TYPES[c.type1 || '']?.short || '措施'}1」</button>}
                {c.measureId2 && <button className="link-btn" onClick={() => onLocate(c.measureId2)}>定位到另一措施</button>}
              </div>
            </div>
            {c.measureId2 && (
              <button
                className="act"
                onClick={() => {
                  onDelete(c.measureId2)
                  setDismissed((s) => new Set([...s, c.id]))
                }}
              >
                删除后者
              </button>
            )}
          </div>
        ))}
        {!visible.length && <div className="tiny-note">冲突已全部处理。</div>}
      </div>
      <div className="modal-foot" style={{ justifyContent: 'space-between' }}>
        <label style={{ fontSize: 11, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" className="check" checked={muted} onChange={(e) => setMuted(e.target.checked)} />
          不再自动弹出（可在校核页查看）
        </label>
        <button className="btn primary" onClick={closeBtn}>知道了</button>
      </div>
    </dialog>
  )
}
