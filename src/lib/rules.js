// 陈列与养护规则引擎（纯函数，便于测试）
import { addDays, daysSince, daysUntil, figureHeightMm, parseDate } from './utils.js';

export const MIN_GAP_MM = 30; // 相邻间距下限
export const MAINT_CYCLE_DAYS = 90; // 养护周期
export const OVERDUE_GRACE_DAYS = 3; // 归还超期宽限天数

// ---------- 层板承重 ----------
// 同一层板上所有陈列件重量之和超过层板承重上限 → 冲突
export function shelfLoadConflicts(placements, figures, shelves) {
  const byShelf = new Map();
  for (const p of placements) {
    if (!byShelf.has(p.shelfId)) byShelf.set(p.shelfId, []);
    byShelf.get(p.shelfId).push(p);
  }
  const conflicts = [];
  for (const [shelfId, list] of byShelf) {
    const shelf = shelves.find(s => s.id === shelfId);
    if (!shelf || !shelf.maxLoadG) continue;
    const total = list.reduce((sum, p) => {
      const f = figures.find(x => x.id === p.figureId);
      return sum + (f?.weightG || 0);
    }, 0);
    if (total > shelf.maxLoadG) {
      conflicts.push({
        type: 'load',
        shelfId,
        totalG: total,
        limitG: shelf.maxLoadG,
        placementIds: list.map(p => p.id),
        figureIds: list.map(p => p.figureId),
        message: `层板「${shelf.name}」承重 ${shelf.maxLoadG}g 已超限：当前合计 ${total}g`
      });
    }
  }
  return conflicts;
}

// ---------- 相邻间距 ----------
// 同一层板内，按 x 排序，两件水平外轮廓间距 < 30mm → 冲突，标出这两件
export function spacingConflicts(placements) {
  const byShelf = new Map();
  for (const p of placements) {
    if (!byShelf.has(p.shelfId)) byShelf.set(p.shelfId, []);
    byShelf.get(p.shelfId).push(p);
  }
  const conflicts = [];
  for (const [shelfId, list] of byShelf) {
    const sorted = [...list].sort((a, b) => a.xMm - b.xMm);
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      const gap = b.xMm - (a.xMm + a.widthMm);
      if (gap < MIN_GAP_MM) {
        conflicts.push({
          type: 'spacing',
          shelfId,
          gapMm: Math.max(0, Math.round(gap * 10) / 10),
          placementIds: [a.id, b.id],
          figureIds: [a.figureId, b.figureId],
          message: `两件间距仅 ${Math.max(0, Math.round(gap))}mm，低于 ${MIN_GAP_MM}mm 下限`
        });
      }
    }
  }
  return conflicts;
}

export function allDisplayConflicts(placements, figures, shelves) {
  return [...shelfLoadConflicts(placements, figures, shelves), ...spacingConflicts(placements)];
}

export function conflictFigureSet(conflicts) {
  return new Set(conflicts.flatMap(c => c.figureIds));
}

// ---------- 紫外线累计 ----------
// 每日紫外线剂量(mJ/cm²) = 照射时长 h × 角度系数 × 强度系数
// 角度系数：入射角越大衰减越强，cos 近似
export function angleFactor(angleDeg) {
  return Math.max(0.15, Math.cos((angleDeg * Math.PI) / 180));
}

export function dailyUvDose({ hoursPerDay, angleDeg, intensity }) {
  const h = Number(hoursPerDay) || 0;
  const a = angleFactor(Number(angleDeg) || 0);
  const i = Number(intensity) || 0;
  return Math.round(h * a * i * 100) / 100;
}

// 累计剂量 = 日剂量 × 已照射天数（从陈列日起算，至少 1 天）
export function accumulatedUv(placement, light) {
  if (!placement || !light) return 0;
  const days = Math.max(1, daysSince(placement.placedOn) ?? 1);
  return Math.round(dailyUvDose(light) * days * 100) / 100;
}

// 超过藏品材质耐受阈值 → 换位建议
export function uvAdvice(placement, light, fig, materialLimit) {
  const acc = accumulatedUv(placement, light);
  const limit = materialLimit ?? fig?.uvLimitMj;
  if (!limit) return null;
  if (acc > limit) {
    return {
      figureId: fig?.id,
      accumulated: acc,
      limit,
      advice: `紫外线累计 ${acc}mJ/cm² 已超过「${fig?.material || '该材质'}」耐受值 ${limit}mJ/cm²，建议换位至背光层或降低每日照射时长`
    };
  }
  return null;
}

// ---------- 养护计划（90 天周期）----------
export function maintenanceSchedule(fig, today = new Date()) {
  const base = fig.lastMaintenanceDate || fig.acquiredDate;
  if (!base) return [];
  const tasks = [];
  // 生成从基准日起、覆盖未来两个周期的除尘/清洁任务
  let due = addDays(base, MAINT_CYCLE_DAYS);
  for (let i = 0; i < 3; i++) {
    tasks.push({ id: `${fig.id}-dust-${i}`, figureId: fig.id, kind: '除尘', dueDate: due, done: false });
    tasks.push({ id: `${fig.id}-clean-${i}`, figureId: fig.id, kind: '清洁', dueDate: addDays(due, 14), done: false });
    due = addDays(due, MAINT_CYCLE_DAYS);
  }
  return tasks;
}

export function isMaintenanceOverdue(task) {
  return !task.done && daysSince(task.dueDate) >= 0;
}

// ---------- 借展流转 ----------
export const LOAN_STAGES = ['待出库', '在展', '归还验收中', '已归还'];

export function loanStage(stage) {
  return LOAN_STAGES.includes(stage) ? stage : '待出库';
}

// 归还超期 3 天自动标黄
export function loanOverdueDays(loan) {
  if (loan.stage === '已归还') return 0;
  if (!loan.dueReturnDate) return 0;
  const d = daysSince(loan.dueReturnDate);
  return d > OVERDUE_GRACE_DAYS ? d : 0;
}

export function isLoanYellow(loan) {
  return loanOverdueDays(loan) > 0;
}

export function loanReturnDueSoon(loan) {
  if (loan.stage === '已归还') return false;
  const d = daysUntil(loan.dueReturnDate);
  return d !== null && d <= OVERDUE_GRACE_DAYS;
}

// ---------- 展柜几何 ----------
export function shelfTopYMm(shelf, cabinet) {
  // SVG y 向下；层板顶面 y = 柜体顶部边距 + 层板序位
  return cabinet.innerTopMm + shelf.index * (shelf.spacingMm || 0);
}

export { figureHeightMm, parseDate };
