import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Boxes,
  Check,
  ClipboardCheck,
  ClipboardList,
  Gamepad2,
  LayoutGrid,
  Lock,
  MonitorPlay,
  Sparkles,
  X,
} from 'lucide-react';
import { useApp, canSeeOps, canReview } from './store';
import { ROLES } from './data/people';
import type { PageKey, Role } from './types';
import { LayoutPage } from './pages/LayoutPage';
import { ContentPage } from './pages/ContentPage';
import { ReviewPage } from './pages/ReviewPage';
import { RecordsPage } from './pages/RecordsPage';
import { BomPage } from './pages/BomPage';
import { OpsPage } from './pages/OpsPage';
import { PatientPage } from './pages/PatientPage';
import { Toasts } from './components/UI';

const NAV: { key: PageKey; label: string; icon: React.ReactNode; group: string; roles: Role[] }[] = [
  { key: 'layout', label: '展项布置', icon: <LayoutGrid size={16} />, group: '设计与配置', roles: ['therapist', 'reviewer', 'supervisor'] },
  { key: 'content', label: '内容配置', icon: <Gamepad2 size={16} />, group: '设计与配置', roles: ['therapist', 'reviewer', 'supervisor'] },
  { key: 'review', label: '发布审查', icon: <ClipboardCheck size={16} />, group: '发布与开放', roles: ['therapist', 'reviewer', 'supervisor'] },
  { key: 'patient', label: '患者训练端', icon: <MonitorPlay size={16} />, group: '发布与开放', roles: ['therapist', 'reviewer', 'supervisor', 'patient'] },
  { key: 'records', label: '训练记录', icon: <ClipboardList size={16} />, group: '运营分析', roles: ['therapist', 'reviewer', 'supervisor'] },
  { key: 'ops', label: '运营看板', icon: <BarChart3 size={16} />, group: '运营分析', roles: ['reviewer', 'supervisor'] },
  { key: 'bom', label: '物料清单', icon: <Boxes size={16} />, group: '交付', roles: ['therapist', 'reviewer', 'supervisor'] },
];

const PAGE_META: Record<PageKey, { title: string; sub: string }> = {
  layout: { title: '展项布置', sub: '在康复大厅平面图上摆放、旋转、缩放进互动训练展项' },
  content: { title: '内容配置', sub: '为展项绑定训练小游戏，设定达标阈值与开放条件' },
  review: { title: '发布审查', sub: '展项经审核通过后才会在患者端开放，退回须写明原因' },
  patient: { title: '患者训练端', sub: '大厅大屏轮播已发布展项，训练满设定时长生成小结' },
  records: { title: '训练记录', sub: '按患者、展项、日期汇总达标率与完成场次' },
  ops: { title: '运营看板', sub: '各展项使用率、排队情况与承重分区负载' },
  bom: { title: '物料清单', sub: '设备数量、屏幕尺寸、线缆长度估算与安装点位坐标' },
};

