// node test-store.js — 数据层与完整业务流程集成测试
global.localStorage = {
  _d: {}, getItem(k) { return this._d[k] || null; },
  setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; }
};
require('../js/geo-scene.js');
require('../js/geo-store.js');
const M = global.GeoScene.math, G = global.GeoStore;

// --- 风险规则边界 ---
const mk = (o) => Object.assign({ slopeDeg: 20, catchArea: 1000, households: 5, soilType: '碎石土', slopeHeight: 20 }, o);
console.log('风险规则:');
[
  ['低坡小汇水', mk({ slopeDeg: 8, catchArea: 300, households: 1, soilType: '坚硬岩' })],
  ['中坡', mk({ slopeDeg: 28, catchArea: 1500, households: 6, soilType: '碎石土' })],
  ['陡坡大汇水', mk({ slopeDeg: 38, catchArea: 6000, households: 25, soilType: '黏性土' })],
  ['极陡坡', mk({ slopeDeg: 46, catchArea: 900, households: 10, soilType: '填土', slopeHeight: 65 })]
].forEach(([name, h]) => {
  const r = G.calcRisk(h);
  console.log(`  ${name}: ${r.score}分 → ${r.level}`);
});

// --- 种子数据（复刻场景播种）---
const rng = M.mulberry32(20261116);
const steepSites = M.findSteepHouseSites(rng, 2);
const houses = steepSites.map(s => ({ x: s.house.x, z: s.house.z }));
for (let i = houses.length; i < 28; i++) houses.push({ x: (i * 37) % 500 - 250, z: (i * 53) % 500 - 250 });

const flow = M.buildFlowGrid();
const evaluateFn = (polygon) => {
  const c = M.centroidOf(polygon);
  const slope = M.slopeAt(c.x, c.z);
  const meanH = polygon.reduce((s, p) => s + M.heightAt(p.x, p.z), 0) / polygon.length;
  const near = [];
  if (slope > 35) houses.forEach((hd, i) => {
    if (M.heightAt(hd.x, hd.z) <= meanH + 1 && M.distToPolygon(hd.x, hd.z, polygon) <= 10) near.push('H' + String(i + 1).padStart(2, '0'));
  });
  return { centroid: c, slope: Math.round(slope * 10) / 10, catchArea: Math.round(M.catchAt(flow, c.x, c.z)),
    area: Math.round(M.polygonArea(polygon)), redFlag: slope > 35 && near.length > 0, nearHouses: near };
};
const seed = G.buildSeed(houses, steepSites, evaluateFn);
console.log('\n种子隐患点:');
seed.hazards.forEach(h => console.log(
  `  ${h.code} ${h.status.padEnd(3)} ${h.type} ${h.township} 坡${h.slopeDeg}° 汇${h.catchArea}m² ${h.riskLevel}(${h.riskScore}) 红旗=${h.redFlag} 户=${h.households} 历史=${h.history.length}条`
));
const red = seed.hazards.filter(h => h.redFlag);
console.log('红色预警点数:', red.length, '(应≥2)');
console.log('状态覆盖:', [...new Set(seed.hazards.map(h => h.status))].join('/'));

// --- Store 完整状态机 ---
const store = new G.Store();
store.reset(seed);
let h1 = store.state.hazards[0];
console.log('\n状态机测试:');
let r1 = store.submitReview(h1.id);
console.log('  红旗点未复核提交:', r1.ok ? '错误!' : '被拦截 ✓ (' + r1.msg + ')');
store.confirmRecheck(h1.id);
r1 = store.submitReview(h1.id);
console.log('  复核后提交:', r1.ok && store.get(h1.id).status === '待审核' ? '成功 ✓' : '错误!');
store.setRole('reviewer');
store.returnHazard(h1.id, '测试退回');
console.log('  审核退回:', store.get(h1.id).status === '已退回' ? '✓' : '错误!');
store.setRole('investigator');
store.resubmit(h1.id, { photos: [G.samplePhoto('补拍坡脚')], evacuationRoute: '沿村道东行至安置点' });
console.log('  补材料重提:', store.get(h1.id).status === '待审核' && store.get(h1.id).photos.length === 1 && store.get(h1.id).evacuationRoute ? '✓' : '错误!');
store.setRole('reviewer');
store.approveHazard(h1.id, 7);
h1 = store.get(h1.id);
console.log('  审核通过派单:', h1.status === '已确认' && h1.patrolCycle === 7 && h1.nextDueAt ? '✓ 下次巡查=' + h1.nextDueAt : '错误!');

// 巡查：正常打卡 + 新增裂缝触发复核
store.setRole('patrol');
const dueBefore = h1.nextDueAt;
store.checkIn(h1.id, { crackStatus: '无变化', signStatus: '完好', newCrack: false, photos: [] });
h1 = store.get(h1.id);
console.log('  正常打卡:', h1.patrols.length === 1 && h1.patrols[0].onTime === true ? '✓ 下次到期更新=' + h1.nextDueAt : '错误!');
store.checkIn(h1.id, { crackStatus: '新增裂缝2m', signStatus: '倾斜', newCrack: true, photos: ['x'], note: '雨后' });
h1 = store.get(h1.id);
console.log('  新增裂缝:', h1.status === '待复核' ? '自动触发复核 ✓' : '错误!');
store.setRole('reviewer');
store.resolveRecheck(h1.id, '现场核查后风险可控，恢复巡查');
console.log('  复核结案:', store.get(h1.id).status === '已确认' ? '✓' : '错误!');
store.closeHazard(h1.id, '治理完工');
console.log('  销号:', store.get(h1.id).status === '已销号' ? '✓' : '错误!');

// --- 看板与台账 ---
const dash = store.dashboard();
console.log('\n看板汇总:');
dash.rows.forEach(r => console.log(`  ${r.township}: 隐患${r.total} 高风险${r.high} 威胁${r.persons}人 逾期${r.overdue}`));
console.log('  合计:', JSON.stringify(dash.totals));
const csv = store.exportCSV();
console.log('\nCSV台账行数:', csv.split('\n').length, '(表头+6条=7)');
console.log('CSV表头:', csv.split('\n')[0].replace(/^﻿/, '').split(',').slice(0, 6).join(','));

// 持久化往返
const raw = localStorage.getItem('geo-hazard-system-v1');
const parsed = JSON.parse(raw);
console.log('\nlocalStorage持久化:', parsed.hazards.length === 6 ? '✓' : '错误!');
console.log('\n全部断言完成');
