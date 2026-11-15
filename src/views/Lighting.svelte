<script>
  import {
    cabinets, lights, placements, saveLight, deleteLight, uvReport, getFigure
  } from '../lib/store.svelte.js';
  import { angleFactor, dailyUvDose } from '../lib/rules.js';
  import { fmtNum } from '../lib/utils.js';
  import Modal from '../components/Modal.svelte';
  import UvChart from '../components/UvChart.svelte';
  import LightAngle from '../components/LightAngle.svelte';

  let cabId = $state(cabinets[0]?.id || null);
  $effect(() => { if (!cabId && cabinets.length) cabId = cabinets[0].id; });
  const cabLights = $derived(lights.filter(l => l.cabinetId === cabId));

  let showForm = $state(false);
  let editing = $state(null);
  let form = $state({ name: '', angleDeg: 30, hoursPerDay: 8, intensity: 12 });

  function openNew() {
    editing = null;
    form = { name: '', angleDeg: 30, hoursPerDay: 8, intensity: 12 };
    showForm = true;
  }
  function openEdit(l) {
    editing = l;
    form = { name: l.name, angleDeg: l.angleDeg, hoursPerDay: l.hoursPerDay, intensity: l.intensity };
    showForm = true;
  }
  function submit() {
    if (!cabId) { alert('请先创建展柜'); return; }
    saveLight({ id: editing?.id, cabinetId: cabId, ...form });
    showForm = false;
  }

  const report = $derived(uvReport());
  const chartData = $derived(report.map(r => ({
    name: r.figure.name.length > 7 ? r.figure.name.slice(0, 7) + '…' : r.figure.name,
    accumulated: r.accumulated,
    limit: r.limit,
    over: r.over
  })));
  const overCount = $derived(report.filter(r => r.over).length);
  const cabDaily = $derived(cabLights.reduce((s, l) => s + dailyUvDose(l), 0));
</script>

<div class="toolbar">
  <div class="left">
    <select bind:value={cabId} style="width:200px">
      {#each cabinets as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
    </select>
  </div>
  <div class="right">
    <button class="primary" onclick={openNew} disabled={!cabId}>+ 添加灯具</button>
  </div>
</div>

{#if !cabId}
  <div class="empty">请先在「展陈设计」中创建展柜。</div>
{:else}
  <div class="grid" style="grid-template-columns:1fr 1fr">
    <div class="card tight">
      <h3>灯具配置（{cabLights.length}）· 合计日剂量 <b class="num">{fmtNum(cabDaily)}</b> mJ/cm²</h3>
      {#if cabLights.length === 0}
        <p class="muted" style="margin-top:10px">尚未配置灯具</p>
      {:else}
        <table style="margin-top:8px">
          <thead><tr><th>灯具</th><th>入射角</th><th>日照射</th><th>强度</th><th>角度系数</th><th>日剂量</th><th></th></tr></thead>
          <tbody>
            {#each cabLights as l (l.id)}
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:8px">
                    <LightAngle angle={l.angleDeg} />
                    {l.name}
                  </div>
                </td>                <td class="num">{l.angleDeg}°</td>
                <td class="num">{l.hoursPerDay}h</td>
                <td class="num">{l.intensity}</td>
                <td class="num">{angleFactor(l.angleDeg).toFixed(2)}</td>
                <td class="num"><b>{fmtNum(dailyUvDose(l))}</b></td>
                <td class="nowrap">
                  <button class="sm" onclick={() => openEdit(l)}>编辑</button>
                  <button class="sm danger" onclick={() => confirm('删除该灯具？') && deleteLight(l.id)}>删</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
      <p class="muted" style="font-size:12px;margin-top:10px">
        日剂量 = 照射时长(h) × 角度系数 cos(θ) × 强度；累计剂量 = 日剂量 × 自陈列日起的天数。
      </p>
    </div>

    <div class="card tight">
      <h3>紫外线累计与换位建议 <span class="badge {overCount ? 'red' : 'green'}">{overCount ? `${overCount} 件超标` : '全部安全'}</span></h3>
      {#if report.length === 0}
        <p class="muted" style="margin-top:10px">暂无在展藏品</p>
      {:else}
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
          {#each report as r (r.placement.id)}
            <div class="alert {r.over ? 'red' : 'green'}">
              <div>
                <strong>{r.figure.name}</strong>
                <span class="muted">（{r.figure.material} · 已照 {r.days} 天）</span>
                <div>累计 <b class="num">{fmtNum(r.accumulated)}</b> / 阈值 {r.limit} mJ/cm² · 日均 {fmtNum(r.daily)}</div>
                {#if r.over}<div style="margin-top:4px">💡 {r.advice.advice}</div>{/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <div class="card tight" style="margin-top:14px">
    <h3>在展藏品 UV 累计对比（虚线为各材质耐受阈值）</h3>
    <UvChart data={chartData} />
  </div>
{/if}

{#if showForm}
  <Modal title={editing ? '编辑灯具' : '添加灯具'} onClose={() => (showForm = false)}>
    {#snippet children()}
      <div class="modal-body">
        <div class="field">
          <span class="lbl">灯具名称</span>
          <input bind:value={form.name} placeholder="例：顶层斜射射灯" />
        </div>
        <div class="row">
          <div class="field">
            <span class="lbl">灯光入射角（°，0=垂直照射）</span>
            <input type="number" min="0" max="85" bind:value={form.angleDeg} />
            <LightAngle angle={Number(form.angleDeg) || 0} large />
          </div>
          <div class="field">
            <span class="lbl">每日照射时长 (h)</span>
            <input type="number" min="0" max="24" bind:value={form.hoursPerDay} />
          </div>
          <div class="field">
            <span class="lbl">光照强度系数</span>
            <input type="number" min="0" bind:value={form.intensity} />
          </div>
        </div>
        <div class="alert blue">
          预计日紫外线剂量：<b class="num">{fmtNum(dailyUvDose(form))}</b> mJ/cm²（角度系数 {angleFactor(Number(form.angleDeg) || 0).toFixed(2)}）
        </div>
      </div>
      <div class="modal-foot">
        <button onclick={() => (showForm = false)}>取消</button>
        <button class="primary" onclick={submit}>保存</button>
      </div>
    {/snippet}
  </Modal>
{/if}

