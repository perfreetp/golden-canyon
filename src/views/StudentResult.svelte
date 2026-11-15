<script>
  import { db, session, setView } from '../lib/store.js';
  import { CATEGORIES, buildReplay } from '../lib/grading.js';
  import { solveMontage, ELECTRODE_INFO, DEFAULT_REGIONS } from '../lib/montage.js';
  import ScalpCanvas from '../components/ScalpCanvas.svelte';

  let dbState = $state({});
  db.subscribe((v) => { dbState = v; });
  let ses = $state({});
  session.subscribe((v) => { ses = v; });

  const courses = $derived(dbState.courses || []);
  const course = $derived(courses.find((c) => c.id === ses.courseId) || courses[0]);
  const regionDict = $derived(dbState.regionDict || DEFAULT_REGIONS);

  const mySubs = $derived(
    (dbState.submissions || [])
      .filter((s) => s.studentId === ses.studentId && s.courseId === course?.id)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)),
  );
  let activeId = $state(null);
  const active = $derived(mySubs.find((s) => s.id === activeId) || mySubs[0]);
  const item = $derived(active?.item || course?.items?.find((i) => i.id === active?.itemId));
  const grade = $derived(active?.grade);
  const { nodes: LM } = solveMontage();

  const score = $derived(active?.finalScore ?? active?.autoScore ?? 0);
  const passLine = $derived(course?.passLine ?? 60);

  // 回放
  const frames = $derived(active?.events ? buildReplay(active.events) : []);
  let replayIdx = $state(-1);
  let playing = $state(false);
  let playTimer = null;
  const replaySnap = $derived(
    replayIdx >= 0 && frames[replayIdx] ? frames[replayIdx].snapshot : null,
  );
  let camKey = $state('top');

  function togglePlay() {
    if (!frames.length) return;
    playing = !playing;
    if (playing) {
      if (replayIdx >= frames.length - 1) replayIdx = -1;
      playTimer = setInterval(() => {
        replayIdx += 1;
        if (replayIdx >= frames.length - 1) {
          replayIdx = frames.length - 1;
          playing = false;
          clearInterval(playTimer);
        }
      }, 520);
    } else {
      clearInterval(playTimer);
    }
  }
  function stopReplay() {
    playing = false;
    clearInterval(playTimer);
    replayIdx = -1;
  }
  $effect(() => () => clearInterval(playTimer));

  const categoryRows = $derived(CATEGORIES.map((c) => ({
    ...c,
    auto: grade?.scores?.[c.id] ?? 0,
    manual: active?.manualAdjust?.[c.id] ?? grade?.scores?.[c.id] ?? 0,
  })));

  const leadRows = $derived.by(() => {
    if (!grade?.perLead) return [];
    return Object.values(grade.perLead);
  });

  const errCount = $derived(grade?.findings?.length ?? 0);
  const required = $derived(item?.requiredLeads || []);
  const placements = $derived(active?.placements || []);
  const wrongIds = $derived.by(() => {
    if (!grade) return [];
    const ids = new Set();
    for (const f of grade.findings) {
      if (f.electrodeId) ids.add(f.electrodeId);
      (f.electrodeIds || []).forEach((x) => ids.add(x));
    }
    return [...ids];
  });

  const ghosts = $derived(required.filter((r) => LM[r] && !placements.some((p) => p.name === r)).map((r) => ({ id: `gh-${r}`, name: r, pos: LM[r].pos })));

  const statusOf = (lead) => grade?.perLead?.[lead]?.status || 'ok';
  const statusLabel = { ok: '正确', missing: '漏放', misplaced: '偏离', region: '分区错' };
  const statusClass = { ok: 'ok', missing: 'danger', misplaced: 'gold', region: 'gold' };

  function fmtDuration(s) {
    if (!s) return '—';
    return `${Math.floor(s / 60)} 分 ${String(s % 60).padStart(2, '0')} 秒`;
  }
</script>

