// Application store. Svelte 5 runes; a single mutable workspace object keeps
// the demo self-contained while the domain logic stays in pure modules.

import { buildDemoState } from './demo.js';
import {
  PHASE,
  CASE_STATE,
  ROLES,
  createCase,
  rerunChecks,
  regenerateContent,
  moveLesion,
  moveAnnotation,
  resizeLesion,
  setBodyText,
  togglePart,
  submitForReview,
  confirmIssue,
  rejectIssue,
  signCase,
  canSign,
  canRelease,
  releaseBlockers,
  releaseBatch,
  batchStats,
  issueCounts,
  phaseOf,
  findBatchesByFilters,
  allOperators,
  fmtDate,
  fmtDateTime,
  nextBatchId,
  nowIso,
  generationKey
} from './model.js';
import { DEFAULT_PARAMS } from './lesions.js';

const seedState = buildDemoState();

class Workspace {
  cases = $state(seedState.cases);
  batches = $state(seedState.batches);
  activeBatchId = $state(seedState.activeBatchId);
  activeCaseId = $state(seedState.activeCaseId);
  view = $state('workbench');
  role = $state('report');
  actor = $state({ report: '张伟', review: '周敏' });
  toast = $state(null);
  lastAction = $state(null);

  batch = $derived(this.batches.find((b) => b.id === this.activeBatchId) || this.batches[0]);
  batchCaseList = $derived(
    (this.batch?.cases || []).map((id) => this.cases[id]).filter(Boolean)
  );
  activeCase = $derived(this.cases[this.activeCaseId] || this.batchCaseList[0]);
  stats = $derived(this.batch ? batchStats(this.batch, this.cases) : null);
  blockers = $derived(this.batch ? releaseBlockers(this.batch, this.cases) : []);
  operators = $derived(allOperators(this.cases));

  get actorName() {
    return this.role === 'report' ? this.actor.report : this.actor.review;
  }

  notify(message, tone = 'info', detail = '') {
    this.toast = { id: Math.random(), message, tone, detail };
    const id = this.toast.id;
    setTimeout(() => {
      if (this.toast?.id === id) this.toast = null;
    }, 3600);
  }

  selectBatch(id) {
    this.activeBatchId = id;
    const b = this.batches.find((x) => x.id === id);
    if (b && !b.cases.includes(this.activeCaseId)) {
      this.activeCaseId = b.cases[0];
    }
  }

  selectCase(id) {
    this.activeCaseId = id;
  }

  setView(view) {
    this.view = view;
    if (view === 'review') {
      const current = this.cases[this.activeCaseId];
      const needsWork =
        current && current.state === 'submitted' && current.issues.some((i) => i.status === 'pending');
      if (!needsWork) {
        const candidate = this.batchCaseList.find(
          (c) => c.state === 'submitted' && c.issues.some((i) => i.status === 'pending')
        );
        if (candidate) this.activeCaseId = candidate.id;
      }
    }
  }

  // ------------------------------------------------------------ editing
  commitEdit(label) {
    const c = this.cases[this.activeCaseId];
    if (!c) return;
    rerunChecks(c);
    this.lastAction = { label, at: nowIso() };
  }

  dragLesion(lesionId, x, y) {
    const c = this.cases[this.activeCaseId];
    if (!c) return;
    moveLesion(c, lesionId, x, y);
    rerunChecks(c);
  }

  dragAnnotation(annotationId, x, y) {
    const c = this.cases[this.activeCaseId];
    if (!c) return;
    moveAnnotation(c, annotationId, x, y);
    rerunChecks(c);
  }

  editLesionSize(lesionId, longCm, shortCm) {
    const c = this.cases[this.activeCaseId];
    if (!c) return;
    resizeLesion(c, lesionId, longCm, shortCm);
    rerunChecks(c);
  }

  editBody(text) {
    const c = this.cases[this.activeCaseId];
    if (!c) return;
    setBodyText(c, text);
    rerunChecks(c);
  }

  setPart(part, present) {
    const c = this.cases[this.activeCaseId];
    if (!c) return;
    togglePart(c, part, present);
    this.notify(present ? '已恢复该部位示意图' : '已移除该部位示意图', present ? 'info' : 'warn');
  }

  regenerate({ params, keepManual = true }) {
    const c = this.cases[this.activeCaseId];
    if (!c) return;
    const res = regenerateContent(c, { params });
    this.lastAction = { label: '重新生成', at: nowIso() };
    if (res.sameGeneration) {
      this.notify(
        `已按当前参数重新生成，保留 ${res.keptManual} 处手工调整`,
        'ok',
        `参数组与种子未变（${generationKey(c.params)}），手工挪动的病灶与标注框全部保留。`
      );
    } else {
      this.notify(
        '参数组或种子已变更，已重新生成示意图与正文',
        'warn',
        '手工调整对应旧布局，已随本次重绘清空。'
      );
    }
  }

  /** Parameter change: regenerate, then re-evaluate the whole case. */
  updateParams(patch) {
    const c = this.cases[this.activeCaseId];
    if (!c) return;
    this.regenerate({ params: patch });
  }

