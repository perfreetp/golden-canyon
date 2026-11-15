import { createStore, produce } from 'solid-js/store';
import type {
  AppState, Batch, BatchStatus, DefectItem, Machine, MoldOrder,
  Part, ShotLog, Style, TrialRecord, Customer, Role,
} from './types';
import { uid, today, nowTime } from './lib/utils';

const STORAGE_KEY = 'mold-tracking-v1';
export const MOLD_LIFE_DEFAULT = 300000;
const LIFE_WARN_RATIO = 0.1;

// ---------- 演示数据里的占位缺陷照片（canvas 生成，避免外链） ----------
function placeholderPhoto(label: string, color: string): string {
  const c = document.createElement('canvas');
  c.width = 360; c.height = 240;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#2b2f36';
  ctx.fillRect(0, 0, 360, 240);
  ctx.fillStyle = color;
  ctx.fillRect(28, 28, 304, 160);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.fillRect(28, 150, 304, 38);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(label, 42, 176);
  ctx.font = '13px sans-serif';
  ctx.fillText('试模缺陷留样（演示数据）', 42, 216);
  return c.toDataURL('image/jpeg', 0.7);
}

function seed(): AppState {
  const customers: Customer[] = [
    { id: 'c1', name: '星辉潮玩', account: 'xh' },
    { id: 'c2', name: '次元造物', account: 'cy' },
  ];
  const styles: Style[] = [
    { id: 's1', code: 'XH-2026-018', name: '机甲少女·零式', customerId: 'c1' },
    { id: 's2', code: 'XH-2026-021', name: '森林精灵盲盒', customerId: 'c1' },
    { id: 's3', code: 'CY-2026-007', name: '巨兽哥莫拉', customerId: 'c2' },
  ];
  const parts: Part[] = [
    { id: 'p1', styleId: 's1', name: '头部前壳', color: '#f2d7b6', shape: 'sphere', pos: [0, 2.15, 0.18], rot: [0, 0, 0], scale: [0.62, 0.55, 0.5], status: 'mold_ready', repairCount: 1, moldId: 'o1' },
    { id: 'p2', styleId: 's1', name: '头部后壳', color: '#e8c8a5', shape: 'sphere', pos: [0, 2.15, -0.22], rot: [0, Math.PI, 0], scale: [0.6, 0.53, 0.45], status: 'mold_ready', repairCount: 0, moldId: 'o2' },
    { id: 'p3', styleId: 's1', name: '躯干主壳', color: '#d94f4f', shape: 'box', pos: [0, 1.15, 0], rot: [0, 0, 0], scale: [1.05, 1.25, 0.62], status: 'trial_pending', repairCount: 2, moldId: 'o3' },
    { id: 'p4', styleId: 's1', name: '左臂护甲', color: '#3d6fb4', shape: 'capsule', pos: [-0.95, 1.2, 0], rot: [0, 0, 0.25], scale: [0.28, 0.85, 0.28], status: 'repairing', repairCount: 3, moldId: 'o4' },
    { id: 'p5', styleId: 's1', name: '右臂护甲', color: '#3d6fb4', shape: 'capsule', pos: [0.95, 1.2, 0], rot: [0, 0, -0.25], scale: [0.28, 0.85, 0.28], status: 'mold_ready', repairCount: 0, moldId: 'o5' },
    { id: 'p6', styleId: 's1', name: '左腿件', color: '#5a5f6e', shape: 'cylinder', pos: [-0.38, 0, 0], rot: [0, 0, 0], scale: [0.32, 0.95, 0.32], status: 'mold_ready', repairCount: 1, moldId: 'o6' },
    { id: 'p7', styleId: 's1', name: '右腿件', color: '#5a5f6e', shape: 'cylinder', pos: [0.38, 0, 0], rot: [0, 0, 0], scale: [0.32, 0.95, 0.32], status: 'pending_mold', repairCount: 0 },
    { id: 'p8', styleId: 's1', name: '背包环', color: '#c9a227', shape: 'torus', pos: [0, 1.35, -0.55], rot: [Math.PI / 2, 0, 0], scale: [0.5, 0.5, 0.5], status: 'mold_ready', repairCount: 0, moldId: 'o8' },
    { id: 'p9', styleId: 's2', name: '精灵身体', color: '#7fcf8e', shape: 'sphere', pos: [0, 0.9, 0], rot: [0, 0, 0], scale: [0.7, 0.85, 0.6], status: 'mold_ready', repairCount: 0, moldId: 'o9' },
    { id: 'p10', styleId: 's2', name: '底座', color: '#8a6f4d', shape: 'cylinder', pos: [0, -0.15, 0], rot: [0, 0, 0], scale: [0.9, 0.18, 0.9], status: 'mold_ready', repairCount: 0, moldId: 'o10' },
    { id: 'p11', styleId: 's3', name: '哥莫拉躯干', color: '#4a5d4a', shape: 'box', pos: [0, 1.1, 0], rot: [0, 0, 0], scale: [1.5, 1.1, 0.85], status: 'mold_ready', repairCount: 1, moldId: 'o11' },
    { id: 'p12', styleId: 's3', name: '尾部组件', color: '#3a4d3a', shape: 'capsule', pos: [-1.4, 1.2, -0.3], rot: [0, 0, 1.1], scale: [0.3, 1.1, 0.3], status: 'trial_pending', repairCount: 1, moldId: 'o12' },
  ];
  const mkOrder = (
    id: string, no: string, partId: string, styleId: string, moldNo: string,
    cavities: number, material: string, colorCode: string, lifeUsed: number, remark = '',
  ): MoldOrder => ({
    id, no, partId, styleId, moldNo, cavities, material, colorCode,
    lifeTotal: MOLD_LIFE_DEFAULT, lifeUsed, createdAt: '2026-09-12', remark,
  });
  const orders: MoldOrder[] = [
    mkOrder('o1', 'MO-260901', 'p1', 's1', 'M-A018-01', 4, 'ABS', '#f2d7b6', 86000),
    mkOrder('o2', 'MO-260902', 'p2', 's1', 'M-A018-02', 4, 'ABS', '#e8c8a5', 79200),
    mkOrder('o3', 'MO-260903', 'p3', 's1', 'M-A018-03', 2, 'PC+ABS', '#d94f4f', 12000, '试模缩水，需调浇口'),
    mkOrder('o4', 'MO-260904', 'p4', 's1', 'M-A018-04', 2, 'ABS', '#3d6fb4', 9500, '飞边反复，配合面修模'),
    // 寿命将尽：剩余 6.7%，排产时必须拦截
    mkOrder('o5', 'MO-260905', 'p5', 's1', 'M-A018-05', 2, 'ABS', '#3d6fb4', 280000, '镀层磨损，计划开新模替代'),
    mkOrder('o6', 'MO-260906', 'p6', 's1', 'M-A018-06', 4, 'POM', '#5a5f6e', 134000),
    mkOrder('o8', 'MO-260908', 'p8', 's1', 'M-A018-08', 6, 'ABS', '#c9a227', 45600),
    mkOrder('o9', 'MO-260909', 'p9', 's2', 'M-B021-01', 8, 'PVC', '#7fcf8e', 210000),
    mkOrder('o10', 'MO-260910', 'p10', 's2', 'M-B021-02', 2, 'PP', '#8a6f4d', 168000),
    mkOrder('o11', 'MO-260911', 'p11', 's3', 'M-C007-01', 1, 'ABS', '#4a5d4a', 58000),
    mkOrder('o12', 'MO-260912', 'p12', 's3', 'M-C007-02', 2, 'ABS', '#3a4d3a', 8000),
  ];
  const machines: Machine[] = [
    { id: 'm1', no: 'IM-01', name: '1号注塑机', tonnage: 120 },
    { id: 'm2', no: 'IM-02', name: '2号注塑机', tonnage: 160 },
    { id: 'm3', no: 'IM-03', name: '3号注塑机', tonnage: 200 },
    { id: 'm4', no: 'IM-04', name: '4号注塑机', tonnage: 260 },
    { id: 'm5', no: 'IM-05', name: '5号注塑机', tonnage: 380 },
    { id: 'm6', no: 'IM-06', name: '6号注塑机', tonnage: 500 },
  ];
  const d = today();
  const batches: Batch[] = [
    { id: 'b1', no: 'BN-261101', orderId: 'o1', partId: 'p1', styleId: 's1', machineId: 'm1', qty: 20000, goodQty: 18400, defectQty: 320, status: 'injecting', createdAt: '2026-11-10', scheduledAt: d, dueDate: '2026-11-18' },
    { id: 'b2', no: 'BN-261102', orderId: 'o2', partId: 'p2', styleId: 's1', machineId: 'm2', qty: 16000, goodQty: 15600, defectQty: 180, status: 'pending_inspect', createdAt: '2026-11-08', scheduledAt: '2026-11-11', dueDate: '2026-11-14' },
    { id: 'b3', no: 'BN-261103', orderId: 'o9', partId: 'p9', styleId: 's2', machineId: 'm3', qty: 40000, goodQty: 39200, defectQty: 410, status: 'released', createdAt: '2026-11-01', scheduledAt: '2026-11-03', dueDate: '2026-11-10', inspectionNote: '抽检 AQL 2.5，合格放行' },
    { id: 'b4', no: 'BN-261104', orderId: 'o11', partId: 'p11', styleId: 's3', qty: 5000, goodQty: 0, defectQty: 0, status: 'pending_schedule', createdAt: '2026-11-12', dueDate: '2026-11-10' },
    { id: 'b5', no: 'BN-261105', orderId: 'o5', partId: 'p5', styleId: 's1', qty: 8000, goodQty: 0, defectQty: 0, status: 'pending_schedule', createdAt: '2026-11-13', dueDate: '2026-11-20' },
    { id: 'b6', no: 'BN-261106', orderId: 'o6', partId: 'p6', styleId: 's1', machineId: 'm4', qty: 12000, goodQty: 9800, defectQty: 760, status: 'rework', createdAt: '2026-11-06', scheduledAt: '2026-11-09', dueDate: '2026-11-13', inspectionNote: '顶白超标，返工挑拣后复检' },
  ];
  const shotLogs: ShotLog[] = [
    { id: 'sl1', date: d, machineId: 'm1', batchId: 'b1', shots: 1200, pieces: 4800, defect: 96, time: '08:30' },
    { id: 'sl2', date: d, machineId: 'm1', batchId: 'b1', shots: 1450, pieces: 5800, defect: 87, time: '11:20' },
    { id: 'sl3', date: d, machineId: 'm2', batchId: 'b2', shots: 900, pieces: 3600, defect: 40, time: '09:05' },
    { id: 'sl4', date: d, machineId: 'm4', batchId: 'b6', shots: 1100, pieces: 4400, defect: 310, time: '10:15' },
    { id: 'sl5', date: d, machineId: 'm3', batchId: 'b3', shots: 600, pieces: 4800, defect: 22, time: '07:50' },
  ];
  const trials: TrialRecord[] = [
    {
      id: 't1', partId: 'p1', round: 1, date: '2026-09-20', passed: false, operator: '周工艺',
      defects: [{ partId: 'p1', type: '缩水', desc: '头顶正面靠近浇口处缩痕明显', photo: placeholderPhoto('头部前壳·缩水', '#b88f6a') }],
      repairPlan: '浇口截面加大 0.3mm，保压压力上调 15bar，模温降低 5℃。',
    },
    {
      id: 't2', partId: 'p1', round: 2, date: '2026-09-25', passed: true, operator: '周工艺',
      defects: [{ partId: 'p1', type: '飞边', desc: '分型面轻微飞边，已在公差边缘', photo: placeholderPhoto('头部前壳·飞边', '#c9a381') }],
    },
    {
      id: 't3', partId: 'p4', round: 1, date: '2026-10-02', passed: false, operator: '李工艺',
      defects: [
        { partId: 'p4', type: '飞边', desc: '护甲配合面周圈飞边 0.2mm', photo: placeholderPhoto('左臂护甲·飞边', '#6f8fc4') },
        { partId: 'p4', type: '顶白', desc: '顶针位顶白，脱模阻力偏大', photo: placeholderPhoto('左臂护甲·顶白', '#8aa6cf') },
      ],
      repairPlan: '配合面减胶 0.05mm，顶针区域加大脱模斜度至 1.5°，抛光型腔。',
    },
  ];
  return {
    role: 'engineer', currentCustomerId: null,
    customers, styles, parts, orders, trials, batches, machines, shotLogs,
  };
}

