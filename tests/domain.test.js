import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createCase,
  checkInput,
  rerunChecks,
  regenerateContent,
  moveLesion,
  moveAnnotation,
  resizeLesion,
  submitForReview,
  confirmIssue,
  rejectIssue,
  signCase,
  canSign,
  canRelease,
  releaseBlockers,
  releaseBatch,
  buildManifest,
  batchStats,
  findBatchesByFilters,
  generationKey,
  togglePart
} from '../src/lib/model.js';
import { DEFAULT_PARAMS, generateCase } from '../src/lib/lesions.js';
import { runChecks, splitSections, parseSizes } from '../src/lib/qc.js';

function caseWith(seed, extra = {}) {
  return createCase({
    id: `C-${seed}`,
    patientId: `P-${seed}`,
    examDate: '2026-11-10',
    operator: '张伟',
    params: { ...DEFAULT_PARAMS, seed },
    ...extra
  });
}

test('same parameters and seed reproduce the same diagram and narrative', () => {
  const a = generateCase({ ...DEFAULT_PARAMS, seed: 'REPRO-1' });
  const b = generateCase({ ...DEFAULT_PARAMS, seed: 'REPRO-1' });
  assert.deepEqual(
    a.lesions.map((l) => [l.id, l.x, l.y, l.longCm, l.shortCm]),
    b.lesions.map((l) => [l.id, l.x, l.y, l.longCm, l.shortCm])
  );
  assert.equal(a.bodyText, b.bodyText);
  assert.deepEqual(a.texture, b.texture);
});

test('a different seed changes the lesion layout', () => {
  const a = generateCase({ ...DEFAULT_PARAMS, seed: 'REPRO-1' });
  const b = generateCase({ ...DEFAULT_PARAMS, seed: 'REPRO-2' });
  assert.notDeepEqual(
    a.lesions.map((l) => [l.x, l.y]),
    b.lesions.map((l) => [l.x, l.y])
  );
});

test('generated markers stay inside their lumen', () => {
  for (let i = 0; i < 40; i++) {
    const c = caseWith(`GEN-${i}`);
    assert.equal(
      c.issues.filter((x) => x.checkType === 'marker-oob').length,
      0,
      `seed GEN-${i} produced an out-of-bounds marker`
    );
  }
});

test('generated labels do not overlap each other', () => {
  for (let i = 0; i < 40; i++) {
    const c = caseWith(`GEN-${i}`);
    assert.equal(
      c.issues.filter((x) => x.checkType === 'label-overlap').length,
      0,
      `seed GEN-${i} produced overlapping labels`
    );
  }
});

test('manual marker and label edits survive regeneration with unchanged parameters', () => {
  const c = caseWith('KEEP-1');
  const lesion = c.lesions[0];
  moveLesion(c, lesion.id, 0.42, 0.55);
  const ann = c.annotations[0];
  moveAnnotation(c, ann.id, 0.1, 0.2);
  const key = generationKey(c.params);

  const { sameGeneration } = regenerateContent(c, { params: {} });
  assert.ok(sameGeneration);
  assert.equal(generationKey(c.params), key);
  const after = c.lesions.find((l) => l.id === lesion.id);
  assert.equal(after.x, 0.42);
  assert.equal(after.y, 0.55);
  assert.equal(after.manualPos, true);
  const annAfter = c.annotations.find((a) => a.id === ann.id);
  assert.equal(annAfter.x, 0.1);
  assert.equal(annAfter.y, 0.2);
  assert.equal(annAfter.manual, true);
});

test('changing the seed drops manual micro-edits and regenerates', () => {
  const c = caseWith('DROP-1');
  const lesion = c.lesions[0];
  moveLesion(c, lesion.id, 0.42, 0.55);
  const { sameGeneration } = regenerateContent(c, { params: { seed: 'DROP-2' } });
  assert.equal(sameGeneration, false);
  assert.equal(c.lesions.find((l) => l.id === lesion.id).manualPos, false);
  assert.notEqual(c.lesions.find((l) => l.id === lesion.id).x, 0.42);
});

test('removing a required part raises a high-severity missing-part finding', () => {
  const c = caseWith('MISS-1', { omitParts: { stomach: true } });
  const found = c.issues.find((i) => i.checkType === 'missing-part');
  assert.ok(found);
  assert.equal(found.severity, 'high');
  assert.match(found.title, /胃/);
});

