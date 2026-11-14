import { createEffect, createSignal, For, Show } from 'solid-js';
import * as d3 from 'd3';
import { activeAnim, setSegmentEase } from '../store/store';
import type { EaseType, SegmentEase } from '../types';
import { bezierEase } from '../util/math';

const W = 300, H = 240, PAD = 28;

const PRESETS: { type: EaseType; label: string; cp1: [number, number]; cp2: [number, number] }[] = [
  { type: 'linear', label: '线性', cp1: [0.25, 0.25], cp2: [0.75, 0.75] },
  { type: 'easeInOut', label: '缓入缓出', cp1: [0.42, 0], cp2: [0.58, 1] },
  { type: 'bezier', label: '自定义贝塞尔', cp1: [0.7, 0], cp2: [0.2, 1] },
];

export function EaseEditor(props: { segmentKfId: string | null; onClose: () => void }) {
  let svgRef!: SVGSVGElement;
  const [version, setVersion] = createSignal(0);

  const seg = (): SegmentEase | null => {
    if (!props.segmentKfId) return null;
    const a = activeAnim();
    return a.eases[props.segmentKfId] ?? { type: 'easeInOut', cp1: [0.42, 0], cp2: [0.58, 1] };
  };

  const save = (e: SegmentEase) => {
    if (props.segmentKfId) setSegmentEase(props.segmentKfId, e);
    setVersion(v => v + 1);
  };

  createEffect(() => {
    version(); props.segmentKfId;
    const e = seg();
    const svg = d3.select(svgRef!);
    svg.selectAll('*').remove();
    if (!e) return;

    const xs = d3.scaleLinear().domain([0, 1]).range([PAD, W - PAD]);
    const ys = d3.scaleLinear().domain([0, 1]).range([H - PAD, PAD]);

    // 网格 + 对角线
    const grid = svg.append('g');
    [0, 0.25, 0.5, 0.75, 1].forEach(v => {
      grid.append('line').attr('x1', xs(v)).attr('x2', xs(v)).attr('y1', PAD).attr('y2', H - PAD).attr('stroke', '#e2e8f0');
      grid.append('line').attr('y1', ys(v)).attr('y2', ys(v)).attr('x1', PAD).attr('x2', W - PAD).attr('stroke', '#e2e8f0');
    });
    svg.append('line').attr('x1', xs(0)).attr('y1', ys(0)).attr('x2', xs(1)).attr('y2', ys(1))
      .attr('stroke', '#cbd5e1').attr('stroke-dasharray', '4 4');

    // 曲线
    const line = d3.line<number>().x(t => xs(t)).y(t => ys(bezierEase(e.cp1, e.cp2, t))).curve(d3.curveLinear);
    if (e.type === 'linear') {
      svg.append('line').attr('x1', xs(0)).attr('y1', ys(0)).attr('x2', xs(1)).attr('y2', ys(1))
        .attr('stroke', '#0f766e').attr('stroke-width', 2.5);
    } else if (e.type === 'easeInOut') {
      svg.append('path').attr('d', line(d3.range(0, 1.001, 0.02))).attr('fill', 'none')
        .attr('stroke', '#0f766e').attr('stroke-width', 2.5);
    } else {
      // 贝塞尔手柄
      svg.append('path')
        .attr('d', `M${xs(0)},${ys(0)} L${xs(e.cp1[0])},${ys(e.cp1[1])} M${xs(1)},${ys(1)} L${xs(e.cp2[0])},${ys(e.cp2[1])}`)
        .attr('stroke', '#d97706').attr('stroke-dasharray', '4 3');
      svg.append('path').attr('d', line(d3.range(0, 1.001, 0.02))).attr('fill', 'none')
        .attr('stroke', '#0f766e').attr('stroke-width', 2.5);
      const handles: { key: 'cp1' | 'cp2'; val: [number, number] }[] = [
        { key: 'cp1', val: e.cp1 }, { key: 'cp2', val: e.cp2 },
      ];
      svg.append('g').selectAll('circle.handle')
        .data(handles).join('circle').attr('class', 'handle')
        .attr('cx', d => xs(d.val[0])).attr('cy', d => ys(d.val[1])).attr('r', 7)
        .attr('fill', '#f59e0b').attr('stroke', '#b45309').style('cursor', 'grab')
        .call(d3.drag<any, { key: 'cp1' | 'cp2'; val: [number, number] }>()
          .on('drag', (event, d) => {
            const nx = Math.max(0, Math.min(1, xs.invert(event.x)));
            const ny = Math.max(-0.3, Math.min(1.3, ys.invert(event.y)));
            const next: SegmentEase = { ...e, type: 'bezier', cp1: [...e.cp1] as [number, number], cp2: [...e.cp2] as [number, number] };
            next[d.key][0] = nx;
            next[d.key][1] = ny;
            save(next);
          }));
    }
    // 端点
    svg.append('circle').attr('cx', xs(0)).attr('cy', ys(0)).attr('r', 4).attr('fill', '#334155');
    svg.append('circle').attr('cx', xs(1)).attr('cy', ys(1)).attr('r', 4).attr('fill', '#334155');
    svg.append('text').attr('x', PAD).attr('y', H - 6).style('font-size', '10px').attr('fill', '#94a3b8').text('时间进度 →');
    svg.append('text').attr('x', 6).attr('y', PAD - 8).style('font-size', '10px').attr('fill', '#94a3b8').text('值');
  });

  return (
    <div class="panel ease-editor">
      <div class="panel-title">
        插值曲线
        <button class="btn-mini" onClick={props.onClose}>收起</button>
      </div>
      <Show when={seg()} fallback={<p class="hint">在时间轴选择两个关键帧之间的段（点击缓动徽标）</p>}>
        {e => (
          <>
            <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} class="ease-svg" />
            <div class="preset-row">
              <For each={PRESETS}>{preset => (
                <button
                  class="btn-mini"
                  classList={{ active: e().type === preset.type }}
                  onClick={() => save({ type: preset.type, cp1: [...preset.cp1] as [number, number], cp2: [...preset.cp2] as [number, number] })}
                >
                  {preset.label}
                </button>
              )}</For>
            </div>
            <Show when={e().type === 'bezier'}>
              <p class="hint">拖动橙色手柄手动调节贝塞尔曲线，x 限定 0~1，y 允许略微超出</p>
            </Show>
          </>
        )}
      </Show>
    </div>
  );
}
