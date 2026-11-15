<script>
  import DiagramPanel from '../components/DiagramPanel.svelte';
  import Icon from '../components/Icon.svelte';
  import SeverityPill from '../components/SeverityPill.svelte';
  import StateBadge from '../components/StateBadge.svelte';
  import { workspace, issueCounts, canSign, fmtDateTime } from '../lib/store.svelte.js';
  import { fmtDate } from '../lib/model.js';
  import { formatSize, PART_LABEL } from '../lib/anatomy.js';
  import { splitSections, parseSizes } from '../lib/qc.js';

  let { c, queue } = $props();

  let selectedIssueId = $state(null);
  let filter = $state('pending');
  let rejectFor = $state(null);
  let rejectReason = $state('');
  let noteDraft = $state('');

  const notes = ['已核对图文，同意归档', '不影响诊断，按提示处理', '已与操作医生确认'];

  const editable = false;
  const counts = $derived(issueCounts(c));
  const visibleIssues = $derived(
    c.issues.filter((i) => {
      if (filter === 'pending') return i.status === 'pending';
      if (filter === 'decided') return i.status !== 'pending';
      return true;
    })
  );
  const pending = $derived(c.issues.filter((i) => i.status === 'pending'));
  const activeIssueIds = $derived(pending.map((i) => i.id));
  const focused = $derived(c.issues.find((i) => i.id === selectedIssueId) || visibleIssues[0] || null);

  const selectedLesionId = $derived(focused?.lesionIds?.[0] || null);
  const selectedAnnotationId = $derived(focused?.annotationIds?.[0] || null);

  const partsPresent = $derived(
    ['esophagus', 'stomach', 'duodenum'].filter((p) => c.parts[p] !== false)
  );

  $effect(() => {
    // select the first pending finding whenever the case changes
    const id = c.id;
    selectedIssueId = c.issues.find((i) => i.status === 'pending')?.id || c.issues[0]?.id || null;
    rejectFor = null;
    rejectReason = '';
    return () => {
      void id;
    };
  });

  function openReject(issue) {
    rejectFor = issue.id;
    rejectReason = '';
  }

  function submitReject() {
    if (!rejectReason.trim()) return;
    workspace.reject(rejectFor, rejectReason.trim());
    rejectFor = null;
    rejectReason = '';
  }

  function confirmIssue(id) {
    workspace.confirm(id, noteDraft || notes[0]);
    selectedIssueId = null;
  }

  function focusIssue(issue) {
    selectedIssueId = issue.id;
    noteDraft = '';
  }

  /** Narrative sizes for a lesion: same part, same ordinal position. */
  function textSizesFor(lesion) {
    const partLesions = c.lesions.filter((l) => l.part === lesion.part);
    const idx = partLesions.findIndex((l) => l.id === lesion.id);
    const section = splitSections(c.bodyText)[lesion.part];
    if (!section) return null;
    return parseSizes(section.text)[idx] || null;
  }

  const severityLabel = { high: '严重', medium: '一般', low: '提示' };
  const STATE_TEXT = { draft: '草稿（报告组编辑中）', rework: '待整改（已退回报告组）', submitted: '待复核', signed: '已签名' };
</script>

