import { useStore, USERS } from '../lib/store.jsx'

const ROLE_LABEL = { secretary: '教学秘书', teacher: '教师', student: '学员' }

const NAV = [
  { role: 'secretary', items: [['gallery', '序列导入台'], ['reports', '成绩与归档']] },
  { role: 'teacher', items: [['workbench', '命题工作台'], ['review', '复核中心'], ['reports', '成绩分析']] },
  { role: 'student', items: [['anatomy', '断层学习'], ['exam', '考核任务']] }
]

export default function AppHeader({ view, setView }) {
  const { state, dispatch } = useStore()
  const nav = NAV.find((n) => n.role === state.user.role)
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark">🧠</span>
        <div>
          <div className="brand-title">神经影像断层解剖分层标注与考核平台</div>
          <div className="brand-sub">分层标注 · LOD 渲染 · 套索命题 · 自动评分</div>
        </div>
      </div>
      <nav className="main-nav">
        {nav.items.map(([id, label]) => (
          <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>{label}</button>
        ))}
      </nav>
      <div className="user-box">
        <select
          value={state.user.id}
          onChange={(e) => {
            const u = USERS.find((x) => x.id === e.target.value)
            dispatch({ type: 'SET_USER', user: u })
            const first = NAV.find((n) => n.role === u.role).items[0][0]
            setView(first)
          }}
        >
          {Object.entries(ROLE_LABEL).map(([role, rl]) => (
            <optgroup key={role} label={rl}>
              {USERS.filter((u) => u.role === role).map((u) => (
                <option key={u.id} value={u.id}>{u.name}{u.group ? `（${u.group} 组）` : ''}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <span className="role-tag">{ROLE_LABEL[state.user.role]}</span>
      </div>
    </header>
  )
}
