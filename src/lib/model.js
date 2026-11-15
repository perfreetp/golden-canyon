// Batch / case domain model: creation, status transitions, release gates,
// manifest construction and history search. Pure functions where possible so
// the workflow is testable without a DOM.

import {
  generateCase,
  applyManualEdits,
  defaultManual,
  buildBodyText,
  makeAnnotation,
  DEFAULT_PARAMS
} from './lesions.js';
import { runChecks, combineSummaries, PART_NAME } from './qc.js';
import { EXAM_TYPES, EXAM_TYPE_NAMES } from './anatomy.js';
import { shortCode, createRng } from './prng.js';

/**
 * Case lifecycle.
 *   draft     report group editing, not yet submitted
 *   submitted reviewer working through the issue list
 *   rework    at least one issue rejected, returned to the report group
 *   signed    reviewer signed the case; read-only
 */
export const CASE_STATE = {
  draft: { key: 'draft', name: '草稿', tone: 'neutral', desc: '报告组编辑中' },
  submitted: { key: 'submitted', name: '待复核', tone: 'info', desc: '已提交复核' },
  rework: { key: 'rework', name: '待整改', tone: 'danger', desc: '有条目被驳回，已退回报告组' },
  signed: { key: 'signed', name: '已签名', tone: 'success', desc: '复核员已签章' }
};

export const PHASE = CASE_STATE;

export const ROLES = [
  { key: 'report', name: '报告组', people: ['张伟', '李敏', '王海涛', '陈晓芸', '刘建国'] },
  { key: 'review', name: '复核员', people: ['周敏', '赵振华', '孙立群', '郑雪'] }
];

export function roleName(key) {
  return ROLES.find((r) => r.key === key)?.name || '—';
}

export function nowIso() {
  return new Date().toISOString();
}

export function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function generationKey(params) {
  return [
    params.examType,
    params.scope,
    params.imageMode,
    params.position,
    params.insufflation,
    params.operator,
    params.reporter,
    params.seed
  ].join('|');
}

/** Normalised case factory. */
export function createCase(input = {}) {
  const params = { ...DEFAULT_PARAMS, ...(input.params || {}) };
  const generated = generateCase(params, { omitParts: input.omitParts });
  const parts = input.parts ? { ...generated.parts, ...input.parts } : generated.parts;
  const manual = input.manual ? structuredClone(input.manual) : defaultManual();
  const base = applyManualEdits({ ...generated, parts }, manual, true);
  const lesions = (input.lesions || base.lesions).filter((l) => parts[l.part] !== false);
  const annotations = (input.annotations || base.annotations)
    .filter((a) => parts[a.part] !== false)
    .filter((a) => lesions.some((l) => l.id === a.lesionId));
  const bodyText = input.bodyText ?? buildBodyText(params, lesions, parts);
  const c = {
    id: input.id || nextCaseId(input.examDate),
    patientId: input.patientId || '—',
    patientLabel: input.patientLabel || '—',
    gender: input.gender || '未知',
    age: input.age ?? null,
    examDate: input.examDate || fmtDate(new Date().toISOString()),
    operator: input.operator || params.operator,
    params,
    parts,
    lesions,
    annotations,
    bodyText,
    texture: generated.texture,
    manual,
    issues: [],
    state: input.state || 'draft',
    rounds: input.rounds ? structuredClone(input.rounds) : [],
    submittedAt: input.submittedAt || null,
    submittedBy: input.submittedBy || null,
    confirmedAt: input.confirmedAt || null,
    confirmedBy: input.confirmedBy || null,
    note: input.note || '',
    createdAt: input.createdAt || nowIso(),
    updatedAt: nowIso()
  };
  c.issues = runChecks(checkInput(c)).issues;
  if (input.issues) {
    const byId = new Map(input.issues.map((i) => [i.id, i]));
    c.issues = c.issues.map((i) => (byId.has(i.id) ? { ...i, ...byId.get(i.id) } : i));
  }
  return c;
}

export function checkInput(c) {
  return {
    examType: c.params.examType,
    parts: c.parts,
    lesions: c.lesions,
    annotations: c.annotations,
    bodyText: c.bodyText
  };
}