// ---------- store 初始化 ----------
function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch { /* 损坏则重建 */ }
  return seed();
}

const [state, setState] = createStore<AppState>(load());

// 持久化（异步微任务，避免写入抖动）
let saveTimer: ReturnType<typeof setTimeout> | undefined;
import { createEffect } from 'solid-js';
createEffect(() => {
  JSON.stringify(state);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch { alert('本地存储已满，请导出数据后清理旧缺陷照片'); }
  }, 200);
});

// ---------- 派生查询 ----------
export const store = state;

export function orderOfPart(partId: string): MoldOrder | undefined {
  return state.orders.find((o) => o.partId === partId);
}
export function partById(id: string): Part | undefined {
  return state.parts.find((p) => p.id === id);
}
export function styleById(id: string): Style | undefined {
  return state.styles.find((s) => s.id === id);
}
export function moldRemaining(o: MoldOrder): number {
  return Math.max(0, o.lifeTotal - o.lifeUsed);
}
export function moldRemainingPct(o: MoldOrder): number {
  return moldRemaining(o) / o.lifeTotal;
}
/** 剩余寿命不足 10%：排产拦截 */
export function isMoldBlocked(o: MoldOrder): boolean {
  return moldRemainingPct(o) < LIFE_WARN_RATIO;
}
export function trialsOfPart(partId: string): TrialRecord[] {
  return state.trials.filter((t) => t.partId === partId).sort((a, b) => a.round - b.round);
}
export function batchDefectRate(b: Batch): number {
  const total = b.goodQty + b.defectQty;
  return total ? b.defectQty / total : 0;
}

