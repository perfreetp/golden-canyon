<script>
  import { saveCabinet } from '../lib/store.svelte.js';
  import { uid } from '../lib/utils.js';

  let { cabinet = null, onSaved, onCancel } = $props();

  let form = $state({
    id: cabinet?.id || null,
    name: cabinet?.name || '',
    innerWidthMm: cabinet?.innerWidthMm ?? 900,
    innerHeightMm: cabinet?.innerHeightMm ?? 1000,
    shelves: cabinet?.shelves
      ? cabinet.shelves.map(s => ({ ...s }))
      : [{ id: uid('sh-'), name: '层板1', yMm: 300, maxLoadG: 2000 }]
  });

  function addShelf() {
    form.shelves.push({ id: uid('sh-'), name: `层板${form.shelves.length + 1}`, yMm: 600, maxLoadG: 2000 });
  }
  function removeShelf(i) { form.shelves.splice(i, 1); }

  function submit() {
    if (!form.name.trim()) { alert('请填写展柜名称'); return; }
    form.shelves = [...form.shelves].sort((a, b) => a.yMm - b.yMm);
    saveCabinet(form);
    onSaved?.();
  }
</script>

<style>
  .lbl { display: block; font-size: 12.5px; color: var(--ink-2); margin-bottom: 3px; }
</style>

<div class="modal-body">
  <div class="row">
    <div class="field" style="flex:2">
      <label>展柜名称</label>
      <input bind:value={form.name} placeholder="例：主展柜 A" />
    </div>
    <div class="field">
      <label>柜内净宽 (mm)</label>
      <input type="number" bind:value={form.innerWidthMm} />
    </div>
    <div class="field">
      <label>柜内净高 (mm)</label>
      <input type="number" bind:value={form.innerHeightMm} />
    </div>
  </div>

  <span class="lbl">层板配置（yMm = 层板距柜顶距离）</span>
  <table>
    <thead><tr><th>层板名</th><th>距柜顶 yMm</th><th>承重上限 (g)</th><th></th></tr></thead>
    <tbody>
      {#each form.shelves as s, i (s.id)}
        <tr>
          <td><input bind:value={s.name} /></td>
          <td><input type="number" bind:value={s.yMm} /></td>
          <td><input type="number" bind:value={s.maxLoadG} /></td>
          <td><button class="sm danger" onclick={() => removeShelf(i)}>删</button></td>
        </tr>
      {/each}
    </tbody>
  </table>
  <button class="sm" style="margin-top:8px" onclick={addShelf}>+ 添加层板</button>
</div>

<div class="modal-foot">
  <button onclick={() => onCancel?.()}>取消</button>
  <button class="primary" onclick={submit}>{cabinet ? '保存' : '创建展柜'}</button>
</div>