/** Recompute findings from the current content. */
export function rerunChecks(c) {
  const { issues } = runChecks(checkInput(c));
  if (c.state === 'submitted' || c.state === 'signed') {
    // Decisions already taken stay attached to identical findings.
    const prev = new Map(c.issues.map((i) => [i.id, i]));
    c.issues = issues.map((i) => {
      const old = prev.get(i.id);
      return old && old.status !== 'pending'
        ? { ...i, status: old.status, note: old.note, decidedBy: old.decidedBy, decidedAt: old.decidedAt }
        : i;
    });
  } else {
    c.issues = issues;
  }
  c.updatedAt = nowIso();
  return c;
}

/**
 * Regenerate diagram content from parameters and seed.
 * When the generation key is unchanged, every locally edited lesion position,
 * lesion size, label box and narrative stays exactly as the user left it.
 * When the key changes, manual micro-adjustments are dropped because they no
 * longer describe the new layout.
 */
export function regenerateContent(c, { params } = {}) {
  const nextParams = { ...c.params, ...(params || {}) };
  const sameGeneration = generationKey(c.params) === generationKey(nextParams);
  c.params = nextParams;

  const gen = generateCase(nextParams);
  const manual = sameGeneration ? c.manual : defaultManual();
  if (!sameGeneration) c.manual = manual;

  const lesions = [];
  const annotations = [];
  let keptManual = 0;
  for (const l of gen.lesions) {
    if (c.parts[l.part] === false) continue;
    const m = manual.lesions[l.id];
    const lesion = {
      ...l,
      x: m && m.manualPos ? m.x : l.x,
      y: m && m.manualPos ? m.y : l.y,
      longCm: m && m.manualSize ? m.longCm : l.longCm,
      shortCm: m && m.manualSize ? m.shortCm : l.shortCm,
      manualPos: Boolean(m && m.manualPos),
      manualSize: Boolean(m && m.manualSize)
    };
    if (lesion.manualPos || lesion.manualSize) keptManual++;
    lesions.push(lesion);
    const am = manual.annotations[`ann-${l.id}`];
    const auto = makeAnnotation(lesion, annotations);
    if (am) keptManual++;
    annotations.push(am ? { ...auto, x: am.x, y: am.y, manual: true } : auto);
  }

  c.lesions = lesions;
  c.annotations = annotations;
  c.bodyText = manual.text && sameGeneration ? manual.text : buildBodyText(nextParams, lesions, c.parts);
  c.texture = gen.texture;
  rerunChecks(c);
  return { keptManual, sameGeneration };
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Move a lesion marker; coordinates are normalised to the panel. */
export function moveLesion(c, lesionId, x, y) {
  const lesion = c.lesions.find((l) => l.id === lesionId);
  if (!lesion) return c;
  lesion.x = clamp01(x);
  lesion.y = clamp01(y);
  lesion.manualPos = true;
  c.manual.lesions[lesion.id] = {
    ...(c.manual.lesions[lesion.id] || {}),
    x: lesion.x,
    y: lesion.y,
    manualPos: true
  };
  c.updatedAt = nowIso();
  return c;
}

/** Move a label box; coordinates are normalised to the panel. */
export function moveAnnotation(c, annotationId, x, y) {
  const ann = c.annotations.find((a) => a.id === annotationId);
  if (!ann) return c;
  ann.x = clamp01(x);
  ann.y = clamp01(y);
  ann.manual = true;
  c.manual.annotations[annotationId] = { x: ann.x, y: ann.y, manual: true };
  c.updatedAt = nowIso();
  return c;
}

/** Resize a lesion by editing its measured size; the marker scales with it. */
export function resizeLesion(c, lesionId, longCm, shortCm) {
  const lesion = c.lesions.find((l) => l.id === lesionId);
  if (!lesion) return c;
  lesion.longCm = Math.max(0.1, Math.round(longCm * 10) / 10);
  lesion.shortCm = Math.max(0.1, Math.round(shortCm * 10) / 10);
  lesion.manualSize = true;
  c.manual.lesions[lesion.id] = {
    ...(c.manual.lesions[lesion.id] || {}),
    longCm: lesion.longCm,
    shortCm: lesion.shortCm,
    manualSize: true
  };
  c.updatedAt = nowIso();
  return c;
}

export function setBodyText(c, text) {
  c.bodyText = text;
  c.manual.text = text;
  c.updatedAt = nowIso();
  return c;
}

/**
 * Enable or disable a segment panel. Enabling regenerates the panel's
 * deterministic content (respecting manual edits), so restoring a part brings
 * its lesions and labels back instead of leaving an empty panel.
 */
export function togglePart(c, part, present) {
  const wasPresent = c.parts[part] !== false;
  if (wasPresent === present) return c;
  c.parts[part] = present;
  if (present) {
    regenerateContent(c, { params: {} });
    return c;
  }
  const keep = (x) => c.parts[x.part] !== false;
  c.lesions = c.lesions.filter(keep);
  c.annotations = c.annotations.filter(keep);
  // Removing a panel also removes its paragraph, unless the narrative was
  // hand-edited — in that case it is left alone so the mismatch is caught.
  if (!c.manual.text) {
    c.bodyText = buildBodyText(c.params, c.lesions, c.parts);
  }
  rerunChecks(c);
  return c;
}

/** Diagram content is editable only before submission or during rework. */
export function isEditable(c) {
  return c.state === 'draft' || c.state === 'rework';
}

// -------------------------------------------------------------- workflow

export function submitForReview(c, by) {
  if (!isEditable(c)) throw new Error('当前状态不可提交');
  const rejected = c.issues.filter((i) => i.status === 'dismissed');
  c.rounds = c.rounds || [];
  c.rounds.push({
    round: c.rounds.length + 1,
    type: 'submit',
    at: nowIso(),
    by,
    rejectedCount: rejected.length,
    rejected: rejected.map((i) => ({ title: i.title, note: i.note, severity: i.severity })),
    issueCount: c.issues.length
  });
  c.state = 'submitted';
  c.submittedAt = nowIso();
  c.submittedBy = by;
  c.confirmedAt = null;
  c.confirmedBy = null;
  rerunChecks(c);
  c.issues = c.issues.map((i) => ({ ...i, status: 'pending', note: '', decidedBy: null, decidedAt: null }));
  c.updatedAt = nowIso();
  return c;
}

export function confirmIssue(c, issueId, by, note = '') {
  const issue = c.issues.find((i) => i.id === issueId);
  if (!issue) return c;
  issue.status = 'confirmed';
  issue.note = note;
  issue.decidedBy = by;
  issue.decidedAt = nowIso();
  c.updatedAt = nowIso();
  return c;
}

export function rejectIssue(c, issueId, by, reason) {
  const issue = c.issues.find((i) => i.id === issueId);
  if (!issue) return c;
  issue.status = 'dismissed';
  issue.note = reason;
  issue.decidedBy = by;
  issue.decidedAt = nowIso();
  if (c.state === 'submitted') {
    c.state = 'rework';
    c.rounds = c.rounds || [];
    c.rounds.push({
      round: c.rounds.length + 1,
      type: 'reject',
      at: nowIso(),
      by,
      title: issue.title,
      note: reason,
      issueId: issue.id,
      severity: issue.severity
    });
  }
  c.updatedAt = nowIso();
  return c;
}

export function canSign(c) {
  return c.state === 'submitted' && c.issues.length >= 0 && c.issues.every((i) => i.status !== 'pending');
}

export function signCase(c, by) {
  if (!canSign(c)) throw new Error('尚有未处理的质检条目');
  c.state = 'signed';
  c.confirmedAt = nowIso();
  c.confirmedBy = by;
  c.updatedAt = nowIso();
  return c;
}

export function phaseOf(c) {
  return c.state || 'draft';
}

export function issueCounts(c) {
  const s = { high: 0, medium: 0, low: 0, total: c.issues.length, pending: 0, confirmed: 0, dismissed: 0 };
  for (const i of c.issues) {
    s[i.severity]++;
    s[i.status === 'pending' ? 'pending' : i.status === 'confirmed' ? 'confirmed' : 'dismissed']++;
  }
  return s;
}

export function batchStats(batch, cases) {
  const list = batch.cases.map((id) => cases[id]).filter(Boolean);
  const phases = { draft: 0, submitted: 0, rework: 0, signed: 0 };
  const issues = { high: 0, medium: 0, low: 0, total: 0, pending: 0, confirmed: 0, dismissed: 0 };
  const operators = new Set();
  let minDate = null;
  let maxDate = null;
  let ready = 0;
  for (const c of list) {
    const p = phaseOf(c);
    phases[p] = (phases[p] || 0) + 1;
    const ic = issueCounts(c);
    for (const k of ['high', 'medium', 'low', 'total', 'pending', 'confirmed', 'dismissed']) issues[k] += ic[k];
    operators.add(c.operator);
    if (p === 'submitted' && ic.pending === 0) ready++;
    if (c.examDate) {
      if (!minDate || c.examDate < minDate) minDate = c.examDate;
      if (!maxDate || c.examDate > maxDate) maxDate = c.examDate;
    }
  }
  return {
    cases: list.length,
    phases,
    issues,
    operators: [...operators],
    ready,
    signedCases: phases.signed,
    dateRange: { from: minDate, to: maxDate },
    progress: list.length ? phases.signed / list.length : 0
  };
}

export function releaseBlockers(batch, cases) {
  const stats = batchStats(batch, cases);
  const blockers = [];
  if (!stats.cases) blockers.push('批次内没有报告');
  if (stats.phases.draft) blockers.push(`${stats.phases.draft} 例仍在报告组编辑（草稿）`);
  if (stats.phases.submitted) blockers.push(`${stats.phases.submitted} 例复核未完成（其中 ${stats.issues.pending} 条质检项待处理）`);
  if (stats.phases.rework) blockers.push(`${stats.phases.rework} 例被驳回，已退回报告组整改`);
  return blockers;
}

export function canRelease(batch, cases) {
  if (!batch || batch.status === 'released') return false;
  const stats = batchStats(batch, cases);
  return stats.cases > 0 && releaseBlockers(batch, cases).length === 0;
}

/** Build the archival manifest written at release time. */
export function buildManifest(batch, cases, reviewer, releasedAt = nowIso()) {
  const list = batch.cases.map((id) => cases[id]).filter(Boolean);
  const stats = batchStats(batch, cases);
  const typeMap = new Map();
  const reviewerMap = new Map();
  const operatorMap = new Map();
  const severityByOperator = new Map();
  const caseRows = [];
  for (const c of list) {
    const ic = issueCounts(c);
    typeMap.set(c.params.examType, (typeMap.get(c.params.examType) || 0) + 1);
    operatorMap.set(c.operator, (operatorMap.get(c.operator) || 0) + 1);
    if (!severityByOperator.has(c.operator)) {
      severityByOperator.set(c.operator, { high: 0, medium: 0, low: 0 });
    }
    const sev = severityByOperator.get(c.operator);
    sev.high += ic.high;
    sev.medium += ic.medium;
    sev.low += ic.low;
    if (c.confirmedBy) reviewerMap.set(c.confirmedBy, (reviewerMap.get(c.confirmedBy) || 0) + 1);
    caseRows.push({
      id: c.id,
      patientId: c.patientId,
      patientLabel: c.patientLabel,
      gender: c.gender,
      age: c.age,
      examDate: c.examDate,
      operator: c.operator,
      examType: c.params.examType,
      seed: c.params.seed,
      issueTotal: ic.total,
      high: ic.high,
      medium: ic.medium,
      low: ic.low,
      confirmedIssues: ic.confirmed,
      dismissedIssues: ic.dismissed,
      reviewers: [...new Set(c.issues.map((i) => i.decidedBy).filter(Boolean))],
      signedBy: c.confirmedBy,
      signedAt: c.confirmedAt,
      rounds: c.rounds?.length || 0
    });
  }

  const byType = new Map();
  for (const c of list) {
    for (const i of c.issues) {
      if (!byType.has(i.checkType)) {
        byType.set(i.checkType, {
          key: i.checkType,
          name: i.checkName,
          total: 0,
          high: 0,
          medium: 0,
          low: 0,
          confirmed: 0,
          dismissed: 0
        });
      }
      const row = byType.get(i.checkType);
      row.total++;
      row[i.severity]++;
      row[i.status === 'confirmed' ? 'confirmed' : 'dismissed']++;
    }
  }

  const signaturePayload = [
    batch.id,
    list.length,
    stats.issues.total,
    list.map((c) => `${c.id}:${c.confirmedBy}:${c.confirmedAt}`).join(',')
  ].join('|');

  return {
    version: 1,
    batchId: batch.id,
    batchName: batch.name,
    releasedAt,
    releasedBy: reviewer,
    source: batch.source || '平台导入',
    caseCount: list.length,
    dateRange: stats.dateRange,
    examTypes: [...typeMap.entries()].map(([name, count]) => ({ name, count })),
    operators: [...operatorMap.entries()].map(([name, count]) => ({
      name,
      count,
      issues: severityByOperator.get(name)
    })),
    reviewers: [...reviewerMap.entries()].map(([name, count]) => ({ name, count })),
    issueTotals: {
      total: stats.issues.total,
      high: stats.issues.high,
      medium: stats.issues.medium,
      low: stats.issues.low,
      confirmed: stats.issues.confirmed,
      dismissed: stats.issues.dismissed
    },
    byType: [...byType.values()].sort((a, b) => b.total - a.total),
    caseRows,
    signature: shortCode(signaturePayload, 12),
    notes: batch.note || ''
  };
}

export function releaseBatch(batch, cases, reviewer) {
  if (!canRelease(batch, cases)) throw new Error('批次尚未满足放行条件');
  const manifest = buildManifest(batch, cases, reviewer);
  batch.status = 'released';
  batch.manifest = manifest;
  batch.releasedAt = manifest.releasedAt;
  return manifest;
}

export function findBatchesByFilters(batches, { from, to, operator, keyword } = {}) {
  return batches
    .filter((b) => b.status === 'released' && b.manifest)
    .filter((b) => {
      const rows = b.manifest.caseRows || [];
      if (from) {
        const latest = rows.reduce((m, r) => (r.examDate > m ? r.examDate : m), '');
        if (!latest || latest < from) return false;
      }
      if (to) {
        const earliest = rows.reduce((m, r) => (r.examDate < m ? r.examDate : m), '9999-99-99');
        if (!earliest || earliest > to) return false;
      }
      if (operator && operator !== 'all') {
        if (!rows.some((r) => r.operator === operator)) return false;
      }
      if (keyword) {
        const k = keyword.trim().toLowerCase();
        if (!k) return true;
        const hay = [
          b.id,
          b.name,
          b.manifest.releasedBy,
          ...rows.map((r) => `${r.id} ${r.patientId} ${r.patientLabel} ${r.operator} ${r.examType}`)
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(k)) return false;
      }
      return true;
    })
    .sort((a, b) => (a.manifest.releasedAt < b.manifest.releasedAt ? 1 : -1));
}

export function allOperators(cases) {
  const set = new Set();
  for (const c of Object.values(cases)) set.add(c.operator);
  return [...set].sort((a, b) => a.localeCompare(b, 'zh'));
}

// ------------------------------------------------------------------ ids
let idCounter = 0;

export function nextBatchId(prefix = 'PB') {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const stamp = `${p(d.getFullYear() % 100)}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  return `${prefix}-${stamp}-${String((idCounter++ % 90) + 10)}`;
}

export function nextCaseId(examDate) {
  const d = examDate || fmtDate(new Date().toISOString());
  const compact = String(d).replaceAll('-', '');
  const rng = createRng('case-id', compact, String(Date.now()), String(idCounter++));
  return `M${compact}-${String(rng.int(1, 999)).padStart(3, '0')}`;
}

export { EXAM_TYPES, EXAM_TYPE_NAMES, PART_NAME, combineSummaries, DEFAULT_PARAMS };
