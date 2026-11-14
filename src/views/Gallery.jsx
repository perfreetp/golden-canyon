import { useState } from 'react'
import { useStore, userName } from '../lib/store.jsx'
import { LAYERS } from '../lib/data.js'

const hex = (n) => '#' + n.toString(16).padStart(6, '0')

export default function Gallery() {
  const { series, state, dispatch } = useStore()
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [toast, setToast] = useState('')

  const doImport = () => {
    setImporting(true)
    setProgress(0)
    const timer = setInterval(() => {
      setProgress((p) => {
        const next = p + Math.floor(8 + Math.random() * 16)
        if (next >= 100) {
          clearInterval(timer)
          setTimeout(() => {
            setImporting(false)
            dispatch({
              type: 'IMPORT_SERIES',
              seriesName: series.name,
              sliceCount: series.sliceCount
            })
            setToast('断层序列导入完成，五类图层已自动组织')
            setTimeout(() => setToast(''), 2600)
          }, 350)
          return 100
        }
        return next
      })
    }, 140)
  }

  const total = series.structures.length

  return (
    <div>
      <div className="section-title">断层序列导入台</div>
      <div className="layout-2">
        <div className="stack">
          <div className="panel">
            <div className="panel-title">序列信息</div>
            <div className="kv"><span>序列名称</span><code>{series.name}</code></div>
            <div className="kv"><span>成像模态</span><code>{series.modality}</code></div>
            <div className="kv"><span>断层数量</span><code>{series.sliceCount} 层（轴位，层厚 {series.sliceThickness}mm）</code></div>
            <div className="kv"><span>世界画布</span><code>{series.worldSize} × {series.worldSize}</code></div>
            <div className="kv"><span>导入状态</span>
              <code>{state.seriesImported ? `已导入 · ${state.importedAt}` : '未导入'}</code>
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="tool-btn primary" disabled={importing} onClick={doImport}>
                {importing ? `正在解析 DICOM… ${progress}%` : state.seriesImported ? '重新导入断层序列' : '导入断层序列（模拟 DICOM 上传）'}
              </button>
              {importing && (
                <div className="bar"><i style={{ width: `${progress}%` }} /></div>
              )}
              <button
                className="tool-btn danger"
                onClick={() => { dispatch({ type: 'RESET_DEMO' }); setToast('演示数据已重置'); setTimeout(() => setToast(''), 2200) }}
              >
                重置全部演示数据（任务/答卷/日志）
              </button>
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">图层组织规则</div>
            {LAYERS.map((l) => (
              <div key={l.id} className="layer-row">
                <span className="layer-dot" style={{ background: hex(l.color) }} />
                <div className="layer-info">
                  <div className="layer-name">{l.name}</div>
                  <div className="layer-desc">{l.desc}</div>
                </div>
                <span className="layer-count">{series.countByLayer[l.id]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="stack">
          <div className="stat-grid">
            <div className="stat-card accent"><div className="num">{series.sliceCount}</div><div className="lbl">断层层数</div></div>
            <div className="stat-card green"><div className="num">{total.toLocaleString()}</div><div className="lbl">标注要素总数</div></div>
            <div className="stat-card purple"><div className="num">{(total / series.sliceCount).toFixed(0)}</div><div className="lbl">平均每层要素</div></div>
            <div className="stat-card yellow"><div className="num">5</div><div className="lbl">独立图层</div></div>
          </div>

          <div className="panel">
            <div className="panel-title">各图层要素分布</div>
            {LAYERS.map((l) => {
              const n = series.countByLayer[l.id]
              return (
                <div key={l.id} style={{ marginBottom: 12 }}>
                  <div className="metric-row">
                    <span>{l.name}</span>
                    <b>{n} 个 · {((n / total) * 100).toFixed(1)}%</b>
                  </div>
                  <div className="bar">
                    <i style={{ width: `${(n / total) * 100}%`, background: hex(l.color) }} />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="panel">
            <div className="panel-title">操作审计（最近 {Math.min(state.audit.length, 30)} 条）</div>
            {state.audit.length === 0 && <div className="empty-tip">暂无操作记录，导入序列或发布任务后将自动留痕</div>}
            <div className="timeline">
              {state.audit.slice(0, 30).map((a, i) => (
                <div key={i} className="tl-item">
                  <div className="tl-at">{a.at} · {userName(a.by)}</div>
                  <div className="tl-act">{a.action}</div>
                  <div className="tl-detail">{a.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
