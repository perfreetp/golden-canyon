import { createEffect, createMemo, createSignal, For, Show, onCleanup } from 'solid-js';
import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior } from 'd3-zoom';
import { select } from 'd3-selection';
import type { Drawing, Issue, PlanPoint, PointLayer } from '../types';
import {
  LAYER_META,
  PIPELINE_META,
  POINT_TYPE_LAYER,
  POINT_TYPE_META,
  SEVERITY_META
} from '../lib/spec';
import { findHostPipeline } from '../lib/rules';
import {
  currentDrawing,
  issuesOfDrawing,
  layerVisible,
  selectIssue,
  selectPoint,
  selectedIssueId,
  selectedPointId,
  setZoom
} from '../store';

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
  k: number;
}

export default function MapView() {
  let svgEl: SVGSVGElement | undefined;
  const drawing = createMemo(() => currentDrawing());

  const [transform, setTransform] = createSignal({ x: 0, y: 0, k: 1 });
  const [size, setSize] = createSignal({ w: 900, h: 760 });
  const view = createMemo<ViewBox>(() => {
    const t = transform();
    const s = size();
    return { x: -t.x / t.k, y: -t.y / t.k, w: s.w / t.k, h: s.h / t.k, k: t.k };
  });

  const issues = createMemo<Issue[]>(() => {
    const d = drawing();
    return d ? issuesOfDrawing(d.id) : [];
  });

  const openIssueByPoint = createMemo(() => {
    const m = new Map<string, Issue>();
    for (const iss of issues()) {
      if (iss.status !== 'open') continue;
      for (const pid of iss.pointIds) {
        const exist = m.get(pid);
        if (!exist || rank(iss.severity) > rank(exist.severity)) m.set(pid, iss);
      }
    }
    return m;
  });

  let behavior: ZoomBehavior<SVGSVGElement, unknown> | undefined;
  let fittedDrawingId: string | null = null;

  // ---- d3-zoom 初始化（图纸切换时重建并适配整图）----
  createEffect(() => {
    const d = drawing();
    if (!svgEl || !d) return;
    const sel = select(svgEl);
    behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 40])
      .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        const t = event.transform;
        setTransform({ x: t.x, y: t.y, k: t.k });
        setZoom(t.k);
      });
    sel.call(behavior);
    fittedDrawingId = null;
    fitToDrawing(d);
    onCleanup(() => {
      sel.on('.zoom', null);
      behavior = undefined;
    });
  });

  function fitToDrawing(d: Drawing) {
    if (!svgEl || !behavior || fittedDrawingId === d.id) return;
    const s = size();
    const k0 = Math.min(s.w / d.width, s.h / d.height) * 0.96;
    if (!(k0 > 0) || !isFinite(k0)) return;
    select(svgEl).call(behavior.transform, zoomIdentity.scale(k0));
    fittedDrawingId = d.id;
  }

  // ---- 容器尺寸监听 ----
  createEffect(() => {
    const el = svgEl?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    onCleanup(() => ro.disconnect());
  });

  // 首次拿到真实容器尺寸后补一次整图适配
  createEffect(() => {
    const d = drawing();
    const s = size();
    if (d && s.w > 10 && fittedDrawingId !== d.id) fitToDrawing(d);
  });

  // 选中问题时平移定位（复用同一 zoom 行为，确保视图信号同步）
  createEffect(() => {
    const iss = issues().find((i) => i.id === selectedIssueId());
    if (!iss || !svgEl || !behavior) return;
    const s = size();
    const targetK = Math.max(view().k, 4);
    select(svgEl).call(
      behavior.transform,
      zoomIdentity.translate(s.w / 2 - iss.x * targetK, s.h / 2 - iss.y * targetK).scale(targetK)
    );
  });

  const inView = (x: number, y: number, pad = 300) => {
    const v = view();
    return x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + pad;
  };

  const selectedPoint = createMemo(() => {
    const d = drawing();
    const id = selectedPointId();
    return d && id ? d.points.find((p) => p.id === id) : undefined;
  });

  const hostPipeline = createMemo(() => {
    const d = drawing();
    const p = selectedPoint();
    if (!d || !p) return undefined;
    return findHostPipeline(d, p);
  });

  const lod = createMemo(() => {
    const k = view().k;
    if (k < 1.2) return 0; // 总览：简化点
    if (k < 5) return 1; // 分区：标准符号
    return 2; // 详图：标签+高度等属性
  });

  const visiblePoints = createMemo(() => {
    const d = drawing();
    if (!d) return [] as PlanPoint[];
    return d.points.filter(
      (p) =>
        layerVisible[POINT_TYPE_LAYER[p.type]] &&
        (lod() === 0 || inView(p.x, p.y))
    );
  });

  const visiblePipelines = createMemo(() => {
    const d = drawing();
    if (!d) return [];
    return d.pipelines.filter((p) => layerVisible[PIPELINE_META[p.system].layer]);
  });

  const visibleIssues = createMemo(() =>
    issues().filter((i) => i.status === 'open' && inView(i.x, i.y, 500))
  );

  const clickPoint = (p: PlanPoint) => {
    selectPoint(p.id === selectedPointId() ? null : p.id);
    selectIssue(null);
  };

  return (
    <div class="map-wrap">
      <div class="map-toolbar">
        <span class="map-scale">
          缩放 {view().k.toFixed(2)}× · 视口内点位 {visiblePoints().length}/{drawing()?.points.length ?? 0}
          · LOD-{lod()}
        </span>
        <span class="map-hint">滚轮缩放 · 拖拽平移 · 单击点位查看管线归属</span>
      </div>
      <svg ref={svgEl} class="map-svg" width="100%" height="100%">
        <defs>
          <pattern id="grid" width="1000" height="1000" patternUnits="userSpaceOnUse">
            <path d="M 1000 0 L 0 0 0 1000" fill="none" stroke="#e6e9ee" stroke-width="6" />
          </pattern>
        </defs>
        <Show when={drawing()}>
          {(d) => (
            <g transform={`translate(${size().w / 2 - (view().x + view().w / 2) * view().k},${size().h / 2 - (view().y + view().h / 2) * view().k}) scale(${view().k})`}>
              {/* 图纸底图 */}
              <rect x={0} y={0} width={d().width} height={d().height} fill="url(#grid)" stroke="#9aa4b2" stroke-width={20} />
              <For each={d().rooms}>
                {(room) => (
                  <g>
                    <rect
                      x={room.x}
                      y={room.y}
                      width={room.w}
                      height={room.h}
                      fill={room.kind === 'corridor' ? '#f4f6f9' : '#fbfcfd'}
                      stroke="#b7c0cc"
                      stroke-width={12}
                    />
                    <text
                      x={room.x + room.w / 2}
                      y={room.y + (room.y < d().height / 2 ? 320 : room.h - 180)}
                      class="room-label"
                      font-size="260"
                      text-anchor="middle"
                      fill="#5b6672"
                    >
                      {room.label}
                    </text>
                  </g>
                )}
              </For>

              {/* 结构梁 */}
              <For each={d().beams}>
                {(beam) => (
                  <g>
                    <rect
                      x={beam.x}
                      y={beam.y}
                      width={beam.w}
                      height={beam.h}
                      fill="#c9b8a8"
                      stroke="#8a7663"
                      stroke-width={8}
                    />
                    <Show when={lod() >= 1}>
                      <text
                        x={beam.x + beam.w / 2}
                        y={beam.y + 500}
                        font-size="180"
                        text-anchor="middle"
                        fill="#6b5a48"
                        transform={`rotate(-90 ${beam.x + beam.w / 2} ${beam.y + 500})`}
                      >
                        结构梁
                      </text>
                    </Show>
                  </g>
                )}
              </For>

              {/* 管线层 */}
              <For each={visiblePipelines()}>
                {(pipe) => {
                  const meta = PIPELINE_META[pipe.system];
                  const isHost = hostPipeline()?.id === pipe.id;
                  return (
                    <polyline
                      points={pipe.path.map((p) => p.join(',')).join(' ')}
                      fill="none"
                      stroke={isHost ? '#e11d48' : meta.color}
                      stroke-width={isHost ? 90 : pipe.status === 'warn' ? 55 : 42}
                      stroke-linejoin="round"
                      stroke-linecap="round"
                      stroke-dasharray={pipe.status === 'warn' && !isHost ? '140,90' : undefined}
                      opacity={selectedPoint() && !isHost ? 0.25 : 0.9}
                    />
                  );
                }}
              </For>

              {/* 点要素层（视口外已在 memo 中裁掉） */}
              <For each={visiblePoints()}>
                {(p) => {
                  const meta = POINT_TYPE_META[p.type];
                  const selected = selectedPointId() === p.id;
                  const openIss = openIssueByPoint().get(p.id);
                  const color = openIss ? SEVERITY_META[openIss.severity].color : meta.color;
                  const r = p.type === 'bed' ? 150 : 95;
                  return (
                    <g
                      transform={`translate(${p.x},${p.y})`}
                      class="map-point"
                      onClick={() => clickPoint(p)}
                      cursor="pointer"
                    >
                      <Show
                        when={p.type === 'bed'}
                        fallback={
                          <>
                            <Show when={lod() >= 1}>
                              <rect
                                x={-r}
                                y={-r}
                                width={r * 2}
                                height={r * 2}
                                rx={28}
                                fill="#fff"
                                stroke={color}
                                stroke-width={selected ? 26 : 14}
                              />
                            </Show>
                            <Show when={lod() === 0}>
                              <circle r={70} fill={color} opacity={0.85} />
                            </Show>
                            <text
                              font-size="110"
                              text-anchor="middle"
                              dominant-baseline="central"
                              fill={color}
                              font-weight={selected ? 700 : 500}
                            >
                              {symbolOf(p.type)}
                            </text>
                          </>
                        }
                      >
                        <rect
                          x={-110}
                          y={-260}
                          width={220}
                          height={520}
                          rx={40}
                          fill={openIss ? SEVERITY_META[openIss.severity].bg : '#eef1f5'}
                          stroke={color}
                          stroke-width={selected ? 26 : 12}
                        />
                      </Show>
                      <Show when={selected}>
                        <circle r={r + 120} fill="none" stroke="#e11d48" stroke-width={18} />
                      </Show>
                      <Show when={lod() >= 2}>
                        <text y={p.type === 'bed' ? 430 : 280} font-size="150" text-anchor="middle" fill="#334155">
                          {shortLabel(p)}
                        </text>
                        <Show when={p.type === 'belt' && p.heightMm !== undefined}>
                          <text y={p.type === 'bed' ? 600 : 450} font-size="140" text-anchor="middle" fill={p.heightMm === 1350 ? '#16a34a' : '#d83931'}>
                            H={p.heightMm}
                          </text>
                        </Show>
                      </Show>
                    </g>
                  );
                }}
              </For>

              {/* 问题标记（无点位锚点的如穿梁问题） */}
              <For each={visibleIssues().filter((i) => i.pointIds.length === 0)}>
                {(iss) => (
                  <g
                    transform={`translate(${iss.x},${iss.y})`}
                    class="map-point"
                    cursor="pointer"
                    onClick={() => {
                      selectIssue(iss.id === selectedIssueId() ? null : iss.id);
                      selectPoint(null);
                    }}
                  >
                    <circle r={260} fill={SEVERITY_META[iss.severity].color} opacity={0.18} />
                    <text font-size="300" text-anchor="middle" dominant-baseline="central" fill={SEVERITY_META[iss.severity].color} font-weight="700">
                      !
                    </text>
                  </g>
                )}
              </For>
            </g>
          )}
        </Show>
      </svg>

      {/* 图例 */}
      <div class="map-legend">
        <For each={Object.entries(LAYER_META) as [PointLayer, { label: string; color: string }][]}>
          {([key, meta]) => (
            <span class="legend-item">
              <i class="legend-dot" style={{ background: meta.color }} />
              {meta.label}
            </span>
          )}
        </For>
      </div>
    </div>
  );
}

function rank(s: Issue['severity']): number {
  return s === 'severe' ? 3 : s === 'major' ? 2 : 1;
}

function symbolOf(t: PlanPoint['type']): string {
  return t === 'call' ? '呼' : t === 'gas' ? '气' : t === 'strong' ? '强' : t === 'weak' ? '弱' : t === 'belt' ? '带' : '床';
}

function shortLabel(p: PlanPoint): string {
  return p.label.replace(/设备带|呼叫|医气|强电|弱电/g, '');
}
