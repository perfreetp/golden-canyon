// 界面②：纵断面校核 —— 自动切纵断面、逐档指标表、标红与砍伐统计
import { createEffect, onMount, For, Show } from 'solid-js';
import { elevation } from '../lib/terrain';
import { analyze, modifiedSpans, LIMITS } from '../lib/calc';

const CW = 1400;
const CH = 430;
const PAD = { l: 60, r: 20, t: 24, b: 36 };

export default function ProfileView(props) {
  const store = props.store;
  let canvas;

  function draw() {
    const ctx = canvas.getContext('2d');
    const scheme = store.scheme();
    const a = analyze(scheme);
    const mod = modifiedSpans(scheme);
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = '#f8f6ef';
    ctx.fillRect(0, 0, CW, CH);
    if (a.towers.length < 2) {
      ctx.fillStyle = '#6b7a6e';
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('请先在「路径规划」中布置至少 2 基塔位', CW / 2, CH / 2);
      return;
    }

    // 纵断面采样
    const samples = [];
    let mile = 0;
    for (let i = 0; i < a.towers.length - 1; i++) {
      const ta = a.towers[i];
      const tb = a.towers[i + 1];
      const L = Math.hypot(tb.x - ta.x, tb.y - ta.y);
      const n = Math.max(8, Math.round(L / 20));
      for (let k = i === 0 ? 0 : 1; k <= n; k++) {
        const t = k / n;
        samples.push({
          mile: mile + L * t,
          z: elevation(ta.x + (tb.x - ta.x) * t, ta.y + (tb.y - ta.y) * t),
        });
      }
      mile += L;
    }
    if (mile < 1) return;

    let zmin = Infinity;
    let zmax = -Infinity;
    for (const s of samples) {
      zmin = Math.min(zmin, s.z);
      zmax = Math.max(zmax, s.z);
    }
    for (const t of a.towers) zmax = Math.max(zmax, t.attach);
    zmin = Math.floor((zmin - 30) / 20) * 20;
    zmax = Math.ceil((zmax + 40) / 20) * 20;

    const X = (m) => PAD.l + (m / mile) * (CW - PAD.l - PAD.r);
    const Y = (z) => CH - PAD.b - ((z - zmin) / (zmax - zmin)) * (CH - PAD.t - PAD.b);

    // 超标档底纹
    for (const s of a.spans) {
      if (!s.bad) continue;
      ctx.fillStyle = 'rgba(211,47,47,0.08)';
      ctx.fillRect(X(s.mileStart), PAD.t, X(s.mileStart + s.L) - X(s.mileStart), CH - PAD.t - PAD.b);
    }

    // 网格与高程轴
    ctx.strokeStyle = '#ddd8c8';
    ctx.fillStyle = '#6b7a6e';
    ctx.font = '11px sans-serif';
    ctx.lineWidth = 1;
    for (let z = zmin; z <= zmax; z += 40) {
      ctx.beginPath();
      ctx.moveTo(PAD.l, Y(z));
      ctx.lineTo(CW - PAD.r, Y(z));
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(`${z}`, PAD.l - 6, Y(z) + 4);
    }
    ctx.textAlign = 'center';
    ctx.fillText('高程 (m)', 24, PAD.t + 4);
    const kmStep = mile > 6000 ? 2000 : 1000;
    for (let m = 0; m <= mile; m += kmStep) {
      ctx.beginPath();
      ctx.moveTo(X(m), PAD.t);
      ctx.lineTo(X(m), CH - PAD.b);
      ctx.stroke();
      ctx.fillText(`${(m / 1000).toFixed(1)}km`, X(m), CH - PAD.b + 16);
    }
    ctx.fillText('里程', CW - PAD.r - 16, CH - 8);

    // 地面线
    ctx.beginPath();
    samples.forEach((s, i) => (i ? ctx.lineTo(X(s.mile), Y(s.z)) : ctx.moveTo(X(s.mile), Y(s.z))));
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineTo(X(mile), CH - PAD.b);
    ctx.lineTo(X(0), CH - PAD.b);
    ctx.closePath();
    ctx.fillStyle = 'rgba(141,110,99,0.12)';
    ctx.fill();

    // 各档导线弧垂曲线 + 标注
    for (const s of a.spans) {
      const ta = a.towers[s.idx];
      const tb = a.towers[s.idx + 1];
      ctx.beginPath();
      for (let k = 0; k <= 40; k++) {
        const t = k / 40;
        const z = ta.attach + (tb.attach - ta.attach) * t - 4 * s.sag * t * (1 - t);
        const x = X(s.mileStart + s.L * t);
        const y = Y(z);
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = s.bad ? '#d32f2f' : mod.has(s.idx) ? '#ef6c00' : '#1565c0';
      ctx.lineWidth = s.bad ? 2.5 : 1.8;
      ctx.setLineDash(mod.has(s.idx) && !s.bad ? [8, 5] : []);
      ctx.stroke();
      ctx.setLineDash([]);

      // 最小对地距离点
      const cx = X(s.mileStart + s.L * s.minT);
      const condZ =
        ta.attach + (tb.attach - ta.attach) * s.minT - 4 * s.sag * s.minT * (1 - s.minT);
      ctx.beginPath();
      ctx.arc(cx, Y(condZ), 4, 0, Math.PI * 2);
      ctx.fillStyle = s.clearBad ? '#d32f2f' : '#1e7e34';
      ctx.fill();
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = s.clearBad ? '#d32f2f' : '#1e7e34';
      ctx.fillText(`对地${s.minClear.toFixed(1)}m`, cx, Y(condZ) + 16);

      // 档距/弧垂标注
      const mx = X(s.mileStart + s.L / 2);
      ctx.fillStyle = s.bad ? '#d32f2f' : '#374151';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`${Math.round(s.L)}m / f=${s.sag.toFixed(1)}m`, mx, PAD.t + 14 + (s.idx % 2) * 13);
    }

    // 塔位
    let tm = 0;
    a.towers.forEach((t, i) => {
      if (i > 0) tm += a.spans[i - 1].L;
      const x = X(tm);
      ctx.beginPath();
      ctx.moveTo(x, Y(t.ground));
      ctx.lineTo(x, Y(t.attach));
      ctx.strokeStyle = '#263238';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 6, Y(t.attach));
      ctx.lineTo(x + 6, Y(t.attach));
      ctx.stroke();
      ctx.fillStyle = '#263238';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t.id, x, Y(t.attach) - 6);
      if (t.steep) {
        ctx.fillStyle = '#e65100';
        ctx.fillText(`⚠${t.slope.toFixed(0)}°`, x, Y(t.ground) + 14);
      }
    });
  }

  onMount(draw);
  createEffect(() => {
    store.scheme().towers.map((t) => [t.x, t.y]);
    store.scheme().voltage;
    store.scheme().weather;
    store.active();
    draw();
  });

  const an = () => analyze(store.scheme());
  const mod = () => modifiedSpans(store.scheme());
  const reviewOf = (i) => {
    const r = store.scheme().review;
    return r && r.spans[i] ? r.spans[i] : null;
  };

  return (
    <main>
      <div class="full canvas-wrap">
        <canvas ref={canvas} class="profile" width={CW} height={CH} />
      </div>

      <div class="full">
        <div class="section-title">
          逐档校核表（{store.scheme().voltage} · {store.scheme().weather} · 限值：档距≤{LIMITS.maxSpan}m，对地≥{LIMITS.minClear}m）
        </div>
        <div style="overflow-x:auto">
          <table class="data">
            <thead>
              <tr>
                <th>档号</th><th>档距(m)</th><th>高差(m)</th><th>弧垂(m)</th><th>最小对地(m)</th>
                <th>判定</th><th>砍伐宽度(m)</th><th>砍伐株数</th><th>红线穿越(m)</th><th>复核意见</th>
              </tr>
            </thead>
            <tbody>
              <For each={an().spans}>
                {(s) => {
                  const rv = () => reviewOf(s.idx);
                  return (
                    <tr class={`${s.bad ? 'bad' : ''} ${mod().has(s.idx) ? 'modified' : ''}`}>
                      <td class="c">
                        第{s.idx + 1}档
                        <Show when={mod().has(s.idx)}><span class="tag orange">已修改</span></Show>
                      </td>
                      <td>{s.L.toFixed(1)}</td>
                      <td>{s.dh.toFixed(1)}</td>
                      <td>{s.sag.toFixed(2)}</td>
                      <td>{s.minClear.toFixed(2)}</td>
                      <td class="c">
                        <Show when={s.spanOver}><span class="tag red">档距超标</span></Show>
                        <Show when={s.clearBad}><span class="tag red">对地不足</span></Show>
                        <Show when={!s.bad}><span class="tag green">合格</span></Show>
                      </td>
                      <td>
                        <Show when={s.forests.length} fallback="—">
                          <For each={s.forests}>{(f) => <div>{f.name} {f.width.toFixed(0)}m×{f.len.toFixed(0)}m</div>}</For>
                        </Show>
                      </td>
                      <td>{s.trees || '—'}</td>
                      <td>
                        <Show when={s.redlines.length} fallback="—">
                          <For each={s.redlines}>{(r) => <div><span class="tag purple">{r.id}</span>{r.len.toFixed(0)}m</div>}</For>
                        </Show>
                      </td>
                      <td class="c">
                        <Show when={rv()} fallback="—">
                          <span class={`tag ${rv().result === '退回' ? 'red' : 'green'}`}>{rv().result}</span>
                          {rv().comment}
                        </Show>
                      </td>
                    </tr>
                  );
                }}
              </For>
            </tbody>
          </table>
        </div>
        <div class="hint" style="margin-top:6px">
          合计：路径 {(an().totalLen / 1000).toFixed(2)}km，超标 {an().badSpans} 档，砍伐 {an().treesTotal} 株，红线重叠 {an().redlineTotal.toFixed(0)}m。
          红色整档为超标档；行首橙条为退回后改动档。
        </div>
      </div>
    </main>
  );
}
