import { createMemo, For, Show } from 'solid-js';
import {
  store, partById, orderOfPart, moldRemainingPct, batchDefectRate,
} from '../store';
import { BatchStatusBadge, PartStatusBadge, Empty, LifeBar } from '../ui';
import { pct, isOverdue } from '../lib/utils';

export default function CustomerPortal() {
  const customerId = () => store.currentCustomerId;
  const customer = createMemo(() => store.customers.find((c) => c.id === customerId()));
  const myStyles = createMemo(() => store.styles.filter((s) => s.customerId === customerId()));
  const myBatches = createMemo(() =>
    store.batches.filter((b) => myStyles().some((s) => s.id === b.styleId)));
  const myParts = createMemo(() =>
    store.parts.filter((p) => myStyles().some((s) => s.id === p.styleId)));

  const totalDefect = createMemo(() => myBatches().reduce((a, b) => a + b.defectQty, 0));
  const totalMade = createMemo(() => myBatches().reduce((a, b) => a + b.goodQty + b.defectQty, 0));
  const activeCount = createMemo(() =>
    myBatches().filter((b) => ['injecting', 'pending_inspect', 'rework', 'pending_schedule'].includes(b.status)).length);

  return (
    <div class="flex-col gap-4">
      <div class="card" style={{ background: 'linear-gradient(120deg,#101828,#1d3557)', color: '#fff' }}>
        <h3 style={{ color: '#fff', 'font-size': '18px' }}>🎏 {customer()?.name} · 跟单门户</h3>
        <div class="hint" style={{ color: '#b9c6da' }}>
          本门户仅展示贵司名下款式的模具进度与质量数据，其他客户数据不可见。账号 {customer()?.account}
        </div>
      </div>

      <div class="grid grid-4">
        <div class="card stat accent"><div class="v">{myStyles().length}<small> 个款式</small></div><div class="k">合作款式总数</div></div>
        <div class="card stat"><div class="v">{activeCount()}<small> 个在途批次</small></div><div class="k">待排产/注塑/待检/返工</div></div>
        <div class="card stat ok"><div class="v">{myBatches().filter((b) => b.status === 'released').length}<small> 批已放行</small></div><div class="k">合格交付批次</div></div>
        <div class="card stat danger"><div class="v">{pct(totalDefect(), totalMade())}<small> %</small></div><div class="k">贵司订单综合不良率</div></div>
      </div>

      <For each={myStyles()}>
        {(st) => {
          const parts = createMemo(() => myParts().filter((p) => p.styleId === st.id));
          const batches = createMemo(() => myBatches().filter((b) => b.styleId === st.id));
          return (
            <div class="card">
              <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 style={{ margin: '0px' }}>{st.code} · {st.name}</h3>
                <div class="flex gap-2">
                  <span class="chip">分件 {parts().length}</span>
                  <span class="chip">批次 {batches().length}</span>
                </div>
              </div>

              <div class="grid grid-2">
                <div>
                  <h3 class="muted" style={{ 'font-size': '13px' }}>开模 / 试模进度</h3>
                  <Show when={parts().length} fallback={<Empty text="暂无分件" />}>
                    <div class="tbl-wrap">
                      <table class="tbl">
                        <thead><tr><th>分件</th><th>模号</th><th>修模</th><th>状态</th></tr></thead>
                        <tbody>
                          <For each={parts()}>
                            {(pt) => {
                              const o = orderOfPart(pt.id);
                              return (
                                <tr>
                                  <td><b>{pt.name}</b></td>
                                  <td>{o?.moldNo ?? <span class="muted">待开模</span>}
                                    <Show when={o}><div style={{ width: '110px', 'margin-top': '3px' }}><LifeBar pct={moldRemainingPct(o!)} /></div></Show>
                                  </td>
                                  <td class="num">{pt.repairCount}</td>
                                  <td><PartStatusBadge status={pt.status} /></td>
                                </tr>
                              );
                            }}
                          </For>
                        </tbody>
                      </table>
                    </div>
                  </Show>
                </div>

                <div>
                  <h3 class="muted" style={{ 'font-size': '13px' }}>量产批次与不良率</h3>
                  <Show when={batches().length} fallback={<Empty text="暂无量产批次" />}>
                    <div class="tbl-wrap">
                      <table class="tbl">
                        <thead><tr><th>批次号</th><th class="num">良/不良</th><th class="num">不良率</th><th>交期</th><th>状态</th></tr></thead>
                        <tbody>
                          <For each={batches()}>
                            {(b) => (
                              <tr>
                                <td><b>{b.no}</b><div class="hint">{partById(b.partId)?.name}</div></td>
                                <td class="num">{b.goodQty.toLocaleString()}<div class="err">{b.defectQty.toLocaleString()}</div></td>
                                <td class="num"><b classList={{ err: batchDefectRate(b) > 0.05 }}>{pct(b.defectQty, b.goodQty + b.defectQty)}%</b></td>
                                <td>
                                  <span classList={{ 'badge red': isOverdue(b.dueDate, b.status), 'badge gray': !isOverdue(b.dueDate, b.status) }}>
                                    {b.dueDate}
                                  </span>
                                </td>
                                <td><BatchStatusBadge status={b.status} /></td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </table>
                    </div>
                  </Show>
                </div>
              </div>
            </div>
          );
        }}
      </For>
    </div>
  );
}
