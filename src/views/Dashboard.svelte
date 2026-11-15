<script>
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import {
    figures, placements, loans, maintenance, damages, figureStatus
  } from '../lib/store.svelte.js';
  import { isMaintenanceOverdue, loanOverdueDays } from '../lib/rules.js';
  import { daysUntil } from '../lib/utils.js';

  let { ongo } = $props();
  let donutHost = $state(null);

  const onDisplay = $derived(placements.length);
  const onLoan = $derived(loans.filter(l => l.stage !== '已归还').length);
  // 在库 = 总数 − 借展中 − 既在展又未借出的件数，避免重复口径
  const displayedNotOnLoan = $derived(placements.filter(p => !loans.some(l => l.stage !== '已归还' && l.figureIds.includes(p.figureId))).length);
  const inStock = $derived(Math.max(0, figures.length - onLoan - displayedNotOnLoan));
  const overdueLoans = $derived(loans.filter(l => loanOverdueDays(l) > 0));
  const overdueMaint = $derived(maintenance.filter(isMaintenanceOverdue));
  const upcomingMaint = $derived(
    maintenance.filter(t => !t.done && !isMaintenanceOverdue(t) && daysUntil(t.dueDate) <= 14)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  );

  const donutData = $derived([
    { label: '在展', value: displayedNotOnLoan, color: '#3f7d52' },
    { label: '借展中', value: onLoan, color: '#35648f' },
    { label: '在库', value: inStock, color: '#b3a690' }
  ]);

  function renderDonut() {
    if (!donutHost) return;
    d3.select(donutHost).selectAll('*').remove();
    const size = 210, r = 78, ir = 48;
    const svg = d3.select(donutHost).append('svg').attr('width', size).attr('height', size);
    const g = svg.append('g').attr('transform', `translate(${size / 2},${size / 2})`);
    const pie = d3.pie().value(d => d.value).sort(null);
    const arc = d3.arc().innerRadius(ir).outerRadius(r);
    const total = donutData.reduce((s, d) => s + d.value, 0);

    g.selectAll('path').data(pie(total ? donutData : [{ label: '空', value: 1, color: '#e6ddcc' }]))
      .join('path').attr('d', arc).attr('fill', d => d.data.color)
      .attr('stroke', '#fffdf8').attr('stroke-width', 2);

    g.append('text').attr('text-anchor', 'middle').attr('dy', '-2px')
      .style('font-size', '26px').style('font-weight', '700').text(total);
    g.append('text').attr('text-anchor', 'middle').attr('dy', '18px')
      .style('font-size', '11px').style('fill', '#6b6257').text('藏品总数');

    const legend = svg.append('g').attr('transform', `translate(12,${size - 22})`);
    donutData.forEach((d, i) => {
      const item = legend.append('g').attr('transform', `translate(${i * 66},0)`);
      item.append('rect').attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', d.color);
      item.append('text').attr('x', 14).attr('y', 9).style('font-size', '11.5px').style('fill', '#6b6257').text(`${d.label} ${d.value}`);
    });
  }
  onMount(renderDonut);
  $effect(renderDonut);

  function figName(id) { return figures.find(f => f.id === id)?.name || '—'; }
</script>

<div class="kpi-grid">
  <div class="card tight kpi"><span class="v">{figures.length}</span><span class="l">藏品总数</span></div>
  <div class="card tight kpi"><span class="v green-text">{onDisplay}</span><span class="l">在展数量</span></div>
  <div class="card tight kpi"><span class="v {overdueLoans.length ? 'red-text' : ''}">{overdueLoans.length}</span><span class="l">超期未还（宽限3天）</span></div>
  <div class="card tight kpi"><span class="v {overdueMaint.length ? 'red-text' : ''}">{overdueMaint.length}</span><span class="l">养护逾期任务</span></div>
  <div class="card tight kpi"><span class="v">{loans.length}</span><span class="l">借展单据累计</span></div>
  <div class="card tight kpi"><span class="v">{damages.length}</span><span class="l">损伤登记条数</span></div>
</div>

