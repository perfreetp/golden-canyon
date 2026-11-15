import { Show, For } from 'solid-js';
import { useStore } from './store';
import { VOLTAGES, WEATHERS } from './lib/calc';
import PlanView from './views/PlanView';
import ProfileView from './views/ProfileView';
import ReviewView from './views/ReviewView';
import OutputView from './views/OutputView';

const TABS = [
  { id: 'plan', name: '① 路径规划' },
  { id: 'profile', name: '② 纵断面校核' },
  { id: 'review', name: '③ 复核' },
  { id: 'output', name: '④ 审定输出' },
];

const STATUS_CLASS = { 草稿: 'draft', 待复核: 'review', 已审定: 'approved' };

export default function App() {
  const store = useStore();
  const statusOf = (k) => store.state.schemes[k].status;

  return (
    <>
      <header class="topbar">
        <h1>山区输电线路路径选择与档距校核系统</h1>
        <span class="sub">电力设计院 · 线路设计室</span>
        <nav class="tabs">
          <For each={TABS}>
            {(t) => (
              <button
                class={store.view() === t.id ? 'on' : ''}
                onClick={() => store.setView(t.id)}
                disabled={t.id === 'output' && store.scheme().status !== '已审定'}
                title={t.id === 'output' && store.scheme().status !== '已审定' ? '方案审定通过后开放' : ''}
              >
                {t.name}
              </button>
            )}
          </For>
        </nav>
      </header>

      <div class="schemebar">
        <div class="schemes">
          <For each={['A', 'B', 'C']}>
            {(k) => (
              <button class={store.active() === k ? 'on' : ''} onClick={() => store.setActive(k)}>
                {store.state.schemes[k].name}
                &nbsp;
                <span class={`badge ${STATUS_CLASS[statusOf(k)]}`}>{statusOf(k)}</span>
              </button>
            )}
          </For>
        </div>
        <label>
          电压等级
          <select
            value={store.scheme().voltage}
            disabled={!store.editable()}
            onChange={(e) => store.setVoltage(e.currentTarget.value)}
          >
            <For each={Object.keys(VOLTAGES)}>{(v) => <option value={v}>{v}</option>}</For>
          </select>
        </label>
        <label>
          气象条件（弧垂模板）
          <select
            value={store.scheme().weather}
            disabled={!store.editable()}
            onChange={(e) => store.setWeather(e.currentTarget.value)}
          >
            <For each={WEATHERS}>{(w) => <option value={w}>{w}</option>}</For>
          </select>
        </label>
        <Show when={!store.editable()}>
          <span class="hint">当前状态为「{store.scheme().status}」，塔位与模板已锁定</span>
        </Show>
      </div>

      <Show when={store.view() === 'plan'}><PlanView store={store} /></Show>
      <Show when={store.view() === 'profile'}><ProfileView store={store} /></Show>
      <Show when={store.view() === 'review'}><ReviewView store={store} /></Show>
      <Show when={store.view() === 'output'}><OutputView store={store} /></Show>
    </>
  );
}
