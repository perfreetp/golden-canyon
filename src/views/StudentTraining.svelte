<script>
  import { db, session } from '../lib/store.js';
  import ScalpCanvas from '../components/ScalpCanvas.svelte';
  import { solveMontage, DEFAULT_REGIONS, classifyRegion, parseName, ELECTRODE_INFO } from '../lib/montage.js';
  import { gradeSubmission, THRESHOLDS } from '../lib/grading.js';
  import { dist, dirOfPoint, scalpMask } from '../lib/headgeo.js';

  let dbState = $state({});
  db.subscribe((v) => { dbState = v; });
  let ses = $state({});
  session.subscribe((v) => { ses = v; });

  const course = $derived((dbState.courses || []).find((c) => c.id === ses.courseId) || dbState.courses?.[0]);
  const item = $derived(course?.items?.find((i) => i.id === ses.itemId) || course?.items?.[0]);
  const regionDict = $derived(dbState.regionDict || DEFAULT_REGIONS);
  const student = $derived((dbState.classes || []).flatMap((c) => c.students).find((s) => s.id === ses.studentId));

  let placements = $state([]);
  let selectedId = $state(null);
  let showRegions = $state(true);
  let showLabels = $state(true);
  let showStandard = $state(false);
  let symmetryCheck = $state(false);
  let gizmoMode = $state('translate');
  let presetKey = $state('iso');
  let presetSeq = $state(0);
  let dragWarn = $state([]);
  let toastList = $state([]);
  let submitting = $state(false);
  let result = $state(null);
  let elapsed = $state(0);
  let timer = null;
  let uid = 0;
  let canvasApi = null;
  let regionDockOpen = $state(true);
  let showTrayHint = $state(true);

  const { nodes: LM, quality } = solveMontage();

  const required = $derived(item?.requiredLeads || []);
  const placedNames = $derived(new Set(placements.map((p) => p.name)));
  const missing = $derived(required.filter((r) => !placedNames.has(r)));
  const extras = $derived([...placedNames].filter((n) => n && !required.includes(n)));

  const liveGrade = $derived.by(() => {
    if (!item) return null;
    return gradeSubmission(item, placements, regionDict);
  });

  const violations = $derived.by(() => {
    const v = [];
    for (let i = 0; i < placements.length; i++) {
      for (let j = i + 1; j < placements.length; j++) {
        const d = dist(placements[i].pos, placements[j].pos);
        if (d < THRESHOLDS.minSpacing) v.push({ a: placements[i].name, b: placements[j].name, d });
      }
    }
    return v;
  });

  const wrongIds = $derived.by(() => {
    if (!liveGrade) return [];
    const ids = new Set();
    for (const f of liveGrade.findings) {
      if (f.electrodeId) ids.add(f.electrodeId);
      (f.electrodeIds || []).forEach((x) => ids.add(x));
    }
    return [...ids];
  });

  const ghosts = $derived.by(() => {
    if (!showStandard) return [];
    return required.filter((r) => LM[r]).map((r) => ({ id: `gh-${r}`, name: r, pos: LM[r].pos }));
  });

  const trayGroups = $derived.by(() => {
    const groups = [
      { key: 'Fp', title: '额极', leads: required.filter((r) => r.startsWith('Fp')) },
      { key: 'F', title: '额区', leads: required.filter((r) => r.startsWith('F') && !r.startsWith('Fp')) },
      { key: 'C', title: '中央', leads: required.filter((r) => r.startsWith('C')) },
      { key: 'P', title: '顶区', leads: required.filter((r) => r.startsWith('P')) },
      { key: 'T', title: '颞区', leads: required.filter((r) => r.startsWith('T')) },
      { key: 'O', title: '枕区', leads: required.filter((r) => r.startsWith('O')) },
      { key: 'A', title: '耳垂', leads: required.filter((r) => r.startsWith('A')) },
    ];
    return groups.filter((g) => g.leads.length);
  });

  function toast(msg, kind = '') {
    const id = Math.random();
    // 最多保留 3 条，避免遮挡画布
    toastList = [...toastList.slice(-2), { id, msg, kind }];
    setTimeout(() => { toastList = toastList.filter((t) => t.id !== id); }, 2200);
  }

  function startTimer() {
    if (timer) return;
    timer = setInterval(() => { elapsed += 1; }, 1000);
  }
  function stopTimer() { clearInterval(timer); timer = null; }
  const fmtClock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  function onDropOutside(payload) {
    if (payload?.lead) toast(`「${payload.lead}」未落入可贴区域，请贴至发际线以上头皮`, 'warn');
  }

  const SNAP_R = THRESHOLDS.snapRadius;

  /**
   * 磁吸规则：
   * - 从电极架拖出的具名电极：仅吸附到「它自己的」标准标记位（半径内）
   * - 未具名落点：吸附到最近的标准标记位，并按该标记位命名
   */
  function magneticSnap(pos, preferred) {
    if (preferred && LM[preferred]) {
      const d = dist(pos, LM[preferred].pos);
      return d <= SNAP_R ? { name: preferred, d, pos: LM[preferred].pos } : null;
    }
    let best = null;
    for (const [name, node] of Object.entries(LM)) {
      const d = dist(pos, node.pos);
      if (d <= SNAP_R && (!best || d < best.d)) best = { name, d, pos: node.pos };
    }
    return best;
  }

  function onPlace(payload, pos, region) {
    const lead = payload?.lead || null;
    // 从电极架拖出：需要指定名称；若未带名称则用自动推断
    const auto = nearestLead(pos);
    const name = lead || auto;
    if (lead && placedNames.has(lead)) {
      toast(`「${lead}」已经放置，可拖动补位或按 Delete 移除`, 'warn');
      return;
    }
    const snap = magneticSnap(pos, lead);
    const finalPos = snap ? [...snap.pos] : pos;
    if (snap && placedNames.has(snap.name) && snap.name !== lead) {
      // 吸附位已被其他电极占用：不提示覆盖，允许放置但由间距规则判定
    }
    const id = `el-${Date.now()}-${uid++}`;
    placements = [...placements, { id, name, pos: finalPos, placedAt: Date.now(), snappedTo: snap?.name || null }];
    selectedId = id;
    startTimer();
    showTrayHint = false;
    if (canvasApi?.focusOn && lead && dist(finalPos, LM[lead].pos) > 2) canvasApi.focusOn(LM[lead].pos);
    const off = LM[lead] ? dist(finalPos, LM[lead].pos) : 0;
    if (snap && snap.name !== lead) {
      toast(`「${name}」被吸附到「${snap.name}」标记位，请确认位置是否正确`, 'warn');
    } else if (off > 2.2) {
      toast(`「${name}」未吸附到标记位，偏离 ${lead} 标准位 ${off.toFixed(1)} cm`, 'warn');
    } else if (snap) {
      toast(`已吸附「${snap.name}」标记位`);
    }
  }

  function nearestLead(pos) {
    let best = null;
    for (const r of required) {
      if (placedNames.has(r)) continue;
      const d = dist(pos, LM[r].pos);
      if (!best || d < best.d) best = { name: r, d };
    }
    if (!best) {
      for (const [n, node] of Object.entries(LM)) {
        const d = dist(pos, node.pos);
        if (!best || d < best.d) best = { name: n, d };
      }
    }
    return best?.name || 'X1';
  }

  function onSelect(id) { selectedId = id; }

  function onMove(id, pos, meta) {
    placements = placements.map((p) => {
      if (p.id !== id) return p;
      // 手柄微调后重新判定是否仍落在标记位
      const node = LM[p.name];
      const onMark = node ? dist(pos, node.pos) < 0.3 : false;
      return { ...p, pos, snappedTo: onMark ? p.name : null };
    });
    if (!meta?.live) startTimer();
  }

  function addByClick(lead) {
    const node = LM[lead];
    if (!node) return;
    if (placedNames.has(lead)) { toast(`「${lead}」已在头模上`, 'warn'); return; }
    onPlace({ lead }, [...node.pos], classifyRegion(dirOfPoint(node.pos), regionDict));
  }

  function rename(id, name) {
    const clean = (name || '').trim();
    if (!clean) return;
    placements = placements.map((p) => (p.id === id ? { ...p, name: clean } : p));
    const parsed = parseName(clean);
    toast(parsed.ok ? `已重命名为「${clean}」` : `「${clean}」${parsed.reason}`, parsed.ok ? '' : 'err');
  }

  function removeSelected() {
    if (!selectedId) return;
    placements = placements.filter((p) => p.id !== selectedId);
    selectedId = null;
  }

  function clearAll() {
    placements = [];
    selectedId = null;
    stopTimer();
    elapsed = 0;
    result = null;
  }

  function loadStandardFill() {
    const next = required.filter((r) => !placedNames.has(r)).map((r, i) => ({
      id: `el-std-${Date.now()}-${i}`, name: r, pos: [...LM[r].pos],
    }));
    placements = [...placements, ...next];
    toast(`已按标准位置补齐 ${next.length} 个电极（练习模式）`);
  }

  function submit() {
    if (!placements.length) { toast('请先放置电极', 'warn'); return; }
    submitting = true;
    stopTimer();
    const grade = gradeSubmission(item, placements, regionDict);
    result = { grade, placements: placements.map((p) => ({ ...p })), elapsed };
    submitting = false;
  }

  // 重命名弹窗
  let renameTarget = $state(null);
  let renameValue = $state('');
  function openRename(id) {
    const p = placements.find((x) => x.id === id);
    if (!p) return;
    renameTarget = p;
    renameValue = p.name;
  }
  function confirmRename() {
    if (renameTarget) rename(renameTarget.id, renameValue);
    renameTarget = null;
  }
  function onGlobalKey(e) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (selectedId) { e.preventDefault(); removeSelected(); }
    }
    if (e.key === 'Escape') { selectedId = null; renameTarget = null; }
  }

  $effect(() => {
    const handler = (ev) => openRename(ev.detail.id);
    window.addEventListener('eeg:rename-request', handler);
    window.addEventListener('keydown', onGlobalKey);
    return () => {
      window.removeEventListener('eeg:rename-request', handler);
      window.removeEventListener('keydown', onGlobalKey);
    };
  });

  // 新建提交（保存到 db）
  function saveSubmission() {
    if (!result) return;
    const sub = {
      id: `sub-live-${Date.now()}`,
      courseId: course.id,
      itemId: item.id,
      item,
      studentId: student?.id || 's-01',
      studentName: student?.name || '王雨桐',
      submittedAt: new Date().toISOString(),
      durationSec: result.elapsed,
      placements: result.placements,
      autoScore: result.grade.total,
      finalScore: result.grade.total,
      status: 'pending',
      grade: result.grade,
      live: true,
    };
    db.update((d) => ({ ...d, submissions: [...d.submissions, sub] }));
    toast('已提交，等待讲师复核');
  }

  function switchView(k) { presetKey = k; presetSeq += 1; }

  let selected = $derived(placements.find((p) => p.id === selectedId) || null);
  let selectedRegion = $derived(selected ? classifyRegion(dirOfPoint(selected.pos), regionDict) : null);

  const passLine = $derived(course?.passLine ?? 60);
