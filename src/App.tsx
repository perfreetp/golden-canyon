import { createMemo, createSignal, For, Show } from 'solid-js';
import BatchSidebar from './components/BatchSidebar';
import MapView from './components/MapView';
import LayerPanel from './components/LayerPanel';
import IssueList from './components/IssueList';
import ReviewPanel from './components/ReviewPanel';
import BatchDashboard from './components/BatchDashboard';
import ArchiveView from './components/ArchiveView';
import {
  currentBatch,
  currentDrawing,
  rectificationList,
  resetAll,
  selectDrawing,
  setActiveReviewer,
  state
} from './store';
import { exportRectification, exportReleaseLog } from './lib/export';

type Tab = 'map' | 'dashboard' | 'archive';

export default function App() {
  const [tab, setTab] = createSignal<Tab>('map');
  const batch = createMemo(() => currentBatch());
  const drawing = createMemo(() => currentDrawing());

  const onExport = (kind: 'rect' | 'log') => {
    const b = batch();
    if (!b) return;
    if (kind === 'rect') {
      exportRectification(b, rectificationList(b.id));
    } else {
      const log = state.db.releaseLogs
        .filter((l) => l.batchId === b.id)
        .sort((a, z) => z.at.localeCompare(a.at))[0];
      if (!log) {
        alert('该批次尚无放行/退回留档。');
        return;
      }
      exportReleaseLog(log);
    }
  };

  return (
    <div class="app">
      <header class="topbar">
        <div class="brand">
          <span class="brand-mark">骨</span>
          <div>
            <h1>骨科病区设备与管线平面图批次质检系统</h1>
            <p>基建办 · 设计图纸规范核查与放行管理平台</p>
          </div>
        </div>
        <nav class="tabs">
          <button class={tab() === 'map' ? 'active' : ''} onClick={() => setTab('map')}>
            平面图质检
          </button>
          <button class={tab() === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>
            批次总览
          </button>
          <button class={tab() === 'archive' ? 'active' : ''} onClick={() => setTab('archive')}>
            留档检索
          </button>
        </nav>
        <div class="topbar-right">
          <label class="reviewer-select">
            当前复核员
            <select
              value={state.activeReviewer()}
              onChange={(e) => setActiveReviewer(e.currentTarget.value)}
            >
              <For each={state.db.reviewers}>
                {(r) => (
                  <option value={r.id}>
                    {r.name}（{r.role}）
                  </option>
                )}
              </For>
            </select>
          </label>
          <button
            class="btn btn-ghost btn-sm"
            onClick={() => confirm('恢复出厂演示数据？当前留档将被清空。') && resetAll()}
          >
            重置演示数据
          </button>
        </div>
      </header>

      <div class="body">
        <BatchSidebar />
        <main class="main">
          <Show when={batch()} fallback={<EmptyState />}>
            <Show when={tab() === 'map'}>
              <div class="map-layout">
                <div class="map-center">
                  <div class="drawing-tabs">
                    <For each={state.db.drawings.filter((d) => d.batchId === batch()!.id)}>
                      {(d) => (
                        <button
                          class="drawing-tab"
                          classList={{ active: drawing()?.id === d.id }}
                          onClick={() => selectDrawing(d.id)}
                        >
                          {d.nursingUnit}
                          <em>{d.floor}</em>
                        </button>
                      )}
                    </For>
                  </div>
                  <Show
                    when={drawing()}
                    fallback={<div class="empty-tip pad">该批次暂无图纸，请在左侧补传。</div>}
                  >
                    <MapView />
                  </Show>
                </div>
                <div class="side-col">
                  <LayerPanel />
                  <IssueList />
                  <ReviewPanel />
                </div>
              </div>
            </Show>
            <Show when={tab() === 'dashboard'}>
              <BatchDashboard onExport={onExport} />
            </Show>
            <Show when={tab() === 'archive'}>
              <ArchiveView />
            </Show>
          </Show>
        </main>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div class="empty-state">
      <div class="empty-icon">📐</div>
      <h2>从左侧选择一个批次开始质检</h2>
      <p>系统已内置三个演示批次：已放行批次、复核中批次与收图中批次；也可新建批次模拟设计院来图建档。</p>
      <ul>
        <li>按 楼栋 / 楼层 / 护理单元 建档，每张平面图含病床、设备带、呼叫、医气、强弱电 5 类要素与 4 系统管线</li>
        <li>画布支持滚轮缩放、拖拽平移，视口外点位自动裁剪，三级 LOD 随缩放切换细节</li>
        <li>五项规范自动检查，严重 / 一般 / 提示三级标注，逐条复核并填写依据</li>
        <li>全部问题闭环后方可放行；不达标可整批退回并导出整改清单</li>
      </ul>
    </div>
  );
}
