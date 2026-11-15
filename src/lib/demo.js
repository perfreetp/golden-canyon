// Demo data: a live open batch plus two archived batches, seeded so the
// platform opens with representative content in every state.

import {
  createCase,
  submitForReview,
  confirmIssue,
  rejectIssue,
  signCase,
  buildManifest,
  togglePart,
  rerunChecks,
  moveLesion,
  moveAnnotation
} from './model.js';
import { DEFAULT_PARAMS } from './lesions.js';

const PATIENTS = [
  ['周**', '男', 52],
  ['李**', '女', 63],
  ['王**', '男', 41],
  ['陈**', '女', 58],
  ['刘**', '男', 67],
  ['杨**', '女', 45],
  ['赵**', '男', 36],
  ['黄**', '女', 71],
  ['吴**', '男', 49],
  ['徐**', '女', 55],
  ['孙**', '男', 60],
  ['马**', '女', 38],
  ['朱**', '男', 44],
  ['胡**', '女', 66],
  ['郭**', '男', 57]
];

const PARAM_SETS = [
  { examType: '无痛胃镜', scope: 'GIF-H290', imageMode: '白光', position: '左侧卧位', insufflation: '适量', operator: '张伟', reporter: '张伟' },
  { examType: '精查胃镜', scope: 'GIF-HQ290', imageMode: 'NBI', position: '左侧卧位', insufflation: '充分', operator: '李敏', reporter: '李敏' },
  { examType: '食管镜', scope: 'GIF-XP290N', imageMode: 'LCI', position: '平卧位', insufflation: '少量', operator: '王海涛', reporter: '王海涛' },
  { examType: '十二指肠镜', scope: 'TJF-Q290V', imageMode: '白光', position: '左侧卧位', insufflation: '适量', operator: '陈晓芸', reporter: '陈晓芸' },
  { examType: '普通胃镜', scope: 'GIF-H290', imageMode: 'BLI', position: '右侧卧位', insufflation: '适量', operator: '刘建国', reporter: '刘建国' }
];

let seq = 0;

function patient(i) {
  const [label, gender, age] = PATIENTS[i % PATIENTS.length];
  return { label, gender, age };
}

function makeCase({ date, index, seed, params, defect }) {
  const p = patient(index);
  const id = `M${date.replaceAll('-', '')}-${String(120 + index * 7 + seq++).slice(-4)}`;
  const c = createCase({
    id,
    patientId: `MR-${date.replaceAll('-', '')}-${String(1000 + index * 37).slice(-4)}`,
    patientLabel: p.label,
    gender: p.gender,
    age: p.age,
    examDate: date,
    operator: params.operator,
    params: { ...DEFAULT_PARAMS, ...params, seed }
  });
  if (defect) defect(c);
  rerunChecks(c);
  return c;
}

// ------------------------------------------------------------- defects
function missingStomach(c) {
  togglePart(c, 'stomach', false);
}

function markerOut(c) {
  const l = c.lesions[0];
  if (!l) return;
  moveLesion(c, l.id, 0.055, 0.075);
}

function sizeDrift(c) {
  const l = c.lesions[0];
  if (!l) return;
  const long = Math.max(0.3, l.longCm - 0.7).toFixed(1);
  const short = Math.max(0.2, l.shortCm - 0.3).toFixed(1);
  const before = `${l.longCm.toFixed(1)}cm×${l.shortCm.toFixed(1)}cm`;
  c.bodyText = c.bodyText.replace(before, `${long}cm×${short}cm`);
}

function labelStack(c) {
  const groups = new Map();
  for (const a of c.annotations) {
    if (!groups.has(a.part)) groups.set(a.part, []);
    groups.get(a.part).push(a);
  }
  // two labels for the same lesion, deliberately misregistered by a few pixels
  const a = c.annotations[0];
  if (!a) return;
  const twinId = `${a.id}-twin`;
  c.annotations.push({ ...a, id: twinId, manual: false });
  moveAnnotation(c, twinId, a.x + 0.03, a.y + 0.026);
}

