<script>
  import { db, session, setView } from '../lib/store.js';
  import { solveMontage, ELECTRODE_INFO, DEFAULT_REGIONS } from '../lib/montage.js';
  import { CATEGORIES, THRESHOLDS } from '../lib/grading.js';
  import ScalpCanvas from '../components/ScalpCanvas.svelte';

  let dbState = $state({});
  db.subscribe((v) => { dbState = v; });
  let ses = $state({});
  session.subscribe((v) => { ses = v; });

  const courses = $derived(dbState.courses || []);
  let courseId = $state(ses.courseId || 'c-1020-basic');
  const course = $derived(courses.find((c) => c.id === courseId) || courses[0]);
  let itemId = $state(ses.itemId || course?.items?.[0]?.id);
  const item = $derived(course?.items?.find((i) => i.id === itemId) || course?.items?.[0]);
  const { nodes: LM } = solveMontage();

  let draft = $state(null);
  let dirty = $state(false);
  let toastMsg = $state('');

  // 载入草稿
  $effect(() => {
    if (item) {
      draft = {
        ...item,
        requiredLeads: [...item.requiredLeads],
        weights: { ...item.weights },
        hints: [...(item.hints || [])],
      };
      dirty = false;
    }
  });

  const ALL_LEADS = Object.keys(LM).filter((n) => !['A1', 'A2'].includes(n));
  const worn = $derived(draft?.requiredLeads || []);
  const ghosts = $derived(worn.filter((r) => LM[r]).map((r) => ({ id: `gh-${r}`, name: r, pos: LM[r].pos })));

  const weightTotal = $derived(CATEGORIES.reduce((s, c) => s + (draft?.weights?.[c.id] ?? 0), 0));

  function toggleLead(lead) {
    if (!draft) return;
    const has = draft.requiredLeads.includes(lead);
    draft.requiredLeads = has ? draft.requiredLeads.filter((l) => l !== lead) : [...draft.requiredLeads, lead];
    dirty = true;
  }

  function applyPreset(key) {
    const presets = {
      '10-20 全导': ['Fp1','Fp2','Fz','F3','F4','F7','F8','C3','C4','Cz','T3','T4','P3','P4','Pz','T5','T6','O1','O2','Oz'],
      '颞区补充': ['F7','F8','T3','T4','T5','T6','A1','A2'],
      '睡眠 8 导': ['F3','F4','C3','C4','O1','O2','A1','A2'],
      '中线 5 导': ['Fpz','Fz','Cz','Pz','Oz'],
      '双额双枕': ['Fp1','Fp2','F3','F4','O1','O2'],
    };
    draft.requiredLeads = [...presets[key]];
    dirty = true;
    toast(`已套用组合：${key}`);
  }

  function addHint() { draft.hints = [...draft.hints, '']; dirty = true; }
  function removeHint(i) { draft.hints = draft.hints.filter((_, k) => k !== i); dirty = true; }

  function save() {
    if (!draft) return;
    db.update((d) => ({
      ...d,
      courses: d.courses.map((c) =>
        c.id === course.id
          ? { ...c, items: c.items.map((i) => (i.id === draft.id ? { ...draft, requiredLeads: [...draft.requiredLeads] } : i)) }
          : c,
      ),
    }));
    dirty = false;
    toast('题目已保存');
  }

  function newItem() {
    const id = `it-${Date.now()}`;
    const next = {
      id, title: '未命名题目', type: '布点', minutes: 15, attempts: 1,
      requiredLeads: [], excludedLeads: [], weights: { naming: 25, region: 25, symmetry: 25, spacing: 25 },
      brief: '', hints: [], software: '',
    };
    db.update((d) => ({
      ...d,
      courses: d.courses.map((c) => (c.id === course.id ? { ...c, items: [...c.items, next] } : c)),
    }));
    itemId = id;
    toast('已新建题目');
  }

  function duplicateItem() {
    if (!item) return;
    const id = `it-${Date.now()}`;
    db.update((d) => ({
      ...d,
      courses: d.courses.map((c) => (c.id === course.id ? { ...c, items: [...c.items, { ...item, id, title: `${item.title}（副本）` }] } : c)),
    }));
    itemId = id;
  }

  function removeItem() {
    if (!item) return;
    db.update((d) => ({
      ...d,
      courses: d.courses.map((c) => (c.id === course.id ? { ...c, items: c.items.filter((i) => i.id !== item.id) } : c)),
    }));
    itemId = course.items.find((i) => i.id !== item.id)?.id;
    toast('题目已删除');
  }

  let toastTimer = null;
  function toast(m) {
    toastMsg = m;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastMsg = ''), 2000);
  }

  const leadGroups = [
    { k: 'Fp', name: '额极', leads: ALL_LEADS.filter((l) => l.startsWith('Fp')) },
    { k: 'F', name: '额区', leads: ALL_LEADS.filter((l) => l.startsWith('F') && !l.startsWith('Fp')) },
    { k: 'C', name: '中央', leads: ALL_LEADS.filter((l) => l.startsWith('C')) },
    { k: 'P', name: '顶区', leads: ALL_LEADS.filter((l) => l.startsWith('P')) },
    { k: 'T', name: '颞区', leads: ALL_LEADS.filter((l) => l.startsWith('T')) },
    { k: 'O', name: '枕区', leads: ALL_LEADS.filter((l) => l.startsWith('O')) },
    { k: 'A', name: '耳垂', leads: ['A1', 'A2'] },
  ];
