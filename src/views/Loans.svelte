<script>
  import {
    loans, figures, damages, createLoan, advanceLoan, revertLoan,
    saveDamage, getFigure, figureStatus, scanOverdueLoans
  } from '../lib/store.svelte.js';
  import { LOAN_STAGES, loanOverdueDays } from '../lib/rules.js';
  import { addDays, download, todayStr } from '../lib/utils.js';
  import { handoverHtml } from '../lib/handover.js';
  import Modal from '../components/Modal.svelte';
  import DamagePicker from '../components/DamagePicker.svelte';

  scanOverdueLoans();

  let showCreate = $state(false);
  let dmgLoan = $state(null);
  let dmgFigureId = $state(null);
  let spots = $state([]);
  let photos = $state([]);
  let dmgDesc = $state('');

  const form = $state({
    borrower: '', org: '', contact: '', figureIds: [],
    startDate: todayStr(), dueReturnDate: addDays(todayStr(), 30), handler: '', notes: ''
  });

  const available = $derived(figures.filter(f => figureStatus(f.id).status !== '借展中'));

  function toggleFigure(id) {
    const i = form.figureIds.indexOf(id);
    if (i >= 0) form.figureIds.splice(i, 1);
    else form.figureIds.push(id);
  }

  function submitLoan() {
    if (!form.borrower.trim() && !form.org.trim()) { alert('请填写借展方'); return; }
    if (!form.figureIds.length) { alert('请至少选择一件藏品'); return; }
    createLoan(form);
    showCreate = false;
    form.figureIds = [];
    form.borrower = ''; form.org = ''; form.contact = ''; form.notes = '';
  }

  function openDamage(loan) {
    dmgLoan = loan;
    dmgFigureId = loan.figureIds[0];
    spots = []; photos = []; dmgDesc = '';
  }

  function submitDamage() {
    if (!spots.length && !photos.length) { alert('请在图上点选损伤部位或拍照留档'); return; }
    saveDamage({
      figureId: dmgFigureId, loanId: dmgLoan.id, desc: dmgDesc,
      handler: dmgLoan.handler, spots, photos
    });
    dmgLoan = null;
  }

  function exportHandover(loan) {
    download(`借展交接单-${loan.loanNo}.html`, handoverHtml(loan, figures, damages), 'text/html;charset=utf-8');
  }

  function stageCls(stage) {
    return { 待出库: 'gray', 在展: 'blue', 归还验收中: 'amber', 已归还: 'green' }[stage] || 'gray';
  }
</script>

<div class="toolbar">
  <div class="left">
    <h2>借展单据（{loans.length}）</h2>
  </div>
  <div class="right">
    <button class="primary" onclick={() => (showCreate = true)}>+ 新建借展单</button>
  </div>
</div>

<div class="alert amber" style="margin-bottom:14px">
  流转：待出库 → 在展 → 归还验收中 → 已归还。应还日期超过 3 天未还的单据自动标黄并推送通知；验收时可点选部位登记损伤并拍照留档。
</div>

