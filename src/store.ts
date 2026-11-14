import { createMemo, createSignal } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import type {
  Batch,
  CheckRun,
  DBShape,
  Drawing,
  Issue,
  IssueStatus,
  PointLayer,
  ReleaseLog,
  Severity
} from './types';
import { runChecks, summarize } from './lib/rules';
import { buildSeedDrawings, generateDrawing, REVIEWERS } from './lib/generator';
import { hashStr } from './lib/geometry';

const LS_KEY = 'ortho-ward-qc-db-v2';

function emptyDB(): DBShape {
  return {
    batches: [],
    drawings: [],
    issues: [],
    reviewers: REVIEWERS,
    checkRuns: [],
    releaseLogs: [],
    seq: 1
  };
}

function seedDB(): DBShape {
  const db = emptyDB();
  const { batches, drawings } = buildSeedDrawings();
  db.batches = batches;
  db.drawings = drawings;

  // 第一批：检查 → 全部闭环 → 已放行
  const b1 = batches[0];
  const i1 = runChecksForBatch(db, b1.id, 1);
  i1.forEach((iss, idx) => {
    iss.status = iss.severity === 'minor' ? 'confirmed' : 'fixed';
    iss.reviewer = idx % 2 === 0 ? 'RV01' : 'RV02';
    iss.reviewNote =
      iss.status === 'fixed'
        ? '设计院已按规范修改并重新出图，现场复核满足要求，予以闭环。'
        : '经现场核实具备等效措施，不影响使用功能，确认通过。';
    iss.reviewedAt = '2026-09-11T15:00:00';
  });
  pushCheckRun(db, b1, 1);
  db.releaseLogs.push({
    id: 'RL-1',
    batchId: b1.id,
    batchName: b1.name,
    building: b1.building,
    floors: b1.floors,
    round: 1,
    action: 'released',
    at: b1.releasedAt!,
    operator: '王建国',
    issueSummary: summarize(i1).severityCounts
  });
  db.drawings
    .filter((d) => d.batchId === b1.id)
    .forEach((d) => (d.status = 'reviewed'));

  // 第二批：检查 → 部分复核中
  const b2 = batches[1];
  const i2 = runChecksForBatch(db, b2.id, 1);
  pushCheckRun(db, b2, 1);
  i2.forEach((iss, idx) => {
    if (idx % 10 < 6) {
      const reject = idx % 7 === 3;
      iss.status = reject ? 'rejected' : 'confirmed';
      iss.reviewer = ['RV01', 'RV02', 'RV03'][idx % 3];
      iss.reviewNote = reject
        ? '该位置与结构柱冲突系底图版本错位，以最新结构条件图复核无此问题，驳回该项。'
        : '现场量测属实，已通知设计院在修订版中调整，问题确认。';
      iss.reviewedAt = '2026-10-28T11:20:00';
    }
  });
  db.drawings
    .filter((d) => d.batchId === b2.id)
    .forEach((d) => (d.status = 'checking'));

  return db;
}

function runChecksForBatch(db: DBShape, batchId: string, round: number): Issue[] {
  const created: Issue[] = [];
  for (const d of db.drawings.filter((x) => x.batchId === batchId)) {
    const issues = runChecks(d, round);
    db.issues.push(...issues);
    created.push(...issues);
    d.status = 'checking';
    d.checkedAt = new Date().toISOString();
  }
  return created;
}

function pushCheckRun(db: DBShape, batch: Batch, round: number) {
  const issues = db.issues.filter((i) => i.batchId === batch.id && i.round === round);
  const s = summarize(issues);
  const run: CheckRun = {
    id: `CR-${db.seq++}`,
    batchId: batch.id,
    round,
    at: new Date().toISOString(),
    ruleCounts: s.ruleCounts,
    severityCounts: s.severityCounts,
    total: s.total
  };
  db.checkRuns.push(run);
}

function load(): DBShape {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as DBShape;
  } catch {
    /* 数据损坏则重建 */
  }
  const db = seedDB();
  localStorage.setItem(LS_KEY, JSON.stringify(db));
  return db;
}

const [db, setDB] = createStore<DBShape>(load());
const [currentBatchId, setCurrentBatchId] = createSignal<string | null>(null);
const [currentDrawingId, setCurrentDrawingId] = createSignal<string | null>(null);
const [selectedPointId, setSelectedPointId] = createSignal<string | null>(null);
const [selectedIssueId, setSelectedIssueId] = createSignal<string | null>(null);
const [activeReviewer, setActiveReviewerSignal] = createSignal<string>('RV02');

const DEFAULT_LAYERS: Record<PointLayer, boolean> = {
  bed: true,
  belt: true,
  call: true,
  gas: true,
  electric: true
};
const [layerVisible, setLayerVisible] = createStore<Record<PointLayer, boolean>>({
  ...DEFAULT_LAYERS
});
const [zoomLevel, setZoomLevel] = createSignal(1);