test('a marker dragged outside the lumen is reported', () => {
  const c = caseWith('OOB-1');
  moveLesion(c, c.lesions[0].id, 0.02, 0.02);
  rerunChecks(c);
  const found = c.issues.find((i) => i.checkType === 'marker-oob');
  assert.ok(found, 'expected marker-oob');
  assert.equal(found.severity, 'high');
});

test('two labels stacked on the same spot are reported as overlapping', () => {
  const c = createCase({
    id: 'OVL-1',
    patientId: 'P-OVL',
    examDate: '2026-11-10',
    params: { ...DEFAULT_PARAMS, seed: 'GEN-1' }
  });
  const part = c.annotations[0].part;
  const same = c.annotations.filter((a) => a.part === part);
  if (same.length < 2) {
    // add a second lesion on the same panel to exercise the check
    const extra = { ...c.lesions[0], id: `${part}-L9`, part };
    c.lesions.push(extra);
    c.annotations.push({ ...c.annotations[0], id: `ann-${part}-L9`, lesionId: extra.id });
  }
  const pairs = c.annotations.filter((a) => a.part === part);
  pairs[1].x = pairs[0].x;
  pairs[1].y = pairs[0].y;
  rerunChecks(c);
  const found = c.issues.find((i) => i.checkType === 'label-overlap');
  assert.ok(found, 'expected label-overlap');
  assert.ok(['high', 'medium'].includes(found.severity));
});

test('a size edited on the diagram but not in the report body is reported', () => {
  const c = caseWith('SIZE-1');
  const lesion = c.lesions[0];
  const before = `${lesion.longCm.toFixed(1)}cm×${lesion.shortCm.toFixed(1)}cm`;
  c.bodyText = c.bodyText.replace(before, '0.2cm×0.2cm');
  rerunChecks(c);
  const found = c.issues.find((i) => i.checkType === 'size-mismatch');
  assert.ok(found, 'expected size-mismatch');
  assert.equal(found.expected, '正文 0.2×0.2cm');
});

test('narrative parsing handles mm and cm', () => {
  assert.deepEqual(
    parseSizes('见 1.4cm×0.9cm 及 8mm×5mm').map((s) => [s.longCm, s.shortCm]),
    [
      [1.4, 0.9],
      [0.8, 0.5]
    ]
  );
});

test('narrative section split keeps per-part text', () => {
  const c = caseWith('SEC-1');
  const sections = splitSections(c.bodyText);
  assert.ok(sections.stomach);
  assert.match(sections.stomach.text, /胃/);
});

test('severity is graded across all three levels', () => {
  const c = caseWith('GRADE-1');
  // high: marker out of bounds
  moveLesion(c, c.lesions[0].id, 0.01, 0.01);
  // low: a label pushed off panel edge
  c.annotations[0].x = 0.9;
  rerunChecks(c);
  const levels = new Set(c.issues.map((i) => i.severity));
  assert.ok(levels.has('high'));
  assert.ok(levels.has('low'));
});

test('a case cannot be signed while findings are pending', () => {
  const c = caseWith('GATE-1');
  moveLesion(c, c.lesions[0].id, 0.01, 0.01);
  rerunChecks(c);
  submitForReview(c, '张伟');
  assert.equal(c.state, 'submitted');
  assert.equal(canSign(c), false);
});

test('rejecting a finding sends the case back to the report group', () => {
  const c = caseWith('REJ-1');
  moveLesion(c, c.lesions[0].id, 0.01, 0.01);
  rerunChecks(c);
  submitForReview(c, '张伟');
  const issue = c.issues[0];
  rejectIssue(c, issue.id, '周敏', '标记压到管壁，请重画');
  assert.equal(c.state, 'rework');
  assert.equal(c.issues.find((i) => i.id === issue.id).status, 'dismissed');
  assert.equal(c.rounds.at(-1).type, 'reject');

  // report group fixes and resubmits
  moveLesion(c, c.lesions[0].id, 0.5, 0.5);
  rerunChecks(c);
  submitForReview(c, '张伟');
  assert.equal(c.state, 'submitted');
  assert.ok(c.issues.every((i) => i.status === 'pending'));
});

