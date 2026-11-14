import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';
import * as d3 from 'd3';
import { state } from '../store/store';

const MONTHS = ['全部', '2026-09', '2026-10', '2026-11'];

function BarChart(props: { id: string; data: { label: string; value: number }[]; color: string; h?: number }) {
  let ref!: SVGSVGElement;
  const W = 520, H = () => props.h ?? 220;
  createEffect(() => {
    const data = props.data;
    const svg = d3.select(ref!);
    svg.selectAll('*').remove();
    const m = { top: 16, right: 12, bottom: 46, left: 44 };
    const xs = d3.scaleBand().domain(data.map(d => d.label)).range([m.left, W - m.right]).padding(0.35);
    const maxV = Math.max(1, ...data.map(d => d.value));
    const ys = d3.scaleLinear().domain([0, maxV]).nice().range([H() - m.bottom, m.top]);
    svg.append('g').attr('transform', `translate(0,${H() - m.bottom})`)
      .call(d3.axisBottom(xs)).selectAll('text')
      .attr('fill', '#64748b').style('font-size', '10px')
      .attr('transform', 'rotate(-24)').attr('text-anchor', 'end');
    svg.append('g').attr('transform', `translate(${m.left},0)`)
      .call(d3.axisLeft(ys).ticks(5)).selectAll('text').attr('fill', '#64748b').style('font-size', '10px');
    svg.selectAll('.domain,.tick line').attr('stroke', '#cbd5e1');
    svg.append('g').selectAll('rect').data(data).join('rect')
      .attr('x', d => xs(d.label)!).attr('y', d => ys(d.value))
      .attr('width', xs.bandwidth()).attr('height', d => ys(0) - ys(d.value))
      .attr('fill', props.color).attr('rx', 3);
    svg.append('g').selectAll('text.val').data(data).join('text')
      .attr('x', d => xs(d.label)! + xs.bandwidth() / 2).attr('y', d => ys(d.value) - 4)
      .attr('text-anchor', 'middle').style('font-size', '10px').attr('fill', '#475569')
      .text(d => d.value);
  });
  return <svg ref={ref} viewBox={`0 0 ${W} ${H()}`} class="chart" />;
}

function LineChart(props: { id: string; data: { label: string; value: number }[] }) {
  let ref!: SVGSVGElement;
  const W = 520, H = 220;
  createEffect(() => {
    const data = props.data;
    const svg = d3.select(ref!);
    svg.selectAll('*').remove();
    const m = { top: 16, right: 16, bottom: 40, left: 44 };
    const xs = d3.scalePoint().domain(data.map(d => d.label)).range([m.left, W - m.right]);
    const ys = d3.scaleLinear().domain([0, Math.max(0.1, d3.max(data, d => d.value) ?? 1)]).nice()
      .range([H - m.bottom, m.top]);
    svg.append('g').attr('transform', `translate(0,${H - m.bottom})`).call(d3.axisBottom(xs))
      .selectAll('text').attr('fill', '#64748b').style('font-size', '10px');
    svg.append('g').attr('transform', `translate(${m.left},0)`).call(d3.axisLeft(ys).ticks(6).tickFormat(d3.format('.0%')))
      .selectAll('text').attr('fill', '#64748b').style('font-size', '10px');
    svg.selectAll('.domain,.tick line').attr('stroke', '#cbd5e1');
    const line = d3.line<{ label: string; value: number }>()
      .x(d => xs(d.label)!).y(d => ys(d.value)).curve(d3.curveMonotoneX);
    svg.append('path').datum(data).attr('d', line).attr('fill', 'none')
      .attr('stroke', '#0f766e').attr('stroke-width', 2.4);
    svg.append('g').selectAll('circle').data(data).join('circle')
      .attr('cx', d => xs(d.label)!).attr('cy', d => ys(d.value)).attr('r', 3.5).attr('fill', '#0f766e');
  });
  return <svg ref={ref} viewBox={`0 0 ${W} ${H}`} class="chart" />;
}

