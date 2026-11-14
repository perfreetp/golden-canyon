import { createMemo, createSignal, For, Show } from 'solid-js';
import type { Batch, BatchStatus } from '../types';
import { SEVERITY_META } from '../lib/spec';
import { fmtDate } from '../lib/geometry';
import {
  batchProgress,
  checkBatch,
  createBatch,
  currentBatchId,
  currentDrawingId,
  drawingsOf,
  selectBatch,
  selectDrawing,
  state,
  uploadDrawing
} from '../store';

const BATCH_STATUS: Record<BatchStatus, { label: string; cls: string }> = {
  uploading: { label: '收图中', cls: 'bs-uploading' },
  checking: { label: '检查复核中', cls: 'bs-checking' },
  released: { label: '已放行', cls: 'bs-released' },
  returned: { label: '已退回', cls: 'bs-returned' }
};

const DRAWING_STATUS: Record<string, string> = {
  pending: '待检查',
  checking: '复核中',
  reviewed: '已复核'
};

export default function BatchSidebar() {
  const [showNew, setShowNew] = createSignal(false);
  const batches = createMemo(() =>
    [...state.db.batches].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  );

  return (
    <aside class="sidebar">
      <div class="sidebar-head">
        <h2>批次档案</h2>
        <button class="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>
          + 新建批次
        </button>
      </div>
      <div class="batch-tree">
        <For each={batches()}>
          {(batch) => {
            const open = createMemo(() => currentBatchId() === batch.id);
            const progress = createMemo(() => batchProgress(batch.id));
            const drawings = createMemo(() => drawingsOf(batch.id));
            return (
              <div class="batch-node" classList={{ active: open() }}>
                <div class="batch-title" onClick={() => selectBatch(batch.id)}>
                  <div class="batch-title-main">
                    <span class="caret">{open() ? '▾' : '▸'}</span>
                    <b>{batch.id}</b>
                    <span class={`batch-status ${BATCH_STATUS[batch.status].cls}`}>
                      {BATCH_STATUS[batch.status].label}
                    </span>
                  </div>
                  <div class="batch-sub">{batch.building} · {batch.floors.join('/')}</div>
                  <div class="batch-sub">{batch.designInstitute}</div>
                  <Show when={progress().total > 0}>
                    <div class="progress-line">
                      <For each={['severe', 'major', 'minor'] as const}>
                        {(sev) => (
                          <span class="mini-stat" style={{ color: SEVERITY_META[sev].color }}>
                            {SEVERITY_META[sev].label} {progress().bySev[sev]}
                            <Show when={progress().openBySev[sev] > 0}>
                              <em>（待办{progress().openBySev[sev]}）</em>
                            </Show>
                          </span>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
                <Show when={open()}>
                  <div class="drawing-list">
                    <For each={drawings()}>
                      {(d) => (
                        <div
                          class="drawing-node"
                          classList={{ active: currentDrawingId() === d.id }}
                          onClick={() => selectDrawing(d.id)}
                        >
                          <span class="drawing-name">{d.nursingUnit}平面图</span>
                          <span class={`drawing-status ds-${d.status}`}>
                            {DRAWING_STATUS[d.status]}
                          </span>
                          <span class="drawing-meta">{d.points.length} 点位</span>
                        </div>
                      )}
                    </For>
                    <div class="drawing-actions">
                      <Show when={batch.status === 'uploading' || batch.status === 'returned'}>
                        <button
                          class="btn btn-ghost btn-sm"
                          onClick={() =>
                            uploadDrawing(
                              batch.id,
                              batch.floors[0],
                              `护理单元${String.fromCharCode(
                                65 + drawingsOf(batch.id).length
                              )}（补传）`,
                              drawingsOf(batch.id).length + 1
                            )
                          }
                        >
                          补传图纸
                        </button>
                        <button class="btn btn-primary btn-sm" onClick={() => checkBatch(batch.id)}>
                          执行规范检查
                        </button>
                      </Show>
                      <Show when={batch.status === 'checking'}>
                        <button class="btn btn-ghost btn-sm" onClick={() => checkBatch(batch.id)}>
                          重新跑检查
                        </button>
                      </Show>
                    </div>
                    <div class="batch-time">建档 {fmtDate(batch.createdAt)}</div>
                  </div>
                </Show>
              </div>
            );
          }}
        </For>
      </div>
      <Show when={showNew()}>
        <NewBatchModal onClose={() => setShowNew(false)} />
      </Show>
    </aside>
  );
}

function NewBatchModal(props: { onClose: () => void }) {
  const [form, setForm] = createSignal({
    name: '',
    designInstitute: '',
    building: '',
    floor: '',
    unit: '护理单元一'
  });

  const set = (k: keyof ReturnType<typeof form>, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    const f = form();
    if (!f.name || !f.designInstitute || !f.building || !f.floor) {
      alert('请完整填写批次名称、设计院、楼栋与楼层。');
      return;
    }
    const id = createBatch(f);
    props.onClose();
    selectBatch(id);
  };

  return (
    <div class="modal-mask" onClick={props.onClose}>
      <div class="modal" onClick={(e) => e.stopPropagation()}>
        <h3>新建批次 · 设计院来图建档</h3>
        <p class="modal-note">按 楼栋 / 楼层 / 护理单元 建档，提交后自动登记首张平面图（可继续补传）。</p>
        <label>
          批次名称
          <input value={form().name} onInput={(e) => set('name', e.currentTarget.value)} placeholder="例：住院楼A座十层骨科病区施工图" />
        </label>
        <label>
          设计单位
          <input value={form().designInstitute} onInput={(e) => set('designInstitute', e.currentTarget.value)} placeholder="例：华南医用建筑设计院" />
        </label>
        <div class="form-row">
          <label>
            楼栋
            <input value={form().building} onInput={(e) => set('building', e.currentTarget.value)} placeholder="例：住院楼A座" />
          </label>
          <label>
            楼层
            <input value={form().floor} onInput={(e) => set('floor', e.currentTarget.value)} placeholder="例：10F" />
          </label>
        </div>
        <label>
          护理单元
          <input value={form().unit} onInput={(e) => set('unit', e.currentTarget.value)} />
        </label>
        <div class="modal-actions">
          <button class="btn btn-ghost" onClick={props.onClose}>取消</button>
          <button class="btn btn-primary" onClick={submit}>建档并登记图纸</button>
        </div>
      </div>
    </div>
  );
}