<div class="review">
  <!-- queue -->
  <aside class="queue card">
    <div class="card-head">
      <Icon name="grid" size={14} />
      <span class="card-title">复核队列</span>
      <span class="spacer"></span>
      <span class="chip mini">{queue.length} 例</span>
    </div>
    <div class="queue-list scroll">
      {#each queue as row}
        {@const ic = issueCounts(row)}
        <button
          class="queue-item"
          class:active={row.id === c.id}
          onclick={() => workspace.selectCase(row.id)}
        >
          <div class="row gap-6">
            <span class="q-id mono">{row.id}</span>
            <span class="spacer"></span>
            <StateBadge state={row.state} size="sm" />
          </div>
          <div class="q-name">{row.patientLabel} · {row.params.examType}</div>
          <div class="q-meta">
            <span>{row.operator}</span>
            <span class="dot-sep">·</span>
            <span class="mono">{row.examDate}</span>
            <span class="spacer"></span>
            {#if ic.total}
              {#if ic.high}<span class="q-sev hi">{ic.high}</span>{/if}
              {#if ic.medium}<span class="q-sev md">{ic.medium}</span>{/if}
              {#if ic.low}<span class="q-sev lo">{ic.low}</span>{/if}
            {:else}
              <span class="q-clean"><Icon name="check" size={9} />无异常</span>
            {/if}
          </div>
        </button>
      {/each}
    </div>
  </aside>

  <!-- case -->
  <section class="review-main">
    <header class="case-bar">
      <div>
        <div class="row gap-8">
          <h2 class="case-title">{c.patientLabel} · {c.params.examType}</h2>
          <StateBadge state={c.state} />
          <span class="muted mono">{c.id}</span>
        </div>
        <div class="case-meta">
          <span>{c.gender} / {c.age} 岁</span><span class="dot-sep">·</span>
          <span>检查日期 <span class="mono">{c.examDate}</span></span><span class="dot-sep">·</span>
          <span>操作医生 {c.operator}</span><span class="dot-sep">·</span>
          <span>种子 <span class="mono">{c.params.seed}</span></span>
        </div>
      </div>
      <span class="spacer"></span>
      <div class="case-totals">
        <span class="sev-block hi"><b>{counts.high}</b>严重</span>
        <span class="sev-block md"><b>{counts.medium}</b>一般</span>
        <span class="sev-block lo"><b>{counts.low}</b>提示</span>
      </div>
    </header>

    {#if c.state === 'rework'}
      <div class="banner warn">
        <Icon name="alert" size={14} />
        <div>
          <strong>本批已退回报告组整改</strong>
          <div class="banner-sub">驳回意见已同步至报告组：{c.issues.find((i) => i.status === 'dismissed')?.note}</div>
        </div>
      </div>
    {:else if c.state === 'signed'}
      <div class="banner ok">
        <Icon name="check" size={14} />
        <div>
          <strong>该例已复核签章</strong>
          <div class="banner-sub">{c.confirmedBy} · {fmtDateTime(c.confirmedAt)}，可随批次放行归档。</div>
        </div>
      </div>
    {/if}

    <div class="review-canvas">
      <div class="panel-strip" class:single={partsPresent.length === 1}>
        {#each partsPresent as part}
          <div class="panel-cell">
            <div class="cell-label">
              <span>{PART_LABEL[part]}</span>
              <span class="muted">{c.lesions.filter((l) => l.part === part).length} 处病灶</span>
            </div>
            <DiagramPanel
              part={part}
              caseData={c}
              textureKey={c.texture?.[part]}
              {editable}
              {selectedLesionId}
              {selectedAnnotationId}
              {activeIssueIds}
            />
          </div>
        {/each}
      </div>
    </div>

    <!-- image / text cross-check -->
    <div class="cross-check">
      <div class="cc-head">
        <Icon name="target" size={12} />
        <span>图文对照</span>
        <span class="spacer"></span>
        <span class="muted">图中标记尺寸 ↔ 正文尺寸描述</span>
      </div>
      <table class="cc-table">
        <thead>
          <tr>
            <th>部位</th>
            <th>病灶</th>
            <th>区域</th>
            <th class="r">图中尺寸</th>
            <th class="r">正文尺寸</th>
            <th class="c">一致性</th>
          </tr>
        </thead>
        <tbody>
          {#each c.lesions as lesion}
            {@const sec = textSizesFor(lesion)}
            {@const ok = sec && Math.abs(sec.longCm - lesion.longCm) <= 0.08 && Math.abs(sec.shortCm - lesion.shortCm) <= 0.08}
            {@const isFocus = focused?.lesionIds?.includes(lesion.id)}
            <tr class:focus={isFocus}>
              <td>{PART_LABEL[lesion.part]}</td>
              <td class="b">{lesion.kind}</td>
              <td class="muted">{lesion.region}</td>
              <td class="r mono tnum">{formatSize(lesion.longCm, lesion.shortCm)}</td>
              <td class="r mono tnum">{sec ? formatSize(sec.longCm, sec.shortCm) : '—'}</td>
              <td class="c">
                {#if !sec}
                  <span class="pill medium compact">未描述</span>
                {:else if ok}
                  <span class="pill ok compact">一致</span>
                {:else}
                  <span class="pill high compact">不一致</span>
                {/if}
              </td>
            </tr>
          {:else}
            <tr><td colspan="6" class="muted" style="text-align:center;padding:10px">本报告无病灶标记</td></tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="body-strip">
      <div class="body-label"><Icon name="doc" size={12} /> 报告正文</div>
      <pre class="body-text">{c.bodyText}</pre>
    </div>
  </section>

  <!-- decisions -->
  <aside class="decision">
    <div class="card issue-panel">
      <div class="card-head">
        <Icon name="shield" size={14} />
        <span class="card-title">逐条复核</span>
        <span class="spacer"></span>
        <div class="seg">
          <button class="seg-btn" class:on={filter === 'pending'} onclick={() => (filter = 'pending')}>
            待处理 {pending.length}
          </button>
          <button class="seg-btn" class:on={filter === 'decided'} onclick={() => (filter = 'decided')}>
            已处理 {c.issues.length - pending.length}
          </button>
        </div>
      </div>

      {#if !visibleIssues.length}
        <div class="empty" style="padding:26px 16px">
          <Icon name="check" size={20} color="#2f6b4f" />
          <div style="font-weight:600">{filter === 'pending' ? '所有质检条目均已处理' : '暂无已处理条目'}</div>
          <div class="muted">复核完成后请在本例底部签名。</div>
        </div>
      {:else}
        <div class="issue-list scroll">
          {#each visibleIssues as issue, idx}
            {@const active = selectedIssueId === issue.id}
            {@const rejected = issue.status === 'dismissed'}
            <div class="issue" class:active class:rejected class:confirmed={issue.status === 'confirmed'}>
              <button class="issue-head" onclick={() => focusIssue(issue)}>
                <span class="issue-idx">{idx + 1}</span>
                <SeverityPill severity={issue.severity} compact />
                <span class="issue-check">{issue.checkName}</span>
                <span class="spacer"></span>
                {#if issue.status === 'confirmed'}
                  <span class="pill ok compact">已确认</span>
                {:else if rejected}
                  <span class="pill high compact">已驳回</span>
                {:else}
                  <span class="pill accent compact">待复核</span>
                {/if}
              </button>
              <div class="issue-title">{issue.title}</div>
              {#if active}
                <div class="issue-body anim-in">
                  <p class="issue-detail">{issue.detail}</p>
                  <div class="evidence">
                    <div class="ev-row"><span>应为</span><b>{issue.expected}</b></div>
                    <div class="ev-row"><span>实际</span><b>{issue.actual}</b></div>
                    {#if issue.partName}<div class="ev-row"><span>部位</span><b>{issue.partName}</b></div>{/if}
                    {#if issue.lesionIds.length}<div class="ev-row"><span>标记</span><b class="mono">{issue.lesionIds.join('、')}</b></div>{/if}
                  </div>

                  {#if issue.status === 'confirmed'}
                    <div class="decision-note ok">
                      <Icon name="check" size={12} /> {issue.decidedBy} 确认 · {fmtDateTime(issue.decidedAt)}
                      {#if issue.note}<span class="note-text">「{issue.note}」</span>{/if}
                    </div>
                  {:else if rejected}
                    <div class="decision-note bad">
                      <Icon name="x" size={12} /> {issue.decidedBy} 驳回 · {fmtDateTime(issue.decidedAt)}
                      <div class="note-text">{issue.note}</div>
                    </div>
                  {/if}

                  {#if issue.status === 'pending' && c.state === 'submitted'}
                    {#if rejectFor === issue.id}
                      <div class="reject-box">
                        <label class="flabel" for="reject-{issue.id}">驳回意见（必填，将退回报告组）</label>
                        <textarea
                          id="reject-{issue.id}"
                          class="input"
                          rows="2"
                          bind:value={rejectReason}
                          placeholder="例如：标记压到管壁，请按正文尺寸重画后重新提交"
                        ></textarea>
                        <div class="row gap-6" style="margin-top:7px">
                          <span class="spacer"></span>
                          <button class="btn sm ghost" onclick={() => (rejectFor = null)}>取消</button>
                          <button class="btn sm danger" disabled={!rejectReason.trim()} onclick={submitReject}>
                            确认驳回并退回
                          </button>
                        </div>
                      </div>
                    {:else}
                      <div class="chips">
                        {#each notes as n}
                          <button class="chip" class:active={noteDraft === n} onclick={() => (noteDraft = n)}>{n}</button>
                        {/each}
                      </div>
                      <div class="row gap-6" style="margin-top:8px">
                        <button class="btn primary sm" onclick={() => confirmIssue(issue.id)}>
                          <Icon name="check" size={11} /> 确认通过
                        </button>
                        <button class="btn danger sm" onclick={() => openReject(issue)}>
                          <Icon name="x" size={11} /> 驳回退回
                        </button>
                      </div>
                    {/if}
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}

      <div class="sign-bar">
        <div class="sign-info">
          {#if c.state === 'submitted'}
            <span class="sign-label">整例签章</span>
            <span class="muted">{pending.length ? `尚有 ${pending.length} 条待处理` : '全部条目已处理'}</span>
          {:else if c.state === 'signed'}
            <span class="sign-label">已签章</span>
            <span class="muted">{fmtDateTime(c.confirmedAt)}</span>
          {:else}
            <span class="sign-label">状态</span>
            <span class="muted">{STATE_TEXT[c.state]}</span>
          {/if}
        </div>
        <button
          class="btn primary"
          disabled={!canSign(c)}
          onclick={() => workspace.sign()}
        >
          <Icon name="shield" size={12} /> 复核签名
        </button>
        {#if c.state === 'submitted' && pending.length}
          <button class="btn sm ghost" onclick={() => workspace.confirmAll()}>全部确认</button>
        {/if}
      </div>
    </div>
  </aside>
</div>

<style>
  .review {
    display: grid;
    grid-template-columns: 236px minmax(0, 1fr) 372px;
    gap: 12px;
    align-items: stretch;
    height: 100%;
    min-height: 0;
    padding: 12px;
  }

  .queue {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }
  .queue-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
  .queue-item {
    display: block;
    width: 100%;
    text-align: left;
    background: none;
    border: 0;
    border-top: 1px solid var(--line-2);
    border-left: 3px solid transparent;
    padding: 8px 11px 9px;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
  }
  .queue-item:hover {
    background: var(--surface-2);
  }
  .queue-item.active {
    background: var(--accent-soft);
    border-left-color: var(--accent);
  }
  .q-id {
    font-size: 10.5px;
    color: var(--ink-3);
  }
  .q-name {
    font-size: 12px;
    font-weight: 600;
    margin-top: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .q-meta {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 10.5px;
    color: var(--ink-3);
    margin-top: 3px;
  }
  .q-sev {
    min-width: 16px;
    height: 15px;
    border-radius: 4px;
    display: inline-grid;
    place-items: center;
    font-size: 10px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .q-sev.hi { color: var(--high); background: var(--high-bg); }
  .q-sev.md { color: var(--med); background: var(--med-bg); }
  .q-sev.lo { color: var(--low); background: var(--low-bg); }
  .q-clean { display: inline-flex; align-items: center; gap: 3px; color: var(--ok); font-size: 10px; }
  .dot-sep { color: var(--line); }

  .review-main {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    overflow: auto;
  }
  .case-bar {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 12px 16px 10px;
    border-bottom: 1px solid var(--line-2);
  }
  .case-title { font-size: 14px; }
  .case-meta {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    font-size: 11px;
    color: var(--ink-3);
    margin-top: 3px;
  }
  .case-totals {
    display: flex;
    gap: 6px;
  }
  .sev-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 46px;
    padding: 4px 8px 5px;
    border-radius: 7px;
    border: 1px solid;
    line-height: 1.15;
  }
  .sev-block b { font-size: 15px; font-variant-numeric: tabular-nums; }
  .sev-block { font-size: 10px; }
  .sev-block.hi { color: var(--high); background: var(--high-bg); border-color: var(--high-line); }
  .sev-block.md { color: var(--med); background: var(--med-bg); border-color: var(--med-line); }
  .sev-block.lo { color: var(--low); background: var(--low-bg); border-color: var(--low-line); }

  .banner {
    display: flex;
    gap: 9px;
    align-items: flex-start;
    margin: 12px 16px 0;
    padding: 9px 12px;
    border-radius: 8px;
    font-size: 12px;
    line-height: 1.5;
  }
  .banner.warn { color: var(--high); background: var(--high-bg); border: 1px solid var(--high-line); }
  .banner.ok { color: var(--ok); background: var(--ok-bg); border: 1px solid var(--ok-line); }
  .banner-sub { font-size: 11px; opacity: 0.85; margin-top: 2px; }

  .review-canvas {
    padding: 12px 16px 6px;
    background: linear-gradient(180deg, #f6f9fa, #eef3f4);
    flex: 1;
  }
  .panel-strip {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
  .panel-strip.single {
    grid-template-columns: minmax(0, 330px);
    justify-content: center;
  }
  .panel-cell {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .cell-label {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 11.5px;
    font-weight: 600;
  }
  .cell-label .muted { font-weight: 400; font-size: 10.5px; }

  .cross-check {
    margin: 2px 16px 10px;
    border: 1px solid var(--line-2);
    border-radius: 8px;
    overflow: hidden;
  }
  .cc-head {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 10px;
    background: var(--surface-2);
    border-bottom: 1px solid var(--line-2);
    font-size: 10.5px;
    font-weight: 600;
    color: var(--ink-2);
    letter-spacing: 0.03em;
  }
  .cc-head .muted { font-weight: 400; font-size: 10.5px; }
  .cc-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  .cc-table thead th {
    text-align: left;
    font-size: 10px;
    font-weight: 600;
    color: var(--ink-3);
    padding: 5px 10px;
    border-bottom: 1px solid var(--line-2);
    white-space: nowrap;
  }
  .cc-table th.r, .cc-table td.r { text-align: right; }
  .cc-table th.c, .cc-table td.c { text-align: center; }
  .cc-table td { padding: 4px 10px; border-bottom: 1px solid var(--line-2); white-space: nowrap; }
  .cc-table tbody tr:last-child td { border-bottom: 0; }
  .cc-table tr.focus { background: var(--accent-soft); }
  .cc-table td.b { font-weight: 600; }

  .body-strip {
    margin: 6px 16px 14px;
    border: 1px solid var(--line-2);
    border-radius: 8px;
    background: var(--surface-2);
    padding: 9px 12px 11px;
  }
  .body-label {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 10.5px;
    font-weight: 600;
    color: var(--ink-3);
    letter-spacing: 0.04em;
    margin-bottom: 5px;
  }
  .body-text {
    margin: 0;
    font-size: 11.5px;
    line-height: 1.75;
    white-space: pre-wrap;
    color: var(--ink-2);
    font-family: inherit;
  }

  .decision {
    min-width: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .issue-panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 1;
    overflow: hidden;
  }
  .seg {
    display: flex;
    gap: 2px;
    background: var(--surface-3);
    border-radius: 6px;
    padding: 2px;
  }
  .seg-btn {
    border: 0;
    background: none;
    font-size: 10.5px;
    padding: 3px 7px;
    border-radius: 5px;
    cursor: pointer;
    color: var(--ink-2);
    white-space: nowrap;
  }
  .seg-btn.on {
    background: var(--surface);
    color: var(--ink);
    font-weight: 600;
    box-shadow: var(--shadow-sm);
  }

  .issue-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .issue {
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface);
    overflow: hidden;
    transition: border-color 0.14s, box-shadow 0.14s;
  }
  .issue.active {
    border-color: var(--accent-line);
    box-shadow: 0 0 0 3px rgba(13, 107, 118, 0.08);
  }
  .issue.rejected {
    border-color: var(--high-line);
    background: #fffafa;
  }
  .issue.confirmed {
    background: #fbfdfb;
  }
  .issue-head {
    display: flex;
    align-items: center;
    gap: 7px;
    width: 100%;
    border: 0;
    background: none;
    padding: 8px 9px 4px;
    cursor: pointer;
    text-align: left;
  }
  .issue-idx {
    width: 16px;
    height: 16px;
    border-radius: 4px;
    background: var(--surface-3);
    display: grid;
    place-items: center;
    font-size: 10px;
    color: var(--ink-3);
    font-variant-numeric: tabular-nums;
    flex: none;
  }
  .issue-check {
    font-size: 11px;
    color: var(--ink-2);
  }
  .issue-title {
    padding: 0 9px 8px 32px;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.45;
  }
  .issue-body {
    padding: 0 10px 10px 32px;
    border-top: 1px dashed var(--line-2);
    margin-top: -2px;
    padding-top: 8px;
  }
  .issue-detail {
    margin: 0 0 8px;
    font-size: 11.5px;
    line-height: 1.6;
    color: var(--ink-2);
  }
  .evidence {
    background: var(--surface-3);
    border-radius: 6px;
    padding: 5px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .ev-row {
    display: grid;
    grid-template-columns: 30px 1fr;
    gap: 6px;
    font-size: 11px;
    align-items: baseline;
  }
  .ev-row span { color: var(--ink-3); }
  .ev-row b { font-weight: 600; font-size: 11px; }
  .decision-note {
    margin-top: 8px;
    font-size: 11px;
    border-radius: 6px;
    padding: 5px 8px;
    line-height: 1.5;
  }
  .decision-note.ok {
    display: flex;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
    color: var(--ok);
    background: var(--ok-bg);
  }
  .decision-note.bad {
    color: var(--high);
    background: var(--high-bg);
  }
  .note-text { font-size: 11px; }
  .reject-box {
    margin-top: 9px;
    padding: 9px;
    border-radius: 7px;
    background: var(--high-bg);
    border: 1px solid var(--high-line);
  }
  .reject-box textarea { background: #fff; }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 9px;
  }
  .chips .chip {
    height: 21px;
    font-size: 10.5px;
    padding: 0 7px;
  }
  .sign-bar {
    border-top: 1px solid var(--line);
    padding: 10px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--surface-2);
  }
  .sign-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }
  .sign-label { font-size: 10px; color: var(--ink-3); letter-spacing: 0.06em; }
  .sign-info .muted { font-size: 11px; }

  @media (max-width: 1400px) {
    .review {
      grid-template-columns: 208px minmax(0, 1fr) 330px;
    }
  }

  @media (max-width: 1180px) {
    .review {
      grid-template-columns: 190px minmax(0, 1fr);
      grid-template-areas:
        'queue main'
        'queue decision';
      grid-template-rows: minmax(0, 1fr) auto;
      height: auto;
      overflow: auto;
    }
    .queue { grid-area: queue; }
    .review-main { grid-area: main; }
    .decision { grid-area: decision; height: 460px; }
    .review-main { overflow: visible; }
    .case-bar { flex-wrap: wrap; }
  }

  @media (max-width: 900px) {
    .review {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas:
        'main'
        'decision'
        'queue';
    }
    .queue { max-height: 320px; }
    .panel-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .panel-strip.single { grid-template-columns: minmax(0, 1fr); }
    .decision { height: 480px; }
  }

  @media (max-width: 640px) {
    .review { padding: 8px; gap: 8px; }
    .panel-strip { grid-template-columns: minmax(0, 1fr); }
    .case-bar { padding: 10px 12px; }
    .cross-check, .body-strip { margin-left: 10px; margin-right: 10px; }
    .cc-table th:nth-child(3), .cc-table td:nth-child(3) { display: none; }
    .review-canvas { padding: 10px 12px 4px; }
  }
</style>
