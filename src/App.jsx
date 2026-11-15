import { useCallback, useEffect, useMemo, useState } from 'react'
import { useProject, ROLES } from './state/store.js'
import Designer from './components/Designer.jsx'
import Reviewer from './components/Reviewer.jsx'
import Manager from './components/Manager.jsx'
import { Modal } from './components/ui.jsx'

const STATUS_LABEL = {
  draft: { text: '编制中', color: '#b8791f' },
  pending: { text: '待复核', color: '#b8791f' },
  returned: { text: '已退回', color: '#b83a2b' },
  approved: { text: '已通过', color: '#3f7a4c' },
}

export default function App() {
  const { state, loading, error, dem, ctx, measures, validation, api } = useProject()
  const [role, setRole] = useState('designer')
  const [toasts, setToasts] = useState([])
  const [resetOpen, setResetOpen] = useState(false)

  const notify = useCallback((message, kind = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setToasts((t) => [...t, { id, message, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 5200 : 3200)
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--ink-3)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, marginBottom: 6 }}>正在生成坡度栅格…</div>
          <div style={{ fontSize: 12 }}>由测绘等高线重建 DEM 并计算坡度分级</div>
        </div>
      </div>
    )
  }
  if (error || !state) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--danger)' }}>
        <div>加载失败：{error || '未知错误'}</div>
      </div>
    )
  }

  const status = STATUS_LABEL[state.status] || STATUS_LABEL.draft
  const pendingCount = (state.versions || []).filter((v) => v.status === 'pending').length

  return (
    <>
      <div className="topbar">
        <div className="brand">
          <div className="brand-mark">坡</div>
          <div className="brand-text">
            <h1>山区小流域坡面治理措施布设与工程量核算系统</h1>
            <p>{state.county} · {state.name}</p>
          </div>
        </div>
        <div className="top-meta">
          <span>方案状态 <b style={{ color: status.color }}>{status.text}</b></span>
          <span>版本 <b>v{state.versions?.length || 0}</b></span>
          {pendingCount > 0 && <span style={{ color: '#f0c070' }}>● {pendingCount} 版待复核</span>}
        </div>
        <div className="top-right">
          <button className="btn sm" style={{ background: 'transparent', color: '#cfe0d4', borderColor: 'rgba(255,255,255,0.2)' }} onClick={() => setResetOpen(true)}>
            重置演示数据
          </button>
          <div className="role-switch">
            {ROLES.map((r) => (
              <button key={r.id} className={role === r.id ? 'active' : ''} onClick={() => setRole(r.id)} title={r.desc}>
                {r.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {role === 'designer' && (
        <Designer
          project={state}
          dem={dem}
          ctx={ctx}
          measures={measures}
          validation={validation}
          api={api}
          notify={notify}
        />
      )}
      {role === 'reviewer' && (
        <Reviewer
          project={state}
          dem={dem}
          measures={measures}
          patches={state.patches}
          api={api}
          notify={notify}
          currentRole={role}
          ctx={ctx}
        />
      )}
      {role === 'manager' && (
        <Manager
          project={state}
          dem={dem}
          ctx={ctx}
          measures={measures}
          validation={validation}
          notify={notify}
          api={api}
        />
      )}

      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind === 'error' ? 'error' : t.kind === 'warn' ? 'warn' : ''}`}>{t.message}</div>
        ))}
      </div>

      <Modal
        open={resetOpen}
        title="重置演示数据"
        onClose={() => setResetOpen(false)}
        footer={
          <>
            <button className="btn" onClick={() => setResetOpen(false)}>取消</button>
            <button
              className="btn danger"
              onClick={async () => {
                await api.resetDemo()
                setResetOpen(false)
                notify('演示数据已重置', 'ok')
              }}
            >
              确认重置
            </button>
          </>
        }
      >
        <div className="msg warn">
          <div className="grow">将清空本地保存的所有勾绘、措施、版本与复核意见，恢复到初始演示方案。</div>
        </div>
      </Modal>
    </>
  )
}