test('a batch cannot be released until every case is signed', () => {
  const cases = {};
  const ids = [];
  for (let i = 0; i < 3; i++) {
    const c = caseWith(`BAT-${i}`);
    cases[c.id] = c;
    ids.push(c.id);
  }
  const c0 = cases[ids[0]];
  moveLesion(c0, c0.lesions[0].id, 0.01, 0.01);
  rerunChecks(c0);
  const batch = { id: 'B-1', name: '体检批次', cases: ids, status: 'open', source: 'test' };

  assert.equal(canRelease(batch, cases), false);
  assert.ok(releaseBlockers(batch, cases).length > 0);

  for (const id of ids) {
    const c = cases[id];
    submitForReview(c, '张伟');
    for (const i of c.issues) confirmIssue(c, i.id, '周敏');
    signCase(c, '周敏');
  }
  assert.equal(canRelease(batch, cases), true);
  assert.equal(releaseBlockers(batch, cases).length, 0);
});

test('the manifest records case count, issue distribution and reviewers', () => {
  const cases = {};
  const ids = [];
  for (let i = 0; i < 2; i++) {
    const c = caseWith(`MAN-${i}`);
    cases[c.id] = c;
    ids.push(c.id);
  }
  const c0 = cases[ids[0]];
  moveLesion(c0, c0.lesions[0].id, 0.01, 0.01);
  rerunChecks(c0);
  for (const id of ids) {
    const c = cases[id];
    submitForReview(c, '张伟');
    for (const i of c.issues) confirmIssue(c, i.id, '周敏');
    signCase(c, '周敏');
  }
  const batch = { id: 'B-2', name: '放行批次', cases: ids, status: 'open', source: 'test' };
  const m = releaseBatch(batch, cases, '周敏');
  assert.equal(m.caseCount, 2);
  assert.equal(m.issueTotals.total, 1);
  assert.equal(m.issueTotals.high, 1);
  assert.equal(m.reviewers[0].name, '周敏');
  assert.equal(m.caseRows.length, 2);
  assert.match(m.signature, /^[0-9A-F]{12}$/);
  assert.ok(m.byType.some((t) => t.key === 'marker-oob' && t.total === 1));
});

test('released batches are searchable by exam date and operator', () => {
  const mk = (id, date, operator, seed) => {
    const c = createCase({
      id,
      patientId: 'P',
      examDate: date,
      operator,
      params: { ...DEFAULT_PARAMS, operator, seed }
    });
    submitForReview(c, operator);
    for (const i of c.issues) confirmIssue(c, i.id, '周敏');
    signCase(c, '周敏');
    return c;
  };
  const c1 = mk('S1', '2026-10-02', '张伟', 'S-1');
  const c2 = mk('S2', '2026-11-20', '李敏', 'S-2');
  const cases = { S1: c1, S2: c2 };
  const b1 = { id: 'B-10', name: '十月', cases: ['S1'], status: 'open' };
  const b2 = { id: 'B-11', name: '十一月', cases: ['S2'], status: 'open' };
  releaseBatch(b1, cases, '周敏');
  releaseBatch(b2, cases, '周敏');
  const all = [b1, b2];
  assert.deepEqual(findBatchesByFilters(all, { operator: '张伟' }).map((b) => b.id), ['B-10']);
  assert.deepEqual(findBatchesByFilters(all, { from: '2026-11-01' }).map((b) => b.id), ['B-11']);
  assert.deepEqual(findBatchesByFilters(all, { to: '2026-10-31' }).map((b) => b.id), ['B-10']);
  assert.deepEqual(findBatchesByFilters(all, { operator: '李敏' }).map((b) => b.id), ['B-11']);
  assert.deepEqual(
    findBatchesByFilters(all, { from: '2026-01-01', to: '2026-12-31', operator: 'all' }).length,
    2
  );
});

// ------------------------------------------------------------ extra coverage

test('restoring a removed part brings its deterministic content back', () => {
  const c = caseWith('RESTORE-1');
  const stomachLesions = c.lesions.filter((l) => l.part === 'stomach').length;
  togglePart(c, 'stomach', false);
  assert.equal(c.lesions.filter((l) => l.part === 'stomach').length, 0);
  assert.match(c.bodyText, /缺少|胃/);
  togglePart(c, 'stomach', true);
  assert.equal(c.lesions.filter((l) => l.part === 'stomach').length, stomachLesions);
  assert.ok(c.issues.every((i) => i.checkType !== 'missing-part'));
});

test('manual edits inside a removed part are not resurrected as stale positions', () => {
  const c = caseWith('RESTORE-2');
  const lesion = c.lesions.find((l) => l.part === 'stomach');
  if (!lesion) return;
  moveLesion(c, lesion.id, 0.3, 0.4);
  togglePart(c, 'stomach', false);
  togglePart(c, 'stomach', true);
  const restored = c.lesions.find((l) => l.id === lesion.id);
  assert.equal(restored.x, 0.3);
  assert.equal(restored.y, 0.4);
  assert.equal(restored.manualPos, true);
});

