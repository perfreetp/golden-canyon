<script>
  import Icon from '../components/Icon.svelte';
  import { workspace } from '../lib/store.svelte.js';
  import { DEFAULT_PARAMS } from '../lib/lesions.js';

  let dragging = $state(false);
  let text = $state('');
  let parsed = $state([]);
  let error = $state('');
  let batchName = $state('门诊胃镜图文 · ' + new Date().toLocaleDateString('zh-CN').replaceAll('/', '-'));
  let mode = $state('paste');

  const EXAMPLE = JSON.stringify(
    [
      { patientLabel: '周**', gender: '男', age: 52, examDate: '2026-11-13', operator: '张伟', params: { examType: '无痛胃镜', seed: 'IMP-001' } },
      { patientLabel: '李**', gender: '女', age: 63, examDate: '2026-11-13', operator: '李敏', params: { examType: '精查胃镜', seed: 'IMP-002', imageMode: 'NBI' } },
      { patientLabel: '王**', gender: '男', age: 41, examDate: '2026-11-13', operator: '王海涛', params: { examType: '食管镜', seed: 'IMP-003' }, omitParts: { stomach: true } }
    ],
    null,
    2
  );

  function validate(rows) {
    if (!Array.isArray(rows)) throw new Error('顶层必须为数组');
    const out = [];
    const seen = new Set();
    rows.forEach((r, i) => {
      if (!r || typeof r !== 'object') throw new Error(`第 ${i + 1} 条记录不是对象`);
      const operator = r.operator || DEFAULT_PARAMS.operator;
      const seed = r.params?.seed || `IMP-${String(i + 1).padStart(3, '0')}`;
      const examDate = r.examDate || '2026-11-13';
      const examType = r.params?.examType || '无痛胃镜';
      const key = `${r.patientLabel}|${examDate}|${seed}`;
      const warnings = [];
      if (seen.has(key)) warnings.push('重复的记录');
      seen.add(key);
      if (!r.patientLabel) warnings.push('缺少患者标识，将标记为「—」');
      out.push({
        index: i + 1,
        patientLabel: r.patientLabel || '—',
        gender: r.gender || '未知',
        age: r.age ?? null,
        examDate,
        operator,
        examType,
        seed,
        raw: r,
        warnings: warnings.filter(Boolean)
      });
    });
    return out;
  }

  function runParse(input) {
    error = '';
    try {
      const rows = input.trim().startsWith('[')
        ? JSON.parse(input)
        : input
            .split(/\r?\n/)
            .filter((l) => l.trim())
            .map((line) => {
              const [patientLabel, gender, age, examDate, operator, examType, seed] = line
                .split(/[,\t;]/)
                .map((s) => s.trim());
              return {
                patientLabel,
                gender,
                age: age ? Number(age) : null,
                examDate,
                operator,
                params: {
                  examType: examType || '无痛胃镜',
                  seed: seed || `IMP-${String(i + 1).padStart(3, '0')}`
                }
              };
            });
      parsed = validate(rows);
      if (!parsed.length) throw new Error('没有可导入的记录');
    } catch (e) {
      error = e.message || String(e);
      parsed = [];
    }
  }

  function onFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      text = String(reader.result || '');
      mode = 'paste';
      runParse(text);
    };
    reader.onerror = () => (error = '文件读取失败');
    reader.readAsText(file, 'utf-8');
  }

  function onDrop(e) {
    e.preventDefault();
    dragging = false;
    onFile(e.dataTransfer?.files?.[0]);
  }

  function doImport() {
    if (!parsed.length) return;
    workspace.importBatch(
      parsed.map((p) => ({ ...p.raw, operator: p.operator, examDate: p.examDate })),
      { name: batchName, source: mode === 'file' ? '文件导入' : '粘贴导入' }
    );
    workspace.setView('workbench');
    workspace.notify(`已导入 ${parsed.length} 例报告`, 'ok', '自动质检已执行，可在工作台逐例查看问题。');
  }

  function addEmptyCase() {
    const batch = workspace.batch;
    if (!batch || batch.status === 'released') {
      workspace.notify('已放行的批次不能再新增报告', 'warn');
      return;
    }
    const c = workspace.addCaseToBatch({});
    if (c) {
      workspace.setView('workbench');
      workspace.notify('已新增一例报告', 'info', `${c.id} · 参数与种子可继续调整`);
    }
  }

  function fillExample() {
    text = EXAMPLE;
    runParse(text);
  }
