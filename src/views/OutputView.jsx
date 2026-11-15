// 界面④：审定输出 —— 塔位明细表、施工交底图、红线重叠区段、造价与占地
import { createEffect, onMount, For, Show } from 'solid-js';
import { elevation, WORLD, FORESTS, REDLINES } from '../lib/terrain';
import { analyze, LIMITS } from '../lib/calc';

const CW = 1400;
const CH = 900;

export default function OutputView(props) {
  const store = props.store;
  const scheme = () => store.scheme();
  const an = () => analyze(scheme());
  let canvas;

  // 施工交底图：上平面图 + 下纵断面 + 图签
  function draw() {
    if (scheme().status !== '已审定') return;
    const ctx = canvas.getContext('2d');
    const a = an();
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CW, CH);
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, CW - 20, CH - 20);

    // 标题
    ctx.fillStyle = '#1e3a2a';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${scheme().name} 施工交底图（${scheme().voltage} · ${scheme().weather}）`, CW / 2, 42);

    // ---- 平面图 ----
    const pm = { x: 40, y: 60, w: CW - 80, h: 380 };
    ctx.strokeStyle = '#90a4ae';
    ctx.lineWidth = 1;
    ctx.strokeRect(pm.x, pm.y, pm.w, pm.h);
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('路径平面图', pm.x + 6, pm.y + 18);

    // 路径包围盒
    let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
    for (const t of a.towers) {
      bx0 = Math.min(bx0, t.x); bx1 = Math.max(bx1, t.x);
      by0 = Math.min(by0, t.y); by1 = Math.max(by1, t.y);
    }
    const pad = 500;
    bx0 -= pad; by0 -= pad; bx1 += pad; by1 += pad;
    const sc = Math.min((pm.w - 40) / (bx1 - bx0), (pm.h - 50) / (by1 - by0));
    const PX = (x) => pm.x + 20 + (x - bx0) * sc;
    const PY = (y) => pm.y + 40 + (y - by0) * sc;

    // 红线与林区（平面示意）
    for (const r of REDLINES) {
      ctx.beginPath();
      r.pts.forEach(([x, y], i) => (i ? ctx.lineTo(PX(x), PY(y)) : ctx.moveTo(PX(x), PY(y))));
      ctx.closePath();
      ctx.fillStyle = 'rgba(198,40,40,0.10)';
      ctx.fill();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = '#c62828';
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const f of FORESTS) {
      ctx.beginPath();
      f.pts.forEach(([x, y], i) => (i ? ctx.lineTo(PX(x), PY(y)) : ctx.moveTo(PX(x), PY(y))));
      ctx.closePath();
      ctx.fillStyle = 'rgba(46,125,50,0.14)';
      ctx.fill();
    }

    // 路径与塔位
    ctx.beginPath();
    a.towers.forEach((t, i) => (i ? ctx.lineTo(PX(t.x), PY(t.y)) : ctx.moveTo(PX(t.x), PY(t.y))));
    ctx.strokeStyle = '#1565c0';
    ctx.lineWidth = 2;
    ctx.stroke();
    a.towers.forEach((t, i) => {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#263238';
      ctx.lineWidth = 1.5;
      ctx.fillRect(PX(t.x) - 4, PY(t.y) - 4, 8, 8);
      ctx.strokeRect(PX(t.x) - 4, PY(t.y) - 4, 8, 8);
      ctx.fillStyle = '#263238';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t.id, PX(t.x), PY(t.y) + 16);
      if (i < a.spans.length) {
        const s = a.spans[i];
        const tb = a.towers[i + 1];
        ctx.fillStyle = s.bad ? '#d32f2f' : '#455a64';
        ctx.fillText(`${Math.round(s.L)}m`, (PX(t.x) + PX(tb.x)) / 2, (PY(t.y) + PY(tb.y)) / 2 - 5);
      }
    });
    // 指北针
    ctx.beginPath();
    ctx.moveTo(pm.x + pm.w - 40, pm.y + 66);
    ctx.lineTo(pm.x + pm.w - 48, pm.y + 40);
    ctx.lineTo(pm.x + pm.w - 32, pm.y + 40);
    ctx.closePath();
    ctx.fillStyle = '#263238';
    ctx.fill();
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('N', pm.x + pm.w - 40, pm.y + 34);

    // ---- 纵断面 ----
    const pf = { x: 40, y: 470, w: CW - 80, h: 300 };
    ctx.strokeStyle = '#90a4ae';
    ctx.strokeRect(pf.x, pf.y, pf.w, pf.h);
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('沿线纵断面图', pf.x + 6, pf.y + 18);

    const samples = [];
    let mile = 0;
    for (let i = 0; i < a.towers.length - 1; i++) {
      const ta = a.towers[i];
      const tb = a.towers[i + 1];
      const L = Math.hypot(tb.x - ta.x, tb.y - ta.y);
      const n = Math.max(8, Math.round(L / 20));
      for (let k = i === 0 ? 0 : 1; k <= n; k++) {
        const t = k / n;
        samples.push({ mile: mile + L * t, z: elevation(ta.x + (tb.x - ta.x) * t, ta.y + (tb.y - ta.y) * t) });
      }
      mile += L;
    }
    let zmin = Infinity, zmax = -Infinity;
    for (const s of samples) { zmin = Math.min(zmin, s.z); zmax = Math.max(zmax, s.z); }
    for (const t of a.towers) zmax = Math.max(zmax, t.attach);
    zmin -= 25; zmax += 30;
    const X = (m) => pf.x + 30 + (m / mile) * (pf.w - 60);
    const Y = (z) => pf.y + pf.h - 30 - ((z - zmin) / (zmax - zmin)) * (pf.h - 70);

    ctx.beginPath();
    samples.forEach((s, i) => (i ? ctx.lineTo(X(s.mile), Y(s.z)) : ctx.moveTo(X(s.mile), Y(s.z))));
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    for (const s of a.spans) {
      const ta = a.towers[s.idx];
      const tb = a.towers[s.idx + 1];
      ctx.beginPath();
      for (let k = 0; k <= 30; k++) {
        const t = k / 30;
        const z = ta.attach + (tb.attach - ta.attach) * t - 4 * s.sag * t * (1 - t);
        k ? ctx.lineTo(X(s.mileStart + s.L * t), Y(z)) : ctx.moveTo(X(s.mileStart + s.L * t), Y(z));
      }
      ctx.strokeStyle = '#1565c0';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#374151';
      ctx.font = '10.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`L=${Math.round(s.L)}m f=${s.sag.toFixed(1)}m`, X(s.mileStart + s.L / 2), pf.y + pf.h - 12);
    }
    let tm = 0;
    a.towers.forEach((t, i) => {
      if (i > 0) tm += a.spans[i - 1].L;
      ctx.beginPath();
      ctx.moveTo(X(tm), Y(t.ground));
      ctx.lineTo(X(tm), Y(t.attach));
      ctx.strokeStyle = '#263238';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#263238';
      ctx.font = '10.5px sans-serif';
      ctx.fillText(t.id, X(tm), Y(t.attach) - 4);
    });

    // ---- 图签 ----
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 1;
    ctx.strokeRect(CW - 360, CH - 110, 330, 80);
    ctx.fillStyle = '#374151';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`工程：山区输电线路工程    图别：施工交底图`, CW - 350, CH - 88);
    ctx.fillText(`方案：${scheme().name}（已审定）    比例：示意`, CW - 350, CH - 68);
    ctx.fillText(`全长：${(a.totalLen / 1000).toFixed(2)}km    塔基：${a.towers.length} 基`, CW - 350, CH - 48);
  }

  onMount(draw);
  createEffect(() => {
    store.scheme().status;
    store.active();
    draw();
  });

  function towerMile(i) {
    let m = 0;
    for (let k = 0; k < i; k++) m += an().spans[k].L;
    return m;
  }

  function exportCSV() {
    const a = an();
    const rows = [['塔号', '里程(m)', 'X(m)', 'Y(m)', '地面高程(m)', '塔高(m)', '坡度(°)', '便道难度', '弃土风险', '永久占地(亩)']];
    a.towers.forEach((t, i) => {
      rows.push([
        t.id, towerMile(i).toFixed(1), t.x, t.y, t.ground.toFixed(1), t.towerH,
        t.slope.toFixed(1), t.steep ? '高' : '一般', t.steep ? '高' : '低', a.vc.baseMu,
      ]);
    });
    const csv = '﻿' + rows.map((r) => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const el = document.createElement('a');
    el.href = url;
    el.download = `${scheme().name}-塔位明细表.csv`;
    el.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main>
      <Show
        when={scheme().status === '已审定'}
        fallback={<div class="empty-state">方案「{scheme().name}」尚未审定（当前：{scheme().status}）。审定通过后自动生成塔位明细表与施工交底图。</div>}
      >
        <div class="full">
          <div class="section-title">塔位明细表（{scheme().name} · {scheme().voltage}）</div>
          <div style="overflow-x:auto">
            <table class="data">
              <thead>
                <tr>
                  <th>塔号</th><th>里程(m)</th><th>X(m)</th><th>Y(m)</th><th>地面高程(m)</th>
                  <th>塔高(m)</th><th>坡度(°)</th><th>施工便道</th><th>弃土风险</th><th>永久占地(亩)</th>
                </tr>
              </thead>
              <tbody>
                <For each={an().towers}>
                  {(t, i) => (
                    <tr>
                      <td class="c">{t.id}</td>
                      <td>{towerMile(i()).toFixed(1)}</td>
                      <td>{t.x}</td>
                      <td>{t.y}</td>
                      <td>{t.ground.toFixed(1)}</td>
                      <td>{t.towerH}</td>
                      <td>{t.slope.toFixed(1)}</td>
                      <td class="c">
                        <Show when={t.steep} fallback="一般">
                          <span class="tag orange">难度高（坡度＞{LIMITS.steepSlope}°）</span>
                        </Show>
                      </td>
                      <td class="c">
                        <Show when={t.steep} fallback={<span class="tag green">低</span>}>
                          <span class="tag red">高，需拦挡</span>
                        </Show>
                      </td>
                      <td>{an().vc.baseMu.toFixed(2)}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>

          <div class="section-title">造价估算与占地</div>
          <div class="card" style="max-width:640px">
            <div class="kv"><span>杆塔工程（含山地系数、陡坡附加与便道）</span><b class="num">{an().cost.tower.toFixed(1)} 万元</b></div>
            <div class="kv"><span>导地线工程（路径 {(an().totalLen / 1000).toFixed(2)}km）</span><b class="num">{an().cost.line.toFixed(1)} 万元</b></div>
            <div class="kv"><span>林木砍伐补偿（{an().treesTotal} 株）</span><b class="num">{an().cost.forest.toFixed(1)} 万元</b></div>
            <div class="kv"><span><b>估算总投资</b></span><b class="num">{an().cost.total.toFixed(1)} 万元</b></div>
            <div class="kv"><span>占地合计（永久 + 便道临时）</span><b class="num">{an().landMu.toFixed(2)} 亩</b></div>
          </div>

          <div class="section-title">生态保护红线重叠区段</div>
          <Show
            when={an().redlineTotal > 0}
            fallback={<div class="hint">本方案路径与生态保护红线无重叠。</div>}
          >
            <table class="data" style="max-width:720px">
              <thead>
                <tr><th>档号</th><th>红线区</th><th>重叠长度(m)</th><th>处理要求</th></tr>
              </thead>
              <tbody>
                <For each={an().spans.filter((s) => s.redlines.length)}>
                  {(s) => (
                    <For each={s.redlines}>
                      {(r) => (
                        <tr>
                          <td class="c">第{s.idx + 1}档（{s.from}–{s.to}）</td>
                          <td>{r.name}</td>
                          <td>{r.len.toFixed(0)}</td>
                          <td class="c"><span class="tag purple">须办理红线穿越论证，优化塔位避让</span></td>
                        </tr>
                      )}
                    </For>
                  )}
                </For>
              </tbody>
            </table>
          </Show>

          <div class="section-title">施工交底图</div>
          <div class="canvas-wrap">
            <canvas ref={canvas} class="brief" width={CW} height={CH} />
          </div>
          <div class="footer-actions">
            <button class="primary" onClick={exportCSV}>导出塔位明细表 CSV</button>
          </div>
        </div>
      </Show>
    </main>
  );
}