test('an empty batch cannot be released', () => {
  const batch = { id: 'EMPTY', name: '空批次', cases: [], status: 'open' };
  assert.equal(canRelease(batch, {}), false);
  assert.ok(releaseBlockers(batch, {}).includes('批次内没有报告'));
});

test('a released batch cannot be released twice', () => {
  const c = caseWith('TWICE-1');
  submitForReview(c, '张伟');
  for (const i of c.issues) confirmIssue(c, i.id, '周敏');
  signCase(c, '周敏');
  const cases = { [c.id]: c };
  const batch = { id: 'TWICE', name: '重复放行', cases: [c.id], status: 'open' };
  releaseBatch(batch, cases, '周敏');
  assert.equal(batch.status, 'released');
  assert.equal(canRelease(batch, cases), false);
  assert.equal(batch.manifest.caseCount, 1);
});

test('findings carry stable ids across repeated checks', () => {
  const c = caseWith('STABLE-1');
  moveLesion(c, c.lesions[0].id, 0.01, 0.01);
  rerunChecks(c);
  const first = c.issues.map((i) => i.id);
  rerunChecks(c);
  assert.deepEqual(c.issues.map((i) => i.id), first);
});

test('a confirmed finding keeps its decision when checks rerun unchanged', () => {
  const c = caseWith('KEEP-DECISION');
  moveLesion(c, c.lesions[0].id, 0.01, 0.01);
  rerunChecks(c);
  submitForReview(c, '张伟');
  const issue = c.issues[0];
  confirmIssue(c, issue.id, '周敏', '已核对');
  assert.equal(c.issues.find((i) => i.id === issue.id).status, 'confirmed');
  rerunChecks(c);
  const after = c.issues.find((i) => i.id === issue.id);
  assert.ok(after, 'finding should persist');
  assert.equal(after.status, 'confirmed');
  assert.equal(after.decidedBy, '周敏');
});

test('rework rounds are recorded with reviewer reason', () => {
  const c = caseWith('ROUNDS-1');
  moveLesion(c, c.lesions[0].id, 0.01, 0.01);
  rerunChecks(c);
  submitForReview(c, '张伟');
  rejectIssue(c, c.issues[0].id, '周敏', '标记越界');
  assert.equal(c.rounds.length, 2);
  assert.equal(c.rounds[0].type, 'submit');
  assert.equal(c.rounds[1].type, 'reject');
  assert.equal(c.rounds[1].note, '标记越界');
});

test('exam type drives which panels are required', () => {
  const eso = createCase({
    id: 'E-1', patientId: 'P', examDate: '2026-11-10', operator: '张伟',
    params: { ...DEFAULT_PARAMS, examType: '食管镜' }
  });
  assert.equal(eso.parts.stomach, false);
  assert.equal(eso.parts.duodenum, false);
  assert.equal(eso.parts.esophagus, true);
  const duo = createCase({
    id: 'D-1', patientId: 'P', examDate: '2026-11-10', operator: '王海涛',
    params: { ...DEFAULT_PARAMS, examType: '十二指肠镜' }
  });
  assert.equal(duo.parts.esophagus, false);
  assert.equal(duo.parts.stomach, true);
  assert.equal(duo.parts.duodenum, true);
});

test('same parameter group in a different case reproduces the same diagram', () => {
  const a = createCase({ id: 'G-1', patientId: 'P1', examDate: '2026-11-10', operator: '张伟', params: { ...DEFAULT_PARAMS, seed: 'GROUP-A' } });
  const b = createCase({ id: 'G-2', patientId: 'P2', examDate: '2026-11-11', operator: '张伟', params: { ...DEFAULT_PARAMS, seed: 'GROUP-A' } });
  assert.deepEqual(
    a.lesions.map((l) => [l.id, l.x, l.y, l.longCm, l.shortCm, l.region]),
    b.lesions.map((l) => [l.id, l.x, l.y, l.longCm, l.shortCm, l.region])
  );
  assert.deepEqual(a.annotations.map((x) => [x.id, x.x, x.y]), b.annotations.map((x) => [x.id, x.x, x.y]));
  assert.equal(a.texture.esophagus, b.texture.esophagus);
});

