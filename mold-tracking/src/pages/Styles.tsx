import { createMemo, createSignal, For, Show } from 'solid-js';
import {
  store, createMoldOrder, orderOfPart, styleById, trialsOfPart,
  moldRemainingPct, MOLD_LIFE_DEFAULT,
} from '../store';
import type { Part, PartShapeKind } from '../types';
import Assembly3D from '../three/Assembly3D';
import CavityView from '../three/CavityView';
import { Modal, PartStatusBadge, LifeBar, Empty, useFlash } from '../ui';
import { fmtDate } from '../lib/utils';

const SHAPES: PartShapeKind[] = ['box', 'sphere', 'cylinder', 'torus', 'capsule'];

export default function Styles() {
  const [styleId, setStyleId] = createSignal(store.styles[0]?.id ?? '');
  const [selected, setSelected] = createSignal<string | null>(null);
  const [orderPart, setOrderPart] = createSignal<Part | null>(null);
  const [detail, setDetail] = createSignal<Part | null>(null);
  const { flash, FlashBox } = useFlash();

  const parts = createMemo(() => store.parts.filter((p) => p.styleId === styleId()));
  const selPart = createMemo(() => parts().find((p) => p.id === selected()) ?? parts()[0]);

  // 开模表单
  const [fMoldNo, setFMoldNo] = createSignal('');
  const [fCav, setFCav] = createSignal(4);
  const [fMat, setFMat] = createSignal('ABS');
  const [fColor, setFColor] = createSignal('');
  const [fLife, setFLife] = createSignal(MOLD_LIFE_DEFAULT);
  const [fRemark, setFRemark] = createSignal('');
  const [fErr, setFErr] = createSignal('');

  const openOrder = (pt: Part) => {
    setOrderPart(pt);
    setFMoldNo(`M-${styleById(pt.styleId)?.code.slice(-3) ?? 'NEW'}-${String(store.orders.length + 1).padStart(2, '0')}`);
    setFCav(4); setFMat('ABS'); setFColor(pt.color); setFLife(MOLD_LIFE_DEFAULT); setFRemark(''); setFErr('');
  };
  const submitOrder = () => {
    const pt = orderPart();
    if (!pt) return;
    if (!fMoldNo().trim()) { setFErr('模号必填'); return; }
    if (fCav() < 1) { setFErr('穴数至少为 1'); return; }
    const r = createMoldOrder({
      partId: pt.id, moldNo: fMoldNo(), cavities: fCav(), material: fMat(),
      colorCode: fColor(), lifeTotal: fLife(), remark: fRemark(),
    });
    if (!r.ok) { setFErr(r.msg ?? '提交失败'); return; }
    flash('ok', `开模单已建立，分件「${pt.name}」进入待试模`);
    setOrderPart(null);
  };

  return (
    <div class="flex-col gap-4">
      <FlashBox />
      <div class="card">
        <div class="flex items-center justify-between mb-3 flex-wrap gap-3">
          <h3 style={{ margin: '0px' }}>选择款式</h3>
          <div class="pill-filter">
            <For each={store.styles}>
              {(s) => (
                <button class={styleId() === s.id ? 'on' : ''} onClick={() => { setStyleId(s.id); setSelected(null); }}>
                  {s.code} · {s.name}
                  <span class="hint">（{store.customers.find((c) => c.id === s.customerId)?.name}）</span>
                </button>
              )}
            </For>
          </div>
        </div>

        <div class="grid grid-2">
          <div class="card" style={{ padding: '10px', background: '#0d1220' }}>
            <Assembly3D
              parts={parts()}
              selectedId={selPart()?.id}
              onSelect={(id) => setSelected(id)}
              height="430px"
            />
          </div>
          <div class="flex-col gap-2">
            <Show when={selPart()} fallback={<Empty text="该款式暂无分件" />}>
              {(pt) => (
                <>
                  <div class="flex items-center justify-between">
                    <h3 style={{ margin: '0px' }}>
                      {pt().name}
                      <span class="chip ml-2" style={{ margin: '0 6px' }}>
                        <i style={{ display: 'inline-block', width: '12px', height: '12px', 'border-radius': '3px', background: pt().color, border: '1px solid #999' }} />
                        色号 {pt().color}
                      </span>
                    </h3>
                    <PartStatusBadge status={pt().status} />
                  </div>
                  <table class="tbl">
                    <tbody>
                      <tr><td class="muted">几何体</td><td>{pt().shape}</td></tr>
                      <tr><td class="muted">累计修模</td><td><b classList={{ err: pt().repairCount >= 3 }}>{pt().repairCount}</b> 次</td></tr>
                      <tr>
                        <td class="muted">模具</td>
                        <td>
                          <Show when={orderOfPart(pt().id)} fallback={<span class="muted">未开模</span>}>
                            {(o) => (
                              <div class="flex-col gap-2">
                                <b>{o().moldNo}</b>
                                <div class="hint">{o().cavities} 穴 · {o().material} · 开模单 {o().no}</div>
                                <LifeBar pct={moldRemainingPct(o())} />
                              </div>
                            )}
                          </Show>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div class="flex gap-2 mt-2">
                    <Show when={!orderOfPart(pt().id)}>
                      <button class="btn primary" onClick={() => openOrder(pt())}>＋ 建开模单</button>
                    </Show>
                    <button class="btn" onClick={() => setDetail(pt())}>📁 分件档案</button>
                  </div>
                </>
              )}
            </Show>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>分件清单（点击行联动 3D 高亮）</h3>
        <div class="tbl-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>分件</th><th>色号</th><th>模号</th><th>穴数</th><th>材质</th>
                <th>状态</th><th>修模次数</th><th class="right">操作</th>
              </tr>
            </thead>
            <tbody>
              <For each={parts()}>
                {(pt) => {
                  const o = orderOfPart(pt.id);
                  return (
                    <tr class="row-click" classList={{ 'bg-blue': selPart()?.id === pt.id }}
                      onClick={() => setSelected(pt.id)}>
                      <td><b>{pt.name}</b></td>
                      <td>
                        <span class="chip"><i style={{ display: 'inline-block', width: '11px', height: '11px', 'border-radius': '3px', background: pt.color, border: '1px solid #999' }} />{pt.color}</span>
                      </td>
                      <td>{o?.moldNo ?? <span class="muted">—</span>}</td>
                      <td class="num">{o?.cavities ?? '—'}</td>
                      <td>{o?.material ?? '—'}</td>
                      <td><PartStatusBadge status={pt.status} /></td>
                      <td class="num"><b classList={{ err: pt.repairCount >= 3 }}>{pt.repairCount}</b></td>
                      <td class="right">
                        <div class="flex gap-2" style={{ 'justify-content': 'flex-end' }}>
                          <Show when={!o}>
                            <button class="btn sm primary" onClick={(e) => { e.stopPropagation(); openOrder(pt); }}>建开模单</button>
                          </Show>
                          <button class="btn sm" onClick={(e) => { e.stopPropagation(); setDetail(pt); }}>档案</button>
                        </div>
                      </td>
                    </tr>
                  );
                }}
              </For>
            </tbody>
          </table>
        </div>
      </div>

      {/* 建开模单弹窗 */}
      <Show when={orderPart()}>
        {(pt) => (
          <Modal title={`建立开模单 · ${pt().name}`} onClose={() => setOrderPart(null)}
            footer={<>
              <button class="btn" onClick={() => setOrderPart(null)}>取消</button>
              <button class="btn primary" onClick={submitOrder}>提交开模单</button>
            </>}>
            <Show when={fErr()}><div class="err">{fErr()}</div></Show>
            <div class="form-row">
              <div class="field">
                <label>模号 <span class="req">*</span>（全局唯一）</label>
                <input value={fMoldNo()} onInput={(e) => setFMoldNo(e.currentTarget.value)} placeholder="如 M-A018-09" />
              </div>
              <div class="field">
                <label>穴数 <span class="req">*</span></label>
                <input type="number" min={1} max={64} value={fCav()} onInput={(e) => setFCav(Number(e.currentTarget.value))} />
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>材质 <span class="req">*</span></label>
                <select value={fMat()} onChange={(e) => setFMat(e.currentTarget.value)}>
                  <For each={['ABS', 'PC+ABS', 'PVC', 'PP', 'POM', 'PA', 'PC']}>
                    {(m) => <option value={m}>{m}</option>}
                  </For>
                </select>
              </div>
              <div class="field">
                <label>色号 <span class="req">*</span></label>
                <div class="flex gap-2">
                  <input type="color" style={{ width: '52px', padding: '3px' }} value={fColor()} onInput={(e) => setFColor(e.currentTarget.value)} />
                  <input value={fColor()} onInput={(e) => setFColor(e.currentTarget.value)} placeholder="#d94f4f" />
                </div>
              </div>
            </div>
            <div class="field">
              <label>模具寿命（模次）<span class="req">*</span></label>
              <input type="number" min={1000} step={10000} value={fLife()}
                onInput={(e) => setFLife(Number(e.currentTarget.value))} />
              <div class="hint mt-2">行业默认 300,000 模次；剩余寿命低于 10% 时排产自动拦截</div>
            </div>
            <div class="field">
              <label>备注</label>
              <textarea value={fRemark()} onInput={(e) => setFRemark(e.currentTarget.value)} placeholder="浇口形式、外观要求、咬花纹路等" />
            </div>
          </Modal>
        )}
      </Show>

      {/* 分件档案弹窗 */}
      <Show when={detail()}>
        {(pt) => {
          const o = createMemo(() => orderOfPart(pt().id));
          const trials = createMemo(() => trialsOfPart(pt().id));
          return (
            <Modal wide title={`分件档案 · ${pt().name}`} onClose={() => setDetail(null)}>
              <div class="grid grid-2">
                <div>
                  <table class="tbl">
                    <tbody>
                      <tr><td class="muted">所属款式</td><td>{styleById(pt().styleId)?.name}</td></tr>
                      <tr><td class="muted">色号 / 材质</td><td>{pt().color} / {o()?.material ?? '—'}</td></tr>
                      <tr><td class="muted">当前状态</td><td><PartStatusBadge status={pt().status} /></td></tr>
                      <tr><td class="muted">累计修模次数</td><td><b classList={{ err: pt().repairCount >= 3 }} style={{ 'font-size': '17px' }}>{pt().repairCount}</b> 次</td></tr>
                      <tr><td class="muted">试模轮次</td><td>{trials().length} 次（通过 {trials().filter((t) => t.passed).length} 次）</td></tr>
                    </tbody>
                  </table>
                  <h3 class="mt-4">试模 / 修模时间线</h3>
                  <Show when={trials().length} fallback={<Empty text="暂无试模记录" />}>
                    <div class="timeline">
                      <For each={trials()}>
                        {(t) => (
                          <div class={`tl-item ${t.passed ? 'ok' : 'fail'}`}>
                            <b>第 {t.round} 轮 · {fmtDate(t.date)} · {t.passed ? '试模通过' : '试模不通过'}</b>
                            <div class="hint">工艺员：{t.operator}</div>
                            <div class="mt-2 flex-wrap gap-2">
                              <For each={t.defects}>
                                {(d) => <span class="chip chip-danger">{d.type}：{d.desc}</span>}
                              </For>
                            </div>
                            <Show when={t.repairPlan}>
                              <div class="toast-warn mt-2"><span>🔧</span><span>修模方案：{t.repairPlan}</span></div>
                            </Show>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
                <div>
                  <Show when={o()} fallback={<div class="toast-warn">该分件尚未建立开模单，无模穴视图</div>}>
                    {(mo) => (
                      <>
                        <h3>模穴分布（{mo().cavities} 穴 · {mo().moldNo}）</h3>
                        <CavityView cavities={mo().cavities} color={mo().colorCode} height="300px" />
                        <div class="mt-3">
                          <LifeBar pct={moldRemainingPct(mo())} />
                          <div class="hint mt-2">
                            已用 {mo().lifeUsed.toLocaleString()} / 寿命 {mo().lifeTotal.toLocaleString()} 模次
                          </div>
                        </div>
                      </>
                    )}
                  </Show>
                </div>
              </div>
            </Modal>
          );
        }}
      </Show>
    </div>
  );
}
