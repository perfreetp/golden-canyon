<script>
  import { db, session, setView } from '../lib/store.js';
  import { CATEGORIES } from '../lib/grading.js';
  import { solveMontage, parseName, ELECTRODE_INFO, classifyRegion, DEFAULT_REGIONS } from '../lib/montage.js';
  import ScalpCanvas from '../components/ScalpCanvas.svelte';

  let dbState = $state({});
  db.subscribe((v) => { dbState = v; });
  let ses = $state({});
  session.subscribe((v) => { ses = v; });

  const courses = $derived(dbState.courses || []);
  let courseId = $state(ses.courseId || 'c-1020-basic');
  const course = $derived(courses.find((c) => c.id === courseId) || courses[0]);
  const regionDict = $derived(dbState.regionDict || DEFAULT_REGIONS);

  const queue = $derived.by(() => {
    const subs = (dbState.submissions || []).filter((s) => s.courseId === course?.id);
    return subs.sort((a, b) => {
      const pa = a.status === 'pending' ? 0 : 1;
      const pb = b.status === 'pending' ? 0 : 1;
      return pa - pb || new Date(b.submittedAt) - new Date(a.submittedAt);
    });
  });

  let selectedId = $state(ses.reviewId || queue.find((s) => s.status === 'pending')?.id || queue[0]?.id);
  const sub = $derived(queue.find((s) => s.id === selectedId) || queue[0]);
  const item = $derived(sub?.item || course?.items?.find((i) => i.id === sub?.itemId));
  const student = $derived((dbState.classes || []).flatMap((c) => c.students).find((x) => x.id === sub?.studentId));
  const { nodes: LM } = solveMontage();

  const grade = $derived(sub?.grade);
  const autoScores = $derived(grade?.scores || { naming: 0, region: 0, symmetry: 0, spacing: 0 });

  // 复核编辑状态
  let edit = $state(null);
  let comment = $state('');
  let selectedElectrodeId = $state(null);

  $effect(() => {
    if (!sub) { edit = null; return; }
    edit = {
      scores: { ...(sub.manualAdjust || sub.grade?.scores || {}) },
      comment: sub.reviewComment || '',
    };
    comment = sub.reviewComment || '';
    selectedElectrodeId = null;
  });

  const weights = $derived(item?.weights || { naming: 25, region: 25, symmetry: 25, spacing: 25 });
  const totalWeight = $derived(CATEGORIES.reduce((a, c) => a + (weights[c.id] ?? 0), 0));

  const manualTotal = $derived.by(() => {
    if (!edit) return 0;
    const raw = CATEGORIES.reduce((a, c) => a + (edit.scores[c.id] ?? 0), 0);
    return totalWeight > 0 ? Math.round(raw * (100 / totalWeight)) : 0;
  });
  const autoTotal = $derived(sub?.autoScore ?? 0);
  const delta = $derived(manualTotal - autoTotal);

  const placements = $derived(sub?.placements || []);
  const wrongIds = $derived.by(() => {
    if (!grade) return [];
    const ids = new Set();
    for (const f of grade.findings) {
      if (f.electrodeId) ids.add(f.electrodeId);
      (f.electrodeIds || []).forEach((x) => ids.add(x));
    }
    return [...ids];
  });
  const ghosts = $derived((item?.requiredLeads || []).filter((r) => LM[r]).map((r) => ({ id: `gh-${r}`, name: r, pos: LM[r].pos })));

  const presets = [
    '布点整体规范，注意 T3/T4 略偏前，下次以外耳道上缘为参照向上引垂线。',
    '中线导联基本准确，Fz 可再向后 0.5 cm。本次操作手法熟练。',
    '左右对称意识良好，个别左右电极需在俯视图下再核对一次。',
    '命名规则掌握不牢，出现了左右编号互换，建议复习「奇左偶右」后补测。',
    '个别电极未完全贴合头皮，临床上会影响阻抗，需注意贴片压紧。',
  ];

  function setScore(cat, v) {
    const n = Math.max(0, Math.min(25, Math.round(Number(v))));
    edit = { ...edit, scores: { ...edit.scores, [cat]: n } };
  }

  function saveReview(finalize) {
    if (!sub || !edit) return;
    db.update((d) => ({
      ...d,
      submissions: d.submissions.map((s) => {
        if (s.id !== sub.id) return s;
        const patch = {
          manualAdjust: { ...edit.scores },
          manualScore: manualTotal,
          finalScore: manualTotal,
          reviewComment: comment,
          reviewedBy: '陈思远',
          reviewedAt: new Date().toISOString(),
        };
        return finalize
          ? { ...s, ...patch, status: 'reviewed' }
          : { ...s, ...patch };
      }),
    }));
    if (finalize) {
      const next = queue.find((s) => s.status === 'pending' && s.id !== sub.id);
      if (next) selectedId = next.id;
    }
  }

  function fmtTime(iso) {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  const scoreColor = (v) => (v >= 20 ? 'var(--accent)' : v >= 15 ? 'var(--gold)' : 'var(--danger)');
</script>

<div class="review">
  <!-- 左：待复核队列 -->
  <aside class="queue panel">
    <div class="q-head">
      <select class="field" bind:value={courseId}>
        {#each courses as c}<option value={c.id}>{c.title}</option>{/each}
      </select>
    </div>
    <div class="q-stats">
      <div class="qs"><b>{queue.filter(s => s.status === 'pending').length}</b><span>待复核</span></div>
      <div class="qs"><b>{queue.filter(s => s.status === 'reviewed').length}</b><span>已复核</span></div>
      <div class="qs"><b>{queue.length}</b><span>总计</span></div>
    </div>
    <div class="q-list scroll">
      {#each queue as s}
        {@const st = s.status}
        <button class="q-item" class:sel={s.id === sub?.id} class:pending={st === 'pending'} onclick={() => (selectedId = s.id)}>
          <div class="qi-top">
            <b>{s.studentName}</b>
            <span class="mono qi-score" class:neg={(s.finalScore ?? s.autoScore) < 60}>{s.finalScore ?? s.autoScore}</span>
          </div>
          <div class="qi-mid">{s.item?.title || s.itemId}</div>
          <div class="qi-foot">
            <span class="dim">{fmtTime(s.submittedAt).slice(5, 16)}</span>
            <span class="tag" class:gold={st === 'pending'} class:ok={st === 'reviewed'} style="font-size:9px;padding:0 5px">
              {st === 'pending' ? '待复核' : '已复核'}
            </span>
          </div>
        </button>
      {/each}
    </div>
  </aside>

  <!-- 中：三维复核 -->
  <section class="stage">
    <div class="stage-top">
      <div class="st-left">
        <b>{sub?.studentName}</b>
        <span class="dim mono">{student?.empNo}</span>
        <span class="vsep"></span>
        <span class="dim">{item?.title}</span>
      </div>
      <div class="st-right">
        <span class="tag info">自动 {autoTotal} 分</span>
        <span class="tag" class:gold={delta !== 0} class:ok={delta === 0}>复核 {manualTotal}</span>
        {#if delta !== 0}<span class="delta {delta > 0 ? 'pos' : 'neg'}">{delta > 0 ? '+' : ''}{delta}</span>{/if}
      </div>
    </div>
    <div class="stage-body">
      <ScalpCanvas
        {placements}
        {regionDict}
        showRegions={false}
        showLabels={true}
        selectedId={selectedElectrodeId}
        minSpacing={1.5}
        editable={false}
        {ghosts}
        {wrongIds}
        presetSeq={1}
        presetKey="top"
        onSelect={(id) => (selectedElectrodeId = id)}
      />
      <div class="legend">
        <div class="leg"><span class="sw ok"></span>正确</div>
        <div class="leg"><span class="sw bad"></span>扣分电极</div>
        <div class="leg"><span class="sw ghost"></span>标准位</div>
      </div>
    </div>
    <div class="stage-bottom">
      <span class="dim sb-tip">俯视核左右对称 · 拖动旋转 · 滚轮缩放 · 单击电极查看详情</span>
      <div class="sbacts">
        <button class="btn sm ghost" onclick={() => (setView('result'))}>查看学员视图</button>
      </div>
    </div>
  </section>

  <!-- 右：评分与评语 -->
  <aside class="grade-panel panel">
    <div class="gp-head">
      <span class="eyebrow">四项评分</span>
      <span class="tag" class:ok={manualTotal >= 60} class:danger={manualTotal < 60}>{manualTotal} 分</span>
    </div>

    <div class="gp-body scroll">
      {#if edit}
        {#each CATEGORIES as c}
          <div class="gscore">
            <div class="gs-top">
              <div class="gs-name">{c.label}</div>
              <div class="gs-auto mono">自动 {autoScores[c.id]}</div>
            </div>
            <div class="gs-controls">
              <button class="btn xs ghost" onclick={() => setScore(c.id, edit.scores[c.id] - 1)}>−</button>
              <input class="gs-input mono" type="number" min="0" max="25" value={edit.scores[c.id]}
                oninput={(e) => setScore(c.id, e.currentTarget.value)} />
              <button class="btn xs ghost" onclick={() => setScore(c.id, edit.scores[c.id] + 1)}>＋</button>
              <span class="gs-max dim">/ 25</span>
            </div>
            <div class="scorebar"><i style={`width:${(edit.scores[c.id] / 25) * 100}%;background:${scoreColor(edit.scores[c.id])}`}></i></div>
            {#if (edit.scores[c.id] ?? 0) !== (autoScores[c.id] ?? 0)}
              <div class="gs-changed">已改分 {edit.scores[c.id] - (autoScores[c.id] ?? 0) > 0 ? '+' : ''}{edit.scores[c.id] - (autoScores[c.id] ?? 0)}</div>
            {/if}
          </div>
        {/each}

        <div class="hr" style="margin:14px 0"></div>

        <div class="findings-head">
          <span>扣分明细</span>
          <span class="mono dim">{grade?.findings.length ?? 0} 项</span>
        </div>
        <div class="findings">
          {#each (grade?.findings || []).slice(0, 10) as f}
            <div class="fd-row" class:active={f.electrodeId && selectedElectrodeId === f.electrodeId}>
              <span class="fd-cat" style={`background:${f.category === 'spacing' ? 'var(--danger)' : f.category === 'symmetry' ? 'var(--gold)' : f.category === 'region' ? 'var(--info)' : 'var(--text-3)'}`}></span>
              <span class="fd-txt">{f.message}</span>
              <span class="fd-pts mono">−{f.points}</span>
            </div>
          {:else}
            <div class="ii-ok">✓ 自动判分未发现扣分项</div>
          {/each}
        </div>

        <div class="hr" style="margin:13px 0"></div>

        <div class="cmt-head">
          <span>复核评语</span>
          <span class="dim mono">{comment.length}/200</span>
        </div>
        <textarea class="field cmt" rows="4" maxlength="200" bind:value={comment} placeholder="填写复核意见，学员端可见…"></textarea>
        <div class="presets">
          {#each presets as p, i}
            <button class="preset" onclick={() => (comment = p)}>{p.slice(0, 12)}…</button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="gp-foot">
      <div class="gpf-total">
        <span class="dim">复核总分</span>
        <b class="mono">{manualTotal}</b>
        <span class="dim" style="font-size:10px">（自动 {autoTotal}）</span>
      </div>
      <div class="gpf-acts">
        <button class="btn ghost" onclick={() => saveReview(false)}>暂存</button>
        <button class="btn primary" onclick={() => saveReview(true)} disabled={!sub || sub.status === 'reviewed'}>
          {sub?.status === 'reviewed' ? '已复核' : '确认复核'}
        </button>
      </div>
    </div>
  </aside>
</div>

<style>
  .review { display: grid; grid-template-columns: 232px 1fr 316px; gap: 10px; padding: 10px; height: 100%; min-height: 0; }

  .queue { display: flex; flex-direction: column; min-height: 0; overflow: hidden; padding: 11px; }
  .q-head { margin-bottom: 8px; }
  .q-stats { display: flex; gap: 6px; margin-bottom: 9px; }
  .qs { flex: 1; padding: 6px 8px; border-radius: 6px; background: #0c1319; border: 1px solid var(--line); text-align: center; }
  .qs b { display: block; font-size: 15px; font-variant-numeric: tabular-nums; }
  .qs span { font-size: 9.5px; color: var(--text-3); }
  .q-list { flex: 1; min-height: 0; min-width: 0; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; gap: 4px; padding-right: 2px; }
  .q-item {
    display: flex; flex-direction: column; gap: 2px; width: 100%;
    padding: 7px 9px; border-radius: 6px; text-align: left;
    background: #0c1319; border: 1px solid var(--line); color: var(--text);
    transition: all .13s;
  }
  .q-item:hover { border-color: #2c4050; background: #101a22; }
  .q-item.sel { border-color: rgba(56,211,189,.5); background: rgba(56,211,189,.07); }
  .q-item.pending { border-left: 3px solid rgba(240,189,104,.6); }
  .qi-top { display: flex; justify-content: space-between; align-items: baseline; }
  .qi-top b { font-size: 11.7px; font-weight: 600; }
  .qi-score { font-size: 12px; font-weight: 650; }
  .qi-mid { font-size: 9.8px; color: var(--text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .qi-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 2px; font-size: 9.3px; }

  .stage { display: flex; flex-direction: column; gap: 8px; min-width: 0; min-height: 0; overflow: hidden; }
  .stage-top { display: flex; align-items: center; justify-content: space-between; padding: 0 2px; }
  .st-left { display: flex; align-items: baseline; gap: 8px; }
  .st-left b { font-size: 13px; }
  .st-left .mono { font-size: 10px; }
  .vsep { width: 1px; height: 3px; }
  .st-right { display: flex; align-items: center; gap: 7px; }
  .stage-body { position: relative; flex: 1; min-height: 0; border-radius: 12px; overflow: hidden; border: 1px solid var(--line); background: radial-gradient(ellipse at 50% 42%, #101a22, #070b0f 72%); }
  .legend { position: absolute; left: 14px; top: 12px; display: flex; flex-direction: column; gap: 4px; padding: 8px 10px; border-radius: 7px; background: rgba(8,14,19,.82); border: 1px solid var(--line); }
  .leg { display: flex; align-items: center; gap: 6px; font-size: 10px; color: var(--text-2); }
  .sw { width: 8px; height: 8px; border-radius: 50%; }
  .sw.ok { background: #e8eef2; }
  .sw.bad { background: var(--danger); }
  .sw.ghost { background: #7fa0b6; opacity: .7; }
  .stage-bottom { display: flex; justify-content: space-between; align-items: center; padding: 0 2px; }
  .sb-tip { font-size: 10.5px; }
  .sbacts { display: flex; gap: 6px; }

  .grade-panel { display: flex; flex-direction: column; min-height: 0; }
  .gp-head { display: flex; justify-content: space-between; align-items: center; padding: 11px 12px; border-bottom: 1px solid var(--line); }
  .gp-body { flex: 1; min-height: 0; padding: 11px 13px; }

  .gscore { margin-bottom: 11px; }
  .gs-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
  .gs-name { font-size: 11.6px; font-weight: 600; }
  .gs-auto { font-size: 9.8px; color: var(--text-3); }
  .gs-controls { display: flex; align-items: center; gap: 4px; margin-bottom: 4px; }
  .gs-input { width: 46px; padding: 2px 6px; background: #0a1015; border: 1px solid var(--line-2); border-radius: 5px; text-align: center; font-size: 12.5px; font-weight: 650; }
  .gs-max { font-size: 9.5px; margin-left: auto; }
  .gs-changed { font-size: 9.5px; color: var(--gold); margin-top: 2px; }

  .findings-head, .cmt-head { display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 600; margin-bottom: 6px; }
  .findings { display: flex; flex-direction: column; gap: 2px; }
  .fd-row { display: flex; align-items: flex-start; gap: 6px; padding: 4px 6px; border-radius: 5px; font-size: 10.3px; color: var(--text-2); }
  .fd-row.active { background: rgba(56,211,189,.08); }
  .fd-cat { width: 3px; height: 10px; border-radius: 2px; flex: none; margin-top: 3px; }
  .fd-txt { flex: 1; line-height: 1.4; }
  .fd-pts { color: var(--danger); font-size: 9.5px; }
  .ii-ok { font-size: 11px; color: var(--ok); padding: 3px 6px; }

  .cmt { resize: vertical; font-size: 11.5px; line-height: 1.5; }
  .presets { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
  .preset { font-size: 9.5px; padding: 2px 6px; border-radius: 4px; background: #101a21; border: 1px solid var(--line); color: var(--text-3); }
  .preset:hover { color: var(--accent); border-color: rgba(56,211,189,.35); }

  .gp-foot { border-top: 1px solid var(--line); padding: 10px 13px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .gpf-total { display: flex; align-items: baseline; gap: 5px; }
  .gpf-total b { font-size: 19px; font-weight: 650; }
  .gpf-acts { display: flex; gap: 6px; }
  .delta { font-size: 10.5px; }
  .pos { color: var(--ok); }
  .neg { color: var(--danger); }

  @media (max-width: 1440px) { .review { grid-template-columns: 206px 1fr 284px; } }
</style>