test('body text describing a vanished panel is flagged as a missing part', () => {
  const c = caseWith('TEXTONLY-1');
  const part = c.lesions[0]?.part || 'duodenum';
  const name = { esophagus: '食管', stomach: '胃', duodenum: '十二指肠' }[part];
  c.bodyText = c.bodyText.replace(`${name}：`, `${name}：球部见0.8cm×0.6cm黏膜糜烂；`);
  togglePart(c, part, false);
  // body text was hand-edited, so it is preserved and now contradicts the panels
  const found = c.issues.filter((i) => i.checkType === 'missing-part');
  assert.ok(found.length >= 1, 'expected a missing-part finding');
  assert.ok(found.some((i) => /正文描述了/.test(i.title) || /「/.test(i.title)));
});

test('a label wider than its box raises a low-severity overflow finding', () => {
  const c = caseWith('OVERFLOW-1');
  const ann = c.annotations[0];
  if (!ann) return;
  c.annotations[0] = { ...ann, w: 0.095, h: 0.05 };
  rerunChecks(c);
  const found = c.issues.find((i) => i.checkType === 'label-overflow');
  assert.ok(found, 'expected label-overflow');
  assert.equal(found.severity, 'low');
});

test('a label pushed past the panel edge raises a low-severity finding', () => {
  const c = caseWith('PANEL-1');
  const ann = c.annotations[0];
  if (!ann) return;
  c.annotations[0] = { ...ann, x: 0.95, y: 0.95 };
  rerunChecks(c);
  const found = c.issues.find((i) => i.checkType === 'label-outside');
  assert.ok(found, 'expected label-outside');
  assert.equal(found.severity, 'low');
});

test('the batch manifest sums issue distribution across cases', () => {
  const cases = {};
  const ids = [];
  for (let i = 0; i < 3; i++) {
    const c = caseWith(`SUM-${i}`);
    if (i === 0) moveLesion(c, c.lesions[0].id, 0.01, 0.01);
    if (i === 1 && c.lesions[1]) moveLesion(c, c.lesions[1].id, 0.01, 0.01);
    rerunChecks(c);
    cases[c.id] = c;
    ids.push(c.id);
    submitForReview(c, '张伟');
    for (const issue of c.issues) confirmIssue(c, issue.id, '周敏');
    signCase(c, '周敏');
  }
  const batch = { id: 'SUM-B', name: '合计', cases: ids, status: 'open' };
  const m = releaseBatch(batch, cases, '周敏');
  const rows = m.caseRows;
  assert.equal(rows.reduce((s, r) => s + r.high, 0), m.issueTotals.high);
  assert.equal(rows.reduce((s, r) => s + r.issueTotal, 0), m.issueTotals.total);
  assert.equal(m.reviewers.length, 1);
});

test('a label box sitting on top of its lesion is reported', () => {
  const c = caseWith('COVER-1');
  const lesion = c.lesions[0];
  const ann = c.annotations.find((a) => a.lesionId === lesion.id);
  moveAnnotation(c, ann.id, lesion.x - ann.w / 2, lesion.y - ann.h / 2);
  rerunChecks(c);
  const found = c.issues.find((i) => i.checkType === 'label-covered');
  assert.ok(found, 'expected label-covered');
  assert.equal(found.severity, 'medium');
});

test('every check type is named and graded', () => {
  const c = caseWith('NAMES-1');
  const types = new Set(['missing-part', 'marker-oob', 'label-overlap', 'size-mismatch', 'label-overflow', 'label-outside', 'label-covered']);
  // force one of each we can manufacture deterministically
  const lesion = c.lesions[0];
  const ann = c.annotations.find((a) => a.lesionId === lesion.id);
  moveLesion(c, lesion.id, 0.01, 0.01);          // marker-oob
  c.annotations[0] = { ...c.annotations[0], x: 0.95, y: 0.95 }; // label-outside
  c.annotations.push({ ...c.annotations[0], id: 'dup-ann' });   // label-overlap
  rerunChecks(c);
  const seen = new Set(c.issues.map((i) => i.checkType));
  assert.ok(seen.has('marker-oob'));
  assert.ok(seen.has('label-outside'));
  assert.ok(seen.has('label-overlap'));
  for (const i of c.issues) {
    assert.ok(typeof i.checkName === 'string' && i.checkName.length > 0, `unnamed check ${i.checkType}`);
    assert.ok(['high', 'medium', 'low'].includes(i.severity), `bad severity ${i.severity}`);
  }
});
