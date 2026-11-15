<script>
  import './app.css';
  import { onMount } from 'svelte';
  import { db, session, setView } from './lib/store.js';
  import { courseStats } from './lib/grading.js';

  import Dashboard from './views/InstructorDashboard.svelte';
  import CourseBuilder from './views/CourseBuilder.svelte';
  import ReviewDesk from './views/ReviewDesk.svelte';
  import StudentTraining from './views/StudentTraining.svelte';
  import StudentResult from './views/StudentResult.svelte';
  import Reports from './views/Reports.svelte';
  import AdminConsole from './views/AdminConsole.svelte';

  const NAV = [
    { group: '讲师端', items: [
      { id: 'dashboard', label: '课程总览', icon: 'grid', hint: '课程 · 进度 · 待复核' },
      { id: 'builder', label: '出题建课', icon: 'layers', hint: '导联组合与布点要求' },
      { id: 'review', label: '人工复核', icon: 'check', hint: '改分与评语' },
    ]},
    { group: '学员端', items: [
      { id: 'train', label: '布点实训', icon: 'target', hint: '三维头模操作' },
      { id: 'result', label: '成绩与错题', icon: 'doc', hint: '扣分明细 · 回放' },
    ]},
    { group: '数据', items: [
      { id: 'reports', label: '结课报表', icon: 'chart', hint: '成绩表 · 高错导联' },
      { id: 'admin', label: '后台维护', icon: 'cog', hint: '分区词典 · 题库 · 名单' },
    ]},
  ];

  let today = $state('');
  onMount(() => {
    today = new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', weekday: 'short' });
    const onKey = (e) => {
      if (e.key === 'Escape') {
        // 交给各视图自行处理
        window.dispatchEvent(new CustomEvent('eeg:escape'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const VIEW_TITLES = {
    dashboard: ['课程总览', '培训班课程进度、待复核队列与结课指标'],
    builder: ['出题建课', '配置导联组合、布点要求与判分权重'],
    review: ['人工复核', '逐项核对自动判分结果，改分并填写评语'],
    train: ['布点实训', '在三维头模上完成电极布点与对称核对'],
    result: ['成绩与错题', '查看扣分明细、错误回放与改进建议'],
    reports: ['结课报表', '导出成绩表与错误率最高的导联点'],
    admin: ['后台维护', '分区词典、题库与班级名单'],
  };

  let sessionState = $state({ view: 'dashboard', role: 'instructor' });
  session.subscribe((s) => { sessionState = s; });

  let dbState = $state({});
  db.subscribe((v) => { dbState = v; });

  const pendingCount = $derived.by(() => {
    const subs = dbState.submissions || [];
    const st = dbState.courses?.[0]?.status;
    return subs.filter((s) => s.status === 'pending').length;
  });

  const currentCourse = $derived((dbState.courses || []).find((c) => c.id === sessionState.courseId) || dbState.courses?.[0]);

  function go(view) {
    setView(view);
  }
</script>

<div class="shell">
  <aside class="sidebar">
    <div class="brand">
      <div class="logo">
        <svg viewBox="0 0 32 32" width="26" height="26">
          <circle cx="16" cy="16" r="14.2" fill="none" stroke="#2a3d49" stroke-width="1.4"/>
          <circle cx="16" cy="16" r="9.3" fill="none" stroke="#38d3bd" stroke-width="1.6" opacity=".85"/>
          <circle cx="16" cy="16" r="3.1" fill="#f0bd68"/>
          <circle cx="16" cy="6.4" r="1.5" fill="#38d3bd"/>
          <circle cx="25.3" cy="21" r="1.5" fill="#38d3bd"/>
          <circle cx="6.7" cy="21" r="1.5" fill="#38d3bd"/>
        </svg>
      </div>
      <div class="brand-txt">
        <b>头皮电极布点实训</b>
        <span>10-20 SYSTEM · TRAINER</span>
      </div>
    </div>

    <div class="role-switch">
      <button class:on={sessionState.role === 'instructor'} onclick={() => { session.update(s => ({ ...s, role: 'instructor' })); }}>
        讲师端
      </button>
      <button class:on={sessionState.role === 'student'} onclick={() => { session.update(s => ({ ...s, role: 'student' })); }}>
        学员端
      </button>
    </div>

    <nav class="nav">
      {#each NAV as g}
        <div class="nav-group">
          <div class="eyebrow">{g.group}</div>
          {#each g.items as item}
            <button
              class="nav-item"
              class:active={sessionState.view === item.id}
              onclick={() => go(item.id)}
              title={item.hint}
            >
              <span class="ni">{#if item.icon === 'grid'}▦{:else if item.icon === 'layers'}▤{:else if item.icon === 'check'}✓{:else if item.icon === 'target'}◎{:else if item.icon === 'doc'}▧{:else if item.icon === 'chart'}▥{:else}⚙{/if}</span>
              <span class="nt">{item.label}</span>
              {#if item.id === 'review' && pendingCount}
                <span class="badge">{pendingCount}</span>
              {/if}
            </button>
          {/each}
        </div>
      {/each}
    </nav>

    <div class="side-foot">
      <div class="course-mini">
        <div class="eyebrow">当前课程</div>
        <b>{currentCourse?.title || '—'}</b>
        <span>{currentCourse?.code} · {currentCourse?.term}</span>
      </div>
      <div class="foot-row">
        <span class="dot"></span> 本地数据 · 已自动保存
      </div>
    </div>
  </aside>

  <main class="main">
    <header class="topbar">
      <div class="tb-left">
        <h1>{VIEW_TITLES[sessionState.view]?.[0]}</h1>
        <span class="tb-sub">{VIEW_TITLES[sessionState.view]?.[1]}</span>
      </div>
      <div class="tb-right">
        <span class="tb-date mono">{today}</span>
        <span class="tb-sep"></span>
        <div class="user">
          <div class="avatar">{sessionState.role === 'instructor' ? '陈' : '王'}</div>
          <div class="user-txt">
            <b>{sessionState.role === 'instructor' ? '陈思远' : '王雨桐'}</b>
            <span>{sessionState.role === 'instructor' ? '讲师 · 神经电生理科' : '进修技师 · NEU2601'}</span>
          </div>
        </div>
      </div>
    </header>

    <div class="view-wrap">
      {#if sessionState.view === 'dashboard'}
        <Dashboard />
      {:else if sessionState.view === 'builder'}
        <CourseBuilder />
      {:else if sessionState.view === 'review'}
        <ReviewDesk />
      {:else if sessionState.view === 'train'}
        <StudentTraining />
      {:else if sessionState.view === 'result'}
        <StudentResult />
      {:else if sessionState.view === 'reports'}
        <Reports />
      {:else if sessionState.view === 'admin'}
        <AdminConsole />
      {/if}
    </div>
  </main>
</div>

<style>
  .shell { display: grid; grid-template-columns: 232px 1fr; height: 100%; }

  .sidebar {
    display: flex; flex-direction: column;
    border-right: 1px solid var(--line);
    background: linear-gradient(180deg, #0a1015, #080d12);
    padding: 16px 12px 12px;
    min-height: 0;
  }
  .brand { display: flex; gap: 10px; align-items: center; padding: 0 4px 14px; }
  .logo { filter: drop-shadow(0 0 10px rgba(56,211,189,.25)); }
  .brand-txt { display: flex; flex-direction: column; line-height: 1.3; }
  .brand-txt b { font-size: 13px; letter-spacing: .01em; }
  .brand-txt span { font-size: 9px; letter-spacing: .14em; color: var(--text-3); font-family: var(--mono); }

  .role-switch {
    display: grid; grid-template-columns: 1fr 1fr; gap: 3px;
    background: #0c131a; border: 1px solid var(--line); border-radius: 8px;
    padding: 3px; margin-bottom: 14px;
  }
  .role-switch button {
    padding: 5px 0; border: 0; border-radius: 6px; background: transparent;
    color: var(--text-3); font-size: 11.5px; font-weight: 600; transition: all .15s;
  }
  .role-switch button.on { background: #182430; color: var(--text); box-shadow: inset 0 0 0 1px var(--line-2); }

  .nav { flex: 1; overflow-y: auto; margin: 0 -4px; padding: 0 4px; }
  .nav-group { margin-bottom: 15px; }
  .nav-group .eyebrow { padding: 0 8px 5px; }
  .nav-item {
    display: flex; align-items: center; gap: 9px; width: 100%;
    padding: 7px 9px; margin-bottom: 2px;
    border: 0; border-radius: 7px; background: transparent;
    color: var(--text-2); font-size: 12.5px; text-align: left;
    transition: background .14s, color .14s;
  }
  .nav-item:hover { background: #101a22; color: var(--text); }
  .nav-item.active { background: rgba(56,211,189,.10); color: var(--accent); box-shadow: inset 2px 0 0 var(--accent); }
  .ni { font-size: 13px; width: 14px; text-align: center; opacity: .85; }
  .nt { flex: 1; }
  .badge {
    font-size: 10px; font-family: var(--mono); padding: 0 5px; border-radius: 999px;
    background: rgba(240,189,104,.16); color: var(--gold); border: 1px solid rgba(240,189,104,.3);
  }

  .side-foot { border-top: 1px solid var(--line); padding-top: 10px; margin-top: 6px; }
  .course-mini { display: flex; flex-direction: column; gap: 2px; padding: 0 4px 8px; }
  .course-mini b { font-size: 11.5px; color: var(--text-2); font-weight: 600; line-height: 1.35; }
  .course-mini span { font-size: 10px; color: var(--text-3); font-family: var(--mono); }
  .foot-row { display: flex; align-items: center; gap: 6px; font-size: 10px; color: var(--text-3); padding: 6px 4px 0; }
  .dot { width: 5px; height: 5px; border-radius: 50%; background: var(--ok); box-shadow: 0 0 7px var(--ok); }

  .main { display: flex; flex-direction: column; min-width: 0; min-height: 0; }

  .topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 13px 22px; border-bottom: 1px solid var(--line);
    background: rgba(10, 15, 20, .72); backdrop-filter: blur(8px); flex: none;
  }
  .tb-left { display: flex; align-items: baseline; gap: 12px; min-width: 0; }
  .tb-left h1 { font-size: 15px; margin: 0; font-weight: 650; letter-spacing: .01em; }
  .tb-sub { font-size: 11.5px; color: var(--text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tb-right { display: flex; align-items: center; gap: 14px; }
  .tb-date { font-size: 11px; color: var(--text-3); }
  .tb-sep { width: 1px; height: 18px; background: var(--line); }
  .user { display: flex; align-items: center; gap: 9px; }
  .avatar {
    width: 29px; height: 29px; border-radius: 8px; display: grid; place-items: center;
    background: linear-gradient(140deg, #1f3a42, #16232c); border: 1px solid var(--line-2);
    font-size: 12px; color: var(--accent); font-weight: 600;
  }
  .user-txt { display: flex; flex-direction: column; line-height: 1.35; }
  .user-txt b { font-size: 12px; font-weight: 600; }
  .user-txt span { font-size: 10px; color: var(--text-3); }

  .view-wrap { flex: 1; min-height: 0; overflow: hidden; position: relative; }
</style>
