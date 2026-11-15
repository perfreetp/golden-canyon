<script>
  import { figures, maintenance, completeMaintenance, getFigure } from '../lib/store.svelte.js';
  import { MAINT_CYCLE_DAYS, isMaintenanceOverdue } from '../lib/rules.js';
  import { daysUntil, todayStr } from '../lib/utils.js';

  let filter = $state('全部');

  const rows = $derived(
    maintenance
      .map(t => ({ ...t, figure: getFigure(t.figureId), remain: daysUntil(t.dueDate) }))
      .filter(r => r.figure)
      .sort((a, b) => (a.done === b.done ? a.dueDate.localeCompare(b.dueDate) : a.done ? 1 : -1))
  );
  const shown = $derived(rows.filter(r => {
    if (filter === '全部') return true;
    if (filter === '逾期') return !r.done && isMaintenanceOverdue(r);
    if (filter === '待执行') return !r.done;
    return r.done;
  }));
  const overdueCount = $derived(rows.filter(r => !r.done && isMaintenanceOverdue(r)).length);

  function badgeOf(r) {
    if (r.done) return ['green', '已完成'];
    if (isMaintenanceOverdue(r)) return ['red', `逾期 ${-r.remain} 天`];
    if (r.remain <= 7) return ['amber', `${r.remain} 天后到期`];
    return ['gray', `${r.remain} 天后到期`];
  }
</script>

<div class="toolbar">
  <div class="left">
    <h2>90 天周期养护任务</h2>
  </div>
  <div class="right">
    <span class="badge {overdueCount ? 'red' : 'green'}">{overdueCount ? `${overdueCount} 项逾期` : '无逾期'}</span>
    <select bind:value={filter} style="width:130px">
      {#each ['全部','待执行','逾期','已完成'] as f}<option>{f}</option>{/each}
    </select>
  </div>
</div>

<div class="alert blue" style="margin-bottom:14px">
  规则：每件藏品自上次养护（或入手日）起每 {MAINT_CYCLE_DAYS} 天生成一次「除尘」任务，14 天后生成配套「清洁」任务；完成后自动排下一周期。今日 {todayStr()}。
</div>

{#if shown.length === 0}
  <div class="empty">暂无任务。新建藏品档案后会自动生成养护计划。</div>
{:else}
  <div class="card tight scroll-x">
    <table>
      <thead><tr><th>藏品</th><th>任务</th><th>到期日</th><th>状态</th><th>完成记录</th><th></th></tr></thead>
      <tbody>
        {#each shown as r (r.id)}
          {@const [cls, text] = badgeOf(r)}
          <tr>
            <td>
              <div style="display:flex;gap:8px;align-items:center">
                {#if r.figure.photo}<img src={r.figure.photo} class="photo-thumb" alt="" />{/if}
                <div><strong>{r.figure.name}</strong><div class="muted" style="font-size:12px">{r.figure.material} · {r.figure.scale}</div></div>
              </div>
            </td>
            <td><span class="chip">{r.kind}</span></td>
            <td class="mono nowrap">{r.dueDate}</td>
            <td><span class="badge {cls}">{text}</span></td>
            <td class="muted">{r.done ? r.doneDate : '—'}</td>
            <td>
              {#if !r.done}
                <button class="sm primary" onclick={() => completeMaintenance(r.id)}>标记完成并排下周期</button>
              {:else}
                <span class="muted">下一周期已自动生成</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