</script>

<div class="train">
  <!-- ============ 左：电极架 ============ -->
  <aside class="tray panel">
    <div class="tray-head">
      <div>
        <div class="eyebrow">电极架</div>
        <b class="tray-title">{item?.title || '未选择题目'}</b>
      </div>
      <span class="tag accent">{required.length} 导联</span>
    </div>

    <div class="tray-progress">
      <div class="tp-row">
        <span>已放置 <b class="mono">{placements.length}</b> / {required.length}</span>
        <span class="mono dim">{Math.round((placements.length / Math.max(1, required.length)) * 100)}%</span>
      </div>
      <div class="scorebar"><i style={`width:${(placements.length / Math.max(1, required.length)) * 100}%;background:var(--accent)`}></i></div>
    </div>

    <div class="tray-scroll scroll">
      {#each trayGroups as g}
        <div class="tray-group">
          <div class="tg-title">{g.title}<span class="dim">{g.leads.length}</span></div>
          <div class="tg-items">
            {#each g.leads as lead}
              {@const done = placedNames.has(lead)}
              <button
                class="lead-chip"
                class:done
                draggable={!done}
                disabled={done}
                ondragstart={(e) => {
                  e.dataTransfer.setData('application/x-electrode', JSON.stringify({ lead }));
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onclick={() => addByClick(lead)}
                title={done ? '已放置' : `拖动到头皮，或点击直接放置标准位`}
              >
                <span class="lc-dot" style={`background:${regionDict.find(r => r.members.includes(lead))?.color || '#6d7d89'}`}></span>
                <span class="lc-name mono">{lead}</span>
                <span class="lc-cn">{ELECTRODE_INFO[lead]?.cn || ''}</span>
                {#if done}<span class="lc-ok">✓</span>{/if}
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <div class="tray-foot">
      <div class="tf-row">
        <span class="dim">漏放</span>
        <span class="mono" class:neg={missing.length > 0}>{missing.length ? missing.join(' · ') : '无'}</span>
      </div>
      {#if extras.length}
        <div class="tf-row">
          <span class="dim">多余</span>
          <span class="mono warnc">{extras.join(' · ')}</span>
        </div>
      {/if}
      <div class="tf-actions">
        <button class="btn sm ghost" onclick={() => (showRegions = !showRegions)}>{showRegions ? '隐藏' : '显示'}分区</button>
        <button class="btn sm ghost" onclick={() => (showStandard = !showStandard)}>{showStandard ? '隐藏' : '对照'}标准位</button>
      </div>
      <button class="btn sm ghost wide" onclick={loadStandardFill} title="练习模式：一键补齐缺失电极">一键补齐（练习）</button>
    </div>
  </aside>

  <!-- ============ 中：三维头模 ============ -->
  <section class="stage">
    <div class="stage-top">
      <div class="view-btns">
        <button class="vbtn" class:on={presetKey === 'top'} onclick={() => switchView('top')}>俯视</button>
        <button class="vbtn" class:on={presetKey === 'left'} onclick={() => switchView('left')}>左侧</button>
        <button class="vbtn" class:on={presetKey === 'right'} onclick={() => switchView('right')}>右侧</button>
        <button class="vbtn" class:on={presetKey === 'front'} onclick={() => switchView('front')}>正前</button>
        <button class="vbtn" class:on={presetKey === 'back'} onclick={() => switchView('back')}>后枕</button>
        <span class="vsep"></span>
        <button class="vbtn" class:on={presetKey === 'iso'} onclick={() => switchView('iso')}>斜视</button>
        <span class="vsep"></span>
        <button class="vbtn sym" class:on={symmetryCheck} onclick={() => (symmetryCheck = !symmetryCheck)} title="显示正中矢状面与左右镜像参考">对称核对</button>
      </div>
      <div class="stage-right">
        <div class="sym-badge" class:ok={violations.length === 0 && missing.length === 0}>
          <span class="sb-dot"></span>
          对称核对 {violations.length === 0 ? '通过' : `${violations.length} 处冲突`}
        </div>
        <div class="clock mono">{fmtClock(elapsed)}</div>
      </div>
    </div>

    <div class="stage-body">
      <ScalpCanvas
        {placements}
        {regionDict}
        {showRegions}
        {showLabels}
        {selectedId}
        minSpacing={THRESHOLDS.minSpacing}
        editable={!result}
        {gizmoMode}
        {ghosts}
        {wrongIds}
        {presetKey}
        {presetSeq}
        {symmetryCheck}
        onPlace={onPlace}
        onSelect={onSelect}
        onMove={onMove}
        onDropOutside={onDropOutside}
        onReady={(api) => (canvasApi = api)}
      />

      {#if showTrayHint && placements.length === 0}
        <div class="stage-hint">
          <div class="sh-icon">◉</div>
          <b>从左侧电极架拖出电极</b>
          <span>拖到头皮上自动吸附最近解剖分区；也可直接点击电极名放置到标准位</span>
        </div>
      {/if}

      {#if result}
        <div class="result-overlay">
          <div class="ro-card">
            <div class="ro-ring" style={`--p:${result.grade.total}`}>
              <svg viewBox="0 0 100 100" width="112" height="112">
                <circle cx="50" cy="50" r="43" fill="none" stroke="#1b2732" stroke-width="7"/>
                <circle cx="50" cy="50" r="43" fill="none"
                  stroke={result.grade.total >= passLine ? '#38d3bd' : '#f2726f'}
                  stroke-width="7" stroke-linecap="round"
                  stroke-dasharray={`${(result.grade.total / 100) * 270} 270`}
                  transform="rotate(-90 50 50)"/>
              </svg>
              <div class="rr-txt"><b>{result.grade.total}</b><span>自动判分</span></div>
            </div>
            <div class="ro-mid">
              <h3>{result.grade.total >= passLine ? '已达及格线' : '未达及格线'}</h3>
              <p class="dim">本次用时 {fmtClock(result.elapsed)} · 发现 {result.grade.findings.length} 处扣分</p>
              <div class="ro-scores">
                {#each [['命名', result.grade.scores.naming], ['分区', result.grade.scores.region], ['对称', result.grade.scores.symmetry], ['间距', result.grade.scores.spacing]] as [k, v]}
                  <div class="rs-item"><span>{k}</span><b class="mono">{v}</b></div>
                {/each}
              </div>
            </div>
            <div class="ro-acts">
              <button class="btn primary" onclick={saveSubmission}>提交并查看明细</button>
              <button class="btn ghost" onclick={() => { result = null; }}>继续调整</button>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <div class="stage-bottom">
      <div class="sb-left">
        {#if selected}
          <div class="sel-chip">
            <span class="sc-name mono">{selected.name}</span>
            <span class="dim">{selectedRegion?.region.name} · 距标准位 {selectedRegion?.distance.toFixed(1)} cm</span>
          </div>
          <button class="btn sm" onclick={() => openRename(selected.id)}>重命名</button>
          <div class="mode-switch">
            <button class:on={gizmoMode === 'translate'} onclick={() => (gizmoMode = 'translate')} title="坐标手柄">移动</button>
            <button class:on={gizmoMode === 'rotate'} onclick={() => (gizmoMode = 'rotate')} title="旋转（贴面角度）">角度</button>
          </div>
          <button class="btn sm danger" onclick={removeSelected}>移除</button>
        {:else}
          <span class="dim sb-tip">拖动旋转视角 · 滚轮缩放 · 单击电极选中 · 双击改名 · <span class="kbd">Del</span> 移除</span>
        {/if}
      </div>
      <div class="sb-right">
        {#if violations.length}
          <span class="tag danger">⚠ {violations.length} 处间距 &lt; 1.5cm</span>
        {/if}
        <button class="btn sm ghost" onclick={clearAll}>清空</button>
        <button class="btn primary" onclick={submit} disabled={!placements.length}>提交判分</button>
      </div>
    </div>
  </section>

  <!-- ============ 右：实时核对 ============ -->
  <aside class="inspect panel">
    <div class="ins-head">
      <span class="eyebrow">实时核对</span>
      <span class="tag" class:ok={liveGrade?.total >= 80} class:gold={liveGrade?.total >= 60 && liveGrade?.total < 80} class:danger={liveGrade?.total < 60}>预计 {liveGrade?.total ?? 0} 分</span>
    </div>

    <div class="ins-body scroll">
      {#each [
        { k: 'naming', label: '命名规则', v: liveGrade?.scores.naming },
        { k: 'region', label: '分区归属', v: liveGrade?.scores.region },
        { k: 'symmetry', label: '左右对称', v: liveGrade?.scores.symmetry },
        { k: 'spacing', label: '间距合规', v: liveGrade?.scores.spacing },
      ] as c}
        <div class="ins-cat">
          <div class="ic-top">
            <span>{c.label}</span>
            <span class="mono">{c.v ?? 0}<i>/25</i></span>
          </div>
          <div class="scorebar"><i style={`width:${((c.v ?? 0) / 25) * 100}%; background:${(c.v ?? 0) >= 20 ? 'var(--accent)' : (c.v ?? 0) >= 15 ? 'var(--gold)' : 'var(--danger)'}`}></i></div>
        </div>
      {/each}

      <div class="hr" style="margin:12px 0"></div>

      <div class="ins-issues">
        <div class="ii-head">
          <span>问题清单</span>
          <span class="mono dim">{liveGrade?.findings.length ?? 0}</span>
        </div>
        {#if liveGrade?.findings.length}
          {#each liveGrade.findings.slice(0, 30) as f}
            <button class="ii-row" onclick={() => f.electrodeId && (selectedId = f.electrodeId)} class:cat={f.category}>
              <span class="ii-cat" style={`background:${f.category === 'spacing' ? 'var(--danger)' : f.category === 'symmetry' ? 'var(--gold)' : f.category === 'region' ? 'var(--info)' : 'var(--text-3)'}`}></span>
              <span class="ii-txt">{f.message}</span>
              <span class="ii-pts mono">−{f.points}</span>
            </button>
          {/each}
        {:else}
          <div class="ii-ok">✓ 暂无扣分项，继续保持</div>
        {/if}
      </div>

      <div class="hr" style="margin:12px 0"></div>

      <div class="ins-sym">
        <div class="ii-head"><span>左右对称核对</span><span class="dim">镜像偏差 ≤ 1.5cm</span></div>
        <div class="sym-pairs">
          {#each (liveGrade?.pairDetails || []) as pd}
            <div class="sym-row" class:bad={pd.deviation == null || pd.deviation > THRESHOLDS.symmetryTolerance}>
              <span class="mono">{pd.left}</span>
              <span class="sym-bar">
                <i style={`width:${pd.deviation == null ? 100 : Math.min(100, (pd.deviation / 3) * 100)}%`}></i>
              </span>
              <span class="mono">{pd.right}</span>
              <span class="sym-val mono">{pd.deviation == null ? '—' : pd.deviation.toFixed(1)}</span>
            </div>
          {:else}
            <div class="dim" style="font-size:11px">放置左右成对电极后显示</div>
          {/each}
        </div>
      </div>

      <div class="hr" style="margin:12px 0"></div>

      <div class="ins-region">
        <div class="ii-head"><span>分区图例</span><button class="linkbtn" onclick={() => (regionDockOpen = !regionDockOpen)}>{regionDockOpen ? '收起' : '展开'}</button></div>
        {#if regionDockOpen}
          {#each regionDict as r}
            <div class="leg-row">
              <span class="leg-sw" style={`background:${r.color}`}></span>
              <span class="leg-name">{r.name}</span>
              <span class="leg-leads mono dim">{r.members.join(' ')}</span>
            </div>
          {/each}
        {/if}
      </div>
    </div>

    <div class="ins-foot">
      <div class="if-row"><span class="dim">题目要求</span></div>
      <p class="if-brief">{item?.brief}</p>
      {#if item?.hints?.length}
        <div class="if-hints">
          {#each item.hints as h}<div class="hint-line"><span>▸</span><span>{h}</span></div>{/each}
        </div>
      {/if}
    </div>
  </aside>
</div>

{#if renameTarget}
  <div class="modal-backdrop" onclick={() => (renameTarget = null)} role="presentation">
    <div class="modal rename-modal" onclick={(e) => e.stopPropagation()} role="dialog">
      <h3>重命名电极</h3>
      <p class="dim">命名规则：字母前缀（Fp/F/C/P/O/T/A）+ 编号，奇数在左、偶数在右，中线用 z 结尾不带数字。</p>
      <input
        class="field mono big"
        bind:value={renameValue}
        onkeydown={(e) => { if (e.key === 'Enter') confirmRename(); }}
        autofocus
      />
      {#if renameValue}
        {@const p = parseName(renameValue)}
        <div class="rn-preview" class:bad={!p.ok}>
          {#if p.ok}
            <span class="tag ok">格式正确</span>
            <span class="dim">解析：{p.prefix} {p.isZ ? '中线' : `第 ${p.num} 号`} · {p.side === 'L' ? '左侧' : p.side === 'R' ? '右侧' : '中线'}</span>
          {:else}
            <span class="tag danger">格式错误</span><span class="dim">{p.reason}</span>
          {/if}
        </div>
      {/if}
      <div class="modal-acts">
        <button class="btn ghost" onclick={() => (renameTarget = null)}>取消</button>
        <button class="btn primary" onclick={confirmRename}>确定</button>
      </div>
    </div>
  </div>
{/if}

<div class="toast-wrap local">
  {#each toastList as t}
    <div class="toast" class:warn={t.kind === 'warn'} class:err={t.kind === 'err'}>{t.msg}</div>
  {/each}
</div>

<style>
  .train {
    position: relative;
    display: grid; grid-template-columns: 226px 1fr 292px; gap: 10px;
    padding: 10px; height: 100%; min-height: 0;
  }

  /* 电极架 */
  .tray { display: flex; flex-direction: column; min-height: 0; padding: 12px 11px; }
  .tray-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 9px; }
  .tray-title { font-size: 12px; display: block; line-height: 1.35; margin-top: 1px; }
  .tray-progress { margin-bottom: 10px; }
  .tp-row { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--text-2); margin-bottom: 4px; }
  .tray-scroll { flex: 1; min-height: 0; margin: 0 -4px; padding: 0 4px; }

  .tray-group { margin-bottom: 10px; }
  .tg-title {
    display: flex; justify-content: space-between; align-items: center;
    font-size: 10px; color: var(--text-3); letter-spacing: .06em; margin-bottom: 4px; padding: 0 2px;
  }
  .tg-items { display: flex; flex-direction: column; gap: 3px; }
  .lead-chip {
    display: flex; align-items: center; gap: 6px;
    padding: 5px 7px; border-radius: 6px; text-align: left;
    background: #0d151b; border: 1px solid var(--line); color: var(--text);
    font-size: 11.5px; transition: all .13s; cursor: grab;
  }
  .lead-chip:hover:not(.done) { border-color: #33495a; background: #121c25; transform: translateX(1px); }
  .lead-chip:active:not(.done) { cursor: grabbing; }
  .lead-chip.done { opacity: .42; cursor: default; border-style: dashed; }
  .lc-dot { width: 6px; height: 6px; border-radius: 50%; flex: none; }
  .lc-name { font-size: 11.5px; font-weight: 650; width: 26px; flex: none; }
  .lc-cn { font-size: 10px; color: var(--text-3); flex: 1; }
  .lc-ok { font-size: 10px; color: var(--ok); }

  .tray-foot { border-top: 1px solid var(--line); padding-top: 8px; margin-top: 6px; display: flex; flex-direction: column; gap: 5px; }
  .tf-row { display: flex; justify-content: space-between; font-size: 10px; gap: 8px; }
  .tf-row .mono { font-size: 10px; text-align: right; }
  .tf-actions { display: flex; gap: 4px; }
  .tf-actions .btn { flex: 1; justify-content: center; }
  .btn.sm.wide { justify-content: center; }

  /* 舞台 */
  .stage { display: flex; flex-direction: column; min-width: 0; min-height: 0; gap: 8px; }
  .stage-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 2px; }
  .view-btns { display: flex; gap: 2px; background: #0b1218; border: 1px solid var(--line); border-radius: 7px; padding: 2px; }
  .vbtn {
    padding: 4px 10px; border: 0; border-radius: 5px; background: transparent;
    color: var(--text-3); font-size: 11px; transition: all .13s;
  }
  .vbtn:hover { color: var(--text); background: #131d25; }
  .vbtn.on { background: rgba(56,211,189,.14); color: var(--accent); }
  .vsep { width: 1px; background: var(--line); margin: 2px 3px; }
  .vbtn.sym.on { background: rgba(240,189,104,.16); color: var(--gold); }
  .stage-right { display: flex; align-items: center; gap: 10px; }
  .sym-badge {
    display: flex; align-items: center; gap: 6px; padding: 3px 9px; border-radius: 999px;
    font-size: 10.5px; background: rgba(240,189,104,.1); color: var(--gold);
    border: 1px solid rgba(240,189,104,.3);
  }
  .sym-badge.ok { background: rgba(56,211,189,.1); color: var(--accent); border-color: rgba(56,211,189,.3); }
  .sb-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; box-shadow: 0 0 7px currentColor; }
  .clock { font-size: 12px; color: var(--text-2); font-variant-numeric: tabular-nums; }

  .stage-body {
    position: relative; flex: 1; min-height: 0;
    border-radius: 12px; overflow: hidden;
    border: 1px solid var(--line);
    background: radial-gradient(ellipse at 50% 40%, #101a22, #070b0f 72%);
  }
  .stage-hint {
    position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
    display: flex; flex-direction: column; align-items: center; gap: 5px;
    padding: 18px 24px; border-radius: 12px; pointer-events: none;
    background: rgba(8, 13, 18, .78); border: 1px dashed #263846;
    backdrop-filter: blur(3px); text-align: center;
  }
  .sh-icon { font-size: 20px; color: var(--accent); opacity: .7; animation: pulse 2.2s ease-in-out infinite; }
  @keyframes pulse { 0%,100% { opacity: .35; transform: scale(.94); } 50% { opacity: .9; transform: scale(1.06); } }
  .stage-hint b { font-size: 12.5px; }
  .stage-hint span { font-size: 10.5px; color: var(--text-3); max-width: 280px; }

  .stage-bottom { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 2px; }
  .sb-left, .sb-right { display: flex; align-items: center; gap: 6px; }
  .sel-chip { display: flex; align-items: center; gap: 7px; padding: 3px 9px; border-radius: 6px; background: #0d151b; border: 1px solid var(--line-2); font-size: 11px; }
  .sc-name { font-size: 12px; color: var(--accent); font-weight: 650; }
  .sb-tip { font-size: 10.5px; }
  .mode-switch { display: flex; background: #0b1218; border: 1px solid var(--line); border-radius: 6px; padding: 2px; }
  .mode-switch button { padding: 2px 8px; border: 0; background: transparent; color: var(--text-3); font-size: 10.5px; border-radius: 4px; }
  .mode-switch button.on { background: rgba(56,211,189,.14); color: var(--accent); }

  /* 判分浮层 */
  .result-overlay { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(5,9,12,.72); backdrop-filter: blur(4px); }
  .ro-card {
    display: flex; align-items: center; gap: 22px; padding: 22px 26px;
    background: var(--panel-2); border: 1px solid var(--line-2); border-radius: 16px;
    box-shadow: var(--shadow); max-width: 560px;
  }
  .ro-ring { position: relative; display: grid; place-items: center; }
  .rr-txt { position: absolute; display: flex; flex-direction: column; align-items: center; }
  .rr-txt b { font-size: 27px; font-weight: 650; letter-spacing: -.03em; }
  .rr-txt span { font-size: 9.5px; color: var(--text-3); }
  .ro-mid h3 { margin: 0 0 2px; font-size: 14px; }
  .ro-mid p { margin: 0 0 8px; font-size: 11px; }
  .ro-scores { display: grid; grid-template-columns: repeat(2, auto); gap: 2px 14px; }
  .rs-item { display: flex; gap: 7px; align-items: baseline; font-size: 11px; }
  .rs-item span { color: var(--text-3); }
  .rs-item b { font-size: 11.5px; }
  .ro-acts { display: flex; flex-direction: column; gap: 6px; }

  /* 右栏 */
  .inspect { display: flex; flex-direction: column; min-height: 0; }
  .ins-head { display: flex; align-items: center; justify-content: space-between; padding: 11px 12px; border-bottom: 1px solid var(--line); }
  .ins-body { flex: 1; min-height: 0; padding: 11px 12px; }
  .ins-cat { margin-bottom: 9px; }
  .ic-top { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; }
  .ic-top .mono { font-variant-numeric: tabular-nums; }
  .ic-top i { font-style: normal; color: var(--text-3); font-size: 9px; }

  .ii-head { display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 600; margin-bottom: 6px; }
  .ii-head .dim { font-weight: 400; font-size: 10px; }
  .ins-issues { display: flex; flex-direction: column; gap: 2px; }
  .ii-row {
    display: flex; align-items: flex-start; gap: 6px; padding: 5px 6px; border-radius: 5px;
    background: none; border: 0; text-align: left; font-size: 10.5px; color: var(--text-2);
    transition: background .13s;
  }
  .ii-row:hover { background: #111b23; }
  .ii-cat { width: 3px; height: 11px; border-radius: 2px; flex: none; margin-top: 3px; }
  .ii-txt { flex: 1; line-height: 1.4; }
  .ii-pts { color: var(--danger); font-size: 10px; flex: none; }
  .ii-ok { font-size: 11px; color: var(--ok); padding: 4px 6px; }

  .sym-pairs { display: flex; flex-direction: column; gap: 3px; }
  .sym-row { display: flex; align-items: center; gap: 5px; font-size: 10px; }
  .sym-row .mono { width: 22px; color: var(--text-3); }
  .sym-row .mono:last-child { text-align: right; }
  .sym-bar { flex: 1; height: 3px; background: #16222c; border-radius: 2px; overflow: hidden; }
  .sym-bar i { display: block; height: 100%; background: var(--accent); border-radius: 2px; }
  .sym-row.bad .sym-bar i { background: var(--danger); }
  .sym-row.bad .sym-val { color: var(--danger); }
  .sym-val { width: 26px; }

  .leg-row { display: flex; align-items: center; gap: 6px; font-size: 10px; padding: 1px 0; }
  .leg-sw { width: 8px; height: 8px; border-radius: 2px; flex: none; }
  .leg-name { width: 62px; color: var(--text-2); }
  .leg-leads { flex: 1; font-size: 9px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .ins-foot { border-top: 1px solid var(--line); padding: 10px 12px; max-height: 176px; overflow-y: auto; }
  .if-row { margin-bottom: 3px; font-size: 10px; }
  .if-brief { margin: 0; font-size: 10.5px; color: var(--text-2); line-height: 1.5; }
  .if-hints { margin-top: 6px; display: flex; flex-direction: column; gap: 3px; }

  .linkbtn { background: none; border: 0; padding: 0; color: var(--accent); font-size: 10px; }

  /* 重命名 */
  .rename-modal h3 { margin: 0 0 4px; font-size: 14px; }
  .rename-modal p { margin: 0 0 12px; font-size: 11px; line-height: 1.5; }
  .field.big { font-size: 18px; padding: 9px 12px; letter-spacing: .05em; }
  .rn-preview { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 11px; }
  .modal-acts { display: flex; justify-content: flex-end; gap: 7px; margin-top: 16px; }

  @media (max-width: 1400px) {
    .train { grid-template-columns: 200px 1fr 262px; }
  }
</style>
