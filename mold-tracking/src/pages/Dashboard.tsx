import { For, Show } from 'solid-js';
import {
  store, isMoldBlocked, moldRemainingPct, moldRemaining, orderOfPart,
  batchDefectRate, styleById, partById,
} from '../store';
import { LifeBar, BatchStatusBadge, PartStatusBadge, Empty } from '../ui';
import { isOverdue, pct } from '../lib/utils';

export default function Dashboard() {
  const blocked = () => store.orders.filter(isMoldBlocked);
  const nearEnd = () => store.orders.filter((o) => !isMoldBlocked(o) && moldRemainingPct(o) < 0.25);
  const overdue = () => store.batches.filter((b) => isOverdue(b.dueDate, b.status));
  const injecting = () => store.batches.filter((b) => b.status === 'injecting');
  const totalDefect = () =>
    store.batches.reduce((acc, b) => acc + b.defectQty, 0);
  const totalProduced = () =>
    store.batches.reduce((acc, b) => acc + b.goodQty + b.defectQty, 0);
  const repairing = () => store.parts.filter((x) => x.status === 'repairing');

  return (
    <div class="flex-col gap-4">
      <div class="grid grid-4">
        <div class="card stat accent">
          <div class="v">{store.orders.length}<small> 副模具</small></div>
          <div class="k">开模单 / 模号台账</div>
        </div>
        <div class="card stat warn">
          <div class="v">{store.parts.filter((x) => x.status !== 'mold_ready' && x.status !== 'scrapped').length}<small> 个分件未量产</small></div>
          <div class="k">待开模 {store.parts.filter((x) => x.status === 'pending_mold').length} · 待试模 {store.parts.filter((x) => x.status === 'trial_pending').length} · 修模中 {repairing().length}</div>
        </div>
        <div class="card stat">
          <div class="v">{store.batches.length}<small> 个批次</small></div>
          <div class="k">注塑中 {injecting().length} · 待检 {store.batches.filter((b) => b.status === 'pending_inspect').length} · 超期 {overdue().length}</div>
        </div>
        <div class="card stat danger">
          <div class="v">{pct(totalDefect(), totalProduced())}<small> %</small></div>
          <div class="k">累计综合不良率（不良 {totalDefect().toLocaleString()} / 出件 {totalProduced().toLocaleString()}）</div>
        </div>
      </div>

      <Show when={blocked().length}>
        <div class="toast-danger mb-2">
          <span style={{ 'font-size': '18px' }}>⛔</span>
          <div>
            <b>排产拦截：{blocked().length} 副模具剩余寿命低于 10% 红线</b>
            <div class="mt-2 flex flex-wrap gap-3">
              <For each={blocked()}>
                {(o) => (
                  <span class="chip chip-danger">
                    {o.moldNo}（{partById(o.partId)?.name}）仅剩 {moldRemaining(o).toLocaleString()} 模次 / {(moldRemainingPct(o) * 100).toFixed(1)}% → 请开新模
                  </span>
                )}
              </For>
            </div>
          </div>
        </div>
      </Show>

      <div class="grid grid-2">
        <div class="card">
          <h3>⚠️ 寿命预警（剩余 &lt; 25%）</h3>
          <Show when={blocked().length + nearEnd().length} fallback={<Empty text="暂无寿命预警" />}>
            <table class="tbl">
              <thead><tr><th>模号</th><th>分件</th><th style={{ width: '190px' }}>寿命进度</th><th>已用 / 总额</th></tr></thead>
              <tbody>
                <For each={[...blocked(), ...nearEnd()]}>
                  {(o) => (
                    <tr>
                      <td><b>{o.moldNo}</b>{isMoldBlocked(o) && <div class="badge red mt-2">已拦截</div>}</td>
                      <td>{partById(o.partId)?.name}<div class="hint">{styleById(o.styleId)?.code}</div></td>
                      <td><LifeBar pct={moldRemainingPct(o)} /></td>
                      <td class="num">{o.lifeUsed.toLocaleString()} / {o.lifeTotal.toLocaleString()}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </Show>
        </div>

        <div class="card">
          <h3>⏰ 超期未放行批次</h3>
          <Show when={overdue().length} fallback={<Empty text="无超期批次" />}>
            <table class="tbl">
              <thead><tr><th>批次号</th><th>分件</th><th>状态</th><th>交期</th></tr></thead>
              <tbody>
                <For each={overdue()}>
                  {(b) => (
                    <tr>
                      <td><b>{b.no}</b></td>
                      <td>{partById(b.partId)?.name}</td>
                      <td><BatchStatusBadge status={b.status} /></td>
                      <td><span class="badge red">{b.dueDate}</span></td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </Show>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <h3>🔧 修模中的分件（修模次数累计入档）</h3>
          <Show when={repairing().length} fallback={<Empty text="当前无修模任务" />}>
            <For each={repairing()}>
              {(pt) => (
                <div class="flex items-center gap-3 mb-3" style={{ 'border-bottom': '1px solid #eef1f5', 'padding-bottom': '10px' }}>
                  <span class="big-num" classList={{ err: pt.repairCount >= 3 }}>{pt.repairCount}</span>
                  <div class="flex-1">
                    <b>{pt.name}</b>
                    <div class="hint">{styleById(pt.styleId)?.name} · {orderOfPart(pt.id)?.moldNo}</div>
                  </div>
                  <PartStatusBadge status={pt.status} />
                </div>
              )}
            </For>
          </Show>
        </div>

        <div class="card">
          <h3>📈 注塑中批次实时质量</h3>
          <Show when={injecting().length} fallback={<Empty text="暂无注塑中的批次" />}>
            <table class="tbl">
              <thead><tr><th>批次</th><th class="num">良品</th><th class="num">不良</th><th class="num">不良率</th></tr></thead>
              <tbody>
                <For each={injecting()}>
                  {(b) => (
                    <tr>
                      <td><b>{b.no}</b><div class="hint">{partById(b.partId)?.name}</div></td>
                      <td class="num">{b.goodQty.toLocaleString()}</td>
                      <td class="num">{b.defectQty.toLocaleString()}</td>
                      <td class="num">
                        <span class={batchDefectRate(b) > 0.05 ? 'err' : ''} style={{ 'font-weight': '700px' }}>
                          {pct(b.defectQty, b.goodQty + b.defectQty)}%
                        </span>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </Show>
        </div>
      </div>
    </div>
  );
}
