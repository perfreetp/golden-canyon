<script>
  import { MATERIALS, saveFigure, settings } from '../lib/store.svelte.js';
  import { SCALES, todayStr } from '../lib/utils.js';
  import { fileToDataUrl } from '../lib/photo.js';

  let { figure = null, onSaved, onCancel } = $props();

  let form = $state({
    id: figure?.id || null,
    name: figure?.name || '',
    series: figure?.series || '',
    scale: figure?.scale || '1/7',
    canonicalHeightMm: figure?.canonicalHeightMm ?? '',
    actualHeightMm: figure?.actualHeightMm ?? '',
    material: figure?.material || 'PVC',
    weightG: figure?.weightG ?? '',
    widthMm: figure?.widthMm ?? '',
    depthMm: figure?.depthMm ?? '',
    acquiredDate: figure?.acquiredDate || todayStr(),
    priceCny: figure?.priceCny ?? '',
    boxLocation: figure?.boxLocation || '',
    photo: figure?.photo || '',
    uvLimitMj: figure?.uvLimitMj ?? '',
    defects: figure?.defects ? figure.defects.map(d => ({ ...d })) : []
  });

  const previewHeight = $derived(
    form.actualHeightMm
      ? Number(form.actualHeightMm)
      : form.canonicalHeightMm
        ? Math.round(Number(form.canonicalHeightMm) / Number(form.scale.split('/')[1]))
        : null
  );

  function onMaterialChange(e) {
    form.material = e.target.value;
    if (!form.uvLimitMj || figure?.uvLimitMj === settings.materialUvLimits[figure?.material]) {
      form.uvLimitMj = settings.materialUvLimits[form.material];
    }
  }

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    form.photo = await fileToDataUrl(file);
  }

  function addDefect() {
    form.defects.push({ id: crypto.randomUUID(), part: '涂装面', desc: '', level: '轻微', date: todayStr() });
  }
  function removeDefect(i) { form.defects.splice(i, 1); }

  function submit() {
    if (!form.name.trim()) { alert('请填写藏品名称'); return; }
    const id = saveFigure(form);
    onSaved?.(id);
  }
</script>

<div class="modal-body">
  <div class="row">
    <div class="field" style="flex:2">
      <label>藏品名称 *</label>
      <input bind:value={form.name} placeholder="例：星野凛奈 制服Ver." />
    </div>
    <div class="field">
      <label>作品系列</label>
      <input bind:value={form.series} placeholder="例：青空学园" />
    </div>
  </div>

  <div class="row">
    <div class="field">
      <label>比例</label>
      <select bind:value={form.scale}>
        {#each SCALES as s}<option value={s}>{s}</option>{/each}
      </select>
    </div>
    <div class="field">
      <label>角色真实身高 (mm)</label>
      <input type="number" bind:value={form.canonicalHeightMm} placeholder="如 1580" />
    </div>
    <div class="field">
      <label>实物高度 (mm，优先)</label>
      <input type="number" bind:value={form.actualHeightMm} placeholder="留空则按比例换算" />
    </div>
  </div>
  <div class="alert blue" style="margin-bottom:12px">
    按 {form.scale} 换算展陈高度：<strong class="num">{previewHeight ?? '—'} mm</strong>
    （实物高度优先，否则 = 真实身高 ÷ {form.scale.split('/')[1]}）
  </div>

  <div class="row">
    <div class="field">
      <label>材质</label>
      <select value={form.material} onchange={onMaterialChange}>
        {#each MATERIALS as m}<option value={m}>{m}</option>{/each}
      </select>
    </div>
    <div class="field">
      <label>重量 (g)</label>
      <input type="number" bind:value={form.weightG} placeholder="用于层板承重核算" />
    </div>
    <div class="field">
      <label>底座宽 × 深 (mm)</label>
      <div style="display:flex;gap:6px">
        <input type="number" bind:value={form.widthMm} placeholder="宽" />
        <input type="number" bind:value={form.depthMm} placeholder="深" />
      </div>
    </div>
  </div>

  <div class="row">
    <div class="field">
      <label>入手日期</label>
      <input type="date" bind:value={form.acquiredDate} />
    </div>
    <div class="field">
      <label>入手价 (¥)</label>
      <input type="number" step="0.01" bind:value={form.priceCny} />
    </div>
    <div class="field">
      <label>UV 耐受阈值 (mJ/cm²)</label>
      <input type="number" bind:value={form.uvLimitMj} />
    </div>
  </div>

  <div class="field">
    <label>包装盒存放位</label>
    <input bind:value={form.boxLocation} placeholder="例：储藏室A-01-左" />
  </div>

  <div class="field">
    <label>藏品照片</label>
    <div style="display:flex;gap:12px;align-items:center">
      {#if form.photo}<img src={form.photo} class="photo-thumb lg" alt="藏品照片" />{/if}
      <input type="file" accept="image/*" onchange={onPhoto} />
      {#if form.photo}<button class="sm danger" onclick={() => (form.photo = '')}>移除照片</button>{/if}
    </div>
  </div>

  <div class="field">
    <label>瑕疵档案</label>
    {#each form.defects as d, i (d.id)}
      <div class="defect-row">
        <select bind:value={d.part} style="width:120px">
          {#each ['头部','面部','躯干','左臂','右臂','左腿','右腿','底座','武器/配件','涂装面','包装盒'] as p}
            <option>{p}</option>
          {/each}
        </select>
        <input bind:value={d.desc} placeholder="瑕疵描述" />
        <select bind:value={d.level} style="width:90px">
          <option>轻微</option><option>明显</option><option>严重</option>
        </select>
        <button class="sm danger" onclick={() => removeDefect(i)}>删</button>
      </div>
    {/each}
    <button class="sm" onclick={addDefect}>+ 添加瑕疵记录</button>
  </div>
</div>

<div class="modal-foot">
  <button onclick={() => onCancel?.()}>取消</button>
  <button class="primary" onclick={submit}>{figure ? '保存修改' : '建立档案'}</button>
</div>

<style>
  .defect-row { display: flex; gap: 8px; margin-bottom: 6px; }
</style>