</script>

<div class="builder">
  <!-- 左：课程/题目树 -->
  <aside class="tree panel">
    <div class="tree-head">
      <select class="field" bind:value={courseId}>
        {#each courses as c}<option value={c.id}>{c.title}</option>{/each}
      </select>
    </div>
    <div class="scroll tree-body">
      {#each course?.items || [] as it}
        <button class="tree-item" class:sel={it.id === itemId} onclick={() => (itemId = it.id)}>
          <span class="ti-main">
            <b>{it.title}</b>
            <span class="dim">{it.requiredLeads.length} 导联 · {it.minutes} 分钟</span>
          </span>
          <span class="ti-tag">{it.type}</span>
        </button>
      {/each}
      <div class="tree-acts">
        <button class="btn sm ghost wide" onclick={newItem}>＋ 新建题目</button>
        <button class="btn sm ghost" onclick={duplicateItem} disabled={!item}>复制</button>
        <button class="btn sm danger" onclick={removeItem} disabled={!item}>删除</button>
      </div>
    </div>
    <div class="tree-foot">
      <div class="hint-line"><span>▸</span><span>讲师端出题：设定导联组合、布点要求与判分权重，学员端按此评分。</span></div>
    </div>
  </aside>

  <!-- 中：编辑区 -->
  <section class="editor scroll">
    {#if draft}
      <div class="panel block">
        <div class="block-head">
          <h3>题目信息</h3>
          {#if dirty}<span class="tag gold">未保存</span>{:else}<span class="tag ok">已保存</span>{/if}
        </div>
        <div class="form-grid">
          <div class="fg-wide">
            <label class="lbl">题目名称</label>
            <input class="field" bind:value={draft.title} oninput={() => (dirty = true)} />
          </div>
          <div>
            <label class="lbl">限时（分钟）</label>
            <input class="field mono" type="number" min="3" max="120" bind:value={draft.minutes} oninput={() => (dirty = true)} />
          </div>
          <div>
            <label class="lbl">允许重做次数</label>
            <input class="field mono" type="number" min="1" max="5" bind:value={draft.attempts} oninput={() => (dirty = true)} />
          </div>
          <div class="fg-wide">
            <label class="lbl">布点要求（学员端展示）</label>
            <textarea class="field" rows="3" bind:value={draft.brief} oninput={() => (dirty = true)}></textarea>
          </div>
          <div class="fg-wide">
            <label class="lbl">设备/方案</label>
            <input class="field" bind:value={draft.software} oninput={() => (dirty = true)} placeholder="如 Nicolet / 颞叶癫痫方案" />
          </div>
        </div>
      </div>

      <div class="panel block">
        <div class="block-head">
          <h3>导联组合</h3>
          <div class="chips">
            {#each ['10-20 全导', '颞区补充', '睡眠 8 导', '中线 5 导', '双额双枕'] as p}
              <button class="btn xs ghost" onclick={() => applyPreset(p)}>{p}</button>
            {/each}
          </div>
        </div>
        <div class="chips" style="margin-bottom:10px">
          <span class="tag accent">已选 {draft.requiredLeads.length} 个导联</span>
          <span class="dim" style="font-size:11px">点击下方电极名可增删；已选导联会在右侧头模以标准位显示</span>
        </div>
        <div class="lead-groups">
          {#each leadGroups as g}
            <div class="lg">
              <div class="lg-title">{g.name}</div>
              <div class="lg-items">
                {#each g.leads as lead}
                  {@const on = draft.requiredLeads.includes(lead)}
                  <button class="lead-toggle" class:on onclick={() => toggleLead(lead)} title={ELECTRODE_INFO[lead]?.cn}>
                    <span class="lt-name mono">{lead}</span>
                    <span class="lt-cn">{ELECTRODE_INFO[lead]?.cn || ''}</span>
                    {#if on}<span class="lt-check">✓</span>{/if}
                  </button>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div class="panel block">
        <div class="block-head">
          <h3>判分权重</h3>
          <span class="tag" class:danger={weightTotal !== 100} class:ok={weightTotal === 100}>合计 {weightTotal} / 100</span>
        </div>
        <div class="weight-rows">
          {#each CATEGORIES as c}
            <div class="wrow">
              <div class="wrow-l">
                <b>{c.label}</b>
                <span class="dim">{c.desc}</span>
              </div>
              <input class="wslider" type="range" min="0" max="50" step="5" bind:value={draft.weights[c.id]} oninput={() => (dirty = true)} />
              <div class="wval mono">{draft.weights[c.id]}</div>
            </div>
          {/each}
        </div>
        {#if weightTotal !== 100}
          <div class="warn-box">权重合计不等于 100，系统将按比例折算总分（不影响相对评判）。</div>
        {/if}
      </div>

      <div class="panel block">
        <div class="block-head">
          <h3>判分阈值</h3>
          <span class="dim">全局默认，可按题目覆盖</span>
        </div>
        <div class="thr-grid">
          <div><label class="lbl">最小电极间距</label><div class="thr mono">{THRESHOLDS.minSpacing} cm</div></div>
          <div><label class="lbl">对称容差</label><div class="thr mono">≤ {THRESHOLDS.symmetryTolerance} cm</div></div>
          <div><label class="lbl">中线容差</label><div class="thr mono">≤ {THRESHOLDS.midlineTolerance} cm</div></div>
          <div><label class="lbl">标记位容差</label><div class="thr mono">{THRESHOLDS.regionTolerance} cm</div></div>
        </div>
      </div>

      <div class="panel block">
        <div class="block-head">
          <h3>定位提示</h3>
          <button class="btn xs ghost" onclick={addHint}>＋ 添加</button>
        </div>
        <div class="hint-list">
          {#each draft.hints as h, i}
            <div class="hint-row">
              <span class="mono dim">{String(i + 1).padStart(2, '0')}</span>
              <input class="field" bind:value={draft.hints[i]} oninput={() => (dirty = true)} placeholder="如：先找鼻根与枕外粗隆，拉出正中矢状线" />
              <button class="btn xs danger" onclick={() => removeHint(i)}>×</button>
            </div>
          {:else}
            <div class="dim" style="font-size:11.5px">暂无提示</div>
          {/each}
        </div>
      </div>

      <div class="save-bar">
        <span class="dim">{dirty ? '有未保存的修改' : '所有修改已保存'}</span>
        <div class="sb-acts">
          <button class="btn ghost" onclick={() => (dirty = false)} disabled={!dirty}>还原</button>
          <button class="btn primary" onclick={save} disabled={!dirty}>保存题目</button>
        </div>
      </div>
    {:else}
      <div class="emptystate">请选择或新建题目</div>
    {/if}
  </section>

  <!-- 右：标准位预览 -->
  <aside class="preview panel">
    <div class="pv-head"><span class="eyebrow">标准位预览</span><span class="dim">{worn.length} 导联</span></div>
    <div class="pv-canvas">
      <ScalpCanvas
        placements={[]}
        ghosts={ghosts}
        showRegions={true}
        showLabels={false}
        editable={false}
        selectedId={null}
        minSpacing={THRESHOLDS.minSpacing}
        presetSeq={1}
        presetKey="top"
      />
    </div>
    <div class="pv-list scroll">
      {#each leadGroups as g}
        {@const on = g.leads.filter((l) => worn.includes(l))}
        {#if on.length}
          <div class="pv-row">
            <span class="pv-g">{g.name}</span>
            <span class="pv-leads mono">{on.join(' ')}</span>
          </div>
        {/if}
      {/each}
    </div>
  </aside>
</div>

{#if toastMsg}<div class="toast" style="right:20px">{toastMsg}</div>{/if}

<style>
  .builder { display: grid; grid-template-columns: 232px 1fr 306px; gap: 10px; padding: 10px; height: 100%; min-height: 0; }

  .tree { display: flex; flex-direction: column; min-height: 0; padding: 11px; }
  .tree-head { margin-bottom: 8px; }
  .tree-body { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 4px; }
  .tree-item {
    display: flex; align-items: center; gap: 7px; width: 100%;
    padding: 8px 9px; border-radius: 7px; text-align: left;
    background: #0c1319; border: 1px solid var(--line); color: var(--text);
    transition: all .13s;
  }
  .tree-item:hover { border-color: #2d4150; background: #101a22; }
  .tree-item.sel { border-color: rgba(56,211,189,.5); background: rgba(56,211,189,.07); }
  .ti-main { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .ti-main b { font-size: 11.6px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ti-main span { font-size: 9.8px; }
  .ti-tag { font-size: 9px; padding: 0 5px; border-radius: 4px; background: #16222c; color: var(--text-3); flex: none; }
  .tree-acts { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--line); }
  .tree-acts .wide { justify-content: center; }
  .tree-foot { border-top: 1px solid var(--line); padding-top: 8px; margin-top: 6px; }

  .editor { display: flex; flex-direction: column; gap: 10px; min-height: 0; overflow-y: auto; padding-right: 2px; }
  .block { padding: 12px 14px; }
  .block-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
  .block-head h3 { margin: 0; font-size: 12.5px; font-weight: 650; }

  .form-grid { display: grid; grid-template-columns: 1fr 130px 130px; gap: 9px; }
  .fg-wide { grid-column: 1 / -1; }
  textarea.field { resize: vertical; line-height: 1.5; font-size: 12px; }

  .chips { display: flex; gap: 5px; flex-wrap: wrap; align-items: center; }
  .lead-groups { display: flex; flex-direction: column; gap: 8px; }
  .lg { display: flex; gap: 8px; align-items: flex-start; }
  .lg-title { width: 34px; flex: none; font-size: 10px; color: var(--text-3); padding-top: 4px; }
  .lg-items { display: flex; flex-wrap: wrap; gap: 4px; flex: 1; }
  .lead-toggle {
    display: flex; align-items: center; gap: 4px;
    padding: 3px 7px; border-radius: 5px; font-size: 11px;
    background: #0d151b; border: 1px solid var(--line); color: var(--text-2);
    transition: all .12s;
  }
  .lead-toggle:hover { border-color: #34495a; color: var(--text); }
  .lead-toggle.on { background: rgba(56,211,189,.13); border-color: rgba(56,211,189,.48); color: var(--accent); }
  .lt-name { font-weight: 650; font-size: 10.8px; }
  .lt-cn { font-size: 9.3px; opacity: .7; }
  .lt-check { font-size: 9px; }

  .weight-rows { display: flex; flex-direction: column; gap: 9px; }
  .wrow { display: grid; grid-template-columns: 1fr 150px 34px; gap: 10px; align-items: center; }
  .wrow-l { display: flex; flex-direction: column; }
  .wrow-l b { font-size: 11.5px; font-weight: 600; }
  .wrow-l span { font-size: 10px; }
  .wval { text-align: right; font-size: 12px; }

  input.wslider { -webkit-appearance: none; appearance: none; height: 4px; border-radius: 3px; background: #1b2731; outline: none; }
  input.wslider::-webkit-slider-thumb {
    -webkit-appearance: none; width: 13px; height: 13px; border-radius: 50%;
    background: var(--accent); border: 2px solid #0b1218; cursor: pointer;
    box-shadow: 0 0 7px rgba(56,211,189,.4);
  }

  .warn-box { margin-top: 9px; padding: 7px 10px; border-radius: 6px; font-size: 10.5px; background: rgba(240,189,104,.09); border: 1px solid rgba(240,189,104,.28); color: var(--gold); }

  .thr-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .thr { font-size: 13px; color: var(--text); }

  .hint-list { display: flex; flex-direction: column; gap: 5px; }
  .hint-row { display: flex; align-items: center; gap: 6px; }
  .hint-row .mono { font-size: 10px; width: 16px; }

  .save-bar {
    position: sticky; bottom: 0; display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px; border-radius: var(--radius);
    background: rgba(12,19,25,.94); border: 1px solid var(--line); backdrop-filter: blur(8px);
  }
  .sb-acts { display: flex; gap: 7px; }

  .preview { display: flex; flex-direction: column; min-height: 0; }
  .pv-head { display: flex; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid var(--line); }
  .pv-canvas { height: 330px; flex: none; background: #080d12; border-bottom: 1px solid var(--line); }
  .pv-list { flex: 1; min-height: 0; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; }
  .pv-row { display: flex; gap: 8px; font-size: 10px; }
  .pv-g { width: 30px; color: var(--text-3); flex: none; }
  .pv-leads { color: var(--text-2); word-break: break-all; font-size: 10px; }

  @media (max-width: 1440px) {
    .builder { grid-template-columns: 208px 1fr 268px; }
    .pv-canvas { height: 250px; }
  }
</style>
