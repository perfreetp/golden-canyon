<script>
  import { figures, deleteFigure, figureStatus, damages, maintenance, getFigure } from '../lib/store.svelte.js';
  import { figureHeightMm, fmtNum } from '../lib/utils.js';
  import Modal from '../components/Modal.svelte';
  import FigureForm from '../components/FigureForm.svelte';

  let showForm = $state(false);
  let editing = $state(null);
  let detail = $state(null);
  let keyword = $state('');
  let statusFilter = $state('全部');

  const filtered = $derived(
    figures.filter(f => {
      const kw = keyword.trim().toLowerCase();
      const hit = !kw || [f.name, f.series, f.material, f.boxLocation].some(v => v?.toLowerCase().includes(kw));
      const st = figureStatus(f.id).status;
      return hit && (statusFilter === '全部' || st === statusFilter);
    })
  );

  const totalValue = $derived(figures.reduce((s, f) => s + (f.priceCny || 0), 0));

  function openNew() { editing = null; showForm = true; }
  function openEdit(f) { editing = f; showForm = true; }
  function remove(f) {
    if (confirm(`确认删除藏品「${f.name}」？其陈列与养护记录将一并移除。`)) deleteFigure(f.id);
  }
  function statusBadge(fid) {
    const { status } = figureStatus(fid);
    const map = { 在展: 'green', 在库: 'gray', 借展中: 'blue' };
    return `<span class="badge ${map[status]}">${status}</span>`;
  }
</script>

