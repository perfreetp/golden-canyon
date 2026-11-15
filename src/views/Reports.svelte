<script>
  import { db } from '../lib/store.js';
  import { courseStats, topErrorLeads, CATEGORIES } from '../lib/grading.js';
  import { buildScoreRows, buildErrorRows, toCSV, download, stamp } from '../lib/export.js';
  import { solveMontage, ELECTRODE_INFO, DEFAULT_REGIONS } from '../lib/montage.js';

  let dbState = $state({});
  db.subscribe((v) => { dbState = v; });

  const courses = $derived(dbState.courses || []);
  let courseId = $state('c-1020-basic');
  const course = $derived(courses.find((c) => c.id === courseId) || courses[0]);
  const cls = $derived((dbState.classes || []).find((c) => c.id === course?.classId));
  const regionDict = $derived(dbState.regionDict || DEFAULT_REGIONS);

  const subs = $derived((dbState.submissions || []).filter((s) => s.courseId === course?.id));
  const stats = $derived(courseStats(subs, course?.passLine ?? 60));
  const top5 = $derived(topErrorLeads(subs, regionDict, 5));
  const { nodes: LM } = solveMontage();

  const itemStats = $derived.by(() =>
    (course?.items || []).map((it) => {
      const list = subs.filter((s) => s.itemId === it.id);
      const st = courseStats(list, course.passLine ?? 60);
      return { ...it, count: list.length, ...st };
    }),
  );

  const categoryAvg = $derived(CATEGORIES.map((c) => {
    const vals = subs.filter((s) => s.grade?.scores).map((s) => s.grade.scores[c.id]);
    return { ...c, avg: vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 0 };
  }));

  const dist = $derived.by(() => {
    const b = [
      { label: '0–59', min: 0, max: 59.9, n: 0 },
      { label: '60–69', min: 60, max: 69.9, n: 0 },
      { label: '70–79', min: 70, max: 79.9, n: 0 },
      { label: '80–89', min: 80, max: 89.9, n: 0 },
      { label: '90–100', min: 90, max: 100, n: 0 },
    ];
    for (const s of subs) {
      const v = s.finalScore ?? s.autoScore;
      if (v == null) continue;
      const t = b.find((x) => v >= x.min && v <= x.max);
      if (t) t.n++;
    }
    return b;
  });

  function exportScores() {
    const rows = buildScoreRows(course, subs, cls?.students || [], course.items);
    download(`${course.code}-成绩表-${stamp()}.csv`, toCSV(rows));
  }
  function exportErrors() {
    const rows = buildErrorRows(top5);
    download(`${course.code}-高频错误导联-${stamp()}.csv`, toCSV(rows));
  }

  function exportJson() {
    download(`${course.code}-完整数据-${stamp()}.json`, JSON.stringify({ course, students: cls?.students, submissions: subs }, null, 2), 'application/json');
  }

  // 一键结课：把进行中标记为已结课
  function closeCourse() {
    db.update((d) => ({
      ...d,
      courses: d.courses.map((c) => (c.id === course.id ? { ...c, status: '已结课', statusSetAt: new Date().toISOString() } : c)),
    }));
  }

  const maxErr = $derived(Math.max(1, ...top5.map((t) => t.errors)));
</script>