  // ----------------------------------------------------------- workflow
  submit() {
    const c = this.cases[this.activeCaseId];
    if (!c) return;
    const rejected = c.issues.filter((i) => i.status === 'dismissed').length;
    submitForReview(c, this.actor.report);
    this.notify(
      rejected ? `已重新提交复核，含 ${rejected} 条整改说明` : '已提交复核',
      'ok',
      '复核员将逐条确认或驳回质检条目。'
    );
  }

  confirm(issueId, note = '') {
    const c = this.cases[this.activeCaseId];
    if (!c) return;
    confirmIssue(c, issueId, this.actor.review, note);
  }

  reject(issueId, reason) {
    const c = this.cases[this.activeCaseId];
    if (!c) return;
    rejectIssue(c, issueId, this.actor.review, reason);
    this.notify('已驳回，该例退回报告组整改', 'warn', '整改完成并重新提交后，复核条目将全部重置为待处理。');
  }

  confirmAll() {
    const c = this.cases[this.activeCaseId];
    if (!c) return;
    const pending = c.issues.filter((i) => i.status === 'pending');
    for (const i of pending) confirmIssue(c, i.id, this.actor.review, '批量确认');
    this.notify(`已确认 ${pending.length} 条质检条目`, 'ok');
  }

  sign() {
    const c = this.cases[this.activeCaseId];
    if (!c) return;
    if (!canSign(c)) {
      this.notify('尚有未处理的质检条目，无法签名', 'warn');
      return;
    }
    signCase(c, this.actor.review);
    this.notify('整例复核签章完成', 'ok', `${c.id} 已进入批次放行队列。`);
  }

  release() {
    const b = this.batch;
    if (!b) return;
    if (!canRelease(b, this.cases)) {
      this.notify('批次尚未满足放行条件', 'warn', this.blockers.join('；'));
      return;
    }
    const manifest = releaseBatch(b, this.cases, this.actor.review);
    this.notify('批次已放行归档', 'ok', `已生成批次清单 ${manifest.batchId}，签名 ${manifest.signature}`);
  }

  archiveSearch({ from, to, operator, keyword }) {
    return findBatchesByFilters(this.batches, { from, to, operator, keyword });
  }

  // --------------------------------------------------------------- batch
  createBatch(name, note = '') {
    const batch = {
      id: nextBatchId(),
      name: name || '新建批次',
      source: '手工新建',
      status: 'open',
      note,
      createdAt: nowIso(),
      cases: []
    };
    this.batches = [batch, ...this.batches];
    this.activeBatchId = batch.id;
    this.activeCaseId = null;
    return batch;
  }

  addCaseToBatch(input = {}) {
    const batch = this.batch;
    if (!batch || batch.status === 'released') return null;
    const n = batch.cases.length;
    const params = {
      ...DEFAULT_PARAMS,
      examType: ['无痛胃镜', '精查胃镜', '食管镜', '十二指肠镜', '普通胃镜'][n % 5],
      seed: `GEN-${String(n + 1).padStart(3, '0')}`,
      operator: ['张伟', '李敏', '王海涛', '陈晓芸', '刘建国'][n % 5],
      ...(input.params || {})
    };
    params.reporter = params.operator;
    const c = createCase({
      ...input,
      params,
      examDate: input.examDate || fmtDate(new Date().toISOString()),
      patientLabel: input.patientLabel || ['周**', '李**', '王**', '陈**', '刘**', '杨**'][n % 6],
      gender: input.gender || (n % 2 ? '女' : '男'),
      age: input.age ?? 40 + ((n * 7) % 35),
      operator: params.operator
    });
    this.cases[c.id] = c;
    batch.cases = [...batch.cases, c.id];
    this.activeCaseId = c.id;
    return c;
  }

  removeCaseFromBatch(id) {
    const batch = this.batch;
    if (!batch || batch.status === 'released') return;
    batch.cases = batch.cases.filter((x) => x !== id);
    delete this.cases[id];
    if (this.activeCaseId === id) this.activeCaseId = batch.cases[0] || null;
  }

  importBatch(cases, meta = {}) {
    const batch = {
      id: nextBatchId('IM'),
      name: meta.name || '导入批次',
      source: meta.source || '批量导入',
      status: 'open',
      note: meta.note || '',
      createdAt: nowIso(),
      cases: []
    };
    for (const raw of cases) {
      const c = createCase(raw);
      this.cases[c.id] = c;
      batch.cases.push(c.id);
    }
    this.batches = [batch, ...this.batches];
    this.activeBatchId = batch.id;
    this.activeCaseId = batch.cases[0];
    return batch;
  }

  resetDemo() {
    const fresh = buildDemoState();
    this.cases = fresh.cases;
    this.batches = fresh.batches;
    this.activeBatchId = fresh.activeBatchId;
    this.activeCaseId = fresh.activeCaseId;
    this.view = 'workbench';
    this.notify('已恢复演示数据', 'info');
  }
}

export const workspace = new Workspace();
export { PHASE, CASE_STATE, ROLES, issueCounts, phaseOf, fmtDate, fmtDateTime, canSign, canRelease };