function persist() {
  localStorage.setItem(LS_KEY, JSON.stringify(db));
}

// ============ 派生查询 ============

export const state = {
  db,
  currentBatchId,
  currentDrawingId,
  selectedPointId,
  selectedIssueId,
  activeReviewer,
  layerVisible,
  zoomLevel
};

// 信号的命名导出，供组件直接订阅
export {
  currentBatchId,
  currentDrawingId,
  selectedPointId,
  selectedIssueId,
  activeReviewer,
  layerVisible,
  zoomLevel
};

export const currentBatch = createMemo<Batch | undefined>(() =>
  db.batches.find((b) => b.id === currentBatchId())
);

export const currentDrawing = createMemo<Drawing | undefined>(() =>
  db.drawings.find((d) => d.id === currentDrawingId())
);

export function drawingsOf(batchId: string): Drawing[] {
  return db.drawings.filter((d) => d.batchId === batchId);
}

export function issuesOf(batchId: string): Issue[] {
  return db.issues.filter((i) => i.batchId === batchId && i.round === batchRound(batchId));
}

export function issuesOfDrawing(drawingId: string): Issue[] {
  const d = db.drawings.find((x) => x.id === drawingId);
  if (!d) return [];
  const round = roundOf(d.batchId);
  return db.issues.filter((i) => i.drawingId === drawingId && i.round === round);
}

function roundOf(batchId: string): number {
  return db.batches.find((b) => b.id === batchId)?.round ?? 1;
}
function batchRound(batchId: string): number {
  return roundOf(batchId);
}

export function issueById(id: string | null): Issue | undefined {
  return id ? db.issues.find((i) => i.id === id) : undefined;
}

export function pointById(id: string | null) {
  if (!id) return undefined;
  for (const d of db.drawings) {
    const p = d.points.find((x) => x.id === id);
    if (p) return { point: p, drawing: d };
  }
  return undefined;
}

export function batchProgress(batchId: string) {
  const issues = issuesOf(batchId);
  const open = issues.filter((i) => i.status === 'open').length;
  const bySev: Record<Severity, number> = { severe: 0, major: 0, minor: 0 };
  const openBySev: Record<Severity, number> = { severe: 0, major: 0, minor: 0 };
  for (const i of issues) {
    bySev[i.severity]++;
    if (i.status === 'open') openBySev[i.severity]++;
  }
  return { total: issues.length, open, bySev, openBySev };
}

export function canRelease(batchId: string): boolean {
  const b = db.batches.find((x) => x.id === batchId);
  if (!b || b.status === 'uploading') return false;
  const drawings = drawingsOf(batchId);
  if (drawings.length === 0) return false;
  return issuesOf(batchId).every((i) => i.status !== 'open');
}

// ============ 动作 ============

export function selectBatch(id: string) {
  setCurrentBatchId(id);
  const first = drawingsOf(id)[0];
  setCurrentDrawingId(first?.id ?? null);
  setSelectedPointId(null);
  setSelectedIssueId(null);
}

export function selectDrawing(id: string) {
  setCurrentDrawingId(id);
  setSelectedPointId(null);
}

export function selectPoint(id: string | null) {
  setSelectedPointId(id);
}

export function selectIssue(id: string | null) {
  setSelectedIssueId(id);
}

export function toggleLayer(layer: PointLayer) {
  setLayerVisible(layer, (v) => !v);
}

export function resetLayers() {
  setLayerVisible({ ...DEFAULT_LAYERS });
}

export function setZoom(z: number) {
  setZoomLevel(z);
}

export function setActiveReviewer(id: string) {
  setActiveReviewerSignal(id);
}

export function createBatch(input: {
  name: string;
  designInstitute: string;
  building: string;
  floor: string;
  unit: string;
}): string {
  const id = `B2026-${String(db.seq + 100).padStart(3, '0')}`;
  const batch: Batch = {
    id,
    name: input.name,
    designInstitute: input.designInstitute,
    building: input.building,
    floors: [input.floor],
    createdAt: new Date().toISOString(),
    status: 'uploading',
    round: 1
  };
  setDB(
    produce((d) => {
      d.batches.push(batch);
      d.seq += 1;
    })
  );
  uploadDrawing(id, input.floor, input.unit, 1);
  persist();
  return id;
}

export function uploadDrawing(
  batchId: string,
  floor: string,
  unit: string,
  seq: number
): Drawing {
  const batch = db.batches.find((b) => b.id === batchId)!;
  const id = `${batchId}-D${seq}`;
  const drawing = generateDrawing({
    id,
    batchId,
    building: batch.building,
    floor,
    unit,
    seq,
    defectSeed: hashStr(batchId + unit) + seq
  });
  drawing.uploadedAt = new Date().toISOString();
  setDB(
    produce((d) => {
      d.drawings.push(drawing);
      if (!batch.floors.includes(floor)) batch.floors.push(floor);
    })
  );
  persist();
  return drawing;
}

