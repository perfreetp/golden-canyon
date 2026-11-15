<script>
  import { db } from '../lib/store.js';
  import { DEFAULT_REGIONS, ELECTRODE_INFO, solveMontage, parseName } from '../lib/montage.js';
  import { resetDb } from '../lib/store.js';

  let dbState = $state({});
  db.subscribe((v) => { dbState = v; });

  let tab = $state('regions');
  const regionDict = $derived(dbState.regionDict || DEFAULT_REGIONS);
  const classes = $derived(dbState.classes || []);
  const courses = $derived(dbState.courses || []);
  const { nodes: LM } = solveMontage();

  let msg = $state('');
  let msgTimer = null;
  function flash(m) {
    msg = m;
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => (msg = ''), 2200);
  }

  /* ---------- 分区词典 ---------- */
  let editRegion = $state(JSON.parse(JSON.stringify(DEFAULT_REGIONS[0])));
  const ALL_LEADS = Object.keys(LM);

  function selectRegion(r) { editRegion = JSON.parse(JSON.stringify(r)); }
  function newRegion() {
    editRegion = { id: `reg-${Date.now()}`, name: '新分区', short: 'N', color: '#88a0b0', members: [], note: '' };
  }
  function saveRegion() {
    if (!editRegion) return;
    db.update((d) => {
      const exists = d.regionDict.some((r) => r.id === editRegion.id);
      const next = exists
        ? d.regionDict.map((r) => (r.id === editRegion.id ? { ...editRegion } : r))
        : [...d.regionDict, { ...editRegion }];
      return { ...d, regionDict: next };
    });
    flash('分区已保存，三维着色将同步刷新');
  }
  function removeRegion(id) {
    db.update((d) => ({ ...d, regionDict: d.regionDict.filter((r) => r.id !== id) }));
    if (editRegion?.id === id) editRegion = null;
    flash('分区已删除');
  }
  function toggleMember(lead) {
    if (!editRegion) return;
    const has = editRegion.members.includes(lead);
    const members = has ? editRegion.members.filter((l) => l !== lead) : [...editRegion.members, lead];
    // 一个电极只能归属一个分区：先从其他分区移除
    editRegion = { ...editRegion, members };
  }
  function addMemberToRegion(lead) {
    if (!editRegion) return;
    if (editRegion.members.includes(lead)) return;
    editRegion = { ...editRegion, members: [...editRegion.members, lead].sort() };
  }

  /* ---------- 题库 ---------- */
  const allItems = $derived(courses.flatMap((c) => c.items.map((i) => ({ ...i, courseId: c.id, courseTitle: c.title }))));
  let itemFilter = $state('');

  function toggleItemActive(item) {
    db.update((d) => ({
      ...d,
      courses: d.courses.map((c) =>
        c.id !== item.courseId ? c : { ...c, items: c.items.map((i) => (i.id === item.id ? { ...i, archived: !i.archived } : i)) },
      ),
    }));
  }

  /* ---------- 班级名单 ---------- */
  let activeClass = $state('cls-a');
  const cls = $derived(classes.find((c) => c.id === activeClass) || classes[0]);
  let newName = $state('');
  let newEmp = $state('');
  let newDept = $state('');

  function addStudent() {
    if (!newName.trim()) return;
    const id = `s-${Date.now()}`;
    db.update((d) => ({
      ...d,
      classes: d.classes.map((c) =>
        c.id !== cls.id ? c : {
          ...c,
          students: [...c.students, { id, name: newName.trim(), empNo: newEmp.trim() || `NEU${String(c.students.length + 1).padStart(2, '0')}`, dept: newDept.trim() || '—' }],
          headcount: c.students.length + 1,
        },
      ),
    }));
    newName = ''; newEmp = ''; newDept = '';
    flash('已添加学员');
  }

  function removeStudent(sid) {
    db.update((d) => ({
      ...d,
      classes: d.classes.map((c) =>
        c.id !== cls.id ? c : { ...c, students: c.students.filter((s) => s.id !== sid), headcount: Math.max(0, c.students.length - 1) },
      ),
    }));
  }

  /* ---------- 数据 ---------- */
  function exportAll() {
    const blob = new Blob([JSON.stringify(dbState, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `eeg1020-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }
  function hardReset() {
    if (!confirm('确认恢复演示数据？所有本地修改将丢失。')) return;
    resetDb();
    flash('已恢复演示数据');
  }

  const leadSort = (a, b) => (a < b ? -1 : 1);
  const groupedLeads = $derived.by(() => {
    const g = { Fp: [], F: [], C: [], P: [], T: [], O: [], A: [] };
    for (const l of ALL_LEADS) {
      const info = ELECTRODE_INFO[l];
      if (!info) continue;
      if (l.startsWith('Fp')) g.Fp.push(l);
      else g[l[0]]?.push(l);
    }
    return g;
  });
  const assigned = $derived(new Set(regionDict.flatMap((r) => r.members)));
  const unassigned = $derived(ALL_LEADS.filter((l) => !assigned.has(l)));
</script>

<div class="admin">
  <div class="tabs">
    <button class="tab" class:on={tab === 'regions'} onclick={() => (tab = 'regions')}>分区词典</button>
    <button class="tab" class:on={tab === 'bank'} onclick={() => (tab = 'bank')}>题库</button>
    <button class="tab" class:on={tab === 'classes'} onclick={() => (tab = 'classes')}>班级名单</button>
    <button class="tab" class:on={tab === 'data'} onclick={() => (tab = 'data')}>数据与规则</button>
    <div class="tab-spacer"></div>
    {#if msg}<span class="tag ok">{msg}</span>{/if}
  </div>

  {#if tab === 'regions'}
    <div class="regions-layout">
      <div class="panel list-panel">
        <div class="lp-head">
          <span class="eyebrow">分区词典 · {regionDict.length} 项</span>
          <button class="btn xs ghost" onclick={newRegion}>＋ 新建</button>
        </div>
        <div class="lp-body scroll">
          {#each regionDict as r}
            <button class="reg-item" class:sel={editRegion?.id === r.id} onclick={() => selectRegion(r)}>
              <span class="ri-sw" style={`background:${r.color}`}></span>
              <span class="ri-main">
                <b>{r.name}</b>
                <span class="dim mono">{r.members.join(' ') || '（未指派）'}</span>
              </span>
              <span class="ri-count mono">{r.members.length}</span>
            </button>
          {/each}
        </div>
        <div class="lp-foot">
          {#if unassigned.length}
            <div class="hint-line"><span class="warnc">!</span><span>{unassigned.length} 个电极未指派分区：<span class="mono">{unassigned.join(' ')}</span></span></div>
          {:else}
            <div class="hint-line"><span class="pos">✓</span><span>所有标准电极均已指派分区</span></div>
          {/if}
        </div>
      </div>

      <div class="panel edit-panel">
        {#if editRegion}
          <div class="ep-head">
            <h3>{editRegion.name}</h3>
            <div class="ep-acts">
              <button class="btn xs danger" onclick={() => removeRegion(editRegion.id)}>删除</button>
              <button class="btn xs primary" onclick={saveRegion}>保存</button>
            </div>
          </div>
          <div class="ep-body scroll">
            <div class="ep-grid">
              <div>
                <label class="lbl">分区名称</label>
                <input class="field" bind:value={editRegion.name} />
              </div>
              <div>
                <label class="lbl">缩写</label>
                <input class="field mono" bind:value={editRegion.short} maxlength="3" />
              </div>
              <div>
                <label class="lbl">标识色</label>
                <div class="color-row">
                  <input class="color-input" type="color" bind:value={editRegion.color} />
                  <span class="mono dim">{editRegion.color}</span>
                </div>
              </div>
            </div>
            <div class="ep-sec">
              <label class="lbl">归属电极</label>
              <div class="member-chips">
                {#each editRegion.members as m}
                  <span class="mem-chip">
                    <span class="mono">{m}</span>
                    <button onclick={() => toggleMember(m)}>×</button>
                  </span>
                {/each}
                {#if !editRegion.members.length}<span class="dim" style="font-size:11px">尚未指派电极</span>{/if}
              </div>
            </div>
            <div class="ep-sec">
              <label class="lbl">添加电极（点击即加入本分区）</label>
              {#each Object.entries(groupedLeads) as [k, leads]}
                <div class="gl-row">
                  <span class="gl-k">{k}</span>
                  <div class="gl-leads">
                    {#each leads.sort(leadSort) as l}
                      {@const owner = regionDict.find((r) => r.id !== editRegion.id && r.members.includes(l))}
                      <button
                        class="gl-chip"
                        class:mine={editRegion.members.includes(l)}
                        class:taken={!!owner}
                        onclick={() => addMemberToRegion(l)}
                        title={owner ? `当前归属：${owner.name}（点击可抢占）` : ''}
                      >
                        <span class="mono">{l}</span>
                        {#if owner}<span class="gl-owner">{owner.short}</span>{/if}
                      </button>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
            <div class="ep-sec">
              <label class="lbl">教学说明</label>
              <textarea class="field" rows="3" bind:value={editRegion.note} placeholder="该分区的解剖定位要点、常见误区…"></textarea>
            </div>
          </div>
        {:else}
          <div class="emptystate">选择左侧分区进行编辑，或新建一个分区</div>
        {/if}
      </div>
    </div>

  {:else if tab === 'bank'}
    <div class="panel block">
      <div class="block-head">
        <h3>题库 · 共 {allItems.length} 道题</h3>
        <div class="bh-right">
          <input class="field" style="width:200px" placeholder="搜索题目…" bind:value={itemFilter} />
        </div>
      </div>
      <table class="tbl">
        <thead>
          <tr><th>题目</th><th>所属课程</th><th>导联组合</th><th>限时</th><th>权重</th><th>状态</th><th></th></tr>
        </thead>
        <tbody>
          {#each allItems.filter(i => !itemFilter || i.title.includes(itemFilter)) as it}
            <tr>
              <td>{it.title}</td>
              <td class="dim">{it.courseTitle}</td>
              <td class="mono dim">{it.requiredLeads.length} 导联</td>
              <td class="mono dim">{it.minutes} 分</td>
              <td class="mono dim">{it.weights.naming}/{it.weights.region}/{it.weights.symmetry}/{it.weights.spacing}</td>
              <td><span class="tag" class:ok={!it.archived} class:danger={it.archived}>{it.archived ? '已归档' : '启用中'}</span></td>
              <td><button class="btn xs ghost" onclick={() => toggleItemActive(it)}>{it.archived ? '启用' : '归档'}</button></td>
            </tr>
          {/each}
        </tbody>
      </table>
      <div class="hint-line" style="margin-top:10px"><span>▸</span><span>题目内容在「出题建课」中编辑；此处用于查看全库与上下线管理。</span></div>
    </div>

  {:else if tab === 'classes'}
    <div class="classes-layout">
      <div class="panel list-panel">
        <div class="lp-head"><span class="eyebrow">班级</span></div>
        <div class="lp-body">
          {#each classes as c}
            <button class="reg-item" class:sel={cls?.id === c.id} onclick={() => (activeClass = c.id)}>
              <span class="ri-main">
                <b>{c.name}</b>
                <span class="dim mono">{c.code}</span>
              </span>
              <span class="ri-count mono">{c.students.length}</span>
            </button>
          {/each}
        </div>
      </div>
      <div class="panel block">
        <div class="block-head">
          <h3>{cls?.name}</h3>
          <span class="dim">{cls?.students.length} 名学员</span>
        </div>
        <div class="add-row">
          <input class="field" placeholder="姓名" bind:value={newName} />
          <input class="field mono" placeholder="工号（可留空）" bind:value={newEmp} />
          <input class="field" placeholder="科室" bind:value={newDept} />
          <button class="btn primary sm" onclick={addStudent} disabled={!newName.trim()}>添加</button>
        </div>
        <table class="tbl" style="margin-top:10px">
          <thead><tr><th>工号</th><th>姓名</th><th>科室</th><th>提交数</th><th></th></tr></thead>
          <tbody>
            {#each cls?.students || [] as s}
              {@const n = (dbState.submissions || []).filter((x) => x.studentId === s.id).length}
              <tr>
                <td class="mono dim">{s.empNo}</td>
                <td>{s.name}</td>
                <td class="dim">{s.dept}</td>
                <td class="mono dim">{n}</td>
                <td><button class="btn xs danger" onclick={() => removeStudent(s.id)}>移除</button></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

  {:else}
    <div class="panel block">
      <div class="block-head"><h3>数据与判分规则</h3></div>
      <div class="data-grid">
        <div class="dg-card">
          <h4>本地数据</h4>
          <p class="dim">所有课程、名单、提交记录保存在浏览器 localStorage，可导出备份或迁移到其他机器。</p>
          <div class="dg-actions">
            <button class="btn sm ghost" onclick={exportAll}>导出备份</button>
            <button class="btn sm danger" onclick={hardReset}>恢复演示数据</button>
          </div>
        </div>
        <div class="dg-card">
          <h4>统计</h4>
          <div class="stat-lines">
            <div><span class="dim">课程</span><b class="mono">{courses.length}</b></div>
            <div><span class="dim">题目</span><b class="mono">{allItems.length}</b></div>
            <div><span class="dim">学员</span><b class="mono">{classes.reduce((a, c) => a + c.students.length, 0)}</b></div>
            <div><span class="dim">提交</span><b class="mono">{dbState.submissions?.length ?? 0}</b></div>
            <div><span class="dim">分区</span><b class="mono">{regionDict.length}</b></div>
          </div>
        </div>
        <div class="dg-card wide">
          <h4>判分规则（全局）</h4>
          <div class="rule-grid">
            <div class="rule"><b class="mono">1.5 cm</b><span>最小电极间距</span><em>任意两电极中心距小于该值时扣分并红框提示</em></div>
            <div class="rule"><b class="mono">1.5 cm</b><span>左右对称容差</span><em>同名左右电极关于正中矢状面的镜像偏差上限</em></div>
            <div class="rule"><b class="mono">0.9 cm</b><span>中线容差</span><em>中线电极偏离正中矢状线的上限</em></div>
            <div class="rule"><b class="mono">2.8 cm</b><span>标记位容差</span><em>落点与标准 10-20 标记位的最大允许偏差</em></div>
          </div>
          <div class="rule-note">
            <b>命名规则：</b>Fp/F/C/P/O/T/A 前缀 + 编号；奇数=左侧、偶数=右侧；中线以 z 结尾且不带数字（Fz/Cz/Pz/Oz/Fpz）。
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .admin { display: flex; flex-direction: column; height: 100%; min-height: 0; padding: 10px 14px 14px; gap: 10px; }

  .tabs { display: flex; align-items: center; gap: 3px; padding: 3px; background: #0c1319; border: 1px solid var(--line); border-radius: 8px; }
  .tab { padding: 6px 14px; border: 0; border-radius: 6px; background: transparent; color: var(--text-3); font-size: 12px; font-weight: 500; }
  .tab:hover { color: var(--text); background: #131d25; }
  .tab.on { background: rgba(56,211,189,.12); color: var(--accent); }
  .tab-spacer { flex: 1; }

  .regions-layout, .classes-layout { display: grid; grid-template-columns: 300px 1fr; gap: 10px; flex: 1; min-height: 0; }

  .list-panel { display: flex; flex-direction: column; min-height: 0; padding: 11px; }
  .lp-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .lp-body { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 3px; overflow-y: auto; }
  .lp-foot { border-top: 1px solid var(--line); padding-top: 8px; margin-top: 6px; }
  .reg-item { display: flex; align-items: center; gap: 8px; padding: 7px 9px; border-radius: 6px; background: #0b1218; border: 1px solid var(--line); color: var(--text); text-align: left; transition: all .13s; }
  .reg-item:hover { border-color: #2c4050; background: #101a22; }
  .reg-item.sel { border-color: rgba(56,211,189,.5); background: rgba(56,211,189,.07); }
  .ri-sw { width: 10px; height: 10px; border-radius: 3px; flex: none; }
  .ri-main { flex: 1; display: flex; flex-direction: column; gap: 0; min-width: 0; }
  .ri-main b { font-size: 11.8px; font-weight: 600; }
  .ri-main span { font-size: 9.3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ri-count { font-size: 10px; color: var(--text-3); }

  .edit-panel { display: flex; flex-direction: column; min-height: 0; }
  .ep-head { display: flex; align-items: center; justify-content: space-between; padding: 11px 14px; border-bottom: 1px solid var(--line); }
  .ep-head h3 { margin: 0; font-size: 13px; font-weight: 650; }
  .ep-acts { display: flex; gap: 5px; }
  .ep-body { flex: 1; min-height: 0; overflow-y: auto; padding: 12px 14px; }
  .ep-grid { display: grid; grid-template-columns: 1fr 90px 1fr; gap: 10px; }
  .ep-sec { margin-top: 14px; }
  .color-row { display: flex; align-items: center; gap: 8px; }
  .color-input { width: 34px; height: 28px; padding: 0; border: 1px solid var(--line-2); border-radius: 5px; background: #0a1015; cursor: pointer; }
  .member-chips { display: flex; flex-wrap: wrap; gap: 5px; min-height: 26px; }
  .mem-chip { display: inline-flex; align-items: center; gap: 5px; padding: 2px 4px 2px 8px; border-radius: 5px; background: rgba(56,211,189,.12); border: 1px solid rgba(56,211,189,.35); font-size: 10.5px; color: var(--accent); }
  .mem-chip button { border: 0; background: none; color: inherit; cursor: pointer; font-size: 12px; line-height: 1; padding: 0 2px; opacity: .6; }
  .mem-chip button:hover { opacity: 1; }
  .gl-row { display: flex; gap: 7px; align-items: flex-start; margin-bottom: 5px; }
  .gl-k { width: 22px; font-size: 9.5px; color: var(--text-3); padding-top: 4px; flex: none; }
  .gl-leads { display: flex; flex-wrap: wrap; gap: 4px; }
  .gl-chip { display: inline-flex; align-items: center; gap: 5px; padding: 2px 7px; border-radius: 5px; background: #0d151b; border: 1px solid var(--line); color: var(--text-2); font-size: 10.5px; }
  .gl-chip:hover { border-color: #34495a; color: var(--text); }
  .gl-chip.mine { background: rgba(56,211,189,.13); border-color: rgba(56,211,189,.48); color: var(--accent); }
  .gl-chip.taken { border-style: dashed; }
  .gl-owner { font-size: 8.5px; padding: 0 3px; border-radius: 3px; background: #1c2833; color: var(--text-3); }
  .gl-chip.mine .gl-owner { background: rgba(56,211,189,.2); color: var(--accent); }

  .block { padding: 12px 15px 14px; }
  .block-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; gap: 10px; }
  .block-head h3 { margin: 0; font-size: 12.5px; font-weight: 650; }
  .bh-right { display: flex; gap: 6px; }

  .add-row { display: grid; grid-template-columns: 1fr 1fr 1.2fr auto; gap: 6px; }

  .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .dg-card { padding: 12px 14px; border-radius: 8px; background: #0b1218; border: 1px solid var(--line); }
  .dg-card.wide { grid-column: 1 / -1; }
  .dg-card h4 { margin: 0 0 5px; font-size: 12px; font-weight: 650; }
  .dg-card p { margin: 0 0 9px; font-size: 11px; line-height: 1.5; }
  .dg-actions { display: flex; gap: 6px; }
  .stat-lines { display: flex; flex-direction: column; gap: 3px; }
  .stat-lines div { display: flex; justify-content: space-between; font-size: 11px; }
  .rule-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .rule { padding: 9px 10px; border-radius: 6px; background: #0d151b; border: 1px solid var(--line); display: flex; flex-direction: column; gap: 2px; }
  .rule b { font-size: 15px; color: var(--accent); font-weight: 650; }
  .rule span { font-size: 10.5px; font-weight: 600; }
  .rule em { font-style: normal; font-size: 9.5px; color: var(--text-3); line-height: 1.4; }
  .rule-note { margin-top: 9px; padding: 8px 10px; border-radius: 6px; font-size: 10.5px; line-height: 1.55; background: rgba(106,168,232,.07); border: 1px solid rgba(106,168,232,.2); color: var(--text-2); }
  .rule-note b { color: var(--info); }

  @media (max-width: 1400px) { .regions-layout, .classes-layout { grid-template-columns: 260px 1fr; } .rule-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