<div class="result">
  <!-- 左：我的提交 -->
  <aside class="subs panel">
    <div class="subs-head"><span class="eyebrow">我的提交</span><span class="dim mono">{mySubs.length}</span></div>
    <div class="subs-list scroll">
      {#each mySubs as s}
        {@const sc = s.finalScore ?? s.autoScore}
        <button class="sub-item" class:sel={s.id === active?.id} onclick={() => { activeId = s.id; replayIdx = -1; }}>
          <div class="si-top">
            <b>{s.item?.title || s.itemId}</b>
            <span class="mono si-score" class:neg={sc < passLine}>{sc}</span>
          </div>
          <div class="si-foot">
            <span class="dim">{new Date(s.submittedAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}</span>
            <span class="tag" class:ok={s.status === 'reviewed'} class:gold={s.status === 'pending'} style="font-size:9px;padding:0 5px">
              {s.status === 'reviewed' ? '已复核' : '待复核'}
            </span>
          </div>
        </button>
      {/each}
    </div>
    <div class="subs-foot">
      <div class="hint-line"><span>▸</span><span>讲师复核后分数与评语会在此更新</span></div>
    </div>
  </aside>

  <!-- 中：成绩与明细 -->
  <section class="detail scroll">
    <div class="hero panel">
      <div class="hero-left">
        <div class="ring" style={`--p:${score}`}>
          <svg viewBox="0 0 120 120" width="126" height="126">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#18242e" stroke-width="8"/>
            <circle cx="60" cy="60" r="52" fill="none"
              stroke={score >= passLine ? '#38d3bd' : '#f2726f'}
              stroke-width="8" stroke-linecap="round"
              stroke-dasharray={`${(score / 100) * 327} 327`}
              transform="rotate(-90 60 60)"/>
          </svg>
          <div class="ring-txt">
            <b>{score}</b>
            <span>最终得分</span>
          </div>
        </div>
      </div>
      <div class="hero-mid">
        <div class="hm-top">
          <h2>{item?.title}</h2>
          <span class="tag" class:ok={score >= passLine} class:danger={score < passLine}>
            {score >= passLine ? '及格' : '不及格'} · 及格线 {passLine}
          </span>
        </div>
        <div class="hm-meta">
          <span>提交于 {new Date(active?.submittedAt).toLocaleString('zh-CN', { hour12: false })}</span>
          <span class="dim">·</span>
          <span>用时 {fmtDuration(active?.durationSec)}</span>
          <span class="dim">·</span>
          <span>复核人 {active?.reviewedBy || '待复核'}</span>
        </div>
        <div class="hm-scores">
          {#each categoryRows as c}
            <div class="hms">
              <span class="hms-l">{c.label}</span>
              <b class="mono" class:warnc={c.manual < 20} class:neg={c.manual < 15}>{c.manual}</b>
              <span class="hms-m">/25</span>
              {#if active?.manualAdjust && active.manualAdjust[c.id] !== c.auto}
                <span class="hms-d mono">{active.manualAdjust[c.id] > c.auto ? '+' : ''}{active.manualAdjust[c.id] - c.auto}</span>
              {/if}
            </div>
          {/each}
        </div>
      </div>
      <div class="hero-right">
        <div class="hr-stat"><b class="mono">{placements.length}</b><span>已放电极</span></div>
        <div class="hr-stat"><b class="mono neg">{errCount}</b><span>扣分项</span></div>
      </div>
    </div>

    {#if active?.reviewComment}
      <div class="panel block comment-block">
        <div class="cb-head"><span class="eyebrow">讲师评语</span><span class="dim">{active.reviewedBy} · {new Date(active.reviewedAt).toLocaleDateString('zh-CN')}</span></div>
        <p class="cb-text">{active.reviewComment}</p>
      </div>
    {/if}

    <div class="panel block">
      <div class="block-head">
        <h3>扣分明细</h3>
        <span class="dim">共 {errCount} 项 · 点击可定位</span>
      </div>
      {#if errCount}
        <div class="fd-table">
          {#each grade.findings as f, i}
            <div class="fd-row">
              <span class="fd-idx mono">{String(i + 1).padStart(2, '0')}</span>
              <span class="fd-catname" style={`color:${f.category === 'spacing' ? 'var(--danger)' : f.category === 'symmetry' ? 'var(--gold)' : f.category === 'region' ? 'var(--info)' : 'var(--text-2)'}`}>
                {CATEGORIES.find(c => c.id === f.category)?.short}
              </span>
              <span class="fd-msg">{f.message}</span>
              <span class="fd-pts mono">−{f.points}</span>
            </div>
          {/each}
        </div>
      {:else}
        <div class="perfect">
          <div class="pf-icon">✓</div>
          <div>
            <b>四项全部满分</b>
            <p class="dim">命名、分区、对称与间距均符合要求。</p>
          </div>
        </div>
      {/if}
    </div>

    <div class="panel block">
      <div class="block-head">
        <h3>逐导联核对</h3>
        <span class="dim">{required.length} 个要求导联</span>
      </div>
      <div class="lead-grid">
        {#each required as lead}
          {@const st = statusOf(lead)}
          {@const info = grade?.perLead?.[lead]}
          <div class="lg-cell" class:bad={st !== 'ok'}>
            <div class="lgc-top">
              <span class="mono lgc-name">{lead}</span>
              <span class="tag {statusClass[st]}" style="font-size:9px;padding:0 5px">{statusLabel[st]}</span>
            </div>
            <div class="lgc-sub dim">{ELECTRODE_INFO[lead]?.cn}</div>
            {#if info?.deviation != null}
              <div class="lgc-dev mono" class:warnc={info.deviation > 1.5}>偏差 {info.deviation} cm</div>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <div class="panel block">
      <div class="block-head">
        <h3>左右对称核对</h3>
        <span class="dim">镜像偏差 ≤ 1.5 cm 为合格</span>
      </div>
      <div class="sym-grid">
        {#each grade?.pairDetails || [] as pd}
          <div class="sym-cell" class:bad={pd.deviation == null || pd.deviation > 1}>
            <span class="mono">{pd.left}</span>
            <div class="sym-meter">
              <div class="sym-fill" style={`width:${pd.deviation == null ? 100 : Math.min(100, (pd.deviation / 3) * 100)}%`}></div>
            </div>
            <span class="mono">{pd.right}</span>
            <span class="mono sym-num">{pd.deviation == null ? '—' : pd.deviation.toFixed(1)}</span>
          </div>
        {:else}
          <div class="dim">无可对称配对的电极</div>
        {/each}
      </div>
    </div>
  </section>

  <!-- 右：错题回放 -->
  <aside class="replay panel">
    <div class="rp-head">
      <span class="eyebrow">错题回放</span>
      <span class="dim mono">{replayIdx >= 0 ? `${replayIdx + 1}/${frames.length}` : `${frames.length} 帧`}</span>
    </div>
    <div class="rp-canvas">
      <ScalpCanvas
        placements={replaySnap || placements}
        {regionDict}
        showRegions={false}
        showLabels={true}
        editable={false}
        {wrongIds}
        {ghosts}
        presetSeq={1}
        presetKey={camKey}
        minSpacing={1.5}
      />
    </div>
    <div class="rp-cam">
      {#each [['top', '俯视'], ['left', '左侧'], ['right', '右侧'], ['front', '正前']] as [k, l]}
        <button class="rpc-btn" class:on={camKey === k} onclick={() => (camKey = k)}>{l}</button>
      {/each}
    </div>
    <div class="rp-controls">
      <button class="btn sm ghost" onclick={() => { replayIdx = Math.max(-1, replayIdx - 1); playing = false; clearInterval(playTimer); }}>◀</button>
      <button class="btn sm primary" onclick={togglePlay}>{playing ? '暂停' : '播放'}</button>
      <button class="btn sm ghost" onclick={() => { replayIdx = Math.min(frames.length - 1, replayIdx + 1); playing = false; clearInterval(playTimer); }}>▶</button>
      <button class="btn sm ghost" onclick={stopReplay}>重置</button>
    </div>
    <div class="rp-timeline">
      <input class="rp-range" type="range" min="-1" max={Math.max(0, frames.length - 1)} value={replayIdx}
        oninput={(e) => { replayIdx = Number(e.currentTarget.value); playing = false; clearInterval(playTimer); }} />
    </div>
    <div class="rp-log scroll">
      {#each frames as f, i}
        <button class="rl-row" class:cur={i === replayIdx} onclick={() => (replayIdx = i)}>
          <span class="rl-idx mono">{String(i + 1).padStart(2, '0')}</span>
          <span class="rl-type" class:move={f.type === 'move'}>{f.type === 'move' ? '微调' : '放置'}</span>
          <span class="mono rl-name">{f.name}</span>
        </button>
      {:else}
        <div class="emptystate" style="padding:14px">本次提交无操作轨迹</div>
      {/each}
    </div>
    <div class="rp-foot">
      <button class="btn sm ghost wide" onclick={() => setView('train')}>重新练习本题</button>
    </div>
  </aside>
</div>

<style>
  .result { display: grid; grid-template-columns: 218px 1fr 292px; gap: 10px; padding: 10px; height: 100%; min-height: 0; }

  .subs { display: flex; flex-direction: column; min-height: 0; padding: 11px; }
  .subs-head { display: flex; justify-content: space-between; margin-bottom: 8px; }
  .subs-list { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 4px; }
  .sub-item { display: flex; flex-direction: column; gap: 2px; padding: 7px 9px; border-radius: 6px; background: #0c1319; border: 1px solid var(--line); color: var(--text); text-align: left; transition: all .13s; }
  .sub-item:hover { border-color: #2c4050; background: #101a22; }
  .sub-item.sel { border-color: rgba(56,211,189,.5); background: rgba(56,211,189,.07); }
  .si-top { display: flex; justify-content: space-between; gap: 6px; align-items: flex-start; }
  .si-top b { font-size: 10.8px; line-height: 1.35; font-weight: 600; }
  .si-score { font-size: 13px; font-weight: 650; }
  .si-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 2px; font-size: 9.3px; }
  .subs-foot { border-top: 1px solid var(--line); padding-top: 8px; margin-top: 6px; }

  .detail { display: flex; flex-direction: column; gap: 10px; min-height: 0; overflow-y: auto; }

  .hero { display: flex; align-items: center; gap: 20px; padding: 16px 20px; }
  .hero-left { flex: none; }
  .ring { position: relative; display: grid; place-items: center; }
  .ring-txt { position: absolute; display: flex; flex-direction: column; align-items: center; }
  .ring-txt b { font-size: 30px; font-weight: 650; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
  .ring-txt span { font-size: 9.5px; color: var(--text-3); }
  .hero-mid { flex: 1; min-width: 0; }
  .hm-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .hm-top h2 { margin: 0; font-size: 16px; font-weight: 650; }
  .hm-meta { display: flex; gap: 6px; font-size: 10.5px; color: var(--text-2); margin: 3px 0 11px; flex-wrap: wrap; }
  .hm-scores { display: flex; gap: 20px; }
  .hms { display: flex; align-items: baseline; gap: 3px; }
  .hms-l { font-size: 10.5px; color: var(--text-3); }
  .hms b { font-size: 15px; font-weight: 650; }
  .hms b.warnc { color: var(--warn); }
  .hms b.neg { color: var(--danger); }
  .hms-m { font-size: 9px; color: var(--text-3); }
  .hms-d { font-size: 9px; color: var(--gold); margin-left: 2px; }
  .hero-right { display: flex; gap: 18px; border-left: 1px solid var(--line); padding-left: 18px; }
  .hr-stat { display: flex; flex-direction: column; align-items: center; }
  .hr-stat b { font-size: 19px; font-weight: 650; }
  .hr-stat span { font-size: 9.5px; color: var(--text-3); }

  .block { padding: 12px 15px 14px; }
  .block-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 9px; gap: 10px; }
  .block-head h3 { margin: 0; font-size: 12.5px; font-weight: 650; }

  .comment-block { border-left: 3px solid rgba(56,211,189,.55); }
  .cb-head { display: flex; justify-content: space-between; margin-bottom: 5px; }
  .cb-text { margin: 0; font-size: 12px; line-height: 1.6; color: var(--text); }

  .fd-table { display: flex; flex-direction: column; }
  .fd-row { display: flex; align-items: center; gap: 9px; padding: 6px 4px; border-bottom: 1px solid var(--line); font-size: 11.5px; }
  .fd-row:last-child { border-bottom: 0; }
  .fd-idx { font-size: 9.5px; color: var(--text-3); width: 16px; }
  .fd-catname { width: 30px; font-size: 10.5px; font-weight: 600; flex: none; }
  .fd-msg { flex: 1; color: var(--text-2); line-height: 1.4; }
  .fd-pts { color: var(--danger); font-size: 11px; }

  .perfect { display: flex; align-items: center; gap: 12px; padding: 8px 4px; }
  .pf-icon { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; background: rgba(79,201,139,.14); color: var(--ok); font-size: 16px; border: 1px solid rgba(79,201,139,.3); }
  .perfect b { font-size: 12px; }
  .perfect p { margin: 1px 0 0; font-size: 11px; }

  .lead-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 5px; }
  .lg-cell { padding: 6px 8px; border-radius: 6px; background: #0b1218; border: 1px solid var(--line); }
  .lg-cell.bad { border-color: rgba(242,114,111,.36); background: rgba(242,114,111,.055); }
  .lgc-top { display: flex; justify-content: space-between; align-items: center; gap: 4px; }
  .lgc-name { font-size: 11.5px; font-weight: 650; }
  .lgc-sub { font-size: 9px; margin-top: 1px; }
  .lgc-dev { font-size: 9px; margin-top: 1px; color: var(--text-3); }

  .sym-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 6px; }
  .sym-cell { display: flex; align-items: center; gap: 6px; font-size: 10px; }
  .sym-cell .mono { width: 22px; color: var(--text-2); }
  .sym-meter { flex: 1; height: 3px; border-radius: 2px; background: #16222c; overflow: hidden; }
  .sym-fill { height: 100%; background: var(--accent); }
  .sym-cell.bad .sym-fill { background: var(--danger); }
  .sym-num { width: 26px; text-align: right; }

  .replay { display: flex; flex-direction: column; min-height: 0; }
  .rp-head { display: flex; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid var(--line); }
  .rp-canvas { height: 268px; flex: none; background: #080d12; border-bottom: 1px solid var(--line); }
  .rp-cam { display: flex; gap: 3px; padding: 7px 10px 0; }
  .rpc-btn { flex: 1; padding: 3px 0; border-radius: 5px; background: #0d151b; border: 1px solid var(--line); color: var(--text-3); font-size: 10px; }
  .rpc-btn.on { background: rgba(56,211,189,.13); color: var(--accent); border-color: rgba(56,211,189,.4); }
  .rp-controls { display: flex; gap: 4px; padding: 7px 10px 0; }
  .rp-controls .btn { flex: 1; justify-content: center; }
  .rp-timeline { padding: 7px 12px 0; }
  .rp-range { width: 100%; -webkit-appearance: none; height: 4px; border-radius: 3px; background: #1b2731; }
  .rp-range::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: var(--accent); cursor: pointer; box-shadow: 0 0 6px rgba(56,211,189,.4); }
  .rp-log { flex: 1; min-height: 0; padding: 8px 10px; display: flex; flex-direction: column; gap: 2px; }
  .rl-row { display: flex; align-items: center; gap: 6px; padding: 3px 6px; border-radius: 5px; background: none; border: 0; font-size: 10.5px; color: var(--text-3); text-align: left; }
  .rl-row:hover { background: #111b23; }
  .rl-row.cur { background: rgba(56,211,189,.1); color: var(--accent); }
  .rl-idx { font-size: 9px; width: 16px; }
  .rl-type { font-size: 9px; padding: 0 4px; border-radius: 3px; background: #16222c; }
  .rl-type.move { background: rgba(240,189,104,.14); color: var(--gold); }
  .rl-name { font-size: 10.5px; }
  .rp-foot { border-top: 1px solid var(--line); padding: 8px 10px; }
  .rp-foot .wide { width: 100%; justify-content: center; }

  @media (max-width: 1460px) { .result { grid-template-columns: 196px 1fr 262px; } }
</style>
