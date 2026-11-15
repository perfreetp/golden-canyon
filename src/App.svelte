<script>
  import Icon from './components/Icon.svelte';
  import WorkbenchView from './views/WorkbenchView.svelte';
  import ReviewView from './views/ReviewView.svelte';
  import BatchView from './views/BatchView.svelte';
  import ArchiveView from './views/ArchiveView.svelte';
  import ImportView from './views/ImportView.svelte';
  import { workspace } from './lib/store.svelte.js';
  import { batchStats, allOperators } from './lib/model.js';

  const ROLE_TEXT = { report: '报告医生', review: '复核员' };

  const navItems = [
    { key: 'workbench', name: '报告工作台', icon: 'grid', hint: '生成与手工调整' },
    { key: 'review', name: '复核台', icon: 'shield', hint: '逐条确认 / 驳回' },
    { key: 'batch', name: '批次总览', icon: 'layers', hint: '问题分布与放行' },
    { key: 'archive', name: '历史归档', icon: 'clock', hint: '按日期 / 医生检索' }
  ];

  const stats = $derived(workspace.batch ? batchStats(workspace.batch, workspace.cases) : null);
  const queue = $derived(
    workspace.batchCaseList.filter((c) => c.state === 'submitted' || c.state === 'rework')
  );

  const navBadge = $derived.by(() => ({
    review: stats?.issues.pending || 0,
    batch: workspace.blockers.length || 0,
    archive: workspace.batches.filter((b) => b.status === 'released').length
  }));

  function go(key) {
    workspace.setView(key);
  }
</script>

