import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  shelfLoadConflicts, spacingConflicts, dailyUvDose, angleFactor,
  accumulatedUv, uvAdvice, loanOverdueDays, MIN_GAP_MM
} from '../src/lib/rules.js';
import { figureHeightMm, addDays, todayStr } from '../src/lib/utils.js';

const shelves = [{ id: 's1', name: '中层', yMm: 300, maxLoadG: 2000 }];
const figures = [
  { id: 'f1', name: 'A', weightG: 1200, widthMm: 100 },
  { id: 'f2', name: 'B', weightG: 900, widthMm: 100 },
  { id: 'f3', name: 'C', weightG: 300, widthMm: 80 }
];

test('层板总重超过承重上限时产生承重冲突', () => {
  const placements = [
    { id: 'p1', figureId: 'f1', shelfId: 's1', xMm: 0, widthMm: 100 },
    { id: 'p2', figureId: 'f2', shelfId: 's1', xMm: 300, widthMm: 100 }
  ];
  const c = shelfLoadConflicts(placements, figures, shelves);
  assert.equal(c.length, 1);
  assert.equal(c[0].totalG, 2100);
  assert.deepEqual(c[0].figureIds.sort(), ['f1', 'f2']);
});

test('承重未超限不产生冲突', () => {
  const placements = [{ id: 'p3', figureId: 'f3', shelfId: 's1', xMm: 0, widthMm: 80 }];
  assert.equal(shelfLoadConflicts(placements, figures, shelves).length, 0);
});

test('相邻间距小于30mm标出冲突的两件', () => {
  const placements = [
    { id: 'p1', figureId: 'f1', shelfId: 's1', xMm: 0, widthMm: 100 },
    { id: 'p2', figureId: 'f2', shelfId: 's1', xMm: 120, widthMm: 100 } // 间距 20mm
  ];
  const c = spacingConflicts(placements);
  assert.equal(c.length, 1);
  assert.equal(c[0].gapMm, 20);
  assert.deepEqual(c[0].figureIds, ['f1', 'f2']);
});

test('间距等于30mm不冲突，不同层板互不判定', () => {
  const placements = [
    { id: 'p1', figureId: 'f1', shelfId: 's1', xMm: 0, widthMm: 100 },
    { id: 'p2', figureId: 'f2', shelfId: 's1', xMm: 130, widthMm: 100 }, // 恰好 30
    { id: 'p3', figureId: 'f3', shelfId: 's9', xMm: 50, widthMm: 80 }
  ];
  assert.equal(spacingConflicts(placements).length, 0);
  assert.equal(MIN_GAP_MM, 30);
});

test('1:7 比例换算高度，实物高度优先', () => {
  assert.equal(figureHeightMm({ scale: '1/7', canonicalHeightMm: 1610 }), 230);
  assert.equal(figureHeightMm({ scale: '1/7', canonicalHeightMm: 1580, actualHeightMm: 240 }), 240);
});

test('紫外线日剂量与角度系数', () => {
  assert.equal(angleFactor(0), 1);
  assert.ok(angleFactor(60) < 0.55 && angleFactor(60) > 0.45);
  const dose = dailyUvDose({ hoursPerDay: 10, angleDeg: 0, intensity: 18 });
  assert.equal(dose, 180);
});

test('累计紫外线按陈列天数计算并在超阈值时给出换位建议', () => {
  const placement = { figureId: 'f1', placedOn: addDays(todayStr(), -10) };
  const light = { hoursPerDay: 10, angleDeg: 0, intensity: 18 };
  assert.equal(accumulatedUv(placement, light), 1800);
  const fig = { id: 'f1', name: '树脂件', material: '树脂' };
  const advice = uvAdvice(placement, light, fig, 1000);
  assert.ok(advice);
  assert.match(advice.advice, /换位/);
  assert.equal(uvAdvice(placement, light, fig, 5000), null);
});

test('借展超期3天宽限：第3天不标黄，第4天标黄', () => {
  const base = { stage: '在展', loanNo: 'X' };
  const within = { ...base, dueReturnDate: addDays(todayStr(), -3) };
  const over = { ...base, dueReturnDate: addDays(todayStr(), -4) };
  assert.equal(loanOverdueDays(within), 0);
  assert.equal(loanOverdueDays(over), 4);
  assert.equal(loanOverdueDays({ ...base, stage: '已归还', dueReturnDate: addDays(todayStr(), -30) }), 0);
});
