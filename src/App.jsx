import { useMemo, useState } from 'react';
import { useSnowOps } from './hooks/useSnowOps.js';
import { Icon, StatusPill, ToastStack, useToasts } from './components/ui.jsx';
import { DesignModule } from './modules/DesignModule.jsx';
import { GunModule } from './modules/GunModule.jsx';
import { ReviewModule } from './modules/ReviewModule.jsx';
import { DashboardModule } from './modules/DashboardModule.jsx';

const TABS = [
  { id: 'design', label: '雪道设计', idx: '01', icon: 'layers' },
  { id: 'guns', label: '造雪布点', idx: '02', icon: 'snow' },
  { id: 'review', label: '安全审核', idx: '03', icon: 'check' },
  { id: 'dashboard', label: '运营看板', idx: '04', icon: 'chart' },
];

export default function App() {
  const ops = useSnowOps();
  const { toasts, push } = useToasts();
  const [tab, setTab] = useState('design');

  const reviewCount = ops.trails.filter((t) => t.status === 'review').length;
  const openCount = ops.trails.filter((t) => t.status === 'open').length;
  const conflictCount = ops.conflicts.length;

  const selectedTrail = useMemo(
    () => ops.trails.find((t) => t.id === ops.selectedTrailId) || ops.trails[0],
    [ops.trails, ops.selectedTrailId],
  );

  const common = { ops, push, selectedTrail };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Icon name="mountain" size={18} />
          </div>
          <div>
            <div className="brand-name">北岭雪场 · 雪道设计与运营审批</div>
            <div className="brand-sub">North Ridge Snow Ops</div>
          </div>
        </div>

        <nav className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span className="idx">{t.idx}</span>
              {t.label}
              {t.id === 'review' && reviewCount > 0 ? <span className="tab-dot" title={`${reviewCount} 条待审核`} /> : null}
            </button>
          ))}
        </nav>

        <div className="topbar-right">
          <div className="meta">
            <span className="meta-k">开放 / 待审 / 冲突</span>
            <span className="meta-v">
              {openCount} · {reviewCount} · {conflictCount}
            </span>
          </div>
          <div className="meta">
            <span className="meta-k">雪季</span>
            <span className="meta-v">2026–27</span>
          </div>
          <div className="user-chip">
            <span className="avatar">陈</span>
            <span style={{ fontSize: 11.5, color: 'var(--text-2)' }}>规划组 · 陈岚</span>
          </div>
        </div>
      </header>

      {tab === 'design' ? <DesignModule {...common} /> : null}
      {tab === 'guns' ? <GunModule {...common} /> : null}
      {tab === 'review' ? <ReviewModule {...common} /> : null}
      {tab === 'dashboard' ? <DashboardModule {...common} /> : null}

      <ToastStack toasts={toasts} />
    </div>
  );
}

export { StatusPill };
