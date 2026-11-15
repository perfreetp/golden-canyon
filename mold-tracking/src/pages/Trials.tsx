import { createMemo, createSignal, For, Show } from 'solid-js';
import {
  store, submitTrial, finishRepair, trialsOfPart, orderOfPart, styleById,
} from '../store';
import type { DefectItem, DefectType, Part } from '../types';
import Assembly3D from '../three/Assembly3D';
import { Modal, PartStatusBadge, Empty, useFlash } from '../ui';
import { fileToDataUrl, fmtDate } from '../lib/utils';

const DEFECT_TYPES: DefectType[] = ['缩水', '飞边', '顶白', '缺胶', '气泡', '变形', '熔接痕', '其他'];

export default function Trials() {
  const [filter, setFilter] = createSignal<'todo' | 'all'>('todo');
  const [modalPart, setModalPart] = createSignal<Part | null>(null);
  const { flash, FlashBox } = useFlash();

  const todoParts = createMemo(() =>
    store.parts.filter((p) => p.status === 'trial_pending' || p.status === 'repairing'));
  const listParts = createMemo(() =>
    filter() === 'todo' ? todoParts() : store.parts.filter((p) => orderOfPart(p.id)));

  // 弹窗内表单
  const [defects, setDefects] = createSignal<DefectItem[]>([]);
  const [passed, setPassed] = createSignal(false);
  const [plan, setPlan] = createSignal('');
  const [operator, setOperator] = createSignal('周工艺');
  const [err, setErr] = createSignal('');
  // 当前正在录入的缺陷
  const [dType, setDType] = createSignal<DefectType>('缩水');
  const [dDesc, setDDesc] = createSignal('');
  const [dPhoto, setDPhoto] = createSignal('');
  const [dPartId, setDPartId] = createSignal('');
  const [busy, setBusy] = createSignal(false);

  const open = (pt: Part) => {
    setModalPart(pt);
    setDefects([]); setPassed(false); setPlan(''); setErr('');
    setDType('缩水'); setDDesc(''); setDPhoto(''); setDPartId(pt.id);
  };

  const onPickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try { setDPhoto(await fileToDataUrl(file)); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  const addDefect = () => {
    if (!dPartId()) { setErr('请点选缺陷所在的具体分件'); return; }
    if (!dDesc().trim()) { setErr('请填写缺陷描述'); return; }
    if (!dPhoto()) { setErr('缺陷照片为必传项，不带照片不能登记'); return; }
    setDefects((arr) => [...arr, {
      partId: dPartId(), type: dType(), desc: dDesc().trim(), photo: dPhoto(),
    }]);
    setDDesc(''); setDPhoto(''); setErr('');
    flash('ok', '缺陷已登记，可继续添加或直接提交试模结论');
  };

  const submit = () => {
    const pt = modalPart();
    if (!pt) return;
    if (!defects().length) { setErr('至少登记一条缺陷记录（含照片）才能提交'); return; }
    if (defects().some((d) => !d.photo)) { setErr('存在未上传照片的缺陷，不能提交'); return; }
    if (!passed() && !plan().trim()) { setErr('试模不通过必须填写修模方案'); return; }
    const r = submitTrial(pt.id, {
      passed: passed(), defects: defects(), repairPlan: plan(), operator: operator(),
    });
    if (!r.ok) { setErr(r.msg ?? '提交失败'); return; }
    flash(passed() ? 'ok' : 'warn',
      passed() ? `第 ${trialsOfPart(pt.id).length} 轮试模通过，模具进入合格状态`
               : `试模不通过已转修模，修模次数 +1，修模完成后回到待试模`);
    setModalPart(null);
  };

  return (
    <div class="flex-col gap-4">
      <FlashBox />
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <h3 style={{ margin: '0px' }}>试模任务</h3>
          <div class="seg">
            <button class={filter() === 'todo' ? 'on' : ''} onClick={() => setFilter('todo')}>
              待处理（{todoParts().length}）
            </button>
            <button class={filter() === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>全部已开模分件</button>
          </div>
        </div>
        <Show when={listParts().length} fallback={<Empty text="暂无试模任务" />}>
          <div class="tbl-wrap">
            <table class="tbl">
              <thead>
                <tr><th>分件</th><th>款式</th><th>模号</th><th>已试轮次</th><th>修模次数</th><th>状态</th><th class="right">操作</th></tr>
              </thead>
              <tbody>
                <For each={listParts()}>
                  {(pt) => {
                    const o = orderOfPart(pt.id);
                    const ts = trialsOfPart(pt.id);
                    return (
                      <tr>
                        <td><b>{pt.name}</b></td>
                        <td>{styleById(pt.styleId)?.code}</td>
                        <td>{o?.moldNo ?? '—'}</td>
                        <td class="num">{ts.length}</td>
                        <td class="num"><b classList={{ err: pt.repairCount >= 3 }}>{pt.repairCount}</b></td>
                        <td><PartStatusBadge status={pt.status} /></td>
                        <td class="right">
                          <div class="flex gap-2" style={{ 'justify-content': 'flex-end' }}>
                            <Show when={pt.status === 'trial_pending' || pt.status === 'repairing'}>
                              <button class="btn sm primary" onClick={() => open(pt)}>
                                {pt.status === 'repairing' ? '复检试模' : '登记试模'}
                              </button>
                            </Show>
                            <Show when={pt.status === 'repairing'}>
                              <button class="btn sm ok" onClick={() => { finishRepair(pt.id); flash('ok', `「${pt.name}」修模完成，已回到待试模`); }}>
                                修模完成
                              </button>
                            </Show>
                            <button class="btn sm" onClick={() => open(pt)}>查看记录</button>
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

      <Show when={modalPart()}>
        {(pt) => {
          const styleParts = createMemo(() => store.parts.filter((x) => x.styleId === pt().styleId));
          const history = createMemo(() => trialsOfPart(pt().id));
          return (
            <Modal wide title={`试模登记 · ${pt().name}（${orderOfPart(pt().id)?.moldNo}）`}
              onClose={() => setModalPart(null)}
              footer={<>
                <button class="btn" onClick={() => setModalPart(null)}>取消</button>
                <button class="btn primary" onClick={submit}>提交试模结论</button>
              </>}>
              <Show when={err()}><div class="err">{err()}</div></Show>
              <div class="grid grid-2">
                <div>
                  <h3>① 在装配图上点选缺陷分件 <span class="sub">红点 = 已登记缺陷</span></h3>
                  <div style={{ background: '#0d1220', padding: '8px', 'border-radius': '10px' }}>
                    <Assembly3D
                      parts={styleParts()}
                      selectedId={dPartId()}
                      defectPartIds={defects().map((d) => d.partId)}
                      onSelect={(id) => setDPartId(id)}
                      height="300px"
                    />
                  </div>
                  <div class="mt-2">
                    <label class="muted">缺陷所在分件：</label>
                    <select value={dPartId()} onChange={(e) => setDPartId(e.currentTarget.value)}>
                      <For each={styleParts()}>{(sp) => <option value={sp.id}>{sp.name}</option>}</For>
                    </select>
                  </div>
                </div>

                <div>
                  <h3>② 填写缺陷并强制上传照片</h3>
                  <div class="form-row">
                    <div class="field">
                      <label>缺陷类型 <span class="req">*</span></label>
                      <select value={dType()} onChange={(e) => setDType(e.currentTarget.value as DefectType)}>
                        <For each={DEFECT_TYPES}>{(t) => <option value={t}>{t}</option>}</For>
                      </select>
                    </div>
                    <div class="field">
                      <label>缺陷照片 <span class="req">*</span></label>
                      <label class="photo-box" style={{ padding: '8px 10px' }}>
                        <Show when={busy()} fallback={dPhoto() ? '📷 点击重新选择照片' : '📷 点击上传缺陷照片（必传）'}>
                          处理中…
                        </Show>
                        <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                          onChange={(e) => onPickPhoto(e.currentTarget.files?.[0])} />
                      </label>
                    </div>
                  </div>
                  <Show when={dPhoto()}><img class="photo-thumb mb-2" src={dPhoto()} alt="缺陷预览" /></Show>
                  <div class="field">
                    <label>缺陷描述 <span class="req">*</span></label>
                    <textarea value={dDesc()} onInput={(e) => setDDesc(e.currentTarget.value)}
                      placeholder="如：分型面周圈飞边 0.2mm，顶针位顶白" />
                  </div>
                  <button class="btn primary" onClick={addDefect}>＋ 添加缺陷条目</button>

                  <h3 class="mt-4">已登记缺陷（{defects().length}）</h3>
                  <Show when={defects().length} fallback={<div class="toast-warn">尚未登记缺陷，没有缺陷照片不能提交试模记录</div>}>
                    <div class="grid" style={{ gap: '10px' }}>
                      <For each={defects()}>
                        {(d, i) => (
                          <div class="defect-card flex gap-3">
                            <img src={d.photo} style={{ width: '110px', height: '80px', flex: '0 0 110px' }} alt="缺陷照片" />
                            <div class="flex-1">
                              <b><span class="badge red">{d.type}</span>
                                <span class="chip ml-2" style={{ margin: '0 6px' }}>{store.parts.find((x) => x.id === d.partId)?.name}</span>
                              </b>
                              <div class="hint mt-2">{d.desc}</div>
                            </div>
                            <button class="btn sm danger" onClick={() => setDefects((arr) => arr.filter((_, idx) => idx !== i()))}>删除</button>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              </div>

              <div class="mt-4" style={{ 'border-top': '1px solid var(--line)', 'padding-top': '14px' }}>
                <h3>③ 试模结论</h3>
                <div class="form-row">
                  <div class="field">
                    <label>工艺员</label>
                    <input value={operator()} onInput={(e) => setOperator(e.currentTarget.value)} />
                  </div>
                  <div class="field">
                    <label>结论 <span class="req">*</span></label>
                    <div class="seg" style={{ width: '100%' }}>
                      <button class={!passed() ? 'on' : ''} style={{ flex: '1px' }} onClick={() => setPassed(false)}>不通过 → 转修模</button>
                      <button class={passed() ? 'on' : ''} style={{ flex: '1px' }} onClick={() => setPassed(true)}>通过 → 模具合格</button>
                    </div>
                  </div>
                </div>
                <Show when={!passed()}>
                  <div class="field">
                    <label>修模方案 <span class="req">*</span>（不通过必填，提交后修模次数 +1，修模完成回到待试模）</label>
                    <textarea value={plan()} onInput={(e) => setPlan(e.currentTarget.value)}
                      placeholder="如：浇口加大 0.3mm，配合面减胶 0.05mm，顶针区脱模斜度加至 1.5° 并抛光型腔" />
                  </div>
                </Show>
              </div>

              <Show when={history().length}>
                <h3 class="mt-4">历史试模记录</h3>
                <div class="timeline">
                  <For each={history()}>
                    {(t) => (
                      <div class={`tl-item ${t.passed ? 'ok' : 'fail'}`}>
                        <b>第 {t.round} 轮 · {fmtDate(t.date)} · {t.passed ? '通过' : '不通过'}</b>
                        <div class="flex-wrap gap-2 mt-2">
                          <For each={t.defects}>{(d) => <span class="chip chip-danger">{d.type}（{store.parts.find((x) => x.id === d.partId)?.name}）</span>}</For>
                        </div>
                        <Show when={t.repairPlan}><div class="hint mt-2">修模方案：{t.repairPlan}</div></Show>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </Modal>
          );
        }}
      </Show>
    </div>
  );
}
