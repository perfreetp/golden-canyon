import { createSignal, For, Show } from 'solid-js';
import { store, switchRole, resetDemo } from './store';
import Dashboard from './pages/Dashboard';
import Styles from './pages/Styles';
import Trials from './pages/Trials';
import Molds from './pages/Molds';
import Batches from './pages/Batches';
import Board from './pages/Board';
import CustomerPortal from './pages/CustomerPortal';

type PageKey = 'dashboard' | 'styles' | 'trials' | 'molds' | 'batches' | 'board' | 'portal';

const ENGINEER_NAV: { key: PageKey; icon: string; label: string }[] = [
  { key: 'dashboard', icon: '🏭', label: '工作台' },
  { key: 'styles', icon: '🧩', label: '款式与分件' },
  { key: 'trials', icon: '🧪', label: '试模管理' },
  { key: 'molds', icon: '🗂️', label: '模具台账' },
  { key: 'batches', icon: '📦', label: '批次跟单' },
  { key: 'board', icon: '📺', label: '车间看板' },
];

export default function App() {
  const [page, setPage] = createSignal<PageKey>('dashboard');

  const go = (k: PageKey) => setPage(k);

  return (
    <div class="app">
      <aside class="sidebar">
        <div class="logo">
          <b>模塑云跟单</b>
          <span>MOLD & INJECTION MES</span>
        </div>
        <Show
          when={store.role === 'engineer'}
          fallback={
            <nav class="nav">
              <button class={page() === 'portal' ? 'active' : ''} onClick={() => go('portal')}>
                🎏 <span class="lbl">我的款式进度</span>
              </button>
            </nav>
          }
        >
          <nav class="nav">
            <For each={ENGINEER_NAV}>
              {(item) => (
                <button class={page() === item.key ? 'active' : ''} onClick={() => go(item.key)}>
                  {item.icon} <span class="lbl">{item.label}</span>
                </button>
              )}
            </For>
          </nav>
        </Show>
        <div class="foot">
          手办代工厂 · 模具寿命管理<br />v1.0 本地版
        </div>
      </aside>

      <div class="main">
        <header class="topbar">
          <h1>
            <Show when={store.role === 'engineer'} fallback="客户跟单门户">
              {ENGINEER_NAV.find((n) => n.key === page())?.label ?? ''}
            </Show>
          </h1>

          <div class="seg">
            <button class={store.role === 'engineer' ? 'on' : ''}
              onClick={() => { switchRole('engineer'); setPage('dashboard'); }}>
              工艺员
            </button>
            <button class={store.role === 'customer' ? 'on' : ''}
              onClick={() => { switchRole('customer', store.customers[0]?.id ?? null); setPage('portal'); }}>
              客户跟单
            </button>
          </div>

          <Show when={store.role === 'customer'}>
            <select
              style={{ width: '180px' }}
              value={store.currentCustomerId ?? ''}
              onChange={(e) => switchRole('customer', e.currentTarget.value)}
            >
              <For each={store.customers}>
                {(c) => <option value={c.id}>{c.name}（{c.account}）</option>}
              </For>
            </select>
          </Show>

          <Show when={store.role === 'engineer'}>
            <button class="btn sm" onClick={resetDemo}>↺ 重置演示数据</button>
          </Show>
        </header>

        <main class="content">
          <Show when={store.role === 'engineer'}>
            <Show when={page() === 'dashboard'}><Dashboard /></Show>
            <Show when={page() === 'styles'}><Styles /></Show>
            <Show when={page() === 'trials'}><Trials /></Show>
            <Show when={page() === 'molds'}><Molds /></Show>
            <Show when={page() === 'batches'}><Batches /></Show>
            <Show when={page() === 'board'}><Board /></Show>
          </Show>
          <Show when={store.role === 'customer'}>
            <CustomerPortal />
          </Show>
        </main>
      </div>
    </div>
  );
}