<div class="toolbar">
  <div class="left">
    <input placeholder="搜索名称 / 系列 / 材质 / 盒位" bind:value={keyword} style="width:260px" />
    <select bind:value={statusFilter} style="width:120px">
      {#each ['全部','在展','在库','借展中'] as s}<option>{s}</option>{/each}
    </select>
  </div>
  <div class="right">
    <span class="muted">共 {figures.length} 件 · 总入手价 ¥{fmtNum(totalValue, 0)}</span>
    <button class="primary" onclick={openNew}>+ 新建藏品档案</button>
  </div>
</div>

{#if figures.length === 0}
  <div class="empty">
    <p>还没有藏品档案。点击「新建藏品档案」录入比例、材质、入手价、瑕疵与包装盒存放位。</p>
  </div>
{:else}
  <div class="card tight scroll-x">
    <table>
      <thead>
        <tr>
          <th>藏品</th><th>比例</th><th>展陈高度</th><th>材质</th><th>重量</th>
          <th>入手价</th><th>瑕疵</th><th>包装盒存放位</th><th>状态</th><th></th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as f (f.id)}
          {@const st = figureStatus(f.id)}
          <tr>
            <td>
              <div style="display:flex;gap:10px;align-items:center">
                {#if f.photo}<img src={f.photo} class="photo-thumb" alt="" />{/if}
                <div>
                  <strong>{f.name}</strong>
                  <div class="muted" style="font-size:12px">{f.series}</div>
                </div>
              </div>
            </td>
            <td class="nowrap">{f.scale}</td>
            <td class="num nowrap">{figureHeightMm(f) != null ? Math.round(figureHeightMm(f)) : '—'} mm</td>
            <td>{f.material}</td>
            <td class="num">{f.weightG}g</td>
            <td class="num">¥{fmtNum(f.priceCny, 0)}</td>
            <td>
              {#if f.defects?.length}<span class="badge amber">{f.defects.length} 处</span>{:else}<span class="muted">无</span>{/if}
            </td>
            <td class="nowrap">{f.boxLocation || '—'}</td>
            <td><span class="badge {st.status === '在展' ? 'green' : st.status === '借展中' ? 'blue' : 'gray'}">{st.status}</span></td>
            <td class="nowrap">
              <button class="sm ghost" onclick={() => (detail = f)}>详情</button>
              <button class="sm" onclick={() => openEdit(f)}>编辑</button>
              <button class="sm danger" onclick={() => remove(f)}>删除</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

{#if showForm}
  <Modal title={editing ? '编辑藏品档案' : '新建藏品档案'} wide onClose={() => (showForm = false)}>
    {#snippet children()}
      <FigureForm {editing} onCancel={() => (showForm = false)} onSaved={() => (showForm = false)} />
    {/snippet}
  </Modal>
{/if}

{#if detail}
  {@const f = getFigure(detail.id)}
  {@const dmgList = damages.filter(d => d.figureId === f.id)}
  {@const mtList = maintenance.filter(t => t.figureId === f.id)}
  {@const st = figureStatus(f.id)}
  <Modal title={`藏品档案 · ${f.name}`} wide onClose={() => (detail = null)}>
    {#snippet children()}
      <div class="modal-body">
        <div style="display:flex;gap:18px">
          {#if f.photo}<img src={f.photo} class="photo-thumb lg" style="width:180px;height:180px" alt="" />{/if}
          <div style="flex:1" class="grid grid2">
            <div><span class="muted">系列：</span>{f.series || '—'}</div>
            <div><span class="muted">比例：</span>{f.scale}</div>
            <div><span class="muted">展陈高度：</span><b class="num">{figureHeightMm(f) != null ? Math.round(figureHeightMm(f)) : '—'} mm</b>{#if f.canonicalHeightMm}<span class="muted">（{f.canonicalHeightMm} ÷ {f.scale.split('/')[1]}）</span>{/if}</div>
            <div><span class="muted">材质：</span>{f.material}</div>
            <div><span class="muted">重量：</span>{f.weightG}g · 底座 {f.widthMm}×{f.depthMm}mm</div>
            <div><span class="muted">入手：</span>{f.acquiredDate} · ¥{fmtNum(f.priceCny, 0)}</div>
            <div><span class="muted">UV 耐受：</span>{f.uvLimitMj} mJ/cm²</div>
            <div><span class="muted">包装盒：</span>{f.boxLocation || '—'}</div>
            <div><span class="muted">状态：</span><span class="badge {st.status === '在展' ? 'green' : st.status === '借展中' ? 'blue' : 'gray'}">{st.status}</span>{#if st.loan}（{st.loan.loanNo}）{/if}</div>
          </div>
        </div>

        <h3 style="margin:18px 0 8px">瑕疵档案（{f.defects?.length || 0}）</h3>
        {#if f.defects?.length}
          <table><thead><tr><th>部位</th><th>描述</th><th>程度</th><th>日期</th></tr></thead>
            <tbody>{#each f.defects as d (d.id)}<tr><td>{d.part}</td><td>{d.desc}</td><td><span class="badge {d.level === '严重' ? 'red' : d.level === '明显' ? 'amber' : 'gray'}">{d.level}</span></td><td class="mono">{d.date}</td></tr>{/each}</tbody>
          </table>
        {:else}<p class="muted">暂无瑕疵记录</p>{/if}

        <h3 style="margin:18px 0 8px">损伤留档（{dmgList.length}）</h3>
        {#if dmgList.length}
          {#each dmgList as d (d.id)}
            <div class="card tight" style="margin-bottom:8px">
              <strong>{d.date}</strong> · {d.handler || '—'}：{d.desc}
              <div class="chip-list" style="margin:6px 0">
                {#each d.spots as s}<span class="chip">{s.part} ({Math.round(s.x * 100)}%,{Math.round(s.y * 100)}%) {s.note || ''}</span>{/each}
              </div>
              {#if d.photos?.length}<div style="display:flex;gap:8px">{#each d.photos as p}<img src={p} class="photo-thumb" alt="损伤照片" />{/each}</div>{/if}
            </div>
          {/each}
        {:else}<p class="muted">暂无损伤登记</p>{/if}

        <h3 style="margin:18px 0 8px">养护任务</h3>
        <table><thead><tr><th>类型</th><th>到期日</th><th>状态</th></tr></thead>
          <tbody>{#each mtList as t (t.id)}<tr><td>{t.kind}</td><td class="mono">{t.dueDate}</td><td>{#if t.done}<span class="badge green">已完成 {t.doneDate}</span>{:else}<span class="badge gray">待执行</span>{/if}</td></tr>{/each}</tbody>
        </table>
      </div>
      <div class="modal-foot"><button onclick={() => (detail = null)}>关闭</button></div>
    {/snippet}
  </Modal>
{/if}

<style>
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 18px; }
</style>
