<script>
  import { onMount } from 'svelte';
  import {
    notifications, markAllRead, clearNotifications, scanOverdueLoans,
    resetAll, exportJson, importJson
  } from './lib/store.svelte.js';
  import { loadSeedData } from './lib/seed.js';
  import { download } from './lib/utils.js';
  import Dashboard from './views/Dashboard.svelte';
  import Figures from './views/Figures.svelte';
  import CabinetEditor from './views/CabinetEditor.svelte';
  import Lighting from './views/Lighting.svelte';
  import Maintenance from './views/Maintenance.svelte';
  import Loans from './views/Loans.svelte';
  import SettingsView from './views/SettingsView.svelte';

  const NAV = [
    { key: 'dashboard', label: '馆长看板', icon: '📊' },
    { key: 'figures', label: '藏品档案', icon: '🗂️' },
    { key: 'cabinet', label: '展陈设计', icon: '🏛️' },
    { key: 'lighting', label: '灯光与紫外线', icon: '💡' },
    { key: 'maintenance', label: '养护计划', icon: '🧹' },
    { key: 'loans', label: '借展流转', icon: '📦' },
    { key: 'settings', label: '设置', icon: '⚙️' }
  ];

  let current = $state('dashboard');
  let showNotif = $state(false);
  let fileInput = $state(null);

  const unread = $derived(notifications.filter(n => !n.read).length);

  onMount(() => {
    scanOverdueLoans();
    // 每小时重扫一次超期
    const timer = setInterval(scanOverdueLoans, 60 * 60 * 1000);
    return () => clearInterval(timer);
  });

  function go(key) {
    current = key;
    showNotif = false;
  }

  function seed() {
    if (confirm('载入演示数据将追加到当前档案，是否继续？（如需干净环境可先在设置中清空）')) {
      loadSeedData();
      scanOverdueLoans();
    }
  }

  function doExport() {
    download(`藏品档案备份-${new Date().toISOString().slice(0, 10)}.json`, exportJson(), 'application/json');
  }

  function onImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importJson(reader.result);
        alert('导入成功');
      } catch (err) {
        alert('导入失败：' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }
</script>

<div class="shell">
  <aside>
    <div class="brand">
      <div class="brand-mark">展</div>
      <div>
        <div class="brand-title">藏臻馆</div>
        <div class="brand-sub">手办陈列与养护档案</div>
      </div>
    </div>
    <nav>
      {#each NAV as item (item.key)}
        <button class:active={current === item.key} onclick={() => go(item.key)}>
          <span class="ico">{item.icon}</span>{item.label}
        </button>
      {/each}
    </nav>
    <div class="side-foot">
      <button class="sm" onclick={seed}>载入演示数据</button>
      <button class="sm" onclick={doExport}>导出备份</button>
      <label class="import-btn sm">
        导入备份
        <input type="file" accept="application/json" bind:this={fileInput} onchange={onImport} hidden />
      </label>
    </div>
  </aside>

  <main>
    <header class="topbar no-print">
      <h1>{NAV.find(n => n.key === current)?.label}</h1>
      <div class="notif-wrap">
        <button class="ghost notif-btn" onclick={() => (showNotif = !showNotif)}>
          🔔 通知
          {#if unread > 0}<span class="notif-dot">{unread}</span>{/if}
        </button>
        {#if showNotif}
          <div class="notif-panel">
            <div class="notif-head">
              <strong>通知中心</strong>
              <span class="notif-actions">
                <button class="sm ghost" onclick={markAllRead}>全部已读</button>
                <button class="sm ghost" onclick={clearNotifications}>清空</button>
              </span>
            </div>
            {#if notifications.length === 0}
              <div class="muted" style="padding:18px;text-align:center">暂无通知</div>
            {:else}
              {#each notifications.slice(0, 30) as n (n.id)}
                <div class="notif-item {n.level} {n.read ? 'read' : ''}">
                  <div class="notif-title">{n.read ? '' : '● '}{n.title}</div>
                  <div class="notif-body">{n.body}</div>
                  <div class="notif-date mono">{n.date}</div>
                </div>
              {/each}
            {/if}
          </div>
        {/if}
      </div>
    </header>

    <div class="view">
      {#key current}
        {#if current === 'dashboard'}
          <Dashboard ongo={go} />
        {:else if current === 'figures'}
          <Figures />
        {:else if current === 'cabinet'}
          <CabinetEditor />
        {:else if current === 'lighting'}
          <Lighting />
        {:else if current === 'maintenance'}
          <Maintenance />
        {:else if current === 'loans'}
          <Loans />
        {:else if current === 'settings'}
          <SettingsView />
        {/if}
      {/key}
    </div>
  </main>
</div>

<style>
  .shell { display: flex; min-height: 100vh; }
  aside {
    width: 218px; flex-shrink: 0; background: #2f2820; color: #e8dfd0;
    display: flex; flex-direction: column; padding: 18px 12px;
    position: sticky; top: 0; height: 100vh;
  }
  .brand { display: flex; gap: 10px; align-items: center; padding: 4px 8px 18px; border-bottom: 1px solid #4a3f31; margin-bottom: 14px; }
  .brand-mark {
    width: 40px; height: 40px; border-radius: 10px; background: var(--accent);
    color: #fff; display: grid; place-items: center; font-size: 20px; font-weight: 700;
  }
  .brand-title { font-weight: 700; font-size: 16px; }
  .brand-sub { font-size: 11.5px; color: #b3a690; }
  nav { display: flex; flex-direction: column; gap: 3px; flex: 1; }
  nav button {
    display: flex; align-items: center; gap: 9px; text-align: left;
    background: none; border: none; color: #cfc3ae; padding: 9px 12px; border-radius: 8px;
  }
  nav button:hover { background: #40362a; color: #fff; }
  nav button.active { background: var(--accent); color: #fff; font-weight: 650; }
  .ico { width: 18px; text-align: center; }
  .side-foot { display: flex; flex-direction: column; gap: 6px; border-top: 1px solid #4a3f31; padding-top: 12px; }
  .side-foot button, .import-btn {
    background: #3c3328; border: 1px solid #544736; color: #d8ccb8; text-align: center;
    border-radius: 7px; padding: 6px; font-size: 12.5px; cursor: pointer; display: block;
  }
  .side-foot button:hover, .import-btn:hover { background: #4a3f31; }

  main { flex: 1; min-width: 0; }
  .topbar {
    display: flex; justify-content: space-between; align-items: center;
    padding: 14px 26px; background: var(--panel); border-bottom: 1px solid var(--line);
    position: sticky; top: 0; z-index: 20;
  }
  .view { padding: 22px 26px 40px; max-width: 1280px; }

  .notif-wrap { position: relative; }
  .notif-btn { position: relative; padding: 6px 12px; }
  .notif-dot {
    position: absolute; top: -4px; right: -4px; background: var(--red); color: #fff;
    border-radius: 999px; font-size: 11px; min-width: 18px; height: 18px;
    display: grid; place-items: center; padding: 0 4px; font-weight: 700;
  }
  .notif-panel {
    position: absolute; right: 0; top: 42px; width: 360px; max-height: 460px; overflow-y: auto;
    background: var(--panel); border: 1px solid var(--line); border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0,0,0,.18); z-index: 40;
  }
  .notif-head { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; border-bottom: 1px solid var(--line); position: sticky; top: 0; background: var(--panel); }
  .notif-actions { display: flex; }
  .notif-item { padding: 10px 14px; border-bottom: 1px solid var(--line); font-size: 13px; }
  .notif-item.read { opacity: .55; }
  .notif-title { font-weight: 650; }
  .notif-item.warn .notif-title { color: var(--amber); }
  .notif-item.error .notif-title { color: var(--red); }
  .notif-item.info .notif-title { color: var(--blue); }
  .notif-body { color: var(--ink-2); margin: 2px 0; }
  .notif-date { font-size: 11px; color: #a99e8d; }

  @media (max-width: 860px) {
    .shell { flex-direction: column; }
    aside { width: 100%; height: auto; position: static; flex-direction: row; flex-wrap: wrap; align-items: center; }
    nav { flex-direction: row; flex-wrap: wrap; }
    .brand { border: none; margin: 0; }
    .side-foot { flex-direction: row; border: none; padding: 0; }
  }
</style>
