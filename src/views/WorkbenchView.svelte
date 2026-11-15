<script>
  import DiagramPanel from '../components/DiagramPanel.svelte';
  import Icon from '../components/Icon.svelte';
  import SeverityPill from '../components/SeverityPill.svelte';
  import { workspace, issueCounts, canSign } from '../lib/store.svelte.js';
  import { KIND_COLOR, formatSize, PART_LABEL } from '../lib/anatomy.js';
  import { fmtDateTime, isEditable } from '../lib/model.js';
  import { annotationLines, PARAM_FIELDS } from '../lib/lesions.js';

  let { c } = $props();

  let selectedLesionId = $state(null);
  let selectedAnnotationId = $state(null);
  let hoverIssueId = $state(null);
  let seedDraft = $state('');
  let bodyDraft = $state('');

  const editable = $derived(isEditable(c));
  const parts = $derived(
    ['esophagus', 'stomach', 'duodenum'].map((p) => ({ key: p, present: c.parts[p] !== false }))
  );
  const presentParts = $derived(parts.filter((p) => p.present));
  const counts = $derived(issueCounts(c));

  $effect(() => {
    if (c) {
      seedDraft = c.params.seed;
      bodyDraft = c.bodyText;
      selectedLesionId = null;
      selectedAnnotationId = null;
    }
  });

  // keep the narrative editor in sync when generation replaces the text
  let lastGenerated = $state('');
  $effect(() => {
    if (c && c.bodyText !== lastGenerated && document.activeElement?.dataset?.role !== 'body-editor') {
      bodyDraft = c.bodyText;
      lastGenerated = c.bodyText;
    }
  });

  const selectedLesion = $derived(c.lesions.find((l) => l.id === selectedLesionId));
  const selectedAnn = $derived(c.annotations.find((a) => a.id === selectedAnnotationId));
  const activeIssueIds = $derived(c.issues.filter((i) => i.status === 'pending').map((i) => i.id));

  function partStatus(key) {
    const present = c.parts[key] !== false;
    const n = c.lesions.filter((l) => l.part === key).length;
    return { present, n };
  }

  function issueForLesion(id) {
    return c.issues.filter((i) => i.lesionIds?.includes(id));
  }
  function issueForAnn(id) {
    return c.issues.filter((i) => i.annotationIds?.includes(id));
  }

  function commitBody() {
    if (bodyDraft !== c.bodyText) workspace.editBody(bodyDraft);
  }

  function applySeed() {
    if (seedDraft !== c.params.seed) {
      workspace.updateParams({ seed: seedDraft });
    } else {
      workspace.regenerate({ params: {} });
    }
  }

  const paramValue = $derived.by(() => {
    const o = {};
    for (const f of PARAM_FIELDS) o[f.key] = c.params[f.key];
    return o;
  });
</script>

