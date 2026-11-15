<script>
  import { settings, resetAll, exportJson, importJson, MATERIAL_UV_DEFAULTS } from '../lib/store.svelte.js';
  import { download } from '../lib/utils.js';

  function doExport() {
    download(`藏品档案备份-${new Date().toISOString().slice(0, 10)}.json`, exportJson(), 'application/json');
  }
  function onImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { importJson(reader.result); alert('导入成功，页面数据已刷新'); }
      catch (err) { alert('导入失败：' + err.message); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }
  function doReset() {
    if (confirm('确认清空全部档案数据？此操作不可恢复，建议先导出备份。')) {
      resetAll();
      alert('已清空');
    }
  }
  function restoreDefaults() {
    Object.assign(settings.materialUvLimits, { ...MATERIAL_UV_DEFAULTS });
    localStorage.setItem('fca-store-v1', JSON.stringify({ ...JSON.parse(localStorage.getItem('fca-store-v1') || '{}'), settings }));
  }
</script>

<div class="grid" style="grid-template-columns:1fr 1fr">
  <div class="card">
    <h3>材质紫外线耐受阈值（mJ/cm²）</h3>
    <p class="muted" style="margin:6px 0 12px">超过阈值时，灯光页与看板会给出换位/降时长建议。新建藏品按材质自动带入，可在藏品档案中单独覆盖。</p>
    <table>
      <thead><tr><th>材质</th><th>默认阈值</th><th>当前阈值</th></tr></thead>
      <tbody>
        {#each Object.keys(MATERIAL_UV_DEFAULTS) as m (m)}
          <tr>
            <td>{m}</td>
            <td class="num muted">{MATERIAL_UV_DEFAULTS[m]}</td>
            <td><input type="number" bind:value={settings.materialUvLimits[m]} /></td>
          </tr>
        {/each}
      </tbody>
    </table>
    <button class="sm" style="margin-top:10px" onclick={restoreDefaults}>恢复默认阈值</button>
  </div>

  <div class="card">
    <h3>数据管理</h3>
    <p class="muted" style="margin:6px 0 14px">全部数据保存在本浏览器 localStorage，包括照片 dataURL。清理浏览器数据前请先导出 JSON 备份。</p>
    <div style="display:flex;flex-direction:column;gap:10px;max-width:320px">
      <button onclick={doExport}>导出完整档案 (JSON)</button>
      <label class="import-label">
        导入档案 (JSON)
        <input type="file" accept="application/json" onchange={onImport} hidden />
      </label>
      <button class="danger" onclick={doReset}>清空全部数据</button>
    </div>

    <h3 style="margin-top:24px">规则说明</h3>
    <ul class="muted" style="font-size:13px;line-height:1.9;padding-left:18px">
      <li>展陈高度按比例换算（1:7 = 角色真实身高 ÷ 7），实物高度优先。</li>
      <li>同层板藏品重量合计超过层板承重上限即判冲突。</li>
      <li>同层板相邻两件水平间距 &lt; 30mm 即判冲突，立面图红色虚线标出。</li>
      <li>日 UV 剂量 = 照射时长 × cos(入射角) × 强度，按陈列天数累计。</li>
      <li>养护周期 90 天：除尘到期后 14 天生成清洁任务，完成自动排下周期。</li>
      <li>借展应还日超 3 天自动标黄并推送通知。</li>
    </ul>
  </div>
</div>

<style>
  .import-label {
    display: block; text-align: center; border: 1px solid var(--line-strong);
    border-radius: 8px; padding: 7px 14px; background: var(--panel); cursor: pointer;
  }
  .import-label:hover { background: var(--panel-2); border-color: var(--accent); }
</style>