<div class="reports scroll">
  <div class="r-top">
    <div class="rt-left">
      <select class="field" bind:value={courseId}>
        {#each courses as c}<option value={c.id}>{c.title}</option>{/each}
      </select>
      <span class="tag" class:ok={course?.status === '进行中'} class:info={course?.status === '已结课'}>{course?.status}</span>
    </div>
    <div class="rt-right">
      <button class="btn sm ghost" onclick={exportJson}>导出原始数据</button>
      <button class="btn sm ghost" onclick={exportErrors}>导出高频错误导联</button>
      <button class="btn sm primary" onclick={exportScores}>导出成绩表 (CSV)</button>
      {#if course?.status === '进行中'}
        <button class="btn sm" onclick={closeCourse}>结课并归档</button>
      {/if}
    </div>
  </div>

  <div class="kpi-row">
    <div class="kpi panel">
      <div class="kpi-l">参考人数</div>
      <div class="kpi-v">{stats.count}<span class="unit">/{cls?.headcount ?? '—'} 人</span></div>
      <div class="kpi-f">已复核 {subs.filter(s => s.status === 'reviewed').length} 份</div>
    </div>
    <div class="kpi panel">
      <div class="kpi-l">平均分</div>
      <div class="kpi-v">{stats.avg}<span class="unit">/100</span></div>
      <div class="kpi-f">最高 {stats.max} · 最低 {stats.min}</div>
    </div>
    <div class="kpi panel">
      <div class="kpi-l">及格率</div>
      <div class="kpi-v">{stats.passRate}<span class="unit">%</span></div>
      <div class="kpi-f">及格线 {course?.passLine} 分</div>
    </div>
    <div class="kpi panel">
      <div class="kpi-l">标准差</div>
      <div class="kpi-v">{stddev(subs)}</div>
      <div class="kpi-f">分差 {stats.max - stats.min} 分</div>
    </div>
  </div>

  <div class="grid2">
    <div class="panel block">
      <div class="block-head">
        <h3>高频错误导联 · TOP 5</h3>
        <span class="dim">按错误率排序，可导出给讲师做补强</span>
      </div>
      {#if top5.length}
        <div class="err-cards">
          {#each top5 as t, i}
            <div class="ec">
              <div class="ec-rank">{i + 1}</div>
              <div class="ec-body">
                <div class="ec-top">
                  <b class="mono">{t.lead}</b>
                  <span class="dim">{ELECTRODE_INFO[t.lead]?.cn} · {t.regionName}</span>
                  <span class="mono ec-rate">{Math.round(t.rate * 100)}%</span>
                </div>
                <div class="scorebar"><i style={`width:${(t.errors / maxErr) * 100}%;background:var(--danger)`}></i></div>
                <div class="ec-foot">
                  <span class="mono">{t.errors} / {t.total} 次出错</span>
                  <span class="dim">
                    {Object.entries(t.byType).filter(([, v]) => v > 0).map(([k, v]) => `${({ missing: '漏放', misplaced: '偏离', region: '分区' })[k]} ${v}`).join(' · ')}
                  </span>
                </div>
              </div>
            </div>
          {/each}
        </div>
        <div class="err-note">
          <b>教学建议：</b>以上导联点错误最集中，建议在下一轮训练中重点演示其解剖参照（如 F7/F8 需以外耳道上缘与前额极连线定位）。
        </div>
      {:else}
        <div class="emptystate">本课程暂无错误数据</div>
      {/if}
    </div>

    <div class="panel block">
      <div class="block-head"><h3>分数分布</h3><span class="dim">{stats.count} 份提交</span></div>
      <div class="hist">
        {#each dist as b}
          <div class="hc">
            <span class="hc-n">{b.n}</span>
            <div class="hc-bar-wrap"><div class="hc-bar" style={`height:${Math.max(2, (b.n / Math.max(1, ...dist.map(x => x.n))) * 100)}%`}></div></div>
            <span class="hc-l">{b.label}</span>
          </div>
        {/each}
      </div>
      <div class="hr" style="margin:12px 0"></div>
      <div class="block-head compact"><h3>分项平均</h3></div>
      <div class="catbars">
        {#each categoryAvg as c}
          <div class="cb-row">
            <span class="cb-l">{c.label}</span>
            <div class="scorebar"><i style={`width:${(c.avg / 25) * 100}%;background:${c.avg >= 20 ? 'var(--accent)' : c.avg >= 15 ? 'var(--gold)' : 'var(--danger)'}`}></i></div>
            <span class="mono cb-v">{c.avg}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <div class="panel block">
    <div class="block-head">
      <h3>题目达成情况</h3>
      <span class="dim">{course?.items.length} 道题</span>
    </div>
    <table class="tbl">
      <thead>
        <tr><th>题目</th><th>导联数</th><th>提交</th><th>均分</th><th>及格率</th><th>最高</th><th>最低</th></tr>
      </thead>
      <tbody>
        {#each itemStats as it}
          <tr>
            <td>{it.title}</td>
            <td class="mono dim">{it.requiredLeads.length}</td>
            <td class="mono">{it.count}</td>
            <td class="mono">{it.avg}</td>
            <td>
              <div class="pass-cell">
                <div class="scorebar" style="width:56px"><i style={`width:${it.passRate}%;background:${it.passRate >= 80 ? 'var(--accent)' : 'var(--gold)'}`}></i></div>
                <span class="mono">{it.passRate}%</span>
              </div>
            </td>
            <td class="mono dim">{it.max}</td>
            <td class="mono dim">{it.min}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="panel block">
    <div class="block-head">
      <h3>成绩表预览</h3>
      <span class="dim">导出为 CSV 可直接用于成绩归档</span>
    </div>
    <div class="tbl-wrap scroll">
      <table class="tbl">
        <thead>
          <tr><th>学号</th><th>姓名</th><th>科室</th><th>题目</th><th>命名</th><th>分区</th><th>对称</th><th>间距</th><th>最终分</th><th>状态</th></tr>
        </thead>
        <tbody>
          {#each subs.slice(0, 40) as s}
            {@const st = cls?.students.find((x) => x.id === s.studentId)}
            {@const sc = s.finalScore ?? s.autoScore}
            <tr>
              <td class="mono dim">{st?.empNo}</td>
              <td>{st?.name}</td>
              <td class="dim">{st?.dept}</td>
              <td class="dim">{s.item?.title}</td>
              <td class="mono dim">{s.grade?.scores?.naming}</td>
              <td class="mono dim">{s.grade?.scores?.region}</td>
              <td class="mono dim">{s.grade?.scores?.symmetry}</td>
              <td class="mono dim">{s.grade?.scores?.spacing}</td>
              <td class="mono strong" class:neg={sc < (course?.passLine ?? 60)}>{sc}</td>
              <td><span class="tag" class:ok={s.status === 'reviewed'} class:gold={s.status === 'pending'} style="font-size:9.5px">{s.status === 'reviewed' ? '已复核' : '待复核'}</span></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>

<script module>
  function stddev(subs) {
    const vals = subs.map((s) => s.finalScore ?? s.autoScore).filter((v) => v != null);
    if (vals.length < 2) return '—';
    const m = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / vals.length).toFixed(1);
  }
</script>

<style>
  .reports { display: flex; flex-direction: column; gap: 11px; padding: 13px 16px 26px; height: 100%; overflow-y: auto; }

  .r-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .rt-left, .rt-right { display: flex; align-items: center; gap: 7px; }
  .rt-left .field { width: 260px; }

  .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .kpi { padding: 11px 14px; }
  .kpi-l { font-size: 10.5px; color: var(--text-3); }
  .kpi-v { font-size: 24px; font-weight: 650; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
  .unit { font-size: 10px; color: var(--text-3); font-weight: 500; margin-left: 3px; }
  .kpi-f { font-size: 10px; color: var(--text-3); }

  .grid2 { display: grid; grid-template-columns: 1.25fr 1fr; gap: 10px; }
  .block { padding: 12px 15px 14px; }
  .block-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; gap: 10px; }
  .block-head.compact { margin-bottom: 7px; }
  .block-head h3 { margin: 0; font-size: 12.5px; font-weight: 650; }

  .err-cards { display: flex; flex-direction: column; gap: 6px; }
  .ec { display: flex; gap: 10px; align-items: flex-start; padding: 8px 10px; border-radius: 7px; background: #0b1218; border: 1px solid var(--line); }
  .ec-rank { width: 19px; height: 19px; flex: none; border-radius: 5px; display: grid; place-items: center; font-size: 10px; font-family: var(--mono); background: rgba(242,114,111,.14); color: var(--danger); border: 1px solid rgba(242,114,111,.28); }
  .ec-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .ec-top { display: flex; align-items: baseline; gap: 7px; }
  .ec-top b { font-size: 13px; }
  .ec-top span { font-size: 9.5px; }
  .ec-rate { margin-left: auto; font-size: 11px; color: var(--danger); font-weight: 650; }
  .ec-foot { display: flex; justify-content: space-between; font-size: 9.5px; color: var(--text-3); }

  .err-note { margin-top: 9px; padding: 8px 10px; border-radius: 6px; font-size: 10.5px; line-height: 1.5; color: var(--text-2); background: rgba(106,168,232,.07); border: 1px solid rgba(106,168,232,.2); }
  .err-note b { color: var(--info); }

  .hist { display: flex; gap: 8px; align-items: flex-end; height: 96px; }
  .hc { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
  .hc-n { font-size: 10px; color: var(--text-2); font-variant-numeric: tabular-nums; }
  .hc-bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; }
  .hc-bar { width: 100%; border-radius: 3px 3px 0 0; background: linear-gradient(180deg, #38d3bd, #1a625b); min-height: 2px; }
  .hc-l { font-size: 9px; color: var(--text-3); margin-top: 2px; }

  .catbars { display: flex; flex-direction: column; gap: 7px; }
  .cb-row { display: grid; grid-template-columns: 56px 1fr 30px; gap: 8px; align-items: center; }
  .cb-l { font-size: 10.5px; color: var(--text-2); }
  .cb-v { text-align: right; font-size: 11px; }

  .pass-cell { display: flex; align-items: center; gap: 7px; }
  .tbl-wrap { max-height: 320px; overflow-y: auto; }
  .mono.strong { font-weight: 650; }
  .neg { color: var(--danger); }

  @media (max-width: 1400px) { .grid2 { grid-template-columns: 1fr; } }
</style>