export function OpsView() {
  const [courseId, setCourseId] = createSignal('全部');
  const [coach, setCoach] = createSignal('全部');
  const [month, setMonth] = createSignal('全部');

  const coaches = createMemo(() => [...new Set(state.courses.map(c => c.coach))]);

  const filtered = createMemo(() => state.events.filter(e =>
    (courseId() === '全部' || e.courseId === courseId()) &&
    (coach() === '全部' || e.coach === coach()) &&
    (month() === '全部' || e.month === month())));

  const total = () => filtered().length;
  const done = () => filtered().filter(e => e.completed).length;
  const completionRate = () => (total() ? done() / total() : 0);
  const repeatRate = () => (total() ? filtered().filter(e => e.repeated).length / total() : 0);
  const exitAvg = () => {
    const exits = filtered().filter(e => !e.completed && e.exitPoint > 0);
    return exits.length ? d3.mean(exits, e => e.exitPoint)! : 0;
  };

  // 月度趋势
  const trend = createMemo(() => {
    const ms = MONTHS.slice(1);
    return ms.map(m => {
      const rows = filtered().filter(e => e.month === m);
      return { label: m, value: rows.length ? rows.filter(e => e.completed).length / rows.length : 0 };
    });
  });

  // 按课程统计
  const byCourse = createMemo(() => state.courses
    .filter(c => courseId() === '全部' || c.id === courseId())
    .map(c => {
      const rows = filtered().filter(e => e.courseId === c.id);
      return { label: c.title.length > 8 ? c.title.slice(0, 8) + '…' : c.title, value: rows.length };
    }));

  // 按教练统计
  const byCoach = createMemo(() => coaches()
    .filter(name => coach() === '全部' || name === coach())
    .map(name => ({ label: name, value: filtered().filter(e => e.coach === name).length })));

  // 中途退出时间点分布（按 30 秒分桶）
  const exitBuckets = createMemo(() => {
    const bins = d3.bin().value((e: any) => e.exitPoint).domain([0, 1800]).thresholds(d3.range(0, 1801, 30));
    const rows = bins(filtered().filter(e => !e.completed && e.exitPoint > 0) as any);
    return rows.map(b => ({ label: `${b.x0}s`, value: b.length })).filter(d => d.value > 0);
  });

  // 不适部位汇总（跨学员）
  const painSummary = createMemo(() => {
    const m = new Map<string, number>();
    for (const s of state.students) for (const f of s.feedback) m.set(f.part, (m.get(f.part) ?? 0) + 1);
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  });

  return (
    <div class="view ops-view">
      <div class="view-head">
        <h2>治未病中心运营看板</h2>
        <div class="filters">
          <label class="ctl inline">课程
            <select value={courseId()} onChange={e => setCourseId(e.currentTarget.value)}>
              <option>全部</option>
              <For each={state.courses}>{c => <option value={c.id}>{c.title}</option>}</For>
            </select>
          </label>
          <label class="ctl inline">教练
            <select value={coach()} onChange={e => setCoach(e.currentTarget.value)}>
              <option>全部</option>
              <For each={coaches()}>{name => <option>{name}</option>}</For>
            </select>
          </label>
          <label class="ctl inline">月份
            <select value={month()} onChange={e => setMonth(e.currentTarget.value)}>
              <For each={MONTHS}>{m => <option>{m}</option>}</For>
            </select>
          </label>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi"><span>练习总人次</span><b>{total()}</b></div>
        <div class="kpi"><span>完课率</span><b>{(completionRate() * 100).toFixed(1)}%</b></div>
        <div class="kpi"><span>复练率</span><b>{(repeatRate() * 100).toFixed(1)}%</b></div>
        <div class="kpi"><span>平均退出点</span><b>{Math.round(exitAvg())}s</b><em>约 {(exitAvg() / 60).toFixed(1)} 分钟</em></div>
      </div>

      <div class="chart-grid">
        <div class="panel chart-card">
          <div class="panel-title">完课率月度趋势</div>
          <LineChart id="trend" data={trend()} />
        </div>
        <div class="panel chart-card">
          <div class="panel-title">各课程练习人次</div>
          <BarChart id="course" data={byCourse()} color="#0f766e" />
        </div>
        <div class="panel chart-card">
          <div class="panel-title">各教练带练人次</div>
          <BarChart id="coach" data={byCoach()} color="#7c3aed" />
        </div>
        <div class="panel chart-card">
          <div class="panel-title">中途退出时间点分布（30 秒分桶）</div>
          <Show when={exitBuckets().length} fallback={<div class="empty">当前筛选下无中途退出记录</div>}>
            <BarChart id="exit" data={exitBuckets()} color="#dc2626" h={220} />
          </Show>
        </div>
        <div class="panel chart-card">
          <div class="panel-title">学员不适部位汇总</div>
          <Show when={painSummary().length} fallback={<div class="empty">暂无不适反馈</div>}>
            <BarChart id="pain" data={painSummary()} color="#d97706" />
          </Show>
        </div>
      </div>
    </div>
  );
}
