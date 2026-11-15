import { useEffect, useRef } from 'react'
import { USERS, useStore, type PageKey } from './store'
import { Chip, Drawer, LogList, Toasts } from './components/ui'
import HomePage from './pages/HomePage'
import ModelPage from './pages/ModelPage'
import BenchPage from './pages/BenchPage'
import AccessoriesPage from './pages/AccessoriesPage'
import TasksPage from './pages/TasksPage'
import ReportsPage from './pages/ReportsPage'

const NAV: { key: PageKey; label: string; icon: string }[] = [
  { key: 'home', label: '校核总览', icon: '▤' },
  { key: 'model', label: '模型关节配置', icon: '◎' },
  { key: 'bench', label: '姿势测试台', icon: '⤢' },
  { key: 'accessories', label: '配件库', icon: '⌘' },
  { key: 'tasks', label: '校核任务', icon: '⌸' },
  { key: 'reports', label: '放行报告', icon: '▣' },
]

const TITLES: Record<PageKey, { title: string; crumb: string }> = {
  home: { title: '校核总览', crumb: 'DASHBOARD' },
  model: { title: '模型关节配置', crumb: 'JOINT CALIBRATION' },
  bench: { title: '姿势测试台', crumb: 'POSE BENCH' },
  accessories: { title: '配件库', crumb: 'ACCESSORY LIBRARY' },
  tasks: { title: '校核任务', crumb: 'CHECK TASKS' },
  reports: { title: '放行报告', crumb: 'RELEASE REPORTS' },
}

export default function App() {
  const page = useStore((s) => s.page)
  const go = useStore((s) => s.go)
  const role = useStore((s) => s.role)
  const setRole = useStore((s) => s.setRole)
  const model = useStore((s) => s.model)
  const tasks = useStore((s) => s.tasks)
  const showLog = useStore((s) => s.showLog)
  const toggleLog = useStore((s) => s.toggleLog)

  const pending = tasks.filter((t) => t.status === 'pending').length
  const user = USERS[role]

  // In-app navigation writes the URL hash; back/forward and deep links read it.
  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    const h = window.location.hash.replace(/^#\/?/, '')
    const hit = NAV.find((n) => n.key === h)
    if (hit && hit.key !== useStore.getState().page) go(hit.key)
  }, [page, go])

  useEffect(() => {
    const apply = () => {
      const h = window.location.hash.replace(/^#\/?/, '')
      const hit = NAV.find((n) => n.key === h)
      if (hit && hit.key !== useStore.getState().page) go(hit.key)
    }
    window.addEventListener('hashchange', apply)
    return () => window.removeEventListener('hashchange', apply)
  }, [go])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key >= '1' && e.key <= '6') {
        e.preventDefault()
        go(NAV[Number(e.key) - 1].key)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="mark">
            <span className="glyph">J</span>
            <span>关节校核台</span>
          </div>
          <div className="sub">FIGURE JOINT QA</div>
        </div>
        <nav className="nav">
          {NAV.slice(0, 5).map((n, i) => (
            <button
              key={n.key}
              className={page === n.key ? 'active' : ''}
              onClick={() => go(n.key)}
              title={`Alt+${i + 1}`}
            >
              <span className="nic">{n.icon}</span>
              {n.label}
              {n.key === 'tasks' && pending > 0 && <span className="badge-count">{pending}</span>}
            </button>
          ))}
          <div className="nav-sep">交付</div>
          {NAV.slice(5).map((n) => (
            <button
              key={n.key}
              className={page === n.key ? 'active' : ''}
              onClick={() => go(n.key)}
            >
              <span className="nic">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="model-chip">
            <b>{model.name}</b>
            <div className="mono tiny">
              {model.code} · {model.version} · {model.scale}
            </div>
            <div className="tiny" style={{ marginTop: 4 }}>
              <Chip tone={model.status === 'configured' ? 'ok' : 'warn'}>
                {model.status === 'configured' ? '关节已标定' : '标定未完成'}
              </Chip>
            </div>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <h1>{TITLES[page].title}</h1>
          <span className="crumb">{TITLES[page].crumb}</span>
          <div className="spacer" />
          <div className="role-switch">
            {(['engineer', 'prototyper', 'qc'] as const).map((r) => (
              <button
                key={r}
                className={role === r ? 'active' : ''}
                onClick={() => setRole(r)}
              >
                {USERS[r].title}
              </button>
            ))}
          </div>
          <button className="ghost icon small" onClick={() => toggleLog(true)} title="操作日志">
            ⧉ <span className="tiny">操作日志</span>
          </button>
          <div className="who">
            <div className="avatar">{user.initials}</div>
            <div className="meta">
              <b>{user.name}</b>
              <span>{user.title}</span>
            </div>
          </div>
        </header>

        <main className="content">
          {page === 'home' && <HomePage />}
          {page === 'model' && <ModelPage />}
          {page === 'bench' && <BenchPage />}
          {page === 'accessories' && <AccessoriesPage />}
          {page === 'tasks' && <TasksPage />}
          {page === 'reports' && <ReportsPage />}
        </main>
      </div>

      <Toasts />
      {showLog && (
        <Drawer title="操作日志 · 全量留痕" onClose={() => toggleLog(false)} width={520}>
          <div className="section-note">
            所有状态变动均记录操作人、身份与时间戳，不可编辑。
          </div>
          <LogList />
        </Drawer>
      )}
    </div>
  )
}