// ---------- 身份切换 ----------
export function switchRole(role: Role, customerId: string | null = null) {
  setState({ role, currentCustomerId: role === 'customer' ? customerId : null });
}
export function resetDemo() {
  if (!confirm('确定恢复全套演示数据？当前录入内容将被清空。')) return;
  setState(seed());
}

// ---------- 开模单 ----------
export function createMoldOrder(form: {
  partId: string; moldNo: string; cavities: number; material: string;
  colorCode: string; lifeTotal?: number; remark: string;
}): { ok: boolean; msg?: string } {
  const part = partById(form.partId);
  if (!part) return { ok: false, msg: '分件不存在' };
  if (state.orders.some((o) => o.moldNo === form.moldNo.trim()))
    return { ok: false, msg: '模号已存在，模号必须唯一' };
  const order: MoldOrder = {
    id: uid('o'),
    no: `MO-${today().slice(2).replace(/-/g, '')}-${String(state.orders.length + 1).padStart(2, '0')}`,
    partId: form.partId, styleId: part.styleId,
    moldNo: form.moldNo.trim(), cavities: form.cavities,
    material: form.material, colorCode: form.colorCode,
    lifeTotal: form.lifeTotal || MOLD_LIFE_DEFAULT, lifeUsed: 0,
    createdAt: today(), remark: form.remark,
  };
  setState(produce((s: AppState) => {
    s.orders.push(order);
    const p = s.parts.find((x) => x.id === form.partId)!;
    p.moldId = order.id; p.orderId = order.id; p.status = 'trial_pending';
  }));
  return { ok: true };
}

