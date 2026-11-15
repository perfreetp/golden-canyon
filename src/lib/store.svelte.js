// 全局状态库：Svelte 5 runes + localStorage 持久化
import { addDays, daysSince, figureHeightMm, todayStr, uid } from './utils.js';
import {
  MAINT_CYCLE_DAYS,
  accumulatedUv,
  dailyUvDose,
  isLoanYellow,
  isMaintenanceOverdue,
  loanOverdueDays,
  uvAdvice
} from './rules.js';

const STORAGE_KEY = 'fca-store-v1';

// 材质默认紫外线耐受阈值 (mJ/cm²)
export const MATERIAL_UV_DEFAULTS = {
  PVC: 1200,
  ABS: 1000,
  树脂: 900,
  GK白模: 800,
  金属: 3000,
  布料: 600,
  混合材质: 1000
};

export const MATERIALS = Object.keys(MATERIAL_UV_DEFAULTS);

function freshState() {
  return {
    figures: [],
    cabinets: [],
    placements: [],
    lights: [],
    loans: [],
    maintenance: [],
    damages: [],
    notifications: [],
    settings: { materialUvLimits: { ...MATERIAL_UV_DEFAULTS } }
  };
}

let state = freshState();
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) state = { ...freshState(), ...JSON.parse(raw) };
} catch (e) {
  console.warn('读取本地档案失败，使用空库', e);
}

// 顶层 rune 状态
export const figures = $state(state.figures);
export const cabinets = $state(state.cabinets);
export const placements = $state(state.placements);
export const lights = $state(state.lights);
export const loans = $state(state.loans);
export const maintenance = $state(state.maintenance);
export const damages = $state(state.damages);
export const notifications = $state(state.notifications);
export const settings = $state(state.settings);

