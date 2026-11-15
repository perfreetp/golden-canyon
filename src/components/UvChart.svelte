<script>
  import { onMount } from 'svelte';
  import * as d3 from 'd3';

  let { data = [], width = 720, height = 280 } = $props();
  let host = $state(null);

  function render() {
    if (!host) return;
    d3.select(host).selectAll('*').remove();
    if (!data.length) {
      d3.select(host).append('text').attr('x', width / 2).attr('y', height / 2)
        .attr('text-anchor', 'middle').attr('fill', '#a99e8d').text('暂无在展藏品的紫外线数据');
      return;
    }
    const margin = { top: 24, right: 24, bottom: 78, left: 64 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const svg = d3.select(host).append('svg').attr('width', width).attr('height', height);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(data.map(d => d.name)).range([0, w]).padding(0.28);
    const maxV = d3.max(data, d => Math.max(d.accumulated, d.limit)) * 1.15;
    const y = d3.scaleLinear().domain([0, maxV]).range([h, 0]).nice();

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x))
      .selectAll('text').attr('transform', 'rotate(-26)').style('text-anchor', 'end')
      .style('font-size', '11px').style('fill', '#6b6257');
    g.append('g').call(d3.axisLeft(y).ticks(6)).selectAll('text').style('font-size', '11px').style('fill', '#6b6257');

    g.append('text').attr('x', -10).attr('y', -8).style('font-size', '11px').style('fill', '#6b6257').text('mJ/cm²');

    // 耐受阈值参考线
    g.selectAll('.limit-line').data(data).join('line')
      .attr('x1', d => x(d.name) - 4).attr('x2', d => x(d.name) + x.bandwidth() + 4)
      .attr('y1', d => y(d.limit)).attr('y2', d => y(d.limit))
      .attr('stroke', '#b3402f').attr('stroke-dasharray', '5 4').attr('stroke-width', 1.5);

    const bars = g.selectAll('.bar').data(data).join('g');
    bars.append('rect')
      .attr('x', d => x(d.name)).attr('width', x.bandwidth())
      .attr('y', y(0)).attr('height', 0)
      .attr('rx', 4)
      .attr('fill', d => (d.over ? '#b3402f' : '#3f7d52'))
      .transition().duration(600)
      .attr('y', d => y(d.accumulated)).attr('height', d => h - y(d.accumulated));

    bars.append('text')
      .attr('x', d => x(d.name) + x.bandwidth() / 2)
      .attr('y', d => y(d.accumulated) - 6)
      .attr('text-anchor', 'middle').style('font-size', '11px').style('font-weight', '600')
      .style('fill', d => (d.over ? '#b3402f' : '#285236'))
      .text(d => d.accumulated);

    // 图例
    const lg = svg.append('g').attr('transform', `translate(${margin.left},4)`);
    lg.append('line').attr('x1', 0).attr('x2', 22).attr('y1', 0).attr('y2', 0)
      .attr('stroke', '#b3402f').attr('stroke-dasharray', '5 4');
    lg.append('text').attr('x', 28).attr('y', 4).style('font-size', '11px').style('fill', '#6b6257').text('材质 UV 耐受阈值');
  }

  onMount(render);
  $effect(render);

  // 容器尺寸自适应
  let ro;
  onMount(() => {
    ro = new ResizeObserver(() => {
      width = host?.clientWidth || 720;
      render();
    });
    if (host) ro.observe(host);
    return () => ro?.disconnect();
  });
</script>

<div bind:this={host} class="chart-host"></div>

<style>
  .chart-host { width: 100%; overflow-x: auto; }
  .chart-host :global(svg) { display: block; max-width: 100%; height: auto; }
</style>