// ---------- 试模 ----------
export function submitTrial(partId: string, form: {
  passed: boolean; defects: DefectItem[]; repairPlan?: string; operator: string;
}): { ok: boolean; msg?: string } {
  if (!form.defects.length) return { ok: false, msg: '至少登记一条缺陷记录' };
  if (form.defects.some((d) => !d.photo)) return { ok: false, msg: '每条缺陷都必须上传缺陷照片，否则不能提交' };
  if (!form.passed && !form.repairPlan?.trim()) return { ok: false, msg: '试模不通过必须填写修模方案' };
  const round = trialsOfPart(partId).length + 1;
  const rec: TrialRecord = {
    id: uid('t'), partId, round, date: today(),
    passed: form.passed, defects: form.defects,
    repairPlan: form.passed ? undefined : form.repairPlan, operator: form.operator,
  };
  setState(produce((s: AppState) => {
    s.trials.push(rec);
    const p = s.parts.find((x) => x.id === partId)!;
    if (form.passed) {
      p.status = 'mold_ready';
    } else {
      p.status = 'repairing';
      p.repairCount += 1;
    }
  }));
  return { ok: true };
}
/** 修模完成，回到待试模 */
export function finishRepair(partId: string) {
  setState('parts', (p) => p.id === partId, 'status', 'trial_pending' as Part['status']);
}

