<script>
  import { BODY_PARTS } from '../lib/store.svelte.js';
  import { fileToDataUrl } from '../lib/photo.js';

  let { figure, spots = $bindable(), photos = $bindable(), desc = $bindable() } = $props();
  let svgEl = $state(null);
  let activePart = $state('头部');

  function onClick(e) {
    const rect = svgEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    spots.push({ x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000, part: activePart, note: '' });
  }
  function onKey(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    const rect = svgEl.getBoundingClientRect();
    spots.push({ x: 0.5, y: 0.5, part: activePart, note: '' });
  }
  function removeSpot(i) { spots.splice(i, 1); }

  async function onPhotos(e) {
    for (const file of e.target.files || []) {
      photos.push(await fileToDataUrl(file, 1100, 0.75));
    }
    e.target.value = '';
  }
</script>

<div class="picker">
  <div class="field">
    <span class="lbl">损伤描述</span>
    <textarea rows="2" bind:value={desc} placeholder="例：归还验收发现左臂关节处漆面开裂"></textarea>
  </div>

  <div class="field">
    <span class="lbl">点选损伤部位（先选部位标签，再在图上点击）</span>
    <div class="chip-list" style="margin-bottom:8px">
      {#each BODY_PARTS as p}
        <button type="button" class="sm {activePart === p ? 'primary' : ''}" onclick={() => (activePart = p)}>{p}</button>
      {/each}
    </div>
    <div class="figure-canvas">
      {#if figure.photo}
        <img src={figure.photo} alt="藏品图" />
      {/if}
      <svg bind:this={svgEl} viewBox="0 0 100 140" preserveAspectRatio="none"
           role="button" tabindex="0" aria-label="点选损伤部位图，回车在中心添加标记"
           onclick={onClick} onkeydown={onKey}>
        <!-- 人形分区轮廓（无照片时的底图） -->
        {#if !figure.photo}
          <g class="silhouette" fill="#e6ddcc" stroke="#b3a690" stroke-width="0.6">
            <circle data-part="头部" cx="50" cy="16" r="11" />
            <rect data-part="躯干" x="36" y="28" width="28" height="46" rx="8" />
            <rect data-part="左臂" x="24" y="30" width="10" height="40" rx="5" />
            <rect data-part="右臂" x="66" y="30" width="10" height="40" rx="5" />
            <rect data-part="左腿" x="39" y="74" width="9" height="48" rx="4.5" />
            <rect data-part="右腿" x="52" y="74" width="9" height="48" rx="4.5" />
            <rect data-part="底座" x="22" y="124" width="56" height="10" rx="3" />
          </g>
        {/if}
        {#each spots as s, i (i)}
          <g transform="translate({s.x * 100},{s.y * 140})">
            <circle r="4.2" fill="#b3402f" stroke="#fff" stroke-width="1" />
            <text y="-5.5" text-anchor="middle" class="spot-label">{i + 1}.{s.part}</text>
          </g>
        {/each}
      </svg>
    </div>
  </div>

  {#if spots.length}
    <div class="field">
      <span class="lbl">已标部位（{spots.length}）</span>
      <table>
        <thead><tr><th>#</th><th>部位</th><th>备注</th><th></th></tr></thead>
        <tbody>
          {#each spots as s, i (i)}
            <tr>
              <td>{i + 1}</td>
              <td>
                <select bind:value={s.part}>
                  {#each BODY_PARTS as p}<option>{p}</option>{/each}
                </select>
              </td>
              <td><input bind:value={s.note} placeholder="如：掉漆2mm" /></td>
              <td><button type="button" class="sm danger" onclick={() => removeSpot(i)}>删</button></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <div class="field">
    <span class="lbl">拍照留档（可多张，自动压缩）</span>
    <input type="file" accept="image/*" multiple capture="environment" onchange={onPhotos} />
    {#if photos.length}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
        {#each photos as p, i (i)}
          <div class="photo-wrap">
            <img src={p} class="photo-thumb lg" alt="损伤照片" />
            <button type="button" class="sm danger photo-del" onclick={() => photos.splice(i, 1)}>✕</button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .figure-canvas {
    position: relative; width: 240px; height: 336px;
    border: 1px solid var(--line-strong); border-radius: 10px; overflow: hidden; background: #faf6ec;
  }
  .figure-canvas img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
  .figure-canvas svg { position: absolute; inset: 0; width: 100%; height: 100%; cursor: crosshair; }
  .spot-label { font-size: 6px; fill: #b3402f; font-weight: 700; paint-order: stroke; stroke: #fff; stroke-width: 1.2px; }
  .lbl { display: block; font-size: 12.5px; color: var(--ink-2); margin-bottom: 3px; }
  .photo-wrap { position: relative; }
  .photo-del { position: absolute; top: -6px; right: -6px; padding: 1px 6px; border-radius: 999px; }
</style>