function persist() {
  const snapshot = {
    figures, cabinets, placements, lights, loans, maintenance, damages, notifications, settings
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (e) {
    console.error('档案写入失败（可能存储空间不足）', e);
    pushNotification({
      level: 'error',
      title: '本地存储写入失败',
      body: '照片可能过大，请清理部分留档照片后重试。'
    });
  }
}

// ---------------- 通知中心 ----------------
export function pushNotification(n) {
  notifications.unshift({
    id: uid('n-'),
    date: todayStr(),
    read: false,
    level: n.level || 'warn',
    ...n
  });
  if (notifications.length > 200) notifications.length = 200;
  persist();
}

export function markAllRead() {
  notifications.forEach(n => (n.read = true));
  persist();
}

export function clearNotifications() {
  notifications.length = 0;
  persist();
}

// ---------------- 藏品档案 ----------------
export function saveFigure(input) {
  const data = {
    name: input.name?.trim(),
    series: input.series?.trim() || '',
    scale: input.scale || '1/7',
    canonicalHeightMm: Number(input.canonicalHeightMm) || null,
    actualHeightMm: Number(input.actualHeightMm) || null,
    material: input.material || 'PVC',
    weightG: Number(input.weightG) || 0,
    widthMm: Number(input.widthMm) || 60,
    depthMm: Number(input.depthMm) || 60,
    acquiredDate: input.acquiredDate || todayStr(),
    priceCny: Number(input.priceCny) || 0,
    boxLocation: input.boxLocation?.trim() || '',
    photo: input.photo || '',
    defects: input.defects || [],
    lastMaintenanceDate: input.lastMaintenanceDate || input.acquiredDate || todayStr(),
    uvLimitMj: Number(input.uvLimitMj) || settings.materialUvLimits[input.material] || 1000
  };
  let id = input.id;
  if (id) {
    const i = figures.findIndex(f => f.id === id);
    if (i >= 0) figures[i] = { ...figures[i], ...data };
  } else {
    id = uid('fig-');
    figures.push({ id, createdAt: todayStr(), ...data });
    ensureMaintenance(id);
  }
  persist();
  return id;
}

export function deleteFigure(id) {
  const i = figures.findIndex(f => f.id === id);
  if (i >= 0) figures.splice(i, 1);
  for (let j = placements.length - 1; j >= 0; j--) {
    if (placements[j].figureId === id) placements.splice(j, 1);
  }
  for (let j = maintenance.length - 1; j >= 0; j--) {
    if (maintenance[j].figureId === id) maintenance.splice(j, 1);
  }
  persist();
}

export function getFigure(id) {
  return figures.find(f => f.id === id);
}

// 藏品状态：借展中 / 在展 / 在库
export function figureStatus(figId) {
  const active = loans.find(l => l.figureIds.includes(figId) && l.stage !== '已归还');
  if (active) return { status: '借展中', loan: active };
  if (placements.some(p => p.figureId === figId)) return { status: '在展' };
  return { status: '在库' };
}

// ---------------- 展柜与层板 ----------------
export function saveCabinet(input) {
  const data = {
    name: input.name?.trim() || '未命名展柜',
    innerWidthMm: Number(input.innerWidthMm) || 800,
    innerHeightMm: Number(input.innerHeightMm) || 900,
    innerTopMm: Number(input.innerTopMm) || 0,
    shelves: (input.shelves || []).map(s => ({
      id: s.id || uid('sh-'),
      name: s.name || '层板',
      yMm: Number(s.yMm) || 0,
      maxLoadG: Number(s.maxLoadG) || 2000
    }))
  };
  if (input.id) {
    const i = cabinets.findIndex(c => c.id === input.id);
    if (i >= 0) cabinets[i] = { ...cabinets[i], ...data };
  } else {
    cabinets.push({ id: uid('cab-'), ...data });
  }
  persist();
}

export function deleteCabinet(id) {
  const i = cabinets.findIndex(c => c.id === id);
  if (i >= 0) cabinets.splice(i, 1);
  for (let j = placements.length - 1; j >= 0; j--) {
    if (placements[j].cabinetId === id) placements.splice(j, 1);
  }
  for (let j = lights.length - 1; j >= 0; j--) {
    if (lights[j].cabinetId === id) lights.splice(j, 1);
  }
  persist();
}

// ---------------- 陈列摆位 ----------------
export function placeFigure({ figureId, cabinetId, shelfId, xMm }) {
  const fig = getFigure(figureId);
  if (!fig) return;
  const existing = placements.find(p => p.figureId === figureId);
  const h = figureHeightMm(fig) || 180;
  if (existing) {
    existing.cabinetId = cabinetId;
    existing.shelfId = shelfId;
    existing.xMm = Math.round(xMm);
    existing.widthMm = fig.widthMm;
    existing.heightMm = h;
  } else {
    placements.push({
      id: uid('pl-'),
      figureId,
      cabinetId,
      shelfId,
      xMm: Math.round(xMm),
      widthMm: fig.widthMm,
      heightMm: h,
      placedOn: todayStr()
    });
  }
  persist();
}

export function updatePlacement(id, patch) {
  const p = placements.find(x => x.id === id);
  if (p) Object.assign(p, patch);
  persist();
}

export function removePlacement(id) {
  const i = placements.findIndex(p => p.id === id);
  if (i >= 0) placements.splice(i, 1);
  persist();
}

// ---------------- 灯光与紫外线 ----------------
export function saveLight(input) {
  const data = {
    cabinetId: input.cabinetId,
    name: input.name?.trim() || '射灯',
    angleDeg: Number(input.angleDeg) || 0,
    hoursPerDay: Number(input.hoursPerDay) || 0,
    intensity: Number(input.intensity) || 0
  };
  if (input.id) {
    const i = lights.findIndex(l => l.id === input.id);
    if (i >= 0) lights[i] = { ...lights[i], ...data };
  } else {
    lights.push({ id: uid('lt-'), ...data });
  }
  persist();
}

export function deleteLight(id) {
  const i = lights.findIndex(l => l.id === id);
  if (i >= 0) lights.splice(i, 1);
  persist();
}

// 某展柜下所有灯的合计日剂量
export function cabinetDailyUv(cabinetId) {
  return lights.filter(l => l.cabinetId === cabinetId).reduce((s, l) => s + dailyUvDose(l), 0);
}

// 全量紫外线评估：返回每条在展藏品的累计与建议
export function uvReport() {
  const rows = [];
  for (const p of placements) {
    const fig = getFigure(p.figureId);
    const cabLights = lights.filter(l => l.cabinetId === p.cabinetId);
    if (!fig || !cabLights.length) continue;
    const daily = cabLights.reduce((s, l) => s + dailyUvDose(l), 0);
    const days = Math.max(1, daysSince(p.placedOn) ?? 1);
    const accumulated = Math.round(daily * days * 100) / 100;
    const limit = fig.uvLimitMj;
    rows.push({
      placement: p,
      figure: fig,
      daily: Math.round(daily * 100) / 100,
      days,
      accumulated,
      limit,
      over: accumulated > limit,
      advice: uvAdvice(p, { hoursPerDay: daily, angleDeg: 0, intensity: 1 }, fig, limit)
    });
  }
  return rows;
}

// ---------------- 养护（90 天周期）----------------
export function ensureMaintenance(figureId) {
  const fig = getFigure(figureId);
  if (!fig || maintenance.some(t => t.figureId === figureId)) return;
  const base = fig.lastMaintenanceDate || fig.acquiredDate || todayStr();
  maintenance.push({ id: uid('mt-'), figureId, kind: '除尘', dueDate: addDays(base, MAINT_CYCLE_DAYS), done: false });
  maintenance.push({ id: uid('mt-'), figureId, kind: '清洁', dueDate: addDays(base, MAINT_CYCLE_DAYS + 14), done: false });
  persist();
}

export function completeMaintenance(taskId) {
  const t = maintenance.find(x => x.id === taskId);
  if (!t || t.done) return;
  t.done = true;
  t.doneDate = todayStr();
  const fig = getFigure(t.figureId);
  if (fig) fig.lastMaintenanceDate = todayStr();
  // 生成下一周期任务
  maintenance.push({
    id: uid('mt-'),
    figureId: t.figureId,
    kind: '除尘',
    dueDate: addDays(todayStr(), MAINT_CYCLE_DAYS),
    done: false
  });
  maintenance.push({
    id: uid('mt-'),
    figureId: t.figureId,
    kind: '清洁',
    dueDate: addDays(todayStr(), MAINT_CYCLE_DAYS + 14),
    done: false
  });
  persist();
}

export function maintenanceOverdueList() {
  return maintenance.filter(isMaintenanceOverdue);
}

// ---------------- 借展单据流转 ----------------
export function createLoan(input) {
  const id = uid('ln-');
  loans.push({
    id,
    loanNo: input.loanNo || `JZ-${todayStr().replace(/-/g, '')}-${loans.length + 1}`,
    borrower: input.borrower?.trim() || '',
    org: input.org?.trim() || '',
    contact: input.contact?.trim() || '',
    figureIds: input.figureIds || [],
    startDate: input.startDate || todayStr(),
    dueReturnDate: input.dueReturnDate || addDays(todayStr(), 30),
    actualOutDate: null,
    actualReturnDate: null,
    stage: '待出库',
    handler: input.handler?.trim() || '',
    notes: input.notes?.trim() || '',
    damageRecordIds: []
  });
  persist();
  pushNotification({ level: 'info', title: '新借展单据', body: `单据 ${input.loanNo || ''} 已创建，状态：待出库`, refId: id });
  return id;
}

const STAGE_FLOW = { 待出库: '在展', 在展: '归还验收中', 归还验收中: '已归还' };

export function advanceLoan(id) {
  const loan = loans.find(l => l.id === id);
  if (!loan || !STAGE_FLOW[loan.stage]) return;
  const next = STAGE_FLOW[loan.stage];
  loan.stage = next;
  if (next === '在展') loan.actualOutDate = todayStr();
  if (next === '已归还') loan.actualReturnDate = todayStr();
  persist();
  pushNotification({ level: 'info', title: '借展状态流转', body: `单据 ${loan.loanNo} → ${next}`, refId: id });
}

export function revertLoan(id) {
  const loan = loans.find(l => l.id === id);
  if (!loan) return;
  const back = { 在展: '待出库', 归还验收中: '在展', 已归还: '归还验收中' };
  if (back[loan.stage]) loan.stage = back[loan.stage];
  persist();
}

// 超期扫描：超 3 天标黄并推送（每条单据只推一次）
export function scanOverdueLoans() {
  for (const loan of loans) {
    if (loan.stage === '已归还') continue;
    const days = loanOverdueDays(loan);
    const flag = `overdue-pushed:${loan.id}`;
    if (days > 0 && !notifications.some(n => n.refId === loan.id && n.tag === flag)) {
      loan.yellow = true;
      pushNotification({
        level: 'warn',
        title: '借展超期预警',
        body: `单据 ${loan.loanNo} 已超期 ${days} 天（宽限 3 天），借展方：${loan.org || loan.borrower}`,
        refId: loan.id,
        tag: flag
      });
    } else if (days > 0) {
      loan.yellow = true;
    } else {
      loan.yellow = false;
    }
  }
  persist();
}

export { isLoanYellow, loanOverdueDays };

// ---------------- 损伤登记（图上点选 + 拍照留档）----------------
export const BODY_PARTS = ['头部', '面部', '躯干', '左臂', '右臂', '左腿', '右腿', '底座', '武器/配件', '涂装面', '包装盒'];

export function saveDamage(input) {
  const id = uid('dm-');
  damages.push({
    id,
    figureId: input.figureId,
    loanId: input.loanId || null,
    date: input.date || todayStr(),
    desc: input.desc?.trim() || '',
    handler: input.handler?.trim() || '',
    spots: input.spots || [], // {x:0~1, y:0~1, part, note}
    photos: input.photos || [] // dataURL[]
  });
  const fig = getFigure(input.figureId);
  if (fig) {
    for (const s of input.spots || []) {
      fig.defects.push({ id: uid('df-'), part: s.part, desc: s.note || '借展损伤登记', level: '待评估', date: todayStr() });
    }
  }
  if (input.loanId) {
    const loan = loans.find(l => l.id === input.loanId);
    if (loan) loan.damageRecordIds.push(id);
  }
  persist();
  pushNotification({
    level: 'error',
    title: '损伤登记',
    body: `藏品「${fig?.name || ''}」登记 ${input.spots?.length || 0} 处损伤并留存照片`,
    refId: input.figureId
  });
  return id;
}

// ---------------- 重置 / 演示数据 ----------------
export function resetAll() {
  figures.length = 0;
  cabinets.length = 0;
  placements.length = 0;
  lights.length = 0;
  loans.length = 0;
  maintenance.length = 0;
  damages.length = 0;
  notifications.length = 0;
  Object.assign(settings, { materialUvLimits: { ...MATERIAL_UV_DEFAULTS } });
  persist();
}

export function exportJson() {
  return JSON.stringify({ figures, cabinets, placements, lights, loans, maintenance, damages, settings }, null, 2);
}

export function importJson(json) {
  const data = JSON.parse(json);
  resetAll();
  figures.push(...(data.figures || []));
  cabinets.push(...(data.cabinets || []));
  placements.push(...(data.placements || []));
  lights.push(...(data.lights || []));
  loans.push(...(data.loans || []));
  maintenance.push(...(data.maintenance || []));
  damages.push(...(data.damages || []));
  if (data.settings) Object.assign(settings, data.settings);
  persist();
}
