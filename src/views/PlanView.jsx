// 界面①：路径规划 —— 等高线地形上布塔、拖动比选、实时提示
import { createEffect, onMount, For, Show } from 'solid-js';
import { WORLD, contours, FORESTS, REDLINES } from '../lib/terrain';
import { analyze, modifiedSpans, LIMITS } from '../lib/calc';

const CW = 1400;
const CH = 950;
const MARGIN = 40;

let _contourPaths = null;
function contourPaths() {
  if (_contourPaths) return _contourPaths;
  const normal = new Path2D();
  const index = new Path2D();
  const labels = [];
  for (const { level, segs } of contours(20)) {
    const isIndex = level % 100 === 0;
    const p = isIndex ? index : normal;
    for (const s of segs) {
      p.moveTo(s[0], s[1]);
      p.lineTo(s[2], s[3]);
    }
    if (isIndex) {
      for (let i = 0; i < segs.length; i += 90) {
        labels.push({ x: segs[i][0], y: segs[i][1], text: String(level) });
      }
    }
  }
  _contourPaths = { normal, index, labels };
  return _contourPaths;
}

export default function PlanView(props) {
  const store = props.store;
  let canvas;
  let dragIdx = -1;
  let hoverMid = -1;
  let didDrag = false;

  const view = () => {
    const s = Math.min((CW - 2 * MARGIN) / WORLD.w, (CH - 2 * MARGIN) / WORLD.h);
    return { s, ox: (CW - WORLD.w * s) / 2, oy: (CH - WORLD.h * s) / 2 };
  };
  const toScreen = (x, y) => {
    const v = view();
    return [v.ox + x * v.s, v.oy + y * v.s];
  };
  const toWorld = (sx, sy) => {
    const v = view();
    return [(sx - v.ox) / v.s, (sy - v.oy) / v.s];
  };

  function draw() {
    const ctx = canvas.getContext('2d');
    const scheme = store.scheme();
    const a = analyze(scheme);
    const mod = modifiedSpans(scheme);
    const v = view();

    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = '#f8f6ef';
    ctx.fillRect(0, 0, CW, CH);

    ctx.save();
    ctx.translate(v.ox, v.oy);
    ctx.scale(v.s, v.s);

    // 等高线
    const cp = contourPaths();
    ctx.lineWidth = 0.7 / v.s;
    ctx.strokeStyle = '#c9c2ae';
    ctx.stroke(cp.normal);
    ctx.lineWidth = 1.4 / v.s;
    ctx.strokeStyle = '#a89e83';
    ctx.stroke(cp.index);

    // 林区
    for (const f of FORESTS) {
      ctx.beginPath();
      f.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = 'rgba(46,125,50,0.18)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(46,125,50,0.55)';
      ctx.lineWidth = 1.5 / v.s;
      ctx.stroke();
      ctx.fillStyle = '#2e7d32';
      ctx.font = `${13 / v.s}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`${f.name} ${f.density}株/亩`, f.pts[0][0], f.pts[0][1]);
    }

    // 生态保护红线
    for (const r of REDLINES) {
      ctx.beginPath();
      r.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = 'rgba(198,40,40,0.12)';
      ctx.fill();
      ctx.setLineDash([10 / v.s, 6 / v.s]);
      ctx.strokeStyle = '#c62828';
      ctx.lineWidth = 2 / v.s;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#c62828';
      ctx.font = `bold ${13 / v.s}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(r.name, r.pts[0][0], r.pts[0][1]);
    }

    // 路径（按档着色）
    const editable = store.editable();
    for (const s of a.spans) {
      const ta = a.towers[s.idx];
      const tb = a.towers[s.idx + 1];
      ctx.beginPath();
      ctx.moveTo(ta.x, ta.y);
      ctx.lineTo(tb.x, tb.y);
      if (s.bad) {
        ctx.strokeStyle = '#d32f2f';
        ctx.lineWidth = 3.5 / v.s;
        ctx.setLineDash([]);
      } else if (mod.has(s.idx)) {
        ctx.strokeStyle = '#ef6c00';
        ctx.lineWidth = 2.5 / v.s;
        ctx.setLineDash([12 / v.s, 7 / v.s]);
      } else {
        ctx.strokeStyle = '#1565c0';
        ctx.lineWidth = 2.5 / v.s;
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // 红线重叠区段（紫色加粗）
      for (const rl of s.redlines) {
        for (const [t0, t1] of rl.intervals) {
          ctx.beginPath();
          ctx.moveTo(ta.x + (tb.x - ta.x) * t0, ta.y + (tb.y - ta.y) * t0);
          ctx.lineTo(ta.x + (tb.x - ta.x) * t1, ta.y + (tb.y - ta.y) * t1);
          ctx.strokeStyle = '#7e22ce';
          ctx.lineWidth = 6 / v.s;
          ctx.stroke();
        }
      }

      // 档距标注
      const mx = (ta.x + tb.x) / 2;
      const my = (ta.y + tb.y) / 2;
      ctx.fillStyle = s.bad ? '#d32f2f' : '#455a64';
      ctx.font = `${11.5 / v.s}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(s.L)}m`, mx, my - 8 / v.s);

      // 插塔手柄
      if (editable) {
        ctx.beginPath();
        ctx.arc(mx, my, 5 / v.s, 0, Math.PI * 2);
        ctx.fillStyle = hoverMid === s.idx ? '#ef6c00' : 'rgba(255,255,255,0.85)';
        ctx.fill();
        ctx.strokeStyle = '#78909c';
        ctx.lineWidth = 1 / v.s;
        ctx.stroke();
      }
    }

    // 塔位
    a.towers.forEach((t, i) => {
      const r = 7 / v.s;
      ctx.beginPath();
      ctx.rect(t.x - r, t.y - r, 2 * r, 2 * r);
      ctx.fillStyle = t.steep ? '#fff3e0' : '#ffffff';
      ctx.fill();
      ctx.strokeStyle = t.steep ? '#e65100' : '#263238';
      ctx.lineWidth = (t.steep ? 2.5 : 1.5) / v.s;
      ctx.stroke();
      if (t.steep) {
        ctx.fillStyle = '#e65100';
        ctx.font = `bold ${12 / v.s}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(`⚠${t.slope.toFixed(0)}°`, t.x + r + 3 / v.s, t.y - r);
      }
      ctx.fillStyle = '#263238';
      ctx.font = `bold ${12 / v.s}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(t.id, t.x, t.y + r + 13 / v.s);
    });

    // 等高线高程注记
    ctx.fillStyle = '#8d8672';
    ctx.font = `${10 / v.s}px sans-serif`;
    ctx.textAlign = 'center';
    for (const lb of cp.labels) ctx.fillText(lb.text, lb.x, lb.y);

    ctx.restore();

    // 图例
    const legend = [
      ['#1565c0', '路径（正常档）'],
      ['#d32f2f', '超标档（档距>800m 或 对地<7m）'],
      ['#ef6c00', '退回后已修改档'],
      ['#7e22ce', '生态红线重叠区段'],
      ['#2e7d32', '林区'],
      ['#c62828', '生态保护红线'],
    ];
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    legend.forEach(([c, txt], i) => {
      const y = CH - legend.length * 18 - 8 + i * 18;
      ctx.fillStyle = c;
      ctx.fillRect(14, y - 9, 14, 10);
      ctx.fillStyle = '#374151';
      ctx.fillText(txt, 34, y);
    });
  }

  onMount(() => {
    draw();
  });
  createEffect(() => {
    // 依赖响应式状态，任何塔位/方案/模板变化都会重绘
    store.scheme().towers.map((t) => [t.x, t.y]);
    store.scheme().voltage;
    store.scheme().weather;
    store.scheme().status;
    store.active();
    draw();
  });

  function evtPos(e) {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * (CW / r.width), (e.clientY - r.top) * (CH / r.height)];
  }
  function hitTower(sx, sy) {
    const a = analyze(store.scheme());
    for (let i = a.towers.length - 1; i >= 0; i--) {
      const [px, py] = toScreen(a.towers[i].x, a.towers[i].y);
      if (Math.hypot(px - sx, py - sy) < 12) return i;
    }
    return -1;
  }
  function hitMid(sx, sy) {
    const a = analyze(store.scheme());
    for (let i = 0; i < a.spans.length; i++) {
      const ta = a.towers[i];
      const tb = a.towers[i + 1];
      const [px, py] = toScreen((ta.x + tb.x) / 2, (ta.y + tb.y) / 2);
      if (Math.hypot(px - sx, py - sy) < 9) return i;
    }
    return -1;
  }

  function onDown(e) {
    if (!store.editable()) return;
    const [sx, sy] = evtPos(e);
    const ti = hitTower(sx, sy);
    if (ti >= 0) {
      dragIdx = ti;
      return;
    }
    const mi = hitMid(sx, sy);
    if (mi >= 0) {
      const [wx, wy] = toWorld(sx, sy);
      store.insertTower(mi, wx, wy);
      dragIdx = mi + 1;
    }
  }
  function onMove(e) {
    const [sx, sy] = evtPos(e);
    hoverMid = store.editable() ? hitMid(sx, sy) : -1;
    if (dragIdx >= 0) {
      didDrag = true;
      const [wx, wy] = toWorld(sx, sy);
      store.moveTower(
        dragIdx,
        Math.max(0, Math.min(WORLD.w, wx)),
        Math.max(0, Math.min(WORLD.h, wy))
      );
    }
    draw();
  }
  function onUp() {
    dragIdx = -1;
  }
  function onDbl(e) {
    if (!store.editable()) return;
    const [sx, sy] = evtPos(e);
    const ti = hitTower(sx, sy);
    if (ti >= 0) store.deleteTower(ti);
  }
  function onClickEmpty(e) {
    if (didDrag) { didDrag = false; return; }
    if (!store.editable() || dragIdx >= 0) return;
    const [sx, sy] = evtPos(e);
    if (hitTower(sx, sy) >= 0 || hitMid(sx, sy) >= 0) return;
    const [wx, wy] = toWorld(sx, sy);
    if (wx >= 0 && wx <= WORLD.w && wy >= 0 && wy <= WORLD.h) store.addTower(wx, wy);
  }

  const summary = () => analyze(store.scheme());
  const returned = () => {
    const s = store.scheme();
    return s.status === '草稿' && s.review && s.review.decision === '退回' ? s.review : null;
  };
  const modSet = () => modifiedSpans(store.scheme());

  return (
    <main>
      <div class="canvas-wrap">
        <canvas
          ref={canvas}
          class={`map ${store.editable() ? '' : 'locked'}`}
          width={CW}
          height={CH}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onDblClick={onDbl}
          onClick={onClickEmpty}
        />
      </div>
      <div class="side">
        <div class="card">
          <h3>方案概况（{store.scheme().name}）</h3>
          <div class="kv"><span>路径全长</span><b class="num">{(summary().totalLen / 1000).toFixed(2)} km</b></div>
          <div class="kv"><span>塔基数</span><b class="num">{summary().towers.length} 基</b></div>
          <div class="kv"><span>超标档</span><b class="num" style={summary().badSpans ? 'color:#c0392b' : ''}>{summary().badSpans} 档</b></div>
          <div class="kv"><span>估算造价</span><b class="num">{summary().cost.total.toFixed(0)} 万元</b></div>
          <div class="kv"><span>占地</span><b class="num">{summary().landMu.toFixed(2)} 亩</b></div>
          <div class="kv"><span>砍伐株数</span><b class="num">{summary().treesTotal} 株</b></div>
          <div class="kv"><span>红线重叠</span><b class="num" style={summary().redlineTotal ? 'color:#7e22ce' : ''}>{summary().redlineTotal.toFixed(0)} m</b></div>
        </div>

        <Show when={summary().steepTowers > 0}>
          <div class="card">
            <h3>陡坡塔位警示（坡度＞{LIMITS.steepSlope}°）</h3>
            <ul class="warn-list">
              <For each={summary().towers.filter((t) => t.steep)}>
                {(t) => (
                  <li>
                    <span class="w">{t.id}（{t.slope.toFixed(1)}°）</span>
                    ：施工便道难度高，需索道或人工运输；塔基开挖弃土存在溜坡风险，建议设置拦挡与截排水。
                  </li>
                )}
              </For>
            </ul>
          </div>
        </Show>

        <Show when={returned()}>
          <div class="card">
            <h3>复核退回意见（第 {returned().round} 轮）</h3>
            <For each={Object.entries(returned().spans).filter(([, v]) => v.result === '退回')}>
              {([idx, v]) => (
                <div class="review-note">
                  <span class="who">第 {Number(idx) + 1} 档</span>：{v.comment || '（无文字意见）'}
                  <Show when={modSet().has(Number(idx))}>
                    <span class="tag orange">已修改</span>
                  </Show>
                </div>
              )}
            </For>
            <div class="hint" style="margin-top:6px">橙色虚线为退回后改动过的档，可重新提交复核。</div>
          </div>
        </Show>

        <div class="card">
          <h3>操作</h3>
          <div class="hint">
            拖动塔位比选路径；点击档线中点圆点插入塔位；双击塔位删除；点击空白处在末端新增塔位。切换方案 A/B/C 进行三套方案比选。
          </div>
          <div class="footer-actions">
            <Show when={store.editable()}>
              <button
                class="primary"
                disabled={summary().towers.length < 2}
                onClick={() => { store.submitReview(); store.setView('review'); }}
              >
                提交复核
              </button>
            </Show>
            <Show when={store.scheme().status === '待复核'}>
              <span class="tag orange">已提交，等待复核员处理</span>
            </Show>
            <Show when={store.scheme().status === '已审定'}>
              <span class="tag green">已审定，详见「审定输出」</span>
            </Show>
          </div>
        </div>
      </div>
    </main>
  );
}