// ---------- 量产批次 ----------
export function createBatch(form: { orderId: string; qty: number; dueDate: string }): { ok: boolean; msg?: string } {
  const o = state.orders.find((x) => x.id === form.orderId);
  if (!o) return { ok: false, msg: '请选择开模单' };
  const batch: Batch = {
    id: uid('b'),
    no: `BN-${today().slice(2).replace(/-/g, '')}-${String(state.batches.length + 1).padStart(2, '0')}`,
    orderId: o.id, partId: o.partId, styleId: o.styleId,
    qty: form.qty, goodQty: 0, defectQty: 0,
    status: 'pending_schedule', createdAt: today(), dueDate: form.dueDate,
  };
  setState(produce((s: AppState) => { s.batches.push(batch); }));
  return { ok: true };
}

/** 排产：寿命不足 10% 拦截 */
export function scheduleBatch(batchId: string, machineId: string): { ok: boolean; msg?: string } {
  const b = state.batches.find((x) => x.id === batchId);
  if (!b) return { ok: false, msg: '批次不存在' };
  const o = state.orders.find((x) => x.id === b.orderId)!;
  if (isMoldBlocked(o)) {
    return {
      ok: false,
      msg: `模具 ${o.moldNo} 剩余寿命仅 ${(moldRemainingPct(o) * 100).toFixed(1)}%（${moldRemaining(o).toLocaleString()} 模次），低于 10% 红线，已拦截排产，请先开新模。`,
    };
  }
  setState(produce((s: AppState) => {
    const bb = s.batches.find((x) => x.id === batchId)!;
    bb.machineId = machineId; bb.status = 'injecting'; bb.scheduledAt = today();
  }));
  return { ok: true };
}

/** 打模：自动扣减模具寿命，累计良品/不良 */
export function addShot(batchId: string, shots: number, defectPieces: number): { ok: boolean; msg?: string } {
  const b = state.batches.find((x) => x.id === batchId);
  if (!b || b.status !== 'injecting') return { ok: false, msg: '只有注塑中的批次可以登记打模' };
  const o = state.orders.find((x) => x.id === b.orderId)!;
  const pieces = shots * o.cavities;
  if (defectPieces > pieces) return { ok: false, msg: '不良件数不能超过本次出件数' };
  if (shots > moldRemaining(o)) return { ok: false, msg: `打模数超过模具剩余寿命（${moldRemaining(o)} 模次）` };
  setState(produce((s: AppState) => {
    const oo = s.orders.find((x) => x.id === b.orderId)!;
    oo.lifeUsed += shots; // 每打一模扣减一次寿命
    const bb = s.batches.find((x) => x.id === batchId)!;
    bb.goodQty += pieces - defectPieces;
    bb.defectQty += defectPieces;
    s.shotLogs.push({
      id: uid('sl'), date: today(), machineId: bb.machineId!, batchId,
      shots, pieces, defect: defectPieces, time: nowTime(),
    });
  }));
  return { ok: true };
}

export function changeBatchStatus(batchId: string, status: BatchStatus, note?: string) {
  setState(produce((s: AppState) => {
    const b = s.batches.find((x) => x.id === batchId)!;
    b.status = status;
    if (note !== undefined) b.inspectionNote = note;
  }));
}
