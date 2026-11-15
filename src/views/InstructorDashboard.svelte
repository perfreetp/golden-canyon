<script>
  import { db, session, setView } from '../lib/store.js';
  import { courseStats, topErrorLeads, CATEGORIES } from '../lib/grading.js';

  let dbState = $state({});
  db.subscribe((v) => { dbState = v; });
  let ses = $state({});
  session.subscribe((v) => { ses = v; });

  let selectedCourseId = $state('c-1020-basic');

  const courses = $derived(dbState.courses || []);
  const course = $derived(courses.find((c) => c.id === selectedCourseId) || courses[0]);
  const cls = $derived((dbState.classes || []).find((c) => c.id === course?.classId));
  const subs = $derived((dbState.submissions || []).filter((s) => s.courseId === course?.id));
  const stats = $derived(courseStats(subs, course?.passLine ?? 60));
  const pending = $derived(subs.filter((s) => s.status === 'pending'));
  const reviewed = $derived(subs.filter((s) => s.status === 'reviewed'));
  const top = $derived(topErrorLeads(subs, dbState.regionDict || [], 5));

  const itemRows = $derived.by(() => {
    if (!course) return [];
    return course.items.map((it) => {
      const list = subs.filter((s) => s.itemId === it.id);
      const st = courseStats(list, course.passLine ?? 60);
      return { item: it, count: list.length, avg: st.avg, pass: st.passRate, list };
    });
  });

  const scoreBuckets = $derived.by(() => {
    const buckets = [
      { label: '0–59', min: 0, max: 59.9, n: 0 },
      { label: '60–69', min: 60, max: 69.9, n: 0 },
      { label: '70–79', min: 70, max: 79.9, n: 0 },
      { label: '80–89', min: 80, max: 89.9, n: 0 },
      { label: '90–100', min: 90, max: 100, n: 0 },
    ];
    for (const s of subs) {
      const v = s.finalScore ?? s.autoScore;
      if (v == null) continue;
      const b = buckets.find((b) => v >= b.min && v <= b.max);
      if (b) b.n++;
    }
    return buckets;
  });

  const categoryAvg = $derived.by(() => {
    return CATEGORIES.map((c) => {
      const vals = subs.filter((s) => s.grade?.scores).map((s) => s.grade.scores[c.id]);
      return { ...c, avg: vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 0 };
    });
  });

  function statusTag(s) {
    if (s.status === 'reviewed') return ['已复核', 'ok'];
    if (s.status === 'pending') return ['待复核', 'gold'];
    return ['自动判分', 'info'];
  }
  function delta(s) {
    if (s.manualScore == null || s.autoScore == null) return null;
    return s.manualScore - s.autoScore;
  }
  function fmtTime(iso) {
    const d = new Date(iso);
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
</script>

<div class="page scroll">
  <div class="course-strip">
    {#each courses as c}
      <button class="course-card" class:sel={c.id === selectedCourseId} onclick={() => (selectedCourseId = c.id)}>
        <div class="cc-top">
          <span class="mono cc-code">{c.code}</span>
          <span class="tag" class:ok={c.status === '进行中'} class:info={c.status === '已结课'}>{c.status}</span>
        </div>
        <b class="cc-title">{c.title}</b>
        <div class="cc-meta">{c.term}</div>
        <div class="cc-foot">
          <span>{cls?.headcount ?? '—'} 名学员</span>
          <span>·</span>
          <span>{c.items.length} 道题</span>
        </div>
      </button>
    {/each}
    <button class="course-card add" onclick={() => setView('builder')}>
      <span class="plus">＋</span>
      <span>新建课程</span>
    </button>
  </div>

  <div class="kpi-row">
    <div class="kpi panel">
      <div class="kpi-label">平均分</div>
      <div class="kpi-val">{stats.avg}<span class="unit">/100</span></div>
      <div class="kpi-foot">已判分 {stats.count} 份</div>
    </div>
    <div class="kpi panel">
      <div class="kpi-label">及格率</div>
      <div class="kpi-val">{stats.passRate}<span class="unit">%</span></div>
      <div class="kpi-foot">及格线 {course?.passLine} 分</div>
    </div>
    <div class="kpi panel gold">
      <div class="kpi-label">待人工复核</div>
      <div class="kpi-val">{pending.length}<span class="unit">份</span></div>
      <div class="kpi-foot"><button class="linkbtn" onclick={() => setView('review')}>前往复核 →</button></div>
    </div>
    <div class="kpi panel">
      <div class="kpi-label">最高 / 最低</div>
      <div class="kpi-val small">{stats.max} <span class="dim">/</span> {stats.min}</div>
      <div class="kpi-foot">分差 {stats.max - stats.min} 分</div>
    </div>
  </div>

  <div class="two-col">
    <div class="panel block">
      <div class="block-head">
        <h3>题目与完成情况</h3>
        <span class="dim">{course?.items.length} 道题 · {cls?.students.length ?? 0} 名学员</span>
      </div>
      <div class="item-list">
        {#each itemRows as row}
          <div class="item-row">
            <div class="ir-left">
              <div class="ir-title">{row.item.title}</div>
              <div class="ir-meta">
                <span class="tag xs">{row.item.requiredLeads.length} 导联</span>
                <span class="dim">{row.item.minutes} 分钟 · 上限 {row.item.attempts} 次</span>
              </div>
            </div>
            <div class="ir-mid">
              <div class="ir-stat"><b>{row.count}</b><span>提交</span></div>
              <div class="ir-stat"><b>{row.avg || '—'}</b><span>均分</span></div>
              <div class="ir-stat"><b>{row.pass || 0}%</b><span>及格</span></div>
            </div>
            <div class="ir-right">
              <button class="btn sm ghost" onclick={() => { session.update(s => ({...s, courseId: course.id, itemId: row.item.id})); setView('builder'); }}>查看题目</button>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="panel block">
      <div class="block-head">
        <h3>分项平均分</h3>
        <span class="dim">四项各 25 分</span>
      </div>
      <div class="cat-list">
        {#each categoryAvg as c}
          <div class="cat-row">
            <div class="cat-top">
              <span class="cat-name">{c.label}</span>
              <span class="mono cat-val">{c.avg}<i>/25</i></span>
            </div>
            <div class="scorebar"><i style={`width:${(c.avg / 25) * 100}%; background:${c.avg >= 20 ? 'var(--accent)' : c.avg >= 15 ? 'var(--gold)' : 'var(--danger)'}`}></i></div>
            <div class="cat-desc">{c.desc}</div>
          </div>
        {/each}
      </div>

      <div class="hr" style="margin:14px 0 12px"></div>
      <div class="block-head compact"><h3>分数分布</h3></div>
      <div class="hist">
        {#each scoreBuckets as b}
          <div class="hist-col">
            <div class="hist-bar-wrap">
              <div class="hist-bar" style={`height:${Math.max(3, (b.n / Math.max(1, ...scoreBuckets.map(x => x.n))) * 100)}%`}></div>
            </div>
            <span class="hist-n">{b.n}</span>
            <span class="hist-l">{b.label}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <div class="panel block">
    <div class="block-head">
      <h3>提交队列</h3>
      <div class="head-tools">
        <span class="dim">共 {subs.length} 份 · 待复核 {pending.length} · 已复核 {reviewed.length}</span>
      </div>
    </div>
    <div class="tbl-wrap scroll">
      <table class="tbl">
        <thead>
          <tr>
            <th>学员</th><th>题目</th><th>自动分</th><th>复核分</th><th>最终分</th>
            <th>命名</th><th>分区</th><th>对称</th><th>间距</th><th>状态</th><th>提交</th><th></th>
          </tr>
        </thead>
        <tbody>
          {#each subs.slice().sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0) || new Date(b.submittedAt) - new Date(a.submittedAt)) as s}
            {@const st = statusTag(s)}
            {@const d = delta(s)}
            <tr class:sel={s.status === 'pending'}>
              <td>
                <div class="who">
                  <span class="who-n">{s.studentName}</span>
                  <span class="who-e mono">{cls?.students.find(x => x.id === s.studentId)?.empNo || ''}</span>
                </div>
              </td>
              <td class="dim">{s.item?.title || s.itemId}</td>
              <td class="mono">{s.autoScore}</td>
              <td class="mono">{s.manualScore ?? '—'}</td>
              <td class="mono strong">{s.finalScore ?? s.autoScore}</td>
              <td class="mono dim">{s.grade?.scores?.naming ?? '—'}</td>
              <td class="mono dim">{s.grade?.scores?.region ?? '—'}</td>
              <td class="mono dim">{s.grade?.scores?.symmetry ?? '—'}</td>
              <td class="mono dim">{s.grade?.scores?.spacing ?? '—'}</td>
              <td>
                <span class="tag" class:ok={st[1] === 'ok'} class:gold={st[1] === 'gold'} class:info={st[1] === 'info'}>{st[0]}</span>
                {#if d != null && d !== 0}<span class="delta {d > 0 ? 'pos' : 'neg'}">{d > 0 ? '+' : ''}{d}</span>{/if}
              </td>
              <td class="dim mono">{fmtTime(s.submittedAt)}</td>
              <td>
                <button
                  class="btn xs"
                  onclick={() => { session.update(x => ({ ...x, courseId: course.id, reviewId: s.id })); setView('review', { reviewId: s.id }); }}
                >复核</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  <div class="panel block">
    <div class="block-head">
      <h3>错误率最高的导联点</h3>
      <button class="btn sm ghost" onclick={() => setView('reports')}>完整报表 →</button>
    </div>
    {#if top.length}
      <div class="top5">
        {#each top as t, i}
          <div class="top-item">
            <div class="ti-rank">{i + 1}</div>
            <div class="ti-main">
              <div class="ti-head"><b class="mono">{t.lead}</b><span class="dim">{t.regionName}</span></div>
              <div class="scorebar"><i style={`width:${t.rate * 100}%; background:var(--danger)`}></i></div>
              <div class="ti-foot"><span class="mono">{t.errors}/{t.total}</span><span>错误率 {(t.rate * 100).toFixed(0)}%</span></div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="emptystate">暂无错误数据</div>
    {/if}
  </div>
</div>

<style>
  .page { padding: 16px 20px 30px; display: flex; flex-direction: column; gap: 13px; height: 100%; overflow-y: auto; }

  .course-strip { display: grid; grid-template-columns: repeat(auto-fill, minmax(226px, 1fr)); gap: 10px; }
  .course-card {
    text-align: left; display: flex; flex-direction: column; gap: 3px;
    padding: 12px 13px; border-radius: var(--radius);
    background: linear-gradient(170deg, #111a22, #0c1319);
    border: 1px solid var(--line); color: var(--text);
    transition: border-color .15s, background .15s, transform .1s;
  }
  .course-card:hover { border-color: #2c4150; background: linear-gradient(170deg, #131e27, #0d151c); }
  .course-card.sel { border-color: rgba(56,211,189,.55); box-shadow: 0 0 0 1px rgba(56,211,189,.25), 0 6px 22px rgba(0,0,0,.3); }
  .course-card.add { align-items: center; justify-content: center; color: var(--text-3); border-style: dashed; gap: 4px; font-size: 12px; }
  .course-card.add .plus { font-size: 18px; }
  .cc-top { display: flex; align-items: center; justify-content: space-between; }
  .cc-code { font-size: 10px; color: var(--text-3); letter-spacing: .06em; }
  .cc-title { font-size: 12.5px; font-weight: 600; line-height: 1.35; }
  .cc-meta { font-size: 10.5px; color: var(--text-3); }
  .cc-foot { display: flex; gap: 5px; font-size: 10.5px; color: var(--text-2); margin-top: 3px; }

  .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .kpi { padding: 12px 14px; display: flex; flex-direction: column; gap: 1px; position: relative; overflow: hidden; }
  .kpi::after { content: ''; position: absolute; right: -22px; top: -22px; width: 70px; height: 70px; border-radius: 50%; background: radial-gradient(circle, rgba(56,211,189,.09), transparent 70%); }
  .kpi.gold::after { background: radial-gradient(circle, rgba(240,189,104,.11), transparent 70%); }
  .kpi-label { font-size: 10.5px; color: var(--text-3); letter-spacing: .06em; }
  .kpi-val { font-size: 25px; font-weight: 650; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
  .kpi-val.small { font-size: 20px; }
  .unit { font-size: 10.5px; color: var(--text-3); font-weight: 500; margin-left: 2px; }
  .kpi-foot { font-size: 10.5px; color: var(--text-3); }
  .linkbtn { background: none; border: 0; padding: 0; color: var(--gold); font-size: 10.5px; }

  .two-col { display: grid; grid-template-columns: 1.35fr 1fr; gap: 10px; }
  .block { padding: 13px 15px 15px; }
  .block-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; gap: 10px; }
  .block-head.compact { margin-bottom: 7px; }
  .block-head h3 { margin: 0; font-size: 12.5px; font-weight: 650; }
  .head-tools { display: flex; gap: 10px; align-items: center; font-size: 10.5px; }

  .item-list { display: flex; flex-direction: column; gap: 6px; }
  .item-row {
    display: flex; align-items: center; gap: 12px;
    padding: 9px 11px; border-radius: 8px;
    background: #0b1218; border: 1px solid var(--line);
  }
  .ir-left { flex: 1; min-width: 0; }
  .ir-title { font-size: 12px; font-weight: 550; }
  .ir-meta { display: flex; gap: 7px; align-items: center; margin-top: 2px; font-size: 10.5px; }
  .tag.xs { padding: 0 6px; font-size: 10px; }
  .ir-mid { display: flex; gap: 16px; }
  .ir-stat { display: flex; flex-direction: column; align-items: flex-end; }
  .ir-stat b { font-size: 13px; font-variant-numeric: tabular-nums; }
  .ir-stat span { font-size: 9.5px; color: var(--text-3); }

  .cat-list { display: flex; flex-direction: column; gap: 11px; }
  .cat-row { display: flex; flex-direction: column; gap: 3px; }
  .cat-top { display: flex; justify-content: space-between; align-items: baseline; }
  .cat-name { font-size: 11.5px; }
  .cat-val { font-size: 12px; font-variant-numeric: tabular-nums; }
  .cat-val i { font-style: normal; font-size: 9.5px; color: var(--text-3); }
  .cat-desc { font-size: 10px; color: var(--text-3); }

  .hist { display: flex; gap: 7px; align-items: flex-end; height: 90px; }
  .hist-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
  .hist-bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; }
  .hist-bar { width: 100%; border-radius: 3px 3px 0 0; background: linear-gradient(180deg, #38d3bd, #1d6f66); min-height: 3px; }
  .hist-n { font-size: 10px; color: var(--text-2); font-variant-numeric: tabular-nums; margin-top: 2px; }
  .hist-l { font-size: 9px; color: var(--text-3); }

  .tbl-wrap { max-height: 300px; overflow-y: auto; margin: 0 -4px; padding: 0 4px; }
  .who { display: flex; flex-direction: column; line-height: 1.3; }
  .who-n { font-size: 12px; font-weight: 550; }
  .who-e { font-size: 9.5px; color: var(--text-3); }
  .mono.strong { font-weight: 650; color: var(--text); }
  .delta { font-size: 10px; margin-left: 5px; }

  .top5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 9px; }
  .top-item { display: flex; gap: 9px; padding: 9px 10px; border-radius: 8px; background: #0b1218; border: 1px solid var(--line); }
  .ti-rank {
    width: 19px; height: 19px; flex: none; border-radius: 5px; display: grid; place-items: center;
    font-size: 10.5px; font-family: var(--mono); background: rgba(242,114,111,.14); color: var(--danger);
    border: 1px solid rgba(242,114,111,.28);
  }
  .ti-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .ti-head { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; }
  .ti-head b { font-size: 13px; }
  .ti-head span { font-size: 9.5px; }
  .ti-foot { display: flex; justify-content: space-between; font-size: 9.5px; color: var(--text-3); }

  @media (max-width: 1280px) {
    .two-col { grid-template-columns: 1fr; }
    .top5 { grid-template-columns: repeat(3, 1fr); }
    .kpi-row { grid-template-columns: repeat(2, 1fr); }
  }
</style>
