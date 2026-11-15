import { createMemo, createSignal, For, Show } from 'solid-js';
import {
  store, createBatch, scheduleBatch, addShot, changeBatchStatus,
  isMoldBlocked, moldRemaining, moldRemainingPct, orderOfPart, partById, styleById,
  batchDefectRate,
} from '../store';
import type { Batch, BatchStatus } from '../types';
import { Modal, BatchStatusBadge, LifeBar, Empty, useFlash } from '../ui';
import { exportCsv, today, pct, isOverdue, fmtDate } from '../lib/utils';

const FLOW: { key: BatchStatus | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending_schedule', label: '待排产' },
  { key: 'injecting', label: '注塑中' },
  { key: 'pending_inspect', label: '待检验' },
  { key: 'released', label: '放行' },
  { key: 'rework', label: '返工' },
];

export default function Batches() {
  const [flow, setFlow] = createSignal<BatchStatus | 'all'>('all');
  const [showCreate, setShowCreate] = createSignal(false);
  const [shotBatch, setShotBatch] = createSignal<Batch | null>(null);
  const [inspectBatch, setInspectBatch] = createSignal<Batch | null>(null);
  const { flash, FlashBox } = useFlash();

  const list = createMemo(() =>
    flow() === 'all' ? store.batches : store.batches.filter((b) => b.status === flow()));

  // 新建批次
  const [cOrder, setCOrder] = createSignal(store.orders[0]?.id ?? '');
  const [cQty, setCQty] = createSignal(5000);
  const [cDue, setCDue] = createSignal(today());
  const [cErr, setCErr] = createSignal('');
  const submitCreate = () => {
    const r = createBatch({ orderId: cOrder(), qty: cQty(), dueDate: cDue() });
    if (!r.ok) { setCErr(r.msg ?? '失败'); return; }
    flash('ok', '量产批次已创建，状态：待排产');
    setShowCreate(false);
  };

  // 排产
  const doSchedule = (b: Batch, machineId: string) => {
    const r = scheduleBatch(b.id, machineId);
    if (!r.ok) { flash('err', r.msg ?? '排产被拦截'); return; }
    flash('ok', `批次 ${b.no} 已排产，进入注塑中`);
  };

  // 打模表单
  const [sShots, setSShots] = createSignal(100);
  const [sDefect, setSDefect] = createSignal(0);
  const [sErr, setSErr] = createSignal('');
  const openShot = (b: Batch) => {
    setShotBatch(b); setSShots(100); setSDefect(0); setSErr('');
  };
  const submitShot = () => {
    const b = shotBatch();
    if (!b) return;
    const r = addShot(b.id, sShots(), sDefect());
    if (!r.ok) { setSErr(r.msg ?? '登记失败'); return; }
    const o = orderOfPart(b.partId)!;
    flash('ok', `登记 ${sShots()} 模次，出件 ${sShots() * o.cavities} 件，模具寿命已自动扣减`);
    if (isMoldBlocked(o)) flash('warn', `⚠️ 模具 ${o.moldNo} 剩余寿命已跌破 10%，后续批次将被拦截，请安排开新模`);
    setShotBatch(null);
  };

  // 检验
  const [iNote, setINote] = createSignal('');
  const openInspect = (b: Batch) => { setInspectBatch(b); setINote(b.inspectionNote ?? ''); };
  const judge = (status: BatchStatus) => {
    const b = inspectBatch();
    if (!b) return;
    if (!iNote().trim()) { flash('err', '请先填写检验结论备注'); return; }
    changeBatchStatus(b.id, status, iNote());
    flash(status === 'released' ? 'ok' : 'warn', status === 'released' ? '批次已放行' : '批次判返工，返回返工处理');
    setInspectBatch(null);
  };
  const reworkRedo = (b: Batch) => {
    changeBatchStatus(b.id, 'pending_inspect', (b.inspectionNote ?? '') + '；返工完成，申请复检');
    flash('ok', '返工完成，批次回到待检验');
  };

  const exportInspection = (b: Batch) => {
    const o = orderOfPart(b.partId)!;
    const pt = partById(b.partId)!;
    exportCsv(
      `批次检验单_${b.no}.csv`,
      ['项目', '内容'],
      [
        ['批次号', b.no], ['款式编号', styleById(b.styleId)?.code ?? ''], ['款式名称', styleById(b.styleId)?.name ?? ''],
        ['分件名称', pt.name], ['模号', o.moldNo], ['穴数', o.cavities], ['材质', o.material], ['色号', o.colorCode],
        ['机台', store.machines.find((m) => m.id === b.machineId)?.no ?? '未排产'],
        ['计划数量', b.qty], ['良品数', b.goodQty], ['不良数', b.defectQty],
        ['不良率%', pct(b.defectQty, b.goodQty + b.defectQty)],
        ['当前状态', FLOW.find((f) => f.key === b.status)?.label ?? b.status],
        ['建批日期', b.createdAt], ['排产日期', fmtDate(b.scheduledAt)], ['交期', b.dueDate],
        ['检验备注', b.inspectionNote ?? ''],
      ],
    );
    flash('ok', `检验单 ${b.no} 已导出`);
  };

  return (
    <div class="flex-col gap-4">
      <FlashBox />
      <div class="card">
        <div class="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div class="pill-filter">
            <For each={FLOW}>
              {(f) => (
                <button class={flow() === f.key ? 'on' : ''} onClick={() => setFlow(f.key)}>
                  {f.label}
                  {f.key !== 'all' && (
                    <span class="hint"> {store.batches.filter((b) => b.status === f.key).length}</span>
                  )}
                </button>
              )}
            </For>
          </div>
          <button class="btn primary" onClick={() => { setCErr(''); setShowCreate(true); }}>＋ 新建量产批次</button>
        </div>

        <Show when={list().length} fallback={<Empty text="该状态下暂无批次" />}>
          <div class="tbl-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>批次号</th><th>分件 / 款式</th><th>模号(剩余寿命)</th><th>机台</th>
                  <th class="num">计划/已出</th><th class="num">良/不良</th><th class="num">不良率</th>
                  <th>交期</th><th>状态</th><th class="right">操作</th>
                </tr>
              </thead>
              <tbody>
                <For each={list()}>
                  {(b) => {
                    const o = orderOfPart(b.partId)!;
                    const machine = store.machines.find((m) => m.id === b.machineId);
                    const rate = batchDefectRate(b);
                    return (
                      <tr>
                        <td><b>{b.no}</b><div class="hint">建 {fmtDate(b.createdAt)}</div></td>
                        <td>{partById(b.partId)?.name}<div class="hint">{styleById(b.styleId)?.code}</div></td>
                        <td>
                          {o.moldNo}
                          <Show when={isMoldBlocked(o)}><span class="badge red mt-2">红线</span></Show>
                          <div style={{ width: '120px', 'margin-top': '4px' }}><LifeBar pct={moldRemainingPct(o)} /></div>
                        </td>
                        <td>{machine ? `${machine.no} ${machine.tonnage}T` : <span class="muted">未排</span>}</td>
                        <td class="num">{b.qty.toLocaleString()}<div class="hint">{(b.goodQty + b.defectQty).toLocaleString()}</div></td>
                        <td class="num">{b.goodQty.toLocaleString()}<div class="err">{b.defectQty.toLocaleString()}</div></td>
                        <td class="num"><b classList={{ err: rate > 0.05 }}>{pct(b.defectQty, b.goodQty + b.defectQty)}%</b></td>
                        <td>
                          <span classList={{ 'badge red': isOverdue(b.dueDate, b.status), 'badge gray': !isOverdue(b.dueDate, b.status) }}>
                            {b.dueDate}
                          </span>
                        </td>
                        <td><BatchStatusBadge status={b.status} /></td>
                        <td>
                          <div class="flex flex-wrap gap-2" style={{ 'justify-content': 'flex-end' }}>
                            <Show when={b.status === 'pending_schedule'}>
                              <select style={{ width: '130px' }} onChange={(e) => e.currentTarget.value && doSchedule(b, e.currentTarget.value)}>
                                <option value="">排产到机台…</option>
                                <For each={store.machines}>{(m) => <option value={m.id}>{m.no} {m.tonnage}T</option>}</For>
                              </select>
                            </Show>
                            <Show when={b.status === 'injecting'}>
                              <button class="btn sm primary" onClick={() => openShot(b)}>登记打模</button>
                              <button class="btn sm" onClick={() => changeBatchStatus(b.id, 'pending_inspect')}>送检验</button>
                            </Show>
                            <Show when={b.status === 'pending_inspect'}>
                              <button class="btn sm ok" onClick={() => openInspect(b)}>检验判定</button>
                            </Show>
                            <Show when={b.status === 'rework'}>
                              <button class="btn sm warn" onClick={() => reworkRedo(b)}>返工完成送检</button>
                            </Show>
                            <button class="btn sm" onClick={() => exportInspection(b)}>⬇ 检验单</button>
                          </div>
                        </td>
                      </tr>
                    );
                  }}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
      </div>

      {/* 新建批次 */}
      <Show when={showCreate()}>
        <Modal title="新建量产批次" onClose={() => setShowCreate(false)}
          footer={<>
            <button class="btn" onClick={() => setShowCreate(false)}>取消</button>
            <button class="btn primary" onClick={submitCreate}>创建（待排产）</button>
          </>}>
          <Show when={cErr()}><div class="err">{cErr()}</div></Show>
          <div class="field">
            <label>选择开模单（模具）<span class="req">*</span></label>
            <select value={cOrder()} onChange={(e) => setCOrder(e.currentTarget.value)}>
              <For each={store.orders}>
                {(o) => {
                  const blocked = isMoldBlocked(o);
                  return (
                    <option value={o.id} disabled={blocked}>
                      {o.moldNo} · {partById(o.partId)?.name}（{o.cavities}穴）
                      {blocked ? ` — 寿命仅剩 ${(moldRemainingPct(o) * 100).toFixed(1)}%，禁止新建排产` : ` · 余 ${moldRemaining(o).toLocaleString()} 模次`}
                    </option>
                  );
                }}
              </For>
            </select>
          </div>
          <div class="form-row">
            <div class="field">
              <label>计划数量（件）<span class="req">*</span></label>
              <input type="number" min={1} value={cQty()} onInput={(e) => setCQty(Number(e.currentTarget.value))} />
            </div>
            <div class="field">
              <label>交期 <span class="req">*</span></label>
              <input type="date" value={cDue()} onInput={(e) => setCDue(e.currentTarget.value)} />
            </div>
          </div>
        </Modal>
      </Show>

      {/* 打模弹窗 */}
      <Show when={shotBatch()}>
        {(b) => {
          const o = orderOfPart(b().partId)!;
          return (
            <Modal title={`登记打模 · ${b().no}`} onClose={() => setShotBatch(null)}
              footer={<>
                <button class="btn" onClick={() => setShotBatch(null)}>取消</button>
                <button class="btn primary" onClick={submitShot}>确认扣减寿命</button>
              </>}>
              <Show when={sErr()}><div class="err">{sErr()}</div></Show>
              <table class="tbl mb-3">
                <tbody>
                  <tr><td class="muted">模具 / 模穴</td><td>{o.moldNo} · {o.cavities} 穴（每打 1 模出 {o.cavities} 件）</td></tr>
                  <tr><td class="muted">当前寿命</td><td>已用 {o.lifeUsed.toLocaleString()} / 剩余 <b classList={{ err: isMoldBlocked(o) }}>{moldRemaining(o).toLocaleString()}</b> 模次</td></tr>
                  <tr><td class="muted">批次累计</td><td>良品 {b().goodQty.toLocaleString()} · 不良 {b().defectQty.toLocaleString()}</td></tr>
                </tbody>
              </table>
              <div class="form-row">
                <div class="field">
                  <label>本次打模数（模次）<span class="req">*</span></label>
                  <input type="number" min={1} value={sShots()} onInput={(e) => setSShots(Number(e.currentTarget.value))} />
                  <div class="hint mt-2">预计出件 {(sShots() * o.cavities).toLocaleString()} 件；提交后模具寿命自动扣 {sShots()} 次</div>
                </div>
                <div class="field">
                  <label>其中不良件数</label>
                  <input type="number" min={0} value={sDefect()} onInput={(e) => setSDefect(Number(e.currentTarget.value))} />
                </div>
              </div>
            </Modal>
          );
        }}
      </Show>

      {/* 检验判定弹窗 */}
      <Show when={inspectBatch()}>
        {(b) => (
          <Modal title={`检验判定 · ${b().no}`} onClose={() => setInspectBatch(null)}>
            <table class="tbl mb-3">
              <tbody>
                <tr><td class="muted">分件 / 模号</td><td>{partById(b().partId)?.name} · {orderOfPart(b().partId)?.moldNo}</td></tr>
                <tr><td class="muted">良品 / 不良</td><td>{b().goodQty.toLocaleString()} / {b().defectQty.toLocaleString()}（不良率 {pct(b().defectQty, b().goodQty + b().defectQty)}%）</td></tr>
              </tbody>
            </table>
            <div class="field">
              <label>检验结论备注 <span class="req">*</span></label>
              <textarea value={iNote()} onInput={(e) => setINote(e.currentTarget.value)} placeholder="抽检标准、AQL、外观/尺寸结论等" />
            </div>
            <div class="flex gap-3">
              <button class="btn ok flex-1" style={{ 'justify-content': 'center' }} onClick={() => judge('released')}>✅ 合格放行</button>
              <button class="btn danger flex-1" style={{ 'justify-content': 'center' }} onClick={() => judge('rework')}>❌ 判返工</button>
            </div>
          </Modal>
        )}
      </Show>
    </div>
  );
}
