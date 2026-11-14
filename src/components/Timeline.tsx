import { createEffect, createSignal, For, onCleanup, Show } from 'solid-js';
import * as d3 from 'd3';
import { activeAnim, removeKeyframe, setPlayer, state, upsertKeyframe } from '../store/store';
import type { BreathConfig, EaseType, SegmentEase } from '../types';
import { fmtTime } from '../util/math';

const W = 760, H = 190, M = { top: 34, right: 24, bottom: 30, left: 56 };
const ROW_Y = 96;

interface TimelineProps {
  onSelectSegment: (kfId: string) => void;
  selectedSegment: string | null;
}

function breathBands(b: BreathConfig, duration: number) {
  const cycle = b.inhale + b.hold + b.exhale;
  const bands: { x0: number; x1: number; phase: 'inhale' | 'hold' | 'exhale' }[] = [];
  let t = 0;
  while (t < duration - 0.001) {
    const segs: [number, 'inhale' | 'hold' | 'exhale'][] = [
      [b.inhale, 'inhale'], [b.hold, 'hold'], [b.exhale, 'exhale'],
    ];
    for (const [len, phase] of segs) {
      if (len <= 0) continue;
      const x1 = Math.min(duration, t + len);
      if (x1 > t) bands.push({ x0: t, x1, phase });
      t += len;
      if (t >= duration) break;
    }
    if (cycle <= 0) break;
  }
  return bands;
}

const EASE_LABEL: Record<EaseType, string> = { linear: '线', easeInOut: '缓', bezier: '贝' };