export default function App() {
  const role = useApp((s) => s.role);
  const setRole = useApp((s) => s.setRole);
  const toasts = useApp((s) => s.toasts);
  const dismissToast = useApp((s) => s.dismissToast);
  const devices = useApp((s) => s.devices);
  const [page, setPage] = useState<PageKey>('layout');
  const [rolePanelOpen, setRolePanelOpen] = useState(false);

  const pendingCount = devices.filter((d) => d.status === 'pending').length;
  const profile = ROLES.find((r) => r.id === role)!;

  const visibleNav = useMemo(() => NAV.filter((n) => n.roles.includes(role)), [role]);

  const allowed = visibleNav.some((n) => n.key === page);
  const current = allowed ? page : (visibleNav[0]?.key ?? 'patient');

  const grouped = useMemo(() => {
    const g: Record<string, typeof NAV> = {};
    for (const n of visibleNav) {
      g[n.group] = g[n.group] ?? [];
      g[n.group].push(n);
    }
    return g;
  }, [visibleNav]);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">童</div>
          <div>
            <div className="brand-name">童行 · 康复大厅</div>
            <div className="brand-sub">Rehab Hall Studio</div>
          </div>
        </div>

        <div className="role-switch">
          <div className="role-switch-label">当前身份 · 切换视图</div>
          {ROLES.map((r) => (
            <button
              key={r.id}
              className={`role-chip ${r.id === role ? 'active' : ''}`}
              onClick={() => {
                setRole(r.id);
                setRolePanelOpen(false);
                if (!NAV.find((n) => n.key === page)?.roles.includes(r.id)) {
                  setPage(r.id === 'patient' ? 'patient' : r.id === 'supervisor' ? 'ops' : 'layout');
                }
              }}
            >
              <span className="role-dot" style={{ background: r.color }} />
              {r.label}
              {r.id === role && <Check size={12} style={{ marginLeft: 'auto', opacity: 0.8 }} />}
            </button>
          ))}
        </div>

        {Object.entries(grouped).map(([group, items]) => (
          <div key={group}>
            <div className="nav-group-label">{group}</div>
            {items.map((n) => (
              <button
                key={n.key}
                className={`nav-item ${current === n.key ? 'active' : ''}`}
                onClick={() => setPage(n.key)}
              >
                {n.icon}
                {n.label}
                {n.key === 'review' && pendingCount > 0 && <span className="badge">{pendingCount}</span>}
              </button>
            ))}
          </div>
        ))}

        <div className="sidebar-foot">
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <Sparkles size={11} /> 演示环境 · 数据保存在本地会话
          </div>
          大厅净尺寸 24×16m · 5 个承重分区
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="page-title">{PAGE_META[current].title}</div>
            <div className="page-sub">{PAGE_META[current].sub}</div>
          </div>
          <div className="topbar-spacer" />
          <button
            onClick={() => setRolePanelOpen((v) => !v)}
            className="role-pill"
            style={{ cursor: 'pointer', position: 'relative' }}
          >
            <span className="role-avatar" style={{ background: profile.color }}>
              {profile.person.slice(0, 1)}
            </span>
            <span style={{ textAlign: 'left' }}>
              <span style={{ display: 'block', fontWeight: 650, lineHeight: 1.25 }}>{profile.person}</span>
              <span style={{ display: 'block', fontSize: 10.5, color: '#7b8f8a' }}>{profile.label} · 演示切换</span>
            </span>
          </button>
          {rolePanelOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setRolePanelOpen(false)} />
              <div
                className="card"
                style={{
                  position: 'absolute',
                  right: 20,
                  top: 56,
                  width: 320,
                  zIndex: 10,
                  padding: 14,
                  boxShadow: '0 18px 48px rgba(11,43,39,.18)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                  <b style={{ fontSize: 12.5 }}>切换身份视图</b>
                  <button className="icon-btn" style={{ marginLeft: 'auto' }} onClick={() => setRolePanelOpen(false)}>
                    <X size={14} />
                  </button>
                </div>
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setRole(r.id);
                      setRolePanelOpen(false);
                      if (!NAV.find((n) => n.key === page)?.roles.includes(r.id)) {
                        setPage(r.id === 'patient' ? 'patient' : r.id === 'supervisor' ? 'ops' : 'layout');
                      }
                    }}
                    style={{
                      display: 'flex',
                      gap: 10,
                      width: '100%',
                      textAlign: 'left',
                      padding: '9px 9px',
                      borderRadius: 9,
                      background: r.id === role ? '#f0faf7' : 'transparent',
                      border: r.id === role ? '1px solid #c9f0e4' : '1px solid transparent',
                      marginBottom: 3,
                    }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: r.color,
                        color: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 11.5,
                        fontWeight: 700,
                        flex: '0 0 auto',
                      }}
                    >
                      {r.person.slice(0, 1)}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 12.2, fontWeight: 650 }}>
                        {r.label} · {r.person}
                      </span>
                      <span style={{ display: 'block', fontSize: 10.5, color: '#7b8f8a', lineHeight: 1.5, marginTop: 2 }}>
                        {r.desc}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </header>

        <div className="page-body" style={{ padding: current === 'layout' || current === 'patient' ? 14 : 18 }}>
          {!allowed && (
            <div className="card" style={{ marginBottom: 12, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#b45309', background: '#fffbeb', borderColor: '#fde68a' }}>
              <Lock size={14} /> 当前身份无「{PAGE_META[page].title}」访问权限，已跳转至可访问页面。
            </div>
          )}
          {current === 'layout' && <LayoutPage role={role} />}
          {current === 'content' && <ContentPage role={role} />}
          {current === 'review' && <ReviewPage role={role} />}
          {current === 'patient' && <PatientPage role={role} />}
          {current === 'records' && <RecordsPage role={role} />}
          {current === 'ops' && <OpsPage role={role} />}
          {current === 'bom' && <BomPage role={role} />}
        </div>
      </main>

      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export { canReview, canSeeOps };