{#if loans.length === 0}
  <div class="empty">暂无借展单据</div>
{:else}
  <div class="grid" style="grid-template-columns:1fr 1fr">
    {#each loans as loan (loan.id)}
      {@const overdue = loanOverdueDays(loan)}
      <div class="card tight loan-card {loan.yellow ? 'yellow' : ''}">
        <div class="loan-head">
          <div>
            <strong class="mono">{loan.loanNo}</strong>
            <span class="badge {stageCls(loan.stage)}" style="margin-left:8px">{loan.stage}</span>
            {#if loan.yellow}<span class="badge red" style="margin-left:6px">超期 {overdue} 天</span>{/if}
          </div>
          <div class="muted" style="font-size:12px">{loan.org || loan.borrower}</div>
        </div>

        <div class="loan-meta">
          <div><span class="muted">借展方：</span>{loan.org || '—'} {loan.borrower}</div>
          <div><span class="muted">联系：</span>{loan.contact || '—'}</div>
          <div><span class="muted">出库：</span><span class="mono">{loan.actualOutDate || loan.startDate}</span></div>
          <div><span class="muted">应还：</span><b class="mono {loan.yellow ? 'red-text' : ''}">{loan.dueReturnDate}</b></div>
          {#if loan.actualReturnDate}<div><span class="muted">实还：</span><span class="mono">{loan.actualReturnDate}</span></div>{/if}
          <div><span class="muted">经办：</span>{loan.handler || '—'}</div>
        </div>

        <div class="chip-list" style="margin:8px 0">
          {#each loan.figureIds as fid}
            <span class="chip">{getFigure(fid)?.name || '已删除藏品'}</span>
          {/each}
        </div>

        {#if loan.notes}<p class="muted" style="font-size:12.5px;margin:4px 0">📝 {loan.notes}</p>{/if}

        {#if loan.damageRecordIds.length}
          <div class="alert red" style="padding:7px 10px;font-size:12.5px;margin:6px 0">
            已登记 {loan.damageRecordIds.length} 条损伤记录
          </div>
        {/if}

        <div class="loan-actions">
          {#if loan.stage !== '已归还'}
            <button class="sm primary" onclick={() => advanceLoan(loan.id)}>
              推进至：{LOAN_STAGES[LOAN_STAGES.indexOf(loan.stage) + 1]}
            </button>
            <button class="sm" onclick={() => revertLoan(loan.id)} disabled={loan.stage === '待出库'}>回退</button>
          {/if}
          {#if loan.stage === '归还验收中' || loan.stage === '已归还'}
            <button class="sm danger" onclick={() => openDamage(loan)}>损伤登记</button>
          {/if}
          <button class="sm" onclick={() => exportHandover(loan)}>导出交接单</button>
        </div>
      </div>
    {/each}
  </div>
{/if}

<!-- 新建借展单 -->
{#if showCreate}
  <Modal title="新建借展单" wide onClose={() => (showCreate = false)}>
    {#snippet children()}
      <div class="modal-body">
        <div class="row">
          <div class="field"><label>借展单位</label><input bind:value={form.org} placeholder="例：市立动漫艺术馆" /></div>
          <div class="field"><label>借展联系人</label><input bind:value={form.borrower} placeholder="例：周衡" /></div>
          <div class="field"><label>联系方式</label><input bind:value={form.contact} placeholder="电话/邮箱" /></div>
        </div>
        <div class="row">
          <div class="field"><label>出库日期</label><input type="date" bind:value={form.startDate} /></div>
          <div class="field"><label>应归还日期</label><input type="date" bind:value={form.dueReturnDate} /></div>
          <div class="field"><label>经办人</label><input bind:value={form.handler} /></div>
        </div>
        <div class="field">
          <label>选择借展藏品（{form.figureIds.length} 件，借展中藏品不可选）</label>
          <div class="fig-pick">
            {#each available as f (f.id)}
              {@const on = form.figureIds.includes(f.id)}
              <button type="button" class="fig-option {on ? 'on' : ''}" onclick={() => toggleFigure(f.id)}>
                {#if f.photo}<img src={f.photo} alt="" />{:else}<span class="ph">🎎</span>{/if}
                <span>{f.name}</span>
                <span class="muted" style="font-size:11.5px">{f.scale} · {f.material}</span>
              </button>
            {/each}
          </div>
        </div>
        <div class="field"><label>备注</label><textarea rows="2" bind:value={form.notes}></textarea></div>
      </div>
      <div class="modal-foot">
        <button onclick={() => (showCreate = false)}>取消</button>
        <button class="primary" onclick={submitLoan}>创建单据（待出库）</button>
      </div>
    {/snippet}
  </Modal>
{/if}

<!-- 损伤登记 -->
{#if dmgLoan}
  <Modal title={`归还验收 · 损伤登记（${dmgLoan.loanNo}）`} wide onClose={() => (dmgLoan = null)}>
    {#snippet children()}
      <div class="modal-body">
        <div class="field">
          <label>验收藏品</label>
          <select bind:value={dmgFigureId}>
            {#each dmgLoan.figureIds as fid}<option value={fid}>{getFigure(fid)?.name}</option>{/each}
          </select>
        </div>
        <DamagePicker figure={getFigure(dmgFigureId)} bind:spots bind:photos bind:desc={dmgDesc} />
      </div>
      <div class="modal-foot">
        <button onclick={() => (dmgLoan = null)}>取消</button>
        <button class="primary danger" onclick={submitDamage}>提交损伤登记并留档</button>
      </div>
    {/snippet}
  </Modal>
{/if}

<style>
  .loan-card.yellow { border-color: var(--amber); background: #fffdf4; box-shadow: 0 0 0 2px var(--amber-soft); }
  .loan-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
  .loan-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 14px; font-size: 13px; }
  .loan-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--line); }
  .red-text { color: var(--red); }
  .fig-pick { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; max-height: 260px; overflow-y: auto; }
  .fig-option {
    display: flex; flex-direction: column; gap: 3px; align-items: flex-start; text-align: left;
    padding: 8px; border-radius: 8px; border: 1.5px solid var(--line); background: var(--panel-2);
  }
  .fig-option.on { border-color: var(--accent); background: var(--accent-soft); }
  .fig-option img, .fig-option .ph { width: 100%; height: 86px; object-fit: cover; border-radius: 6px; background: #e6ddcc; display: grid; place-items: center; font-size: 28px; }
</style>