<div class="shell">
  <!-- top bar -->
  <header class="topbar">
    <div class="brand">
      <div class="logo">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round">
          <path d="M9 3.4c0 4 3.6 4.4 3.6 8.2S9 16.6 9 20.6" />
          <path d="M14.4 5.4c0 3.2 2.6 3.6 2.6 6.6" opacity="0.75" />
          <circle cx="9" cy="12" r="1.6" fill="#fff" stroke="none" />
        </svg>
      </div>
      <div class="brand-text">
        <div class="brand-name">消化内镜图文报告</div>
        <div class="brand-sub">分段示意图生成 · 批量质检 · 复核放行</div>
      </div>
    </div>

    <nav class="nav">
      {#each navItems as item}
        <button
        class="nav-btn"
        class:on={workspace.view === item.key}
        title={item.name}
        aria-label={item.name}
        onclick={() => go(item.key)}
      >
          <Icon name={item.icon} size={13} />
          <span>{item.name}</span>
          {#if navBadge[item.key]}
            <span class="nav-badge" class:alert={item.key === 'review'}>{navBadge[item.key]}</span>
          {/if}
        </button>
      {/each}
    </nav>

    <span class="spacer"></span>

    <div class="batch-picker">
      <span class="bp-label">当前批次</span>
      <select
        class="select bp-select"
        value={workspace.activeBatchId}
        onchange={(e) => workspace.selectBatch(e.target.value)}
      >
        {#each workspace.batches as b}
          <option value={b.id}>{b.id} · {b.name}</option>
        {/each}
      </select>
      <button class="btn sm ghost" title="新建批次" onclick={() => {
        const b = workspace.createBatch(`新建批次 ${new Date().toLocaleDateString('zh-CN')}`);
        workspace.notify('已新建批次', 'info', b.id);
        workspace.setView('workbench');
      }}>
        <Icon name="plus" size={12} />
      </button>
      <button class="btn sm ghost" title="导入报告" onclick={() => workspace.setView('import')}>
        <Icon name="download" size={12} />
      </button>
    </div>

    <div class="role-switch" role="group" aria-label="角色切换">
      <button
        class="role-btn"
        class:on={workspace.role === 'report'}
        onclick={() => (workspace.role = 'report')}
      >
        <Icon name="hand" size={12} /> 报告组
      </button>
      <button
        class="role-btn"
        class:on={workspace.role === 'review'}
        onclick={() => (workspace.role = 'review')}
      >
        <Icon name="shield" size={12} /> 复核员
      </button>
    </div>

    <div class="actor">
      <span class="avatar">{workspace.actorName.slice(0, 1)}</span>
      <div class="actor-text">
        <span class="actor-name">{workspace.actorName}</span>
        <span class="actor-role">{ROLE_TEXT[workspace.role]}</span>
      </div>
    </div>
  </header>

  <!-- sub bar -->
  <div class="subbar">
    <div class="sub-left">
      <span class="crumb">
        <span class="muted">{navItems.find((n) => n.key === workspace.view)?.name}</span>
        <Icon name="chevronRight" size={11} color="#a4b4ba" />
        <strong>{workspace.batch?.name}</strong>
      </span>
      {#if stats}
        <span class="sub-sep"></span>
        <span class="sub-stat">
          <span class="tnum">{stats.cases}</span> 例
        </span>
        <span class="sub-stat tone-hi"><span class="tnum">{stats.issues.high}</span> 严重</span>
        <span class="sub-stat tone-md"><span class="tnum">{stats.issues.medium}</span> 一般</span>
        <span class="sub-stat tone-lo"><span class="tnum">{stats.issues.low}</span> 提示</span>
        <span class="sub-sep"></span>
        <div class="prog" title="整例签名进度">
          <div class="prog-track"><span style={`width:${Math.round((stats.progress || 0) * 100)}%`}></span></div>
          <span class="prog-text">{stats.phases.signed}/{stats.cases} 已签名</span>
        </div>
      {/if}
    </div>
    <span class="spacer"></span>
    {#if workspace.view !== 'review' && workspace.activeCase}
      <button class="btn sm" onclick={() => workspace.setView('workbench')}>
        <Icon name="grid" size={12} /> 打开当前报告
      </button>
    {/if}
    {#if workspace.view !== 'review' && queue.length}
      <button class="btn sm primary" onclick={() => workspace.setView('review')}>
        <Icon name="shield" size={12} /> 复核台 · {stats.issues.pending} 条待处理
      </button>
    {/if}
    <button class="btn sm ghost" title="恢复演示数据" onclick={() => workspace.resetDemo()}>
      <Icon name="refresh" size={12} />
    </button>
  </div>

  <!-- main -->
  <main class="main">
    {#if workspace.view === 'workbench'}
      {#if workspace.activeCase}
        <WorkbenchView c={workspace.activeCase} />
      {:else}
        <div class="empty" style="height:100%">
          <Icon name="doc" size={24} />
          <div style="font-weight:600">批次内暂无报告</div>
          <button class="btn primary" onclick={() => workspace.setView('import')} style="margin-top:6px">
            <Icon name="download" size={12} /> 导入报告
          </button>
        </div>
      {/if}
    {:else if workspace.view === 'review'}
      {#if workspace.activeCase}
        <ReviewView c={workspace.activeCase} {queue} />
      {:else}
        <div class="empty" style="height:100%">
          <Icon name="shield" size={24} />
          <div>复核队列为空</div>
        </div>
      {/if}
    {:else if workspace.view === 'batch'}
      <BatchView batch={workspace.batch} cases={workspace.cases} />
    {:else if workspace.view === 'archive'}
      <ArchiveView batches={workspace.batches} cases={workspace.cases} />
    {:else if workspace.view === 'import'}
      <ImportView />
    {/if}
  </main>

  <!-- toast -->
  {#if workspace.toast}
    {@const t = workspace.toast}
    <div class="toast {t.tone} anim-in" role="status">
      <div class="toast-icon">
        <Icon
          name={t.tone === 'ok' ? 'check' : t.tone === 'warn' ? 'alert' : 'info'}
          size={14}
          color="#fff"
        />
      </div>
      <div class="toast-body">
        <div class="toast-msg">{t.message}</div>
        {#if t.detail}<div class="toast-detail">{t.detail}</div>{/if}
      </div>
      <button class="toast-x" onclick={() => (workspace.toast = null)}><Icon name="x" size={12} /></button>
    </div>
  {/if}
</div>

<style>
  .shell {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  /* topbar */
  .topbar {
    display: flex;
    align-items: center;
    gap: 14px;
    height: 54px;
    padding: 0 14px;
    background: linear-gradient(180deg, #ffffff, #f8fbfb);
    border-bottom: 1px solid var(--line);
    flex: none;
    z-index: 5;
  }
  .brand { display: flex; align-items: center; gap: 9px; min-width: 0; }
  .logo {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: linear-gradient(145deg, #0f7b87, #0a5560);
    display: grid;
    place-items: center;
    box-shadow: 0 2px 6px rgba(13, 107, 118, 0.3);
    flex: none;
  }
  .brand-name { font-size: 13px; font-weight: 700; letter-spacing: 0.01em; white-space: nowrap; }
  .brand-sub { font-size: 10px; color: var(--ink-3); letter-spacing: 0.02em; white-space: nowrap; }

  .nav {
    display: flex;
    gap: 2px;
    padding: 3px;
    background: var(--surface-3);
    border-radius: 9px;
  }
  .nav-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    border: 0;
    background: none;
    border-radius: 7px;
    padding: 5px 10px;
    font-size: 12px;
    color: var(--ink-2);
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.14s, color 0.14s;
  }
  .nav-btn:hover { color: var(--ink); background: rgba(255, 255, 255, 0.7); }
  .nav-btn.on {
    background: var(--surface);
    color: var(--accent-ink);
    font-weight: 600;
    box-shadow: var(--shadow-sm);
  }
  .nav-badge {
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 9px;
    background: var(--surface-3);
    color: var(--ink-2);
    font-size: 10px;
    font-weight: 700;
    display: inline-grid;
    place-items: center;
    font-variant-numeric: tabular-nums;
  }
  .nav-btn.on .nav-badge { background: var(--accent-soft); color: var(--accent-ink); }
  .nav-badge.alert { background: var(--high-bg); color: var(--high); }

  .batch-picker {
    display: flex;
    align-items: center;
    gap: 5px;
    padding-left: 12px;
    border-left: 1px solid var(--line-2);
  }
  .bp-label { font-size: 10px; color: var(--ink-3); letter-spacing: 0.04em; white-space: nowrap; }
  .bp-select {
    height: 27px;
    font-size: 11.5px;
    width: 210px;
    background-position: calc(100% - 13px) 11px, calc(100% - 8px) 11px;
  }

  .role-switch {
    display: flex;
    background: var(--surface-3);
    border-radius: 8px;
    padding: 2px;
    gap: 2px;
  }
  .role-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    border: 0;
    background: none;
    padding: 4px 9px;
    border-radius: 6px;
    font-size: 11.5px;
    color: var(--ink-2);
    cursor: pointer;
    white-space: nowrap;
  }
  .role-btn.on {
    background: var(--surface);
    color: var(--ink);
    font-weight: 600;
    box-shadow: var(--shadow-sm);
  }

  .actor { display: flex; align-items: center; gap: 7px; }
  .avatar {
    width: 27px;
    height: 27px;
    border-radius: 8px;
    background: var(--accent-soft);
    color: var(--accent-ink);
    display: grid;
    place-items: center;
    font-size: 12px;
    font-weight: 700;
    border: 1px solid var(--accent-line);
  }
  .actor-text { display: flex; flex-direction: column; line-height: 1.25; }
  .actor-name { font-size: 12px; font-weight: 600; }
  .actor-role { font-size: 10px; color: var(--ink-3); }

  /* subbar */
  .subbar {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 38px;
    padding: 0 14px;
    background: var(--bg-2);
    border-bottom: 1px solid var(--line);
    flex: none;
    font-size: 11.5px;
  }
  .sub-left { display: flex; align-items: center; gap: 9px; min-width: 0; flex-wrap: wrap; }
  .crumb { display: flex; align-items: center; gap: 5px; white-space: nowrap; }
  .crumb strong { font-weight: 600; }
  .sub-sep { width: 1px; height: 15px; background: var(--line); }
  .sub-stat { color: var(--ink-2); }
  .sub-stat .tnum { font-weight: 600; color: var(--ink); }
  .tone-hi .tnum { color: var(--high); }
  .tone-md .tnum { color: var(--med); }
  .tone-lo .tnum { color: var(--low); }
  .prog { display: flex; align-items: center; gap: 7px; }
  .prog-track {
    width: 92px;
    height: 5px;
    border-radius: 4px;
    background: #cbd7db;
    overflow: hidden;
  }
  .prog-track span {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, #2f8a6a, #2f6b4f);
    border-radius: 4px;
    transition: width 0.35s ease;
  }
  .prog-text { font-size: 10.5px; color: var(--ink-2); font-variant-numeric: tabular-nums; }

  .main {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  /* toast */
  .toast {
    position: fixed;
    right: 18px;
    bottom: 18px;
    display: flex;
    align-items: flex-start;
    gap: 9px;
    max-width: 400px;
    padding: 10px 12px 11px;
    border-radius: 10px;
    background: #17313a;
    color: #eaf2f4;
    box-shadow: 0 12px 32px rgba(15, 35, 44, 0.28);
    z-index: 50;
  }
  .toast.ok { background: #16382c; }
  .toast.warn { background: #3e2c14; }
  .toast-icon {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    display: grid;
    place-items: center;
    background: rgba(255, 255, 255, 0.14);
    flex: none;
    margin-top: 1px;
  }
  .toast-body { min-width: 0; }
  .toast-msg { font-size: 12px; font-weight: 600; }
  .toast-detail { font-size: 11px; opacity: 0.78; line-height: 1.5; margin-top: 2px; }
  .toast-x {
    border: 0;
    background: none;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    padding: 2px;
    margin-left: 2px;
  }
  .toast-x:hover { color: #fff; }

  @media (max-width: 1380px) {
    .brand-sub { display: none; }
    .bp-select { width: 168px; }
  }

  @media (max-width: 1180px) {
    .brand-text { display: none; }
    .nav-btn { padding: 5px 8px; font-size: 11.5px; }
    .bp-label { display: none; }
    .bp-select { width: 148px; }
    .actor-text { display: none; }
  }

  @media (max-width: 900px) {
    .nav-btn span { display: none; }
    .nav-btn { padding: 6px 10px; }
  }

  @media (max-width: 860px) {
    .topbar { height: auto; flex-wrap: wrap; padding: 8px 12px; gap: 8px; }
    .nav { order: 3; width: 100%; overflow-x: auto; }
    .subbar { height: auto; flex-wrap: wrap; padding: 6px 12px; gap: 6px; }
    .subbar .btn { height: 26px; font-size: 11.5px; }
    .role-btn { font-size: 11px; }
    .batch-picker { border-left: 0; padding-left: 0; }
    .bp-select { width: 128px; }
  }
</style>
