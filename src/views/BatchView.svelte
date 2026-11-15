<script>
  import Icon from '../components/Icon.svelte';
  import SeverityPill from '../components/SeverityPill.svelte';
  import StateBadge from '../components/StateBadge.svelte';
  import { workspace, issueCounts, canRelease, fmtDateTime, fmtDate } from '../lib/store.svelte.js';
  import { batchStats, releaseBlockers, allOperators } from '../lib/model.js';

  let { batch, cases } = $props();

  let filterState = $state('all');
  let filterSev = $state('all');
  let confirmRelease = $state(false);

  const list = $derived(batch.cases.map((id) => cases[id]).filter(Boolean));
  const stats = $derived(batchStats(batch, cases));
  const blockers = $derived(releaseBlockers(batch, cases));
  const released = $derived(batch.status === 'released');
  const manifest = $derived(batch.manifest);

  const visible = $derived(
    list.filter((c) => {
      if (filterState !== 'all' && c.state !== filterState) return false;
      if (filterSev !== 'all' && !c.issues.some((i) => i.severity === filterSev)) return false;
      return true;
    })
  );

  const operators = $derived([...new Set(list.map((c) => c.operator))]);

  const typeRows = $derived.by(() => {
    const m = new Map();
    for (const c of list) m.set(c.params.examType, (m.get(c.params.examType) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  });

  const severityBars = $derived.by(() => {
    const total = Math.max(1, stats.issues.total);
    return [
      { key: 'high', name: '严重', n: stats.issues.high, color: 'var(--high)' },
      { key: 'medium', name: '一般', n: stats.issues.medium, color: 'var(--med)' },
      { key: 'low', name: '提示', n: stats.issues.low, color: 'var(--low)' }
    ].map((s) => ({ ...s, pct: (s.n / total) * 100 }));
  });

  const typeDist = $derived.by(() => {
    const m = new Map();
    for (const c of list) {
      for (const i of c.issues) m.set(i.checkType, (m.get(i.checkType) || 0) + 1);
    }
    const names = {
      'missing-part': '缺部位',
      'marker-oob': '标记超界',
      'label-overlap': '标注重叠',
      'size-mismatch': '尺寸不一致',
      'label-overflow': '标注溢出',
      'label-outside': '标注越界',
      'label-covered': '标注遮挡'
    };
    return [...m.entries()]
      .map(([k, n]) => ({ key: k, name: names[k] || k, n }))
      .sort((a, b) => b.n - a.n);
  });

  function doRelease() {
    workspace.release();
    confirmRelease = false;
  }
</script>

<div class="overview">
  <!-- head -->
  <header class="batch-head card">
    <div class="head-main">
      <div class="row gap-10">
        <h2 class="b-name">{batch.name}</h2>
        <StateBadge state={batch.status} />
      </div>
      <div class="b-meta">
        <span class="mono">{batch.id}</span>
        <span class="dot-sep">·</span>
        <span>{batch.source}</span>
        <span class="dot-sep">·</span>
        <span>检查日期 {stats.dateRange.from || '—'} ~ {stats.dateRange.to || '—'}</span>
        <span class="dot-sep">·</span>
        <span>{operators.length} 位操作医生</span>
      </div>
    </div>
    <span class="spacer"></span>
    <div class="kpis">
      <div class="kpi">
        <span class="kpi-n tnum">{stats.cases}</span>
        <span class="kpi-l">例数</span>
      </div>
      <div class="kpi">
        <span class="kpi-n tnum" style="color:var(--high)">{stats.issues.high}</span>
        <span class="kpi-l">严重</span>
      </div>
      <div class="kpi">
        <span class="kpi-n tnum">{stats.issues.pending}</span>
        <span class="kpi-l">待复核条目</span>
      </div>
      <div class="kpi">
        <span class="kpi-n tnum">{stats.phases.signed}</span>
        <span class="kpi-l">已签名</span>
      </div>
    </div>
  </header>

  <div class="grid">
    <!-- left: case table -->
    <section class="card table-card">
      <div class="card-head">
        <Icon name="grid" size={14} />
        <span class="card-title">报告清单</span>
        <span class="spacer"></span>
        <div class="filters">
          <select class="select sm" bind:value={filterState}>
            <option value="all">全部状态</option>
            <option value="draft">草稿</option>
            <option value="submitted">待复核</option>
            <option value="rework">待整改</option>
            <option value="signed">已签名</option>
          </select>
          <select class="select sm" bind:value={filterSev}>
            <option value="all">全部级别</option>
            <option value="high">含严重</option>
            <option value="medium">含一般</option>
            <option value="low">含提示</option>
          </select>
        </div>
      </div>
      <div class="table-wrap scroll">
        <table>
          <thead>
            <tr>
              <th>报告号</th>
              <th>患者</th>
              <th>检查日期</th>
              <th>操作医生</th>
              <th>检查类型</th>
              <th class="c">状态</th>
              <th class="c">严重</th>
              <th class="c">一般</th>
              <th class="c">提示</th>
              <th class="c">复核</th>
            </tr>
          </thead>
          <tbody>
            {#each visible as c}
              {@const ic = issueCounts(c)}
              <tr
                class:active={c.id === workspace.activeCaseId}
                onclick={() => workspace.selectCase(c.id)}
              >
                <td class="mono cid">{c.id}</td>
                <td>{c.patientLabel}<span class="muted"> · {c.gender}/{c.age}</span></td>
                <td class="mono">{c.examDate}</td>
                <td>{c.operator}</td>
                <td>{c.params.examType}</td>
                <td class="c"><StateBadge state={c.state} size="sm" /></td>
                <td class="c tnum">{#if ic.high}<span class="num hi">{ic.high}</span>{:else}<span class="num zero">0</span>{/if}</td>
                <td class="c tnum">{#if ic.medium}<span class="num md">{ic.medium}</span>{:else}<span class="num zero">0</span>{/if}</td>
                <td class="c tnum">{#if ic.low}<span class="num lo">{ic.low}</span>{:else}<span class="num zero">0</span>{/if}</td>
                <td class="c">
                  {#if c.confirmedBy}
                    <span class="signed-by">{c.confirmedBy}</span>
                  {:else}
                    <span class="muted">—</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
        {#if !visible.length}
          <div class="empty">没有符合筛选条件的报告</div>
        {/if}
      </div>
    </section>

    <!-- right: distribution + release -->
    <aside class="side">
      <div class="card dist-card">
        <div class="card-head">
          <Icon name="filter" size={14} />
          <span class="card-title">问题分布</span>
        </div>
        <div class="dist-body">
          <div class="sev-stack">
            <div class="sev-bar">
              {#each severityBars as s}
                {#if s.n} <span class="seg" style={`width:${s.pct}%;background:${s.color}`} title={`${s.name} ${s.n}`}></span> {/if}
              {/each}
            </div>
            <div class="sev-legend">
              {#each severityBars as s}
                <span class="leg"><span class="dot" style={`background:${s.color}`}></span>{s.name} <b>{s.n}</b></span>
              {/each}
            </div>
          </div>

          <div class="type-list">
            {#each typeDist as t}
              <div class="type-row">
                <span class="type-name">{t.name}</span>
                <div class="type-track"><span style={`width:${(t.n / Math.max(1, typeDist[0].n)) * 100}%`}></span></div>
                <span class="type-n tnum">{t.n}</span>
              </div>
            {:else}
              <div class="muted" style="font-size:11.5px;padding:6px 0">整批未检出问题</div>
            {/each}
          </div>

          <dl class="mini-stats">
            <div><dt>检查类型</dt><dd>{typeRows.length}</dd></div>
            <div><dt>已确认条目</dt><dd>{stats.issues.confirmed}</dd></div>
            <div><dt>驳回条目</dt><dd class:danger={stats.issues.dismissed > 0}>{stats.issues.dismissed}</dd></div>
            <div><dt>核对进度</dt><dd>{Math.round(stats.progress * 100)}%</dd></div>
          </dl>
        </div>
      </div>

      <div class="card release-card">
        <div class="card-head">
          <Icon name={released ? 'lock' : 'unlock'} size={14} />
          <span class="card-title">{released ? '已放行归档' : '批次放行'}</span>
          <span class="spacer"></span>
          {#if released}<span class="pill ok">清单已生成</span>{/if}
        </div>
        <div class="release-body">
          {#if released}
            <div class="release-done">
              <div class="ok-ring"><Icon name="check" size={20} color="#2f6b4f" /></div>
              <div>
                <div style="font-weight:600">批次清单 {manifest.batchId}</div>
                <div class="muted" style="font-size:11px">
                  {fmtDate(manifest.releasedAt)} · 复核人 {manifest.releasedBy}
                </div>
              </div>
            </div>
            <dl class="manifest-mini">
              <div><dt>例数</dt><dd>{manifest.caseCount}</dd></div>
              <div><dt>问题总数</dt><dd>{manifest.issueTotals.total}</dd></div>
              <div><dt>复核人</dt><dd>{manifest.reviewers.map((r) => r.name).join('、')}</dd></div>
              <div><dt>签名码</dt><dd class="mono">{manifest.signature}</dd></div>
            </dl>
            <button class="btn primary" style="width:100%" onclick={() => workspace.setView('archive')}>
              <Icon name="download" size={12} /> 查看批次清单
            </button>
          {:else}
            <div class="gate">
              <div class="gate-head">
                <span class="gate-title">放行条件</span>
                <span class="pill {blockers.length ? 'medium' : 'ok'}">
                  {blockers.length ? `${blockers.length} 项未满足` : '全部满足'}
                </span>
              </div>
              <ul class="gate-list">
                <li class:ok={stats.phases.draft === 0}>
                  <Icon name={stats.phases.draft === 0 ? 'check' : 'clock'} size={12} />
                  全部报告已提交复核
                  <span class="spacer"></span>
                  <span class="mono">{stats.cases - stats.phases.draft}/{stats.cases}</span>
                </li>
                <li class:ok={stats.phases.submitted === 0}>
                  <Icon name={stats.phases.submitted === 0 ? 'check' : 'clock'} size={12} />
                  复核条目已全部处理
                  <span class="spacer"></span>
                  <span class="mono">{stats.issues.pending} 待处理</span>
                </li>
                <li class:ok={stats.phases.rework === 0}>
                  <Icon name={stats.phases.rework === 0 ? 'check' : 'alert'} size={12} />
                  无退回整改病例
                  <span class="spacer"></span>
                  <span class="mono">{stats.phases.rework} 例</span>
                </li>
                <li class:ok={stats.phases.signed === stats.cases && stats.cases > 0}>
                  <Icon name={stats.phases.signed === stats.cases ? 'check' : 'clock'} size={12} />
                  整例复核签名完成
                  <span class="spacer"></span>
                  <span class="mono">{stats.phases.signed}/{stats.cases}</span>
                </li>
              </ul>
            </div>

            {#if blockers.length}
              <div class="blockers">
                <Icon name="info" size={12} />
                <div>{blockers.join('；')}。</div>
              </div>
            {/if}

            {#if confirmRelease}
              <div class="confirm-box">
                <div class="confirm-title">确认放行整批 {stats.cases} 例报告？</div>
                <div class="muted" style="font-size:11px;line-height:1.55">
                  放行后将生成不可修改的批次清单，记录例数、问题分布与复核人，写入历史归档。
                </div>
                <div class="row gap-6" style="margin-top:9px">
                  <span class="spacer"></span>
                  <button class="btn sm ghost" onclick={() => (confirmRelease = false)}>取消</button>
                  <button class="btn sm primary" onclick={doRelease}>确认放行</button>
                </div>
              </div>
            {:else}
              <button
                class="btn primary"
                style="width:100%"
                disabled={!canRelease(batch, cases)}
                onclick={() => (confirmRelease = true)}
              >
                <Icon name="unlock" size={12} /> 放行并生成批次清单
              </button>
            {/if}
          {/if}
        </div>
      </div>
    </aside>
  </div>
</div>

<style>
  .overview {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
    min-height: 0;
    overflow: auto;
  }
  .batch-head {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 13px 18px;
    flex-wrap: wrap;
  }
  .b-name { font-size: 16px; }
  .b-meta {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    font-size: 11px;
    color: var(--ink-3);
    margin-top: 3px;
    align-items: center;
  }
  .kpis {
    display: flex;
    gap: 4px;
  }
  .kpi {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    padding: 2px 14px;
    border-left: 1px solid var(--line-2);
    min-width: 70px;
  }
  .kpi-n {
    font-size: 21px;
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }
  .kpi-l { font-size: 10.5px; color: var(--ink-3); }

  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 12px;
    align-items: start;
    flex: 1;
    min-height: 0;
  }

  .table-card {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }
  .table-wrap { overflow: auto; }
  .filters { display: flex; gap: 6px; }
  .filters .select {
    height: 26px;
    font-size: 11.5px;
    width: auto;
    padding: 0 24px 0 8px;
    background-position: calc(100% - 12px) 11px, calc(100% - 7px) 11px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  thead th {
    position: sticky;
    top: 0;
    background: var(--surface-2);
    border-bottom: 1px solid var(--line);
    padding: 7px 12px;
    text-align: left;
    font-weight: 600;
    font-size: 10.5px;
    color: var(--ink-3);
    letter-spacing: 0.04em;
    white-space: nowrap;
    z-index: 1;
  }
  thead th.c { text-align: center; }
  tbody tr {
    border-bottom: 1px solid var(--line-2);
    cursor: pointer;
    transition: background 0.1s;
  }
  tbody tr:hover { background: var(--surface-2); }
  tbody tr.active { background: var(--accent-soft); box-shadow: inset 3px 0 0 var(--accent); }
  td { padding: 7px 12px; white-space: nowrap; }
  td.c { text-align: center; }
  .cid { font-size: 11px; color: var(--ink-2); }
  .num { font-weight: 600; font-size: 12px; }
  .num.hi { color: var(--high); }
  .num.md { color: var(--med); }
  .num.lo { color: var(--low); }
  .num.zero { color: #bcc9ce; font-weight: 400; }
  .signed-by { font-size: 11px; color: var(--ink-2); }
  .dot-sep { color: var(--line); }

  .side {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }
  .dist-body, .release-body { padding: 12px 14px 14px; }

  .sev-stack { margin-bottom: 12px; }
  .sev-bar {
    display: flex;
    height: 9px;
    border-radius: 5px;
    overflow: hidden;
    background: var(--surface-3);
    gap: 1px;
  }
  .seg { display: block; height: 100%; transition: width 0.3s; }
  .sev-legend {
    display: flex;
    gap: 12px;
    margin-top: 6px;
    font-size: 11px;
    color: var(--ink-2);
  }
  .leg { display: inline-flex; align-items: center; gap: 4px; }
  .leg b { font-variant-numeric: tabular-nums; }

  .type-list { display: flex; flex-direction: column; gap: 5px; }
  .type-row {
    display: grid;
    grid-template-columns: 74px 1fr 24px;
    gap: 8px;
    align-items: center;
    font-size: 11.5px;
  }
  .type-name { color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .type-track { height: 6px; background: var(--surface-3); border-radius: 4px; overflow: hidden; }
  .type-track span { display: block; height: 100%; background: var(--accent); opacity: 0.6; border-radius: 4px; }
  .type-n { text-align: right; font-weight: 600; color: var(--ink-2); }

  .mini-stats, .manifest-mini {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 12px;
    margin: 12px 0 0;
    padding-top: 10px;
    border-top: 1px dashed var(--line);
  }
  .mini-stats div, .manifest-mini div {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .mini-stats dt, .manifest-mini dt { font-size: 10.5px; color: var(--ink-3); }
  .mini-stats dd, .manifest-mini dd {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .mini-stats dd.danger { color: var(--high); }
  .manifest-mini dd.mono { font-size: 11px; }

  .gate-head {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .gate-title { font-size: 11px; font-weight: 600; color: var(--ink-2); }
  .gate-list {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .gate-list li {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 11.5px;
    color: var(--ink-2);
    padding: 5px 8px;
    border-radius: 6px;
    background: var(--surface-2);
    border: 1px solid var(--line-2);
  }
  .gate-list li.ok { color: var(--ok); background: var(--ok-bg); border-color: var(--ok-line); }
  .gate-list li .mono { font-size: 10.5px; }

  .blockers {
    display: flex;
    gap: 7px;
    margin-top: 9px;
    padding: 7px 9px;
    border-radius: 6px;
    background: var(--med-bg);
    border: 1px solid var(--med-line);
    color: var(--med);
    font-size: 11px;
    line-height: 1.5;
  }

  .confirm-box {
    margin-top: 9px;
    padding: 10px;
    border-radius: 7px;
    background: var(--accent-soft);
    border: 1px solid var(--accent-line);
  }
  .confirm-title { font-weight: 600; font-size: 12px; margin-bottom: 3px; }
  .release-card .btn { margin-top: 10px; }

  @media (max-width: 1180px) {
    .grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex: 0 0 auto;
    }
    .table-card { flex: 0 0 auto; max-height: 44vh; }
    .side {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      align-items: start;
      width: 100%;
    }
  }

  @media (max-width: 820px) {
    .side { grid-template-columns: minmax(0, 1fr); }
    .table-card { max-height: 40vh; }
    .batch-head { padding: 11px 12px; }
    .kpis { width: 100%; }
    .kpi { flex: 1; align-items: flex-start; padding: 2px 10px; }
    .kpi:first-child { border-left: 0; padding-left: 0; }
    .kpi-n { font-size: 18px; }
    thead th:nth-child(5), tbody td:nth-child(5),
    thead th:nth-child(10), tbody td:nth-child(10) { display: none; }
    td, thead th { padding: 6px 8px; }
    .filters .select { font-size: 11px; }
  }

  @media (max-width: 560px) {
    .overview { padding: 8px; gap: 8px; }
    thead th:nth-child(3), tbody td:nth-child(3) { display: none; }
    .table-wrap { overflow-x: auto; }
    table { min-width: 0; }
  }

  .release-done {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .ok-ring {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--ok-bg);
    border: 1px solid var(--ok-line);
    flex: none;
  }
</style>
