<script>
  import Icon from '../components/Icon.svelte';
  import StateBadge from '../components/StateBadge.svelte';
  import { workspace, fmtDateTime, fmtDate } from '../lib/store.svelte.js';
  import { allOperators } from '../lib/model.js';

  let { batches, cases } = $props();

  let from = $state('');
  let to = $state('');
  let operator = $state('all');
  let keyword = $state('');
  let selectedId = $state(null);

  const operators = $derived(allOperators(cases));

  const results = $derived(
    workspace.archiveSearch({ from, to, operator, keyword })
  );

  const selected = $derived(
    results.find((b) => b.id === selectedId) || results[0] || null
  );

  function reset() {
    from = '';
    to = '';
    operator = 'all';
    keyword = '';
  }

  function downloadJson() {
    if (!selected) return;
    const blob = new Blob([JSON.stringify(selected.manifest, null, 2)], {
      type: 'application/json;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `批次清单-${selected.id}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    workspace.notify('批次清单已导出为 JSON', 'ok', `${selected.id} · 签名 ${selected.manifest.signature}`);
  }

  const sevBars = $derived.by(() => {
    if (!selected) return [];
    const t = selected.manifest.issueTotals;
    const max = Math.max(1, t.high, t.medium, t.low);
    return [
      { key: 'high', name: '严重', n: t.high, bar: 'var(--high)', color: 'var(--high)' },
      { key: 'medium', name: '一般', n: t.medium, bar: 'var(--med)', color: 'var(--med)' },
      { key: 'low', name: '提示', n: t.low, bar: 'var(--low)', color: 'var(--low)' }
    ].map((s) => ({ ...s, pct: (s.n / max) * 100 }));
  });
</script>

<div class="archive">
  <!-- search bar -->
  <section class="card search-card">
    <div class="search-row">
      <div class="field">
        <label for="from">检查日期起</label>
        <input id="from" class="input" type="date" bind:value={from} />
      </div>
      <div class="field">
        <label for="to">检查日期止</label>
        <input id="to" class="input" type="date" bind:value={to} />
      </div>
      <div class="field">
        <label for="op">操作医生</label>
        <select id="op" class="select" bind:value={operator}>
          <option value="all">全部医生</option>
          {#each operators as name}
            <option value={name}>{name}</option>
          {/each}
        </select>
      </div>
      <div class="field grow">
        <label for="kw">关键词</label>
        <div class="search-input">
          <Icon name="search" size={13} color="#788a92" />
          <input id="kw" class="input" placeholder="批次号 / 报告号 / 复核人" bind:value={keyword} />
        </div>
      </div>
      <button class="btn ghost" onclick={reset}><Icon name="x" size={12} /> 重置</button>
    </div>
    <div class="search-foot">
      <Icon name="lock" size={12} color="#4a5d66" />
      <span>历史批次仅检索已放行归档的清单，共 <b>{results.length}</b> 批</span>
      <span class="spacer"></span>
      {#if from || to || operator !== 'all' || keyword}
        <span class="chip active">筛选生效</span>
      {/if}
    </div>
  </section>

  <div class="archive-grid">
    <!-- list -->
    <section class="card list-card">
      <div class="card-head">
        <Icon name="layers" size={14} />
        <span class="card-title">历史批次</span>
        <span class="spacer"></span>
        <span class="chip mini">{results.length}</span>
      </div>
      <div class="list scroll">
        {#each results as b}
          {@const m = b.manifest}
          <button class="batch-item" class:active={b.id === selected?.id} onclick={() => (selectedId = b.id)}>
            <div class="row gap-6">
              <span class="b-id mono">{b.id}</span>
              <span class="spacer"></span>
              <span class="pill ok compact">已放行</span>
            </div>
            <div class="b-name">{b.name}</div>
            <div class="b-row">
              <span class="b-count tnum">{m.caseCount}</span> 例
              <span class="dot-sep">·</span>
              <span class="mono">{fmtDate(m.dateRange.from)} ~ {fmtDate(m.dateRange.to)}</span>
            </div>
            <div class="b-row">
              <span class="muted">复核人</span>
              <span class="b-reviewers">{m.reviewers.map((r) => r.name).join('、') || '—'}</span>
              <span class="spacer"></span>
              <span class="mono sign">{m.signature}</span>
            </div>
          </button>
        {/each}
        {#if !results.length}
          <div class="empty">
            <Icon name="search" size={20} />
            <div>没有符合条件的已放行批次</div>
            <div class="muted">请放宽检查日期范围或切换操作医生。</div>
          </div>
        {/if}
      </div>
    </section>

    <!-- manifest -->
    <section class="card manifest-card">
      {#if selected}
        {@const m = selected.manifest}
        <div class="manifest-head">
          <div>
            <div class="row gap-8">
              <h2 class="m-title">批次清单</h2>
              <span class="mono m-id">{m.batchId}</span>
            </div>
            <div class="m-sub">{selected.name} · {m.source} · 放行于 {fmtDateTime(m.releasedAt)}</div>
          </div>
          <span class="spacer"></span>
          <button class="btn sm" onclick={downloadJson}><Icon name="download" size={12} /> 导出 JSON</button>
        </div>

        <div class="manifest-body scroll">
          <div class="m-strip">
            <div class="m-kpi">
              <span class="m-n tnum">{m.caseCount}</span>
              <span class="m-l">例数</span>
            </div>
            <div class="m-kpi">
              <span class="m-n tnum">{m.issueTotals.total}</span>
              <span class="m-l">问题总数</span>
            </div>
            <div class="m-kpi">
              <span class="m-n tnum" style="color:var(--high)">{m.issueTotals.high}</span>
              <span class="m-l">严重</span>
            </div>
            <div class="m-kpi">
              <span class="m-n tnum">{m.issueTotals.confirmed}</span>
              <span class="m-l">确认条目</span>
            </div>
            <div class="m-kpi">
              <span class="m-n tnum">{m.reviewers.length}</span>
              <span class="m-l">复核人</span>
            </div>
            <div class="m-kpi">
              <span class="m-n tnum">{m.operators.length}</span>
              <span class="m-l">操作医生</span>
            </div>
          </div>

          <div class="m-section">
            <h3 class="m-h">问题分布</h3>
            <div class="sev-cols">
              {#each sevBars as s}
                <div class="sev-col">
                  <div class="sev-track">
                    <span style={`height:${s.pct}%;background:${s.bar}`}></span>
                  </div>
                  <span class="sev-n tnum" style="color:{s.color}">{s.n}</span>
                  <span class="sev-l">{s.name}</span>
                </div>
              {/each}
            </div>
            <table class="m-table">
              <thead>
                <tr>
                  <th>检查项</th>
                  <th class="c">严重</th>
                  <th class="c">一般</th>
                  <th class="c">提示</th>
                  <th class="c">合计</th>
                  <th class="c">确认</th>
                  <th class="c">驳回</th>
                </tr>
              </thead>
              <tbody>
                {#each m.byType as t}
                  <tr>
                    <td>{t.name}</td>
                    <td class="c tnum">{t.high || '—'}</td>
                    <td class="c tnum">{t.medium || '—'}</td>
                    <td class="c tnum">{t.low || '—'}</td>
                    <td class="c tnum b">{t.total}</td>
                    <td class="c tnum">{t.confirmed}</td>
                    <td class="c tnum">{t.dismissed}</td>
                  </tr>
                {:else}
                  <tr><td colspan="7" class="muted" style="text-align:center;padding:12px">整批未检出问题</td></tr>
                {/each}
              </tbody>
            </table>
          </div>

          <div class="m-section">
            <h3 class="m-h">复核人与操作医生</h3>
            <div class="people">
              <div class="people-col">
                <span class="people-label">复核人</span>
                {#each m.reviewers as r}
                  <div class="person">
                    <span class="avatar">{r.name.slice(0, 1)}</span>
                    <span class="p-name">{r.name}</span>
                    <span class="spacer"></span>
                    <span class="p-n tnum">{r.count} 例</span>
                  </div>
                {/each}
              </div>
              <div class="people-col">
                <span class="people-label">操作医生</span>
                {#each m.operators as o}
                  <div class="person">
                    <span class="avatar alt">{o.name.slice(0, 1)}</span>
                    <span class="p-name">{o.name}</span>
                    <span class="spacer"></span>
                    <span class="p-n tnum">{o.count} 例</span>
                  </div>
                {/each}
              </div>
            </div>
          </div>

          <div class="m-section">
            <h3 class="m-h">逐例明细 <span class="muted" style="font-weight:400">（{m.caseRows.length} 例）</span></h3>
            <table class="m-table rows">
              <thead>
                <tr>
                  <th>报告号</th>
                  <th>患者</th>
                  <th>检查日期</th>
                  <th>操作医生</th>
                  <th>检查类型</th>
                  <th class="c">严重</th>
                  <th class="c">一般</th>
                  <th class="c">提示</th>
                  <th>复核签名</th>
                </tr>
              </thead>
              <tbody>
                {#each m.caseRows as r}
                  <tr
                    class="clickable"
                    onclick={() => {
                      if (cases[r.id]) {
                        workspace.selectBatch(selected.id);
                        workspace.selectCase(r.id);
                        workspace.setView('workbench');
                      }
                    }}
                  >
                    <td class="mono cid">{r.id}</td>
                    <td>{r.patientLabel} <span class="muted">· {r.gender}/{r.age}</span></td>
                    <td class="mono">{r.examDate}</td>
                    <td>{r.operator}</td>
                    <td>{r.examType}</td>
                    <td class="c tnum">{r.high || '—'}</td>
                    <td class="c tnum">{r.medium || '—'}</td>
                    <td class="c tnum">{r.low || '—'}</td>
                    <td>{r.signedBy} <span class="muted mono">{fmtDate(r.signedAt)}</span></td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          <div class="signature">
            <div class="sig-left">
              <Icon name="shield" size={16} color="#2f6b4f" />
              <div>
                <div class="sig-title">放行签名</div>
                <div class="muted" style="font-size:11px">
                  {m.releasedBy} · {fmtDateTime(m.releasedAt)} · 规范 v3.2
                </div>
              </div>
            </div>
            <span class="spacer"></span>
            <span class="sig-code mono">{m.signature}</span>
          </div>
        </div>
      {:else}
        <div class="empty" style="height:100%">
          <Icon name="doc" size={22} />
          <div>选择左侧批次查看清单</div>
        </div>
      {/if}
    </section>
  </div>
</div>

<style>
  .archive {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    height: 100%;
    min-height: 0;
  }
  .search-card { padding: 12px 14px 9px; }
  .search-row {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    flex-wrap: wrap;
  }
  .search-row .field { width: 148px; }
  .search-row .field.grow { flex: 1; min-width: 200px; width: auto; }
  .search-input {
    position: relative;
    display: flex;
    align-items: center;
  }
  .search-input :global(svg) { position: absolute; left: 9px; }
  .search-input .input { padding-left: 27px; }
  .search-foot {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--ink-2);
    border-top: 1px dashed var(--line-2);
    margin-top: 10px;
    padding-top: 8px;
  }
  .search-foot b { font-variant-numeric: tabular-nums; }

  .archive-grid {
    display: grid;
    grid-template-columns: 318px minmax(0, 1fr);
    gap: 12px;
    flex: 1;
    min-height: 0;
  }
  .list-card {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }
  .list { flex: 1; overflow-y: auto; min-height: 0; }
  .chip.mini { height: 19px; font-size: 10.5px; padding: 0 7px; }

  .batch-item {
    display: block;
    width: 100%;
    text-align: left;
    border: 0;
    border-top: 1px solid var(--line-2);
    border-left: 3px solid transparent;
    background: none;
    padding: 9px 12px 11px;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
  }
  .batch-item:hover { background: var(--surface-2); }
  .batch-item.active { background: var(--accent-soft); border-left-color: var(--accent); }
  .b-id { font-size: 10.5px; color: var(--ink-3); }
  .b-name { font-size: 12.5px; font-weight: 600; margin: 1px 0 3px; }
  .b-row {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    color: var(--ink-2);
    margin-top: 2px;
  }
  .b-row .mono { font-size: 10.5px; }
  .b-count { font-weight: 600; }
  .b-reviewers { color: var(--ink-2); }
  .sign { color: var(--ink-3); font-size: 10px; letter-spacing: 0.04em; }
  .dot-sep { color: var(--line); }

  .manifest-card {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }
  .manifest-head {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--line-2);
    background: linear-gradient(180deg, #fbfcfd, #f6f9fa);
  }
  .m-title { font-size: 15px; }
  .m-id { font-size: 11px; color: var(--ink-3); }
  .m-sub { font-size: 11px; color: var(--ink-3); margin-top: 2px; }
  .manifest-body { flex: 1; overflow-y: auto; min-height: 0; padding: 14px 16px 16px; }

  .m-strip {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 1px;
    background: var(--line-2);
    border: 1px solid var(--line-2);
    border-radius: 9px;
    overflow: hidden;
  }
  .m-kpi {
    background: var(--surface);
    padding: 9px 10px;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .m-n { font-size: 18px; font-weight: 600; letter-spacing: -0.02em; }
  .m-l { font-size: 10.5px; color: var(--ink-3); }

  .m-section { margin-top: 16px; }
  .m-h { font-size: 12px; margin-bottom: 8px; }

  .sev-cols {
    display: flex;
    gap: 14px;
    align-items: flex-end;
    padding: 10px 12px;
    background: var(--surface-2);
    border-radius: 8px;
    border: 1px solid var(--line-2);
  }
  .sev-col { display: flex; flex-direction: column; align-items: center; gap: 2px; width: 62px; }
  .sev-track {
    height: 44px;
    width: 100%;
    display: flex;
    align-items: flex-end;
    background: var(--surface-3);
    border-radius: 5px;
    overflow: hidden;
  }
  .sev-track span { display: block; width: 100%; border-radius: 5px 5px 0 0; min-height: 2px; transition: height 0.3s; }
  .sev-n { font-size: 14px; font-weight: 600; }
  .sev-l { font-size: 10px; color: var(--ink-3); }

  .m-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11.5px;
    margin-top: 10px;
  }
  .m-table thead th {
    text-align: left;
    font-size: 10px;
    font-weight: 600;
    color: var(--ink-3);
    letter-spacing: 0.04em;
    padding: 5px 8px;
    border-bottom: 1px solid var(--line);
    background: var(--surface-2);
    white-space: nowrap;
  }
  .m-table th.c, .m-table td.c { text-align: center; }
  .m-table td {
    padding: 5px 8px;
    border-bottom: 1px solid var(--line-2);
    white-space: nowrap;
  }
  .m-table td.b { font-weight: 600; }
  .m-table.rows tbody tr.clickable { cursor: pointer; }
  .m-table.rows tbody tr.clickable:hover { background: var(--surface-2); }
  .cid { font-size: 10.5px; color: var(--ink-2); }

  .people { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .people-col {
    background: var(--surface-2);
    border: 1px solid var(--line-2);
    border-radius: 8px;
    padding: 8px 10px;
  }
  .people-label {
    font-size: 10px;
    color: var(--ink-3);
    letter-spacing: 0.05em;
    font-weight: 600;
  }
  .person {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 4px 0;
    border-top: 1px dashed var(--line-2);
    margin-top: 4px;
  }
  .person:first-of-type { border-top: 0; }
  .avatar {
    width: 20px;
    height: 20px;
    border-radius: 6px;
    background: var(--accent-soft);
    color: var(--accent-ink);
    display: grid;
    place-items: center;
    font-size: 10px;
    font-weight: 700;
  }
  .avatar.alt { background: var(--surface-3); color: var(--ink-2); }
  .p-name { font-size: 12px; }
  .p-n { font-size: 11px; color: var(--ink-3); }

  .signature {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 16px;
    padding: 10px 12px;
    border-radius: 8px;
    background: var(--ok-bg);
    border: 1px solid var(--ok-line);
  }
  .sig-left { display: flex; align-items: center; gap: 9px; }
  .sig-title { font-size: 11px; font-weight: 600; color: var(--ok); }
  .sig-code {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.12em;
    color: var(--ok);
  }

  @media (max-width: 1280px) {
    .archive-grid { grid-template-columns: 264px minmax(0, 1fr); }
    .m-strip { grid-template-columns: repeat(3, 1fr); }
  }

  @media (max-width: 980px) {
    .archive-grid { grid-template-columns: minmax(0, 1fr); }
    .list-card { max-height: 280px; }
    .search-row .field { width: calc(50% - 9px); }
    .search-row .field.grow { min-width: 100%; }
    .manifest-head { flex-wrap: wrap; gap: 8px; }
    .people { grid-template-columns: minmax(0, 1fr); }
  }

  @media (max-width: 640px) {
    .archive { padding: 8px; gap: 8px; }
    .search-row .field { width: 100%; }
    .m-strip { grid-template-columns: repeat(2, 1fr); }
    .manifest-body { padding: 10px 12px 12px; }
    .m-table.rows th:nth-child(5), .m-table.rows td:nth-child(5),
    .m-table.rows th:nth-child(9), .m-table.rows td:nth-child(9) { display: none; }
    .m-table { font-size: 11px; }
  }
</style>