</script>

<div class="import">
  <div class="import-inner">
    <header class="imp-head">
      <div class="imp-icon"><Icon name="layers" size={20} color="#0d6b76" /></div>
      <div>
        <h2>批量导入报告</h2>
        <p class="muted">
          导入后每例按检查参数与种子自动生成食管/胃/十二指肠分段示意图，并立即执行四项自动质检。
        </p>
      </div>
      <span class="spacer"></span>
      <button class="btn sm" onclick={addEmptyCase} title="不导入数据，直接在当前批次新增一例空白报告">
        <Icon name="plus" size={12} /> 手动新增一例
      </button>
    </header>

    <div class="imp-grid">
      <section class="card">
        <div class="card-head">
          <Icon name="doc" size={14} />
          <span class="card-title">导入源</span>
          <span class="spacer"></span>
          <div class="seg">
            <button class="seg-btn" class:on={mode === 'paste'} onclick={() => (mode = 'paste')}>粘贴 JSON / CSV</button>
            <button class="seg-btn" class:on={mode === 'file'} onclick={() => (mode = 'file')}>上传文件</button>
          </div>
        </div>
        <div class="imp-body">
          {#if mode === 'file'}
            <div
              class="drop"
              class:dragging
              ondragover={(e) => {
                e.preventDefault();
                dragging = true;
              }}
              ondragleave={() => (dragging = false)}
              ondrop={onDrop}
            >
              <Icon name="download" size={22} color="#0d6b76" />
              <div style="font-weight:600">将 .json / .csv / .txt 拖到此处</div>
              <div class="muted">或</div>
              <label class="btn sm">
                选择文件
                <input
                  type="file"
                  accept=".json,.csv,.txt"
                  hidden
                  onchange={(e) => {
                    onFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          {:else}
            <textarea
              class="input imp-text mono"
              rows="11"
              bind:value={text}
              placeholder="粘贴 JSON 数组，或每行一条：患者标识,性别,年龄,检查日期,操作医生,检查类型,种子"
              oninput={() => runParse(text)}
            ></textarea>
          {/if}
          <div class="imp-actions">
            <button class="btn sm ghost" onclick={fillExample}><Icon name="spark" size={12} /> 填入示例</button>
            <button class="btn sm" onclick={() => runParse(text)}><Icon name="search" size={12} /> 校验</button>
            <span class="spacer"></span>
            {#if error}
              <span class="err"><Icon name="alert" size={11} /> {error}</span>
            {:else if parsed.length}
              <span class="ok"><Icon name="check" size={11} /> 校验通过 {parsed.length} 条</span>
            {/if}
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <Icon name="grid" size={14} />
          <span class="card-title">预览</span>
          <span class="spacer"></span>
          <span class="chip mini">{parsed.length} 条</span>
        </div>
        <div class="preview scroll">
          {#if parsed.length}
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>患者</th>
                  <th>检查日期</th>
                  <th>医生</th>
                  <th>类型</th>
                  <th>种子</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {#each parsed as p}
                  <tr>
                    <td class="mono muted">{p.index}</td>
                    <td>{p.patientLabel}</td>
                    <td class="mono">{p.examDate}</td>
                    <td>{p.operator}</td>
                    <td>{p.examType}</td>
                    <td class="mono seed">{p.seed}</td>
                    <td>
                      {#if p.warnings.length}
                        <span class="pill medium compact" title={p.warnings.join('；')}>
                          注意
                        </span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {:else}
            <div class="empty">
              <Icon name="grid" size={20} />
              <div>尚无有效记录</div>
              <div class="muted">粘贴或上传后将在此预览</div>
            </div>
          {/if}
        </div>
        <div class="imp-foot">
          <div class="field" style="flex:1">
            <label for="bn">批次名称</label>
            <input id="bn" class="input" bind:value={batchName} />
          </div>
          <button class="btn primary" disabled={!parsed.length} onclick={doImport}>
            <Icon name="plus" size={12} /> 导入并自动质检
          </button>
        </div>
      </section>
    </div>

    <div class="imp-note">      <Icon name="info" size={13} />
      <div>
        <strong>导入字段说明：</strong>
        <span class="mono">patientLabel</span> 患者标识、<span class="mono">gender</span> 性别、
        <span class="mono">age</span> 年龄、<span class="mono">examDate</span> 检查日期、
        <span class="mono">operator</span> 操作医生、
        <span class="mono">params.examType</span> 检查类型（无痛胃镜/普通胃镜/食管镜/十二指肠镜/精查胃镜）、
        <span class="mono">params.seed</span> 种子。同一参数组 + 同一种子可完全复现示意布局。
      </div>
    </div>
  </div>
</div>

<style>
  .import {
    height: 100%;
    overflow: auto;
    padding: 24px;
  }
  .import-inner {
    max-width: 1180px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .imp-head { display: flex; gap: 13px; align-items: flex-start; }
  .imp-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: var(--accent-soft);
    border: 1px solid var(--accent-line);
    display: grid;
    place-items: center;
    flex: none;
  }
  .imp-head h2 { font-size: 17px; }
  .imp-head p { margin: 3px 0 0; font-size: 12px; }

  .imp-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
    gap: 14px;
    align-items: stretch;
  }
  .imp-body { padding: 12px 14px; }
  .imp-text {
    width: 100%;
    font-size: 11.5px;
    line-height: 1.7;
    min-height: 240px;
  }
  .drop {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 7px;
    height: 240px;
    border: 1.5px dashed var(--line);
    border-radius: 9px;
    background: var(--surface-2);
    color: var(--ink-2);
    transition: border-color 0.15s, background 0.15s;
  }
  .drop.dragging { border-color: var(--accent); background: var(--accent-soft); }
  .imp-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 9px;
    font-size: 11.5px;
  }
  .err { color: var(--high); display: inline-flex; align-items: center; gap: 4px; }
  .ok { color: var(--ok); display: inline-flex; align-items: center; gap: 4px; }

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
    padding: 3px 8px;
    border-radius: 5px;
    cursor: pointer;
    color: var(--ink-2);
    white-space: nowrap;
  }
  .seg-btn.on {
    background: var(--surface);
    font-weight: 600;
    color: var(--ink);
    box-shadow: var(--shadow-sm);
  }

  .preview { max-height: 300px; overflow: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  thead th {
    position: sticky;
    top: 0;
    background: var(--surface-2);
    border-bottom: 1px solid var(--line);
    padding: 6px 10px;
    text-align: left;
    font-size: 10px;
    color: var(--ink-3);
    font-weight: 600;
    white-space: nowrap;
  }
  tbody td { padding: 5px 10px; border-bottom: 1px solid var(--line-2); white-space: nowrap; }
  .seed { font-size: 10px; color: var(--ink-3); }
  .imp-foot {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    padding: 10px 14px 13px;
    border-top: 1px solid var(--line-2);
  }
  .imp-note {
    display: flex;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 8px;
    background: var(--surface-2);
    border: 1px solid var(--line-2);
    font-size: 11.5px;
    line-height: 1.65;
    color: var(--ink-2);
  }
  .imp-note .mono { background: #fff; padding: 0 3px; border-radius: 3px; font-size: 10.5px; }
</style>