<div class="grid two">
  <div class="card tight">
    <h3>藏品分布</h3>
    <div bind:this={donutHost} class="donut"></div>
    <div style="text-align:center;margin-top:6px">
      <button class="sm" onclick={() => ongo('cabinet')}>去展陈设计 →</button>
    </div>
  </div>

  <div class="card tight">
    <h3>待办预警</h3>
    <div class="todo">
      {#if overdueLoans.length}
        <div class="alert red" style="margin-bottom:8px">
          <div>
            <strong>借展超期 {overdueLoans.length} 单</strong>
            {#each overdueLoans as l (l.id)}
              <div class="todo-line">
                <span class="mono">{l.loanNo}</span> · {l.org || l.borrower} · 超 {loanOverdueDays(l)} 天
                <button class="sm" onclick={() => ongo('loans')}>处理</button>
              </div>
            {/each}
          </div>
        </div>
      {/if}
      {#if overdueMaint.length}
        <div class="alert amber" style="margin-bottom:8px">
          <div>
            <strong>养护逾期 {overdueMaint.length} 项</strong>
            {#each overdueMaint.slice(0, 5) as t (t.id)}
              <div class="todo-line">
                {figName(t.figureId)} · {t.kind} · 应于 {t.dueDate} 完成
                <button class="sm" onclick={() => ongo('maintenance')}>去处理</button>
              </div>
            {/each}
          </div>
        </div>
      {/if}
      {#if upcomingMaint.length}
        <div class="alert blue">
          <div>
            <strong>14 天内到期 {upcomingMaint.length} 项</strong>
            {#each upcomingMaint.slice(0, 4) as t (t.id)}
              <div class="todo-line">{figName(t.figureId)} · {t.kind} · {t.dueDate}（{daysUntil(t.dueDate)} 天）</div>
            {/each}
          </div>
        </div>
      {/if}
      {#if !overdueLoans.length && !overdueMaint.length && !upcomingMaint.length}
        <div class="alert green">运行状态良好，暂无预警事项。</div>
      {/if}
    </div>
  </div>
</div>

<div class="grid two" style="margin-top:14px">
  <div class="card tight">
    <h3>在展藏品一览（{onDisplay}）</h3>
    {#if placements.length === 0}
      <p class="muted">暂无陈列，可前往展陈设计拖拽摆位。</p>
    {:else}
      <table>
        <thead><tr><th>藏品</th><th>比例</th><th>陈列日</th><th>状态</th></tr></thead>
        <tbody>
          {#each placements as p (p.id)}
            {@const f = figures.find(x => x.id === p.figureId)}
            {#if f}
              <tr>
                <td>{f.name}</td><td>{f.scale}</td><td class="mono">{p.placedOn}</td>
                <td><span class="badge green">在展</span></td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    {/if}
  </div>

  <div class="card tight">
    <h3>借展进行中（{onLoan}）</h3>
    {#if onLoan === 0}
      <p class="muted">当前无外借藏品。</p>
    {:else}
      <table>
        <thead><tr><th>单据</th><th>借展方</th><th>状态</th><th>应还</th></tr></thead>
        <tbody>
          {#each loans.filter(l => l.stage !== '已归还') as l (l.id)}
            <tr>
              <td class="mono">{l.loanNo}</td>
              <td>{l.org || l.borrower}</td>
              <td><span class="badge {l.yellow ? 'red' : 'blue'}">{l.stage}{l.yellow ? ` · 超${loanOverdueDays(l)}天` : ''}</span></td>
              <td class="mono">{l.dueReturnDate}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>

<style>
  .kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 14px; }
  .grid.two { grid-template-columns: 1fr 1.4fr; }
  .donut { display: flex; justify-content: center; }
  .green-text { color: var(--green); }
  .red-text { color: var(--red); }
  .todo-line { display: flex; align-items: center; gap: 8px; margin-top: 5px; font-size: 12.5px; flex-wrap: wrap; }
  @media (max-width: 1100px) {
    .kpi-grid { grid-template-columns: repeat(3, 1fr); }
    .grid.two { grid-template-columns: 1fr; }
  }
</style>
