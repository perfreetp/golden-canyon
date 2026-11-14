import { resetAll, setRole, state } from './store/store';
import type { Role } from './types';
import { AnimatorView } from './views/AnimatorView';
import { PlannerView } from './views/PlannerView';
import { ReviewerView } from './views/ReviewerView';
import { StudentView } from './views/StudentView';
import { OpsView } from './views/OpsView';

const ROLES: { id: Role; label: string; icon: string; desc: string }[] = [
  { id: 'animator', label: '动画师工作台', icon: '🦴', desc: '拆件绑定 · 关键帧 · 导出' },
  { id: 'planner', label: '课程策划后台', icon: '📚', desc: '动作组合成课' },
  { id: 'reviewer', label: '审查台', icon: '⚖️', desc: '逐条驳回 / 通过' },
  { id: 'student', label: '学员端', icon: '🧘', desc: '周计划播放与反馈' },
  { id: 'ops', label: '运营看板', icon: '📊', desc: '完课率 · 退出点 · 复练率' },
];

export function App() {
  return (
    <div class="app">
      <header class="app-header">
        <div class="brand">
          <span class="brand-seal">岐黄</span>
          <div>
            <h1>中医导引课程动画制作与治未病中心运营系统</h1>
            <small>Daoyin Animation Studio · Preventive Treatment Center</small>
          </div>
        </div>
        <div class="role-switch">
          {ROLES.map(r => (
            <button
              class="role-btn"
              classList={{ active: state.role === r.id }}
              title={r.desc}
              onClick={() => setRole(r.id)}
            >
              <span class="role-icon">{r.icon}</span>{r.label}
            </button>
          ))}
          <button class="btn-mini reset" onClick={() => {
            if (confirm('重置全部数据为演示种子？')) resetAll();
          }}>重置演示数据</button>
        </div>
      </header>

      <main class="app-main">
        {state.role === 'animator' && <AnimatorView />}
        {state.role === 'planner' && <PlannerView />}
        {state.role === 'reviewer' && <ReviewerView />}
        {state.role === 'student' && <StudentView />}
        {state.role === 'ops' && <OpsView />}
      </main>
    </div>
  );
}