<div class="editor">
  <!-- ------------------------------------------------------- parameters -->
  <aside class="params card">
    <div class="card-head">
      <Icon name="layers" size={14} />
      <span class="card-title">检查参数</span>
      <span class="spacer"></span>
      {#if !editable}
        <span class="pill neutral"><Icon name="lock" size={10} />只读</span>
      {/if}
    </div>
    <div class="param-grid">
      {#each PARAM_FIELDS as f}
        <div class="field">
          <label for={`p-${f.key}`}>{f.label}</label>
          <select
            id={`p-${f.key}`}
            class="select"
            disabled={!editable}
            value={paramValue[f.key]}
            onchange={(e) => {
              const v = e.target.value;
              if (f.key === 'operator') workspace.updateParams({ operator: v, reporter: v });
              else workspace.updateParams({ [f.key]: v });
            }}
          >
            {#each f.options as opt}
              <option value={opt}>{opt}</option>
            {/each}
          </select>
        </div>
      {/each}
      <div class="field seed-field">
        <label for="seed">种子（同组参数复现）</label>
        <div class="row gap-4">
          <input
            id="seed"
            class="input mono"
            bind:value={seedDraft}
            disabled={!editable}
            onkeydown={(e) => {
              if (e.key === 'Enter') applySeed();
            }}
          />
          <button class="btn sm" disabled={!editable} onclick={applySeed} title="按种子重新生成">
            应用
          </button>
        </div>
      </div>
    </div>
    <div class="param-foot">
      <div class="row gap-6 wrap">
        <span class="chip"><Icon name="target" size={11} />分组键</span>
        <span class="mono dim groupkey">{c.params.examType} · {c.params.scope} · {c.params.imageMode} · {c.params.insufflation} · {c.params.operator}</span>
      </div>
      <div class="row gap-4" style="margin-top:8px">
        <button
          class="btn sm"
          disabled={!editable}
          onclick={() => workspace.regenerate({ params: {} })}
        >
          <Icon name="refresh" size={12} /> 重新生成
        </button>
        <button
          class="btn sm ghost"
          disabled={!editable}
          title="换一个种子，重新抽样病灶布局"
          onclick={() => {
            const next = `${c.params.seed.split('-')[0]}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
            seedDraft = next;
            workspace.updateParams({ seed: next });
          }}
        >
          <Icon name="spark" size={12} /> 换种子
        </button>
      </div>
      <p class="hint">
        参数组与种子不变时，重新生成会保留已手工挪动的病灶标记与标注框。
      </p>
    </div>

    <div class="divider"></div>

    <div class="parts-block">
      <div class="section-label" style="padding:10px 14px 6px">分段图</div>
      {#each parts as p}
        {@const st = partStatus(p.key)}
        <div class="part-row" class:off={!st.present}>
          <label class="switch">
            <input
              type="checkbox"
              checked={st.present}
              disabled={!editable}
              onchange={(e) => workspace.setPart(p.key, e.target.checked)}
            />
            <span class="track"><span class="knob"></span></span>
          </label>
          <span class="part-name">
            {PART_LABEL[p.key]}
          </span>
          <span class="spacer"></span>
          {#if st.present}
            <span class="chip mini">{st.n} 处病灶</span>
          {:else}
            <span class="pill high compact">缺失</span>
          {/if}
        </div>
      {/each}
    </div>
  </aside>

  <!-- ----------------------------------------------------------- canvas -->
  <section class="canvas">
    <div class="canvas-head">
      <div class="row gap-8">
        <h2 class="case-title">{c.patientLabel} · {c.params.examType}</h2>
        <span class="muted mono">{c.id}</span>
      </div>
      <div class="spacer"></div>
      <div class="row gap-6">
        {#if counts.high}<span class="pill high">{counts.high} 严重</span>{/if}
        {#if counts.medium}<span class="pill medium">{counts.medium} 一般</span>{/if}
        {#if counts.low}<span class="pill low">{counts.low} 提示</span>{/if}
        {#if !counts.total}<span class="pill ok"><Icon name="check" size={10} />质检通过</span>{/if}
      </div>
      <span class="head-sep"></span>
      {#if c.state === 'draft'}
        <button class="btn primary sm" onclick={() => workspace.submit()}>
          <Icon name="shield" size={12} /> 提交复核
        </button>
      {:else if c.state === 'rework'}
        <button class="btn primary sm" onclick={() => workspace.submit()}>
          <Icon name="refresh" size={12} /> 整改后重新提交
        </button>
      {:else if c.state === 'submitted'}
        <span class="state-note">已提交，等待 {c.submittedBy === workspace.actor.report ? '复核员' : '复核'}处理</span>
        <button class="btn sm ghost" onclick={() => workspace.setView('review')}>前往复核台</button>
      {:else if c.state === 'signed'}
        <span class="pill ok"><Icon name="check" size={10} />复核签名 {c.confirmedBy}</span>
      {/if}
    </div>

    <div class="canvas-body">
      {#if !presentParts.length}
        <div class="empty card">
          <Icon name="alert" size={22} color="#b2332c" />
          <div style="font-weight:600">该报告没有任何分段示意图</div>
          <div class="muted">请在左侧「分段图」中至少启用一个部位，或核对检查类型。</div>
        </div>
      {/if}
      <div class="panel-strip" class:single={presentParts.length === 1}>
        {#each presentParts as p}
          <figure class="panel-fig">
            <figcaption>
              <span class="fig-name">{PART_LABEL[p.key]}</span>
              <span class="fig-meta">
                {c.lesions.filter((l) => l.part === p.key).length} 处病灶 ·
                {c.annotations.filter((a) => a.part === p.key).length} 个标注
              </span>
            </figcaption>
            <div class="panel-wrap">
              <DiagramPanel
                part={p.key}
                caseData={c}
                textureKey={c.texture?.[p.key]}
                {editable}
                {selectedLesionId}
                {selectedAnnotationId}
                {activeIssueIds}
                onSelectLesion={(id) => {
                  selectedLesionId = id;
                  selectedAnnotationId = null;
                }}
                onSelectAnnotation={(id) => {
                  selectedAnnotationId = id;
                  selectedLesionId = null;
                }}
                onDragLesion={(id, x, y) => workspace.dragLesion(id, x, y)}
                onDragAnnotation={(id, x, y) => workspace.dragAnnotation(id, x, y)}
                onOpenLesion={(id) => {
                  selectedLesionId = id;
                }}
                onOpenAnnotation={(id) => {
                  selectedAnnotationId = id;
                }}
              />
            </div>
            {#each c.issues.filter((i) => i.part === p.key && i.status !== 'confirmed').slice(0, 3) as issue}
              <div class="panel-flag" class:hot={issue.severity === 'high'} >
                <SeverityPill severity={issue.severity} compact />
                <span class="flag-text">{issue.title}</span>
              </div>
            {/each}
          </figure>
        {/each}
      </div>
    </div>

    <!-- lesion sheet -->
    <div class="sheet">
      <div class="sheet-head">
        <Icon name="target" size={12} />
        <span>病灶标记清单</span>
        <span class="spacer"></span>
        <span class="muted">拖动标记或标注框后自动重新质检</span>
      </div>
      <table class="sheet-table">
        <thead>
          <tr>
            <th class="c">#</th>
            <th>部位</th>
            <th>性质</th>
            <th>区域</th>
            <th class="r">长径</th>
            <th class="r">短径</th>
            <th class="r">标记中心</th>
            <th>标注框</th>
            <th class="c">手工</th>
          </tr>
        </thead>
        <tbody>
          {#each c.lesions as lesion, i}
            {@const ann = c.annotations.find((a) => a.lesionId === lesion.id)}
            {@const bad = issueForLesion(lesion.id).length > 0}
            <tr
              class:active={selectedLesionId === lesion.id || selectedAnnotationId === ann?.id}
              class:bad
              onclick={() => {
                selectedLesionId = lesion.id;
                selectedAnnotationId = null;
              }}
            >
              <td class="c mono idx">{i + 1}</td>
              <td>{PART_LABEL[lesion.part]}</td>
              <td><span class="kind-dot" style={`background:${KIND_COLOR[lesion.kind]}`}></span>{lesion.kind}</td>
              <td class="muted">{lesion.region}</td>
              <td class="r mono tnum">{lesion.longCm.toFixed(1)}cm</td>
              <td class="r mono tnum">{lesion.shortCm.toFixed(1)}cm</td>
              <td class="r mono tnum muted">{(lesion.x * 100).toFixed(0)}%, {(lesion.y * 100).toFixed(0)}%</td>
              <td>
                {#if ann}
                  <button
                    class="link-btn"
                    onclick={(e) => {
                      e.stopPropagation();
                      selectedAnnotationId = ann.id;
                      selectedLesionId = null;
                    }}
                  >
                    {(ann.x * 100).toFixed(0)}%, {(ann.y * 100).toFixed(0)}%
                  </button>
                {:else}
                  <span class="muted">—</span>
                {/if}
              </td>
              <td class="c">
                {#if lesion.manualPos || lesion.manualSize || ann?.manual}
                  <span class="pill accent compact">已手工</span>
                {:else}
                  <span class="muted">—</span>
                {/if}
              </td>
            </tr>
          {:else}
            <tr><td colspan="9" class="muted" style="text-align:center;padding:14px">当前无病灶标记</td></tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- selection inspector -->
    <div class="inspector">
      {#if selectedLesion}
        <div class="insp-head">
          <span class="insp-kind">
            <span class="dot" style={`background:${KIND_COLOR[selectedLesion.kind]}`}></span>
            {selectedLesion.kind}
          </span>
          <span class="insp-region">{selectedLesion.region}</span>
          <span class="spacer"></span>
          {#if selectedLesion.manualPos || selectedLesion.manualSize}
            <span class="pill accent"><Icon name="hand" size={10} />手工调整</span>
          {/if}
          <button class="btn ghost sm" onclick={() => (selectedLesionId = null)}><Icon name="x" size={12} /></button>
        </div>
        <div class="insp-grid">
          <div class="field">
            <span class="flabel">长径 (cm)</span>
            <input
              class="input tnum"
              type="number"
              min="0.1"
              step="0.1"
              disabled={!editable}
              value={selectedLesion.longCm}
              onchange={(e) =>
                workspace.editLesionSize(selectedLesion.id, +e.target.value, selectedLesion.shortCm)}
            />
          </div>
          <div class="field">
            <span class="flabel">短径 (cm)</span>
            <input
              class="input tnum"
              type="number"
              min="0.1"
              step="0.1"
              disabled={!editable}
              value={selectedLesion.shortCm}
              onchange={(e) =>
                workspace.editLesionSize(selectedLesion.id, selectedLesion.longCm, +e.target.value)}
            />
          </div>
          <div class="field">
            <span class="flabel">标记中心</span>
            <span class="mono tnum coord">
              {(selectedLesion.x * 100).toFixed(1)}%, {(selectedLesion.y * 100).toFixed(1)}%
            </span>
          </div>
          <div class="field">
            <span class="flabel">直径</span>
            <span class="mono">{formatSize(selectedLesion.longCm, selectedLesion.shortCm)}</span>
          </div>
        </div>
        {#if issueForLesion(selectedLesion.id).length}
          <div class="insp-issues">
            {#each issueForLesion(selectedLesion.id) as issue}
              <div class="insp-issue">
                <SeverityPill severity={issue.severity} compact />
                <span>{issue.title}</span>
              </div>
            {/each}
          </div>
        {/if}
      {:else if selectedAnn}
        {@const lesion = c.lesions.find((l) => l.id === selectedAnn.lesionId)}
        {@const idx = c.lesions.filter((l) => l.part === selectedAnn.part).findIndex((l) => l.id === selectedAnn.lesionId) + 1}
        <div class="insp-head">
          <span class="insp-kind"><Icon name="corner" size={12} /> 标注框</span>
          <span class="insp-region">{lesion ? annotationLines(lesion, idx).title : selectedAnn.id}</span>
          <span class="spacer"></span>
          {#if selectedAnn.manual}
            <span class="pill accent"><Icon name="hand" size={10} />手工调整</span>
          {/if}
          <button class="btn ghost sm" onclick={() => (selectedAnnotationId = null)}><Icon name="x" size={12} /></button>
        </div>
        <div class="insp-grid">
          <div class="field">
            <span class="flabel">左上角 X</span>
            <span class="mono tnum coord">{(selectedAnn.x * 100).toFixed(1)}%</span>
          </div>
          <div class="field">
            <span class="flabel">左上角 Y</span>
            <span class="mono tnum coord">{(selectedAnn.y * 100).toFixed(1)}%</span>
          </div>
          <div class="field">
            <span class="flabel">框尺寸</span>
            <span class="mono">{Math.round(selectedAnn.w * 320)}×{Math.round(selectedAnn.h * 384)} px</span>
          </div>
          <div class="field">
            <span class="flabel">内容</span>
            <span class="mono">{lesion ? annotationLines(lesion, idx).detail : '—'}</span>
          </div>
        </div>
        {#if issueForAnn(selectedAnn.id).length}
          <div class="insp-issues">
            {#each issueForAnn(selectedAnn.id) as issue}
              <div class="insp-issue">
                <SeverityPill severity={issue.severity} compact />
                <span>{issue.title}</span>
              </div>
            {/each}
          </div>
        {/if}
      {:else}
        <div class="insp-idle">
          <Icon name="hand" size={15} color="#788a92" />
          <span>点选图中的病灶标记或标注框即可拖动调整位置{editable ? '' : '（当前为只读状态）'}，双击进入病灶清单。</span>
        </div>
      {/if}
    </div>
  </section>

  <!-- ----------------------------------------------------------- right rail -->
  <aside class="rail">
    <div class="card findings">
      <div class="card-head">
        <Icon name="shield" size={14} />
        <span class="card-title">质检条目</span>
        <span class="spacer"></span>
        <span class="chip mini">{counts.pending} 待处理</span>
      </div>
      {#if !c.issues.length}
        <div class="findings-empty">
          <div class="ok-ring"><Icon name="check" size={18} color="#2f6b4f" /></div>
          <div style="font-weight:600">四项自动检查全部通过</div>
          <div class="muted" style="font-size:11.5px">缺部位 · 标记超界 · 标注重叠 · 尺寸一致性</div>
        </div>
      {:else}
        {#each c.issues as issue}
          <div
            class="finding"
            class:done={issue.status !== 'pending'}
            class:hover={hoverIssueId === issue.id}
            onmouseenter={() => (hoverIssueId = issue.id)}
            onmouseleave={() => (hoverIssueId = null)}
            onclick={() => {
              if (issue.lesionIds?.length) selectedLesionId = issue.lesionIds[0];
              else if (issue.annotationIds?.length) selectedAnnotationId = issue.annotationIds[0];
            }}
          >
            <div class="row gap-6">
              <SeverityPill severity={issue.severity} compact />
              <span class="finding-name">{issue.checkName}</span>
              <span class="spacer"></span>
              {#if issue.status === 'confirmed'}
                <span class="pill ok compact"><Icon name="check" size={9} />已确认</span>
              {:else if issue.status === 'dismissed'}
                <span class="pill high compact">已驳回</span>
              {:else}
                <span class="pill neutral compact">待复核</span>
              {/if}
            </div>
            <div class="finding-title">{issue.title}</div>
            <div class="finding-detail">{issue.detail}</div>
            {#if issue.expected}
              <div class="finding-ev">
                <span class="ev-label">应为</span><span class="mono">{issue.expected}</span>
                <span class="ev-label">实际</span><span class="mono">{issue.actual}</span>
              </div>
            {/if}
            {#if issue.note}
              <div class="finding-note">复核意见：{issue.note}</div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>

    <div class="card body-card">
      <div class="card-head">
        <Icon name="doc" size={14} />
        <span class="card-title">报告正文</span>
        <span class="spacer"></span>
        {#if bodyDraft !== c.bodyText}
          <span class="pill medium compact">未保存</span>
        {/if}
      </div>
      <textarea
        class="body-editor"
        data-role="body-editor"
        bind:value={bodyDraft}
        disabled={!editable}
        onblur={commitBody}
        onkeydown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            commitBody();
          }
        }}
      ></textarea>
      {#if editable}
        <div class="body-foot">
          <span class="muted">正文中的尺寸会与图中标记逐一比对</span>
          <span class="spacer"></span>
          <button class="btn sm" disabled={bodyDraft === c.bodyText} onclick={commitBody}>重算检查</button>
        </div>
      {/if}
    </div>

    <div class="card history-card">
      <div class="card-head">
        <Icon name="clock" size={14} />
        <span class="card-title">流转记录</span>
        <span class="spacer"></span>
        <span class="chip mini">{c.rounds.length} 次</span>
      </div>
      <ol class="timeline">
        {#each c.rounds as r}
          <li class:reject={r.type === 'reject'}>
            <span class="tl-dot"></span>
            <div class="tl-body">
              <div class="tl-head">
                <strong>{r.type === 'submit' ? '提交复核' : '驳回退回'}</strong>
                <span class="muted mono">{fmtDateTime(r.at)}</span>
              </div>
              <div class="tl-who">{r.by} · 第 {r.round} 轮</div>
              {#if r.type === 'reject'}
                <div class="tl-note">「{r.title}」— {r.note}</div>
              {:else}
                <div class="tl-note muted">本轮 {r.issueCount} 条质检项</div>
              {/if}
            </div>
          </li>
        {/each}
        {#if !c.rounds.length}
          <li class="tl-empty muted">尚未提交复核，仍在报告组编辑。</li>
        {/if}
      </ol>
    </div>
  </aside>
</div>

<style>
  .editor {
    display: grid;
    grid-template-columns: 236px minmax(0, 1fr) 320px;
    gap: 12px;
    align-items: stretch;
    height: 100%;
    min-height: 0;
    padding: 12px;
  }

  /* parameters */
  .params {
    align-self: start;
    overflow: hidden;
  }
  .param-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 12px 14px;
  }
  .seed-field .input {
    font-size: 11.5px;
  }
  .param-foot {
    padding: 0 14px 12px;
  }
  .groupkey {
    font-size: 10.5px;
    line-height: 1.5;
    white-space: normal;
  }
  .chip {
    height: 22px;
    font-size: 11px;
  }
  .wrap {
    flex-wrap: wrap;
    align-items: flex-start;
  }
  .hint {
    margin: 8px 0 0;
    font-size: 11px;
    color: var(--ink-3);
    line-height: 1.55;
  }

  .parts-block {
    padding-bottom: 8px;
  }
  .part-row {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 6px 14px;
  }
  .part-row.off .part-name {
    color: var(--ink-3);
    text-decoration: line-through;
  }
  .part-name {
    font-size: 12.5px;
    font-weight: 500;
  }
  .chip.mini {
    height: 19px;
    font-size: 10.5px;
    padding: 0 7px;
  }

  .switch input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }
  .track {
    display: inline-block;
    width: 26px;
    height: 15px;
    border-radius: 20px;
    background: #c9d5d9;
    position: relative;
    transition: background 0.18s;
    cursor: pointer;
  }
  .knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.18s;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }
  .switch input:checked + .track {
    background: var(--accent);
  }
  .switch input:checked + .track .knob {
    transform: translateX(11px);
  }
  .switch input:disabled + .track {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* canvas */
  .canvas {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    height: 100%;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    overflow: hidden;
  }
  .canvas-head {
    display: flex;
    align-items: center;
    padding: 10px 16px;
    border-bottom: 1px solid var(--line-2);
    gap: 10px;
    flex-wrap: wrap;
  }
  .case-title {
    font-size: 14px;
  }
  .head-sep {
    width: 1px;
    height: 18px;
    background: var(--line);
  }
  .state-note {
    font-size: 11px;
    color: var(--ink-3);
  }
  .canvas-body {
    padding: 14px 16px;
    background: linear-gradient(180deg, #f6f9fa 0%, #eef3f4 100%);
    min-height: 0;
  }
  .panel-strip {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    align-items: start;
    width: 100%;
    max-width: 1120px;
    margin: 0 auto;
  }
  .panel-strip.single {
    grid-template-columns: minmax(0, 340px);
    justify-content: center;
  }
  .panel-fig {
    margin: 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .panel-fig figcaption {
    display: flex;
    align-items: baseline;
    gap: 7px;
  }
  .fig-name {
    font-size: 12px;
    font-weight: 600;
  }
  .fig-meta {
    font-size: 10.5px;
    color: var(--ink-3);
  }
  .panel-wrap {
    border: 1px solid var(--line);
    border-radius: 8px;
    overflow: hidden;
    background: #fbfdfd;
    box-shadow: var(--shadow-sm);
    max-width: 372px;
    margin: 0 auto;
    width: 100%;
  }
  .panel-flag {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 5px 8px;
    border-radius: 6px;
    background: var(--med-bg);
    border: 1px solid var(--med-line);
    font-size: 11px;
    color: var(--med);
    line-height: 1.4;
  }
  .panel-flag.hot {
    background: var(--high-bg);
    border-color: var(--high-line);
    color: var(--high);
  }
  .flag-text {
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .sheet {
    border-top: 1px solid var(--line-2);
    background: var(--surface);
  }
  .sheet-head {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 7px 16px 4px;
    font-size: 10.5px;
    font-weight: 600;
    color: var(--ink-2);
    letter-spacing: 0.03em;
  }
  .sheet-head .muted { font-weight: 400; font-size: 10.5px; }
  .sheet-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11.5px;
  }
  .sheet-table thead th {
    text-align: left;
    font-size: 10px;
    font-weight: 600;
    color: var(--ink-3);
    padding: 4px 10px;
    border-bottom: 1px solid var(--line-2);
    white-space: nowrap;
  }
  .sheet-table th.c, .sheet-table td.c { text-align: center; }
  .sheet-table th.r, .sheet-table td.r { text-align: right; }
  .sheet-table td {
    padding: 4px 10px;
    border-bottom: 1px solid var(--line-2);
    white-space: nowrap;
    cursor: pointer;
  }
  .sheet-table tbody tr:last-child td { border-bottom: 0; }
  .sheet-table tbody tr:hover { background: var(--surface-2); }
  .sheet-table tbody tr.active { background: var(--accent-soft); }
  .sheet-table tbody tr.bad td:first-child { box-shadow: inset 3px 0 0 var(--high); }
  .kind-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin-right: 5px;
    vertical-align: 1px;
  }
  .link-btn {
    border: 0;
    background: none;
    padding: 0;
    color: var(--accent);
    font-family: var(--mono);
    font-size: 10.5px;
    cursor: pointer;
    text-decoration: underline;
    text-decoration-color: transparent;
  }
  .link-btn:hover { text-decoration-color: var(--accent); }
  .idx { color: var(--ink-3); font-size: 10px; }

  .inspector {    border-top: 1px solid var(--line-2);
    padding: 10px 16px 12px;
    background: var(--surface);
    min-height: 78px;
  }
  .insp-idle {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--ink-3);
    font-size: 11.5px;
    height: 46px;
  }
  .insp-head {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 8px;
  }
  .insp-kind {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-weight: 600;
    font-size: 12.5px;
  }
  .insp-region {
    font-size: 11.5px;
    color: var(--ink-2);
    background: var(--surface-3);
    padding: 1px 7px;
    border-radius: 5px;
  }
  .insp-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    align-items: end;
  }
  .coord {
    font-size: 11.5px;
    padding-top: 6px;
    display: inline-block;
  }
  .insp-issues {
    margin-top: 9px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .insp-issue {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 11.5px;
    color: var(--ink-2);
  }

  /* rail */
  .rail {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }
  .findings {
    overflow: hidden;
    max-height: 46vh;
    display: flex;
    flex-direction: column;
  }
  .findings-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 22px 14px;
    text-align: center;
    background: linear-gradient(180deg, #fbfdfc, #f2f8f4);
  }
  .ok-ring {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--ok-bg);
    border: 1px solid var(--ok-line);
    margin-bottom: 4px;
  }
  .findings .finding {
    border-top: 1px solid var(--line-2);
  }
  .finding {
    padding: 9px 13px 11px;
    cursor: pointer;
    transition: background 0.12s;
  }
  .finding:hover {
    background: var(--surface-2);
  }
  .finding.done {
    opacity: 0.62;
    background: #fbfcfc;
  }
  .finding-name {
    font-size: 11px;
    color: var(--ink-2);
    font-weight: 500;
  }
  .finding-title {
    font-size: 12px;
    font-weight: 600;
    margin-top: 3px;
    line-height: 1.45;
  }
  .finding-detail {
    font-size: 11.5px;
    color: var(--ink-2);
    line-height: 1.55;
    margin-top: 2px;
  }
  .finding-ev {
    display: grid;
    grid-template-columns: 26px 1fr;
    gap: 2px 6px;
    margin-top: 6px;
    padding: 6px 8px;
    background: var(--surface-3);
    border-radius: 6px;
    font-size: 11px;
  }
  .ev-label {
    color: var(--ink-3);
  }
  .finding-note {
    margin-top: 6px;
    font-size: 11px;
    color: var(--high);
    background: var(--high-bg);
    border-radius: 5px;
    padding: 4px 7px;
  }

  .body-card {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .body-editor {
    border: 0;
    resize: vertical;
    min-height: 150px;
    max-height: 260px;
    padding: 11px 14px;
    background: var(--surface);
    font-size: 12px;
    line-height: 1.85;
    outline: none;
    border-bottom: 1px solid var(--line-2);
  }
  .body-editor:focus {
    background: #fcfefe;
  }
  .body-editor:disabled {
    background: var(--surface-2);
    color: var(--ink-2);
  }
  .body-foot {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px;
    font-size: 10.5px;
  }

  .history-card {
    overflow: hidden;
  }
  .timeline {
    list-style: none;
    margin: 0;
    padding: 10px 14px 14px;
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .timeline li {
    position: relative;
    padding: 0 0 12px 18px;
    border-left: 1px solid var(--line);
    margin-left: 3px;
  }
  .timeline li:last-child {
    border-left-color: transparent;
    padding-bottom: 0;
  }
  .tl-dot {
    position: absolute;
    left: -4px;
    top: 4px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 2px #fff;
  }
  .timeline li.reject .tl-dot {
    background: var(--high);
  }
  .tl-head {
    display: flex;
    gap: 8px;
    align-items: baseline;
    font-size: 12px;
  }
  .tl-head .mono {
    font-size: 10px;
    color: var(--ink-3);
  }
  .tl-who {
    font-size: 11px;
    color: var(--ink-3);
  }
  .tl-note {
    font-size: 11.5px;
    color: var(--ink-2);
    margin-top: 3px;
    line-height: 1.5;
  }
  .timeline li.reject .tl-note {
    color: var(--high);
    background: var(--high-bg);
    padding: 4px 7px;
    border-radius: 5px;
  }
  .tl-empty {
    border: 0;
    padding-left: 0;
    font-size: 11.5px;
  }

  @media (max-width: 1420px) {
    .editor {
      grid-template-columns: 214px minmax(0, 1fr) 288px;
    }
  }

  @media (max-width: 1220px) {
    .editor {
      grid-template-columns: 200px minmax(0, 1fr);
      grid-template-areas:
        'params canvas'
        'rail rail';
      height: auto;
      overflow: auto;
      align-items: start;
    }
    .params { grid-area: params; }
    .canvas { grid-area: canvas; }
    .rail {
      grid-area: rail;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      align-items: start;
    }
    .findings { max-height: none; }
  }

  @media (max-width: 900px) {
    .editor {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas:
        'canvas'
        'params'
        'rail';
    }
    .rail { grid-template-columns: minmax(0, 1fr); }
    .panel-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .panel-strip.single { grid-template-columns: minmax(0, 1fr); }
    .insp-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (max-width: 640px) {
    .editor { padding: 8px; gap: 8px; }
    .panel-strip { grid-template-columns: minmax(0, 1fr); }
    .canvas-head { padding: 8px 10px; }
    .canvas-body { padding: 10px; }
    .sheet-table { font-size: 10.5px; }
    .sheet-table th:nth-child(7), .sheet-table td:nth-child(7),
    .sheet-table th:nth-child(8), .sheet-table td:nth-child(8) { display: none; }
    .insp-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; }
  }
</style>
