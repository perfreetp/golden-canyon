import { createMemo, For, Show } from 'solid-js';
import { store, batchDefectRate, partById, styleById } from '../store';
import { BatchStatusBadge, Empty } from '../ui';
import { isOverdue, pct, today } from '../lib/utils';

export default function Board() {
  const d = today();

  const rows = createMemo(() =>
    store.machines.map((m) => {
      const logs = store.shotLogs.filter((l) => l.machineId === m.id && l.date === d);
      const shots = logs.reduce((a, l) => a + l.shots, 0);
      const pieces = logs.reduce((a, l) => a + l.pieces, 0);
      const defect = logs.reduce((a, l) => a + l.defect, 0);
      const batchId = logs[logs.length - 1]?.batchId;
      const batch = store.batches.find((b) => b.id === batchId)
        ?? store.batches.find((b) => b.machineId === m.id && b.status === 'injecting');
      return { m, shots, pieces, defect, batch, rate: pieces ? defect / pieces : 0 };
    }));

  const totalShots = createMemo(() => rows().reduce((a, r) => a + r.shots, 0));
  const totalDefect = createMemo(() => rows().reduce((a, r) => a + r.defect, 0));
  const totalPieces = createMemo(() => rows().reduce((a, r) => a + r.pieces, 0));
  const overdue = createMemo(() => store.batches.filter((b) => isOverdue(b.dueDate, b.status)));
  const activeMachines = createMemo(() => rows().filter((r) => r.shots > 0).length);

  return (
    <div class="flex-col gap-4">
      <div class="grid grid-4">
        <div class="card stat accent"><div class="v">{activeMachines()}<small> / {store.machines.length} 台开机</small></div><div class="k">今日 {d} 注塑机台状态</div></div>
        <div class="card stat"><div class="v">{totalShots().toLocaleString()}<small> 模次</small></div><div class="k">全厂当日累计打模</div></div>
        <div class="card stat danger"><div class="v">{pct(totalDefect(), totalPieces())}<small> %</small></div><div class="k">当日综合不良率（不良 {totalDefect().toLocaleString()} 件）</div></div>
        <div class="card stat warn"><div class="v">{overdue().length}<small> 个超期批次</small></div><div class="k">未放行且超过交期</div></div>
      </div>

      <div class="card">
        <h3>📺 机台实时看板 <span class="sub">按机台统计当日模次 / 出件 / 不良率 / 在制批次</span></h3>
        <div class="grid grid-3">
          <For each={rows()}>
            {(r) => (
              <div class={`card machine-card ${r.shots ? '' : 'idle'}`} style={{ margin: '0px' }}>
                <div class="flex items-center justify-between mb-2">
                  <b style={{ 'font-size': '15px' }}>{r.m.no} · {r.m.name}</b>
                  <Show when={r.batch} fallback={<span class="badge gray">待机</span>}>
                    <BatchStatusBadge status={r.batch!.status} />
                  </Show>
                </div>
                <div class="hint mb-2">锁模力 {r.m.tonnage}T</div>
                <div class="grid grid-2">
                  <div>
                    <div class="mv">{r.shots.toLocaleString()}</div>
                    <div class="hint">当日模次</div>
                  </div>
                  <div>
                    <div class="mv">{r.pieces.toLocaleString()}</div>
                    <div class="hint">当日出件</div>
                  </div>
                </div>
                <div class="mt-3 flex items-center justify-between">
                  <span class="muted">不良率</span>
                  <b classList={{ err: r.rate > 0.05 }} style={{ 'font-size': '17px' }}>
                    {pct(r.defect, r.pieces)}%
                    <span class="hint">（{r.defect} 件）</span>
                  </b>
                </div>
                <div class="progress mt-2"><i class={r.rate > 0.05 ? 'danger' : r.rate > 0.02 ? 'warn' : 'ok'} style={{ width: `${Math.min(100, r.rate * 1000)}%` }} /></div>
                <Show when={r.batch}>
                  <div class="mt-3" style={{ 'border-top': '1px solid #eef1f5', 'padding-top': '10px' }}>
                    <div class="hint">在制批次</div>
                    <b>{r.batch!.no}</b>
                    <div class="hint">{partById(r.batch!.partId)?.name} · {styleById(r.batch!.styleId)?.code}</div>
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <h3>⏰ 超期批次预警</h3>
          <Show when={overdue().length} fallback={<Empty text="无超期批次" />}>
            <table class="tbl">
              <thead><tr><th>批次</th><th>分件</th><th>机台</th><th>交期</th><th>状态</th></tr></thead>
              <tbody>
                <For each={overdue()}>
                  {(b) => (
                    <tr>
                      <td><b>{b.no}</b></td>
                      <td>{partById(b.partId)?.name}</td>
                      <td>{store.machines.find((m) => m.id === b.machineId)?.no ?? '未排产'}</td>
                      <td><span class="badge red">{b.dueDate}</span></td>
                      <td><BatchStatusBadge status={b.status} /></td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </Show>
        </div>
        <div class="card">
          <h3>🏭 在制批次质量排行</h3>
          <table class="tbl">
            <thead><tr><th>批次</th><th>机台</th><th class="num">不良率</th><th>状态</th></tr></thead>
            <tbody>
              <For each={[...store.batches].filter((b) => b.goodQty + b.defectQty > 0)
                .sort((a, b2) => batchDefectRate(b2) - batchDefectRate(a))}>
                {(b) => (
                  <tr>
                    <td><b>{b.no}</b><div class="hint">{partById(b.partId)?.name}</div></td>
                    <td>{store.machines.find((m) => m.id === b.machineId)?.no ?? '—'}</td>
                    <td class="num"><b classList={{ err: batchDefectRate(b) > 0.05 }}>{pct(b.defectQty, b.goodQty + b.defectQty)}%</b></td>
                    <td><BatchStatusBadge status={b.status} /></td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
