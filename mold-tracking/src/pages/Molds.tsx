import { createMemo, createSignal, For, Show } from 'solid-js';
import {
  store, isMoldBlocked, moldRemaining, moldRemainingPct, partById, styleById,
  trialsOfPart,
} from '../store';
import type { MoldOrder } from '../types';
import CavityView from '../three/CavityView';
import { LifeBar, Modal, Empty, useFlash } from '../ui';
import { exportCsv, today } from '../lib/utils';

export default function Molds() {
  const [q, setQ] = createSignal('');
  const [onlyWarn, setOnlyWarn] = createSignal(false);
  const [detail, setDetail] = createSignal<MoldOrder | null>(null);
  const { flash, FlashBox } = useFlash();

  const rows = createMemo(() =>
    store.orders.filter((o) => {
      if (onlyWarn() && !isMoldBlocked(o)) return false;
      if (!q()) return true;
      const pt = partById(o.partId);
      const kw = q().toLowerCase();
      return [o.moldNo, o.no, o.material, o.colorCode, pt?.name ?? '', styleById(o.styleId)?.code ?? '']
        .some((v) => v.toLowerCase().includes(kw));
    }));

  const exportLedger = () => {
    exportCsv(
      `模具台账_${today()}.csv`,
      ['开模单号', '模号', '款式编号', '分件名称', '穴数', '材质', '色号', '寿命总额(模次)', '已用模次', '剩余模次', '剩余比例%', '状态', '累计修模次数', '建单日期', '备注'],
      store.orders.map((o) => {
        const pt = partById(o.partId);
        return [
          o.no, o.moldNo, styleById(o.styleId)?.code ?? '', pt?.name ?? '',
          o.cavities, o.material, o.colorCode, o.lifeTotal, o.lifeUsed,
          moldRemaining(o), (moldRemainingPct(o) * 100).toFixed(2),
          isMoldBlocked(o) ? '寿命拦截-待开新模' : '在用',
          pt?.repairCount ?? 0, o.createdAt, o.remark,
        ];
      }),
    );
    flash('ok', `已导出 ${store.orders.length} 副模具台账`);
  };

  return (
    <div class="flex-col gap-4">
      <FlashBox />
      <div class="card">
        <div class="flex items-center justify-between flex-wrap gap-3 mb-3">
          <h3 style={{ margin: '0px' }}>
            模具台账
            <span class="sub">共 {store.orders.length} 副 · 寿命红线：剩余 &lt; 10% 排产拦截</span>
          </h3>
          <div class="flex gap-2 items-center">
            <input placeholder="搜模号 / 分件 / 材质" value={q()} onInput={(e) => setQ(e.currentTarget.value)} style={{ width: '220px' }} />
            <label class="chip" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={onlyWarn()} onChange={(e) => setOnlyWarn(e.currentTarget.checked)} style={{ width: 'auto' }} />
              只看红线模具
            </label>
            <button class="btn primary" onClick={exportLedger}>⬇ 导出台账 CSV</button>
          </div>
        </div>
        <Show when={rows().length} fallback={<Empty text="没有匹配的模具" />}>
          <div class="tbl-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>模号</th><th>开模单号</th><th>分件 / 款式</th><th>穴数</th><th>材质</th><th>色号</th>
                  <th style={{ width: '170px' }}>寿命进度</th><th class="num">已用 / 总额</th>
                  <th class="num">修模</th><th>状态</th><th class="right">操作</th>
                </tr>
              </thead>
              <tbody>
                <For each={rows()}>
                  {(o) => {
                    const pt = partById(o.partId);
                    return (
                      <tr>
                        <td><b>{o.moldNo}</b></td>
                        <td>{o.no}<div class="hint">{o.createdAt}</div></td>
                        <td>{pt?.name}<div class="hint">{styleById(o.styleId)?.code}</div></td>
                        <td class="num">{o.cavities}</td>
                        <td>{o.material}</td>
                        <td>
                          <span class="chip"><i style={{ display: 'inline-block', width: '11px', height: '11px', 'border-radius': '3px', background: o.colorCode, border: '1px solid #999' }} />{o.colorCode}</span>
                        </td>
                        <td><LifeBar pct={moldRemainingPct(o)} /></td>
                        <td class="num">{o.lifeUsed.toLocaleString()}<div class="hint">/ {o.lifeTotal.toLocaleString()}</div></td>
                        <td class="num">{pt?.repairCount ?? 0}</td>
                        <td>
                          <Show when={isMoldBlocked(o)} fallback={<span class="badge green">在用</span>}>
                            <span class="badge red">寿命拦截</span>
                          </Show>
                        </td>
                        <td class="right"><button class="btn sm" onClick={() => setDetail(o)}>模穴/详情</button></td>
                      </tr>
                    );
                  }}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
      </div>

      <Show when={detail()}>
        {(o) => {
          const pt = createMemo(() => partById(o().partId));
          const trials = createMemo(() => trialsOfPart(o().partId));
          return (
            <Modal wide title={`模具详情 · ${o().moldNo}`} onClose={() => setDetail(null)}>
              <div class="grid grid-2">
                <div>
                  <h3>模穴分布（{o().cavities} 穴）</h3>
                  <CavityView cavities={o().cavities} color={o().colorCode} height="320px" />
                </div>
                <div>
                  <table class="tbl">
                    <tbody>
                      <tr><td class="muted">开模单号 / 建单</td><td>{o().no} · {o().createdAt}</td></tr>
                      <tr><td class="muted">对应分件</td><td>{pt()?.name}（{styleById(o().styleId)?.name}）</td></tr>
                      <tr><td class="muted">材质 / 色号</td><td>{o().material} / {o().colorCode}</td></tr>
                      <tr><td class="muted">寿命总额</td><td>{o().lifeTotal.toLocaleString()} 模次（标准 30 万）</td></tr>
                      <tr><td class="muted">已打模次</td><td>{o().lifeUsed.toLocaleString()}</td></tr>
                      <tr><td class="muted">剩余寿命</td><td><b classList={{ err: isMoldBlocked(o()) }}>{moldRemaining(o()).toLocaleString()} 模次（{(moldRemainingPct(o()) * 100).toFixed(1)}%）</b></td></tr>
                      <tr><td class="muted">累计修模</td><td>{pt()?.repairCount} 次 · 试模 {trials().length} 轮</td></tr>
                      <tr><td class="muted">备注</td><td>{o().remark || '—'}</td></tr>
                    </tbody>
                  </table>
                  <Show when={isMoldBlocked(o())}>
                    <div class="toast-danger mt-3">
                      ⛔ 该模具已触达 10% 寿命红线，排产会被系统拦截。请尽快发起新模开模流程，新模试模合格前不得继续量产排产。
                    </div>
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