/** 对整批执行规范检查（新一轮检查会清理上一轮问题） */
export function checkBatch(batchId: string) {
  const batch = db.batches.find((b) => b.id === batchId);
  if (!batch) return;
  setDB(
    produce((d) => {
      d.issues = d.issues.filter(
        (i) => !(i.batchId === batchId && i.round === batch.round)
      );
      runChecksForBatch(d, batchId, batch.round);
      pushCheckRun(d, batch, batch.round);
      batch.status = 'checking';
    })
  );
  persist();
}

export function reviewIssue(issueId: string, action: 'confirmed' | 'rejected', note: string) {
  const status: IssueStatus = action === 'confirmed' ? 'confirmed' : 'rejected';
  setDB(
    produce((d) => {
      const iss = d.issues.find((i) => i.id === issueId);
      if (!iss || iss.status !== 'open') return;
      iss.status = status;
      iss.reviewNote = note;
      iss.reviewer = activeReviewer();
      iss.reviewedAt = new Date().toISOString();
    })
  );
  persist();
}

export function markFixed(issueId: string, note: string) {
  setDB(
    produce((d) => {
      const iss = d.issues.find((i) => i.id === issueId);
      if (!iss) return;
      iss.status = 'fixed';
      iss.reviewNote = note;
      iss.reviewer = activeReviewer();
      iss.reviewedAt = new Date().toISOString();
    })
  );
  persist();
}

export function releaseBatch(batchId: string, operator: string) {
  if (!canRelease(batchId)) return;
  const batch = db.batches.find((b) => b.id === batchId)!;
  const issues = issuesOf(batchId);
  const log: ReleaseLog = {
    id: `RL-${db.seq++}`,
    batchId,
    batchName: batch.name,
    building: batch.building,
    floors: batch.floors,
    round: batch.round,
    action: 'released',
    at: new Date().toISOString(),
    operator,
    issueSummary: summarize(issues).severityCounts
  };
  setDB(
    produce((d) => {
      batch.status = 'released';
      batch.releasedAt = log.at;
      d.releaseLogs.push(log);
      d.drawings
        .filter((x) => x.batchId === batchId)
        .forEach((x) => (x.status = 'reviewed'));
    })
  );
  persist();
}

/** 整批退回设计院并生成整改清单 */
export function returnBatch(batchId: string, note: string, operator: string): Issue[] {
  const batch = db.batches.find((b) => b.id === batchId)!;
  const issues = issuesOf(batchId).filter((i) => i.status !== 'rejected');
  const log: ReleaseLog = {
    id: `RL-${db.seq++}`,
    batchId,
    batchName: batch.name,
    building: batch.building,
    floors: batch.floors,
    round: batch.round,
    action: 'returned',
    at: new Date().toISOString(),
    operator,
    note,
    issueSummary: summarize(issues).severityCounts
  };
  setDB(
    produce((d) => {
      batch.status = 'returned';
      batch.returnedAt = log.at;
      batch.returnNote = note;
      d.releaseLogs.push(log);
    })
  );
  persist();
  return issues;
}

/** 设计院修改后重新上传：进入下一轮，重生成图纸 */
export function reuploadBatch(batchId: string) {
  const batch = db.batches.find((b) => b.id === batchId);
  if (!batch || batch.status !== 'returned') return;
  const oldDrawings = drawingsOf(batchId);
  setDB(
    produce((d) => {
      batch.round += 1;
      batch.status = 'uploading';
      for (const old of oldDrawings) {
        const fresh = generateDrawing({
          id: old.id,
          batchId,
          building: old.building,
          floor: old.floor,
          unit: old.nursingUnit,
          seq: Number(old.id.split('-D')[1]),
          defectSeed: hashStr(batchId + old.nursingUnit) + batch.round * 31
        });
        fresh.uploadedAt = new Date().toISOString();
        const idx = d.drawings.findIndex((x) => x.id === old.id);
        d.drawings[idx] = fresh;
      }
    })
  );
  persist();
}

export function resetAll() {
  localStorage.removeItem(LS_KEY);
  const fresh = seedDB();
  setDB(fresh);
  setCurrentBatchId(null);
  setCurrentDrawingId(null);
  setSelectedPointId(null);
  setSelectedIssueId(null);
}

export function rectificationList(batchId: string): Issue[] {
  return issuesOf(batchId).filter((i) => i.status !== 'rejected');
}

export function checkRunsOf(batchId: string): CheckRun[] {
  return db.checkRuns.filter((r) => r.batchId === batchId);
}