export function Timeline(props: TimelineProps) {
  let svgRef!: SVGSVGElement;
  const [dragTime, setDragTime] = createSignal<number | null>(null);

  const x = () => {
    const a = activeAnim();
    return d3.scaleLinear().domain([0, a.duration]).range([M.left, W - M.right]);
  };

  // D3 驱动：每次关键帧/缓动/呼吸变化重绘
  createEffect(() => {
    const svg = d3.select(svgRef!);
    const a = activeAnim();
    const xs = x();
    svg.selectAll('*').remove();

    // 底层点击区：点击时间轴空白处跳转播放头（最先插入，关键帧/段徽标在其之上优先命中）
    svg.append('rect').attr('class', 'scrub-layer')
      .attr('x', M.left).attr('y', M.top - 6)
      .attr('width', W - M.left - M.right).attr('height', H - M.top - M.bottom + 8)
      .attr('fill', 'transparent')
      .on('click', event => setPlayer({ time: xs.invert(event.offsetX ?? event.x) }));

    // 呼吸节奏底色带
    const phaseColor = { inhale: '#dbeafe', hold: '#f1f5f9', exhale: '#dcfce7' };
    svg.append('g').attr('class', 'breath')
      .selectAll('rect')
      .data(breathBands(a.breath, a.duration))
      .join('rect')
      .attr('x', d => xs(d.x0)).attr('y', M.top)
      .attr('width', d => Math.max(0, xs(d.x1) - xs(d.x0) - 1))
      .attr('height', H - M.top - M.bottom)
      .attr('fill', d => phaseColor[d.phase])
      .attr('opacity', 0.75);

    // 时间轴
    const axis = d3.axisBottom(xs).ticks(Math.min(12, a.duration)).tickFormat((d, i) => i % 2 === 0 ? `${d}s` : '');
    const gAxis = svg.append('g').attr('transform', `translate(0,${H - M.bottom})`).call(axis);
    gAxis.selectAll('text').attr('fill', '#64748b').style('font-size', '11px');
    gAxis.selectAll('line,path').attr('stroke', '#cbd5e1');

    // 呼吸图例
    const legend = svg.append('g').attr('transform', `translate(${M.left},14)`);
    const items: [string, string, string][] = [
      ['吸气', phaseColor.inhale, `${a.breath.inhale}s`],
      ['屏息', phaseColor.hold, `${a.breath.hold}s`],
      ['呼气', phaseColor.exhale, `${a.breath.exhale}s`],
    ];
    items.forEach(([label, color, sec], i) => {
      const g = legend.append('g').attr('transform', `translate(${i * 92},0)`);
      g.append('rect').attr('width', 14).attr('height', 10).attr('rx', 2).attr('fill', color).attr('stroke', '#94a3b8');
      g.append('text').attr('x', 18).attr('y', 9).style('font-size', '11px').attr('fill', '#475569').text(`${label} ${sec}`);
    });

    // 关键帧轨道
    svg.append('line')
      .attr('x1', M.left).attr('x2', W - M.right).attr('y1', ROW_Y).attr('y2', ROW_Y)
      .attr('stroke', '#94a3b8').attr('stroke-width', 2);

    const kfs = [...a.keyframes].sort((p, q) => p.time - q.time);

    // 段缓动徽标
    svg.append('g').selectAll('g.seg')
      .data(kfs.slice(0, -1))
      .join('g')
      .attr('class', 'seg')
      .attr('transform', d => `translate(${(xs(d.time) + xs(kfs[kfs.indexOf(d) + 1].time)) / 2},${ROW_Y - 26})`)
      .style('cursor', 'pointer')
      .on('click', (_, d) => props.onSelectSegment(d.id))
      .call(g => {
        g.append('rect')
          .attr('x', -16).attr('y', -11).attr('width', 32).attr('height', 18).attr('rx', 9)
          .attr('fill', d => props.selectedSegment === d.id ? '#0f766e' : '#e2e8f0')
          .attr('stroke', d => a.eases[d.id]?.type === 'bezier' ? '#d97706' : '#94a3b8');
        g.append('text')
          .attr('text-anchor', 'middle').attr('dy', '2px')
          .style('font-size', '11px').style('font-weight', 600)
          .attr('fill', d => props.selectedSegment === d.id ? '#fff' : '#334155')
          .text(d => EASE_LABEL[a.eases[d.id]?.type ?? 'easeInOut']);
      });

    // 关键帧菱形（可拖动改时间，双击删除）
    const kfG = svg.append('g').selectAll('g.kf')
      .data(kfs, (d: any) => d.id)
      .join('g')
      .attr('class', 'kf')
      .attr('transform', d => `translate(${xs(d.time)},${ROW_Y})`)
      .style('cursor', 'grab')
      .call(d3.drag<any, any>()
        .on('start', function (this: SVGGElement) { d3.select(this).style('cursor', 'grabbing'); })
        .on('drag', (event, d) => {
          const t = Math.max(0, Math.min(a.duration, xs.invert(event.x)));
          setDragTime(t);
          d3.select(event.sourceEvent.currentTarget as Element).attr('transform', `translate(${event.x},${ROW_Y})`);
        })
        .on('end', (event, d) => {
          d3.select(event.sourceEvent.currentTarget as Element).style('cursor', 'grab');
          const t = Math.max(0, Math.min(a.duration, xs.invert(event.x)));
          setDragTime(null);
          upsertKeyframe({ ...d, time: Math.round(t * 10) / 10 });
        }))
      .on('dblclick', (_, d) => removeKeyframe(d.id));

    kfG.append('path')
      .attr('d', d3.symbol().type(d3.symbolDiamond).size(150)!)
      .attr('fill', '#f59e0b').attr('stroke', '#b45309').attr('stroke-width', 1.4);
    kfG.append('text')
      .attr('y', 22).attr('text-anchor', 'middle')
      .style('font-size', '10px').attr('fill', '#64748b')
      .text(d => `${d.time}s`);

    // 播放头（仅线条与箭头，不再放拦截点击的矩形）
    const head = svg.append('g').attr('class', 'playhead');
    head.append('line')
      .attr('y1', M.top - 4).attr('y2', H - M.bottom)
      .attr('stroke', '#dc2626').attr('stroke-width', 1.6)
      .style('pointer-events', 'none');
    head.append('path').attr('d', 'M -6 0 L 6 0 L 0 8 Z').attr('fill', '#dc2626')
      .style('pointer-events', 'none');

    const updateHead = () => {
      const t = state.player.time;
      head.attr('transform', `translate(${xs(Math.min(t, a.duration))},0)`);
      head.select('text').remove();
      head.append('text').attr('y', M.top - 8).attr('text-anchor', 'middle')
        .style('font-size', '10px').attr('fill', '#dc2626').text(fmtTime(t));
    };
    updateHead();
    const raf = requestAnimationFrame(function loop() { updateHead(); rafId = requestAnimationFrame(loop); });
    let rafId = raf;
    onCleanup(() => cancelAnimationFrame(rafId));
  });

  return (
    <div class="panel">
      <div class="panel-title">
        时间轴
        <Show when={dragTime() !== null}>
          <span class="hint">拖动到 {dragTime()!.toFixed(1)}s · 双击菱形删除关键帧</span>
        </Show>
        <Show when={dragTime() === null}>
          <span class="hint">拖动菱形调整关键帧时间 · 点击段上的徽标编辑插值曲线</span>
        </Show>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} class="timeline" />
    </div>
  );
}