/** A size mismatch severe enough to grade 严重. */
function bigSizeDrift(c) {
  const l = c.lesions[0];
  if (!l) return;
  const before = `${l.longCm.toFixed(1)}cm×${l.shortCm.toFixed(1)}cm`;
  c.bodyText = c.bodyText.replace(before, '0.4cm×0.3cm');
}

/** An isolated size in the narrative with no matching marker. */
function orphanSize(c) {
  const first = c.lesions[0];
  if (!first) return;
  const name = { esophagus: '食管', stomach: '胃', duodenum: '十二指肠' }[first.part];
  c.bodyText = c.bodyText.replace(`${name}：`, `${name}：另见1.9cm×1.5cm隆起性病变；`);
}

function narrowLabel(c) {
  const a = c.annotations[0];
  if (!a) return;
  a.w = 0.3;
  a.manual = true;
  c.manual.annotations[a.id] = { x: a.x, y: a.y, manual: true };
}

function textOnlyDuodenum(c) {
  // body describes the duodenum but the panel was removed
  c.bodyText = c.bodyText.replace(
    '十二指肠：',
    '十二指肠：球部见0.8cm×0.6cm黏膜糜烂，边界清楚；'
  );
  togglePart(c, 'duodenum', false);
}

function submitAnd(confirmAll) {
  return (c) => {
    submitForReview(c, c.operator);
    if (confirmAll) {
      for (const i of c.issues) confirmIssue(c, i.id, '周敏', '已核对，同意归档');
      signCase(c, '周敏');
    }
  };
}

// ------------------------------------------------------------- open batch
export function buildDemoState() {
  const cases = {};
  const today = '2026-11-12';
  const plan = [
    { date: today, index: 0, seed: 'ENDO-2611-A1', params: PARAM_SETS[0], defect: null, after: (c) => submitForReview(c, c.operator) },
    { date: today, index: 1, seed: 'ENDO-2611-A2', params: PARAM_SETS[0], defect: missingStomach, after: null },
    { date: today, index: 2, seed: 'ENDO-2611-A3', params: PARAM_SETS[1], defect: markerOut, after: (c) => submitForReview(c, c.operator) },
    { date: today, index: 3, seed: 'ENDO-2611-A4', params: PARAM_SETS[4], defect: bigSizeDrift, after: submitAnd(false) },
    { date: today, index: 4, seed: 'QC-5', params: PARAM_SETS[0], defect: labelStack, after: (c) => submitForReview(c, c.operator) },
    { date: today, index: 5, seed: 'ENDO-2611-A6', params: PARAM_SETS[3], defect: null, after: submitAnd(true) },
    { date: today, index: 6, seed: 'ENDO-2611-A7', params: PARAM_SETS[1], defect: null, after: submitAnd(true) },
    { date: today, index: 7, seed: 'ENDO-2611-A8', params: PARAM_SETS[2], defect: narrowLabel, after: (c) => submitForReview(c, c.operator) },
    { date: today, index: 8, seed: 'ENDO-2611-A9', params: PARAM_SETS[0], defect: orphanSize, after: submitAnd(false) }
  ];

  for (const item of plan) {
    const c = makeCase(item);
    cases[c.id] = c;
    if (item.after) item.after(c);
  }

  // one case in rework: submitted, then one finding rejected
  const reworkCase = cases[Object.keys(cases)[3]];
  if (reworkCase && reworkCase.issues.length) {
    const target = reworkCase.issues[0];
    rejectIssue(reworkCase, target.id, '周敏', '图注尺寸与正文不符，请按正文 0.9cm 重画后重新提交');
  }

  const openBatch = {
    id: 'PB-2611-07',
    name: '11月第2周 · 门诊胃镜图文',
    source: 'PACS 批量导入',
    status: 'open',
    note: '本批含无痛胃镜、精查胃镜及食管/十二指肠专项，按院内报告规范 v3.2 复核。',
    createdAt: '2026-11-12T07:40:00',
    cases: Object.keys(cases)
  };

  // ----------------------------------------------------------- archives
  const archiveA = buildArchive({
    id: 'PB-2611-03',
    name: '11月第1周 · 住院胃镜图文',
    source: 'PACS 批量导入',
    releasedAt: '2026-11-08T17:12:00',
    releasedBy: '赵振华',
    note: '住院部批量，含 2 例窄带成像精查。',
    entries: [
      ['2026-11-03', 9, 'HIST-A1', PARAM_SETS[0], null],
      ['2026-11-03', 10, 'QC-7', PARAM_SETS[1], markerOut],
      ['2026-11-04', 11, 'HIST-A3', PARAM_SETS[3], null],
      ['2026-11-05', 12, 'HIST-A4', PARAM_SETS[2], narrowLabel],
      ['2026-11-05', 13, 'HIST-A5', PARAM_SETS[4], null],
      ['2026-11-06', 14, 'HIST-A6', PARAM_SETS[0], sizeDrift]
    ]
  });

  const archiveB = buildArchive({
    id: 'PB-2610-22',
    name: '10月末 · 门诊胃镜图文',
    source: '手工登记',
    releasedAt: '2026-10-30T18:05:00',
    releasedBy: '孙立群',
    note: '月度结算前最后一批。',
    entries: [
      ['2026-10-27', 1, 'HIST-B1', PARAM_SETS[0], null],
      ['2026-10-28', 2, 'QC-2', PARAM_SETS[2], labelStack],
      ['2026-10-28', 3, 'HIST-B3', PARAM_SETS[1], null],
      ['2026-10-29', 4, 'HIST-B4', PARAM_SETS[4], null]
    ]
  });

  for (const [id, c] of Object.entries(archiveA.cases)) cases[id] = c;
  for (const [id, c] of Object.entries(archiveB.cases)) cases[id] = c;

  return {
    cases,
    batches: [openBatch, archiveA.batch, archiveB.batch],
    activeBatchId: openBatch.id,
    activeCaseId:
      openBatch.cases.find((id) => {
        const c = cases[id];
        return c?.state === 'submitted' && c.issues.some((i) => i.status === 'pending');
      }) ||
      openBatch.cases.find((id) => cases[id]?.state === 'submitted') ||
      openBatch.cases[0]
  };
}

function buildArchive({ id, name, source, releasedAt, releasedBy, note, entries }) {
  const cases = {};
  const ids = [];
  for (const [date, index, seed, params, defect] of entries) {
    const c = makeCase({ date, index, seed, params, defect });
    cases[c.id] = c;
    ids.push(c.id);
    submitForReview(c, c.operator);
    for (const issue of c.issues) {
      confirmIssue(c, issue.id, index % 3 === 0 ? '孙立群' : '周敏', '已核对，同意归档');
    }
    signCase(c, index % 3 === 0 ? '孙立群' : '周敏');
    // historic batches were reviewed and signed on their own days, not today
    const signedAt = `${date}T${16 + (index % 3)}:${String((index * 7) % 60).padStart(2, '0')}:00`;
    c.submittedAt = `${date}T${15 + (index % 2)}:${String((index * 11) % 60).padStart(2, '0')}:00`;
    c.submittedBy = c.operator;
    c.confirmedAt = signedAt;
    for (const r of c.rounds || []) r.at = c.submittedAt;
  }
  const batch = {
    id,
    name,
    source,
    status: 'open',
    note,
    createdAt: releasedAt,
    cases: ids
  };
  const manifest = buildManifest(batch, cases, releasedBy, releasedAt);
  batch.status = 'released';
  batch.manifest = manifest;
  batch.releasedAt = manifest.releasedAt;
  return { batch, cases };
}

export { PARAM_SETS, PATIENTS };
