// 演示数据：覆盖承重超限、间距冲突、紫外线超标、借展超期、养护逾期等场景
import { addDays, todayStr, uid } from './utils.js';
import {
  cabinets, damages, figures, lights, loans, maintenance, placements,
  saveFigure, saveCabinet, saveLight, placeFigure, pushNotification
} from './store.svelte.js';

export function loadSeedData() {
  const t = todayStr();

  // ---------- 藏品 ----------
  const fDefs = [
    { name: '星野凛奈 制服Ver.', series: '青空学园', scale: '1/7', canonicalHeightMm: 1580, material: 'PVC', weightG: 420, widthMm: 95, depthMm: 90, priceCny: 880, boxLocation: '储藏室A-01-左', acquiredDate: addDays(t, -300) },
    { name: '剑圣 苍岚', series: '神域纪行', scale: '1/7', canonicalHeightMm: 1820, material: 'ABS', weightG: 680, widthMm: 130, depthMm: 110, priceCny: 1280, boxLocation: '储藏室A-01-右', acquiredDate: addDays(t, -260) },
    { name: '机械少女 MK-II', series: '钢魂', scale: '1/6', canonicalHeightMm: 1650, material: 'ABS', weightG: 950, widthMm: 150, depthMm: 130, priceCny: 1680, boxLocation: '储藏室A-02-左', acquiredDate: addDays(t, -200) },
    { name: '花嫁少女 白无垢', series: '四季物语', scale: '1/7', canonicalHeightMm: 1600, material: '树脂', weightG: 520, widthMm: 140, depthMm: 120, priceCny: 1560, boxLocation: '储藏室B-03', acquiredDate: addDays(t, -150) },
    { name: '魔导士 莉诺', series: '幻境编年史', scale: '1/8', canonicalHeightMm: 1550, material: 'PVC', weightG: 350, widthMm: 85, depthMm: 80, priceCny: 720, boxLocation: '储藏室B-04', acquiredDate: addDays(t, -120) },
    { name: '龙裔战士 重装', series: '神域纪行', scale: '1/6', canonicalHeightMm: 1900, material: '混合材质', weightG: 1100, widthMm: 170, depthMm: 150, priceCny: 2180, boxLocation: '储藏室C-01', acquiredDate: addDays(t, -95) },
    { name: '夏日泳装 葵', series: '海岸线', scale: '1/7', canonicalHeightMm: 1620, material: 'PVC', weightG: 300, widthMm: 90, depthMm: 85, priceCny: 640, boxLocation: '储藏室C-02', acquiredDate: addDays(t, -60) },
    { name: 'GK 白模 剑士素体', series: '原型工坊', scale: '1/7', canonicalHeightMm: 1750, material: 'GK白模', weightG: 480, widthMm: 100, depthMm: 95, priceCny: 460, boxLocation: '工作台旁货架', acquiredDate: addDays(t, -20) }
  ];
  const ids = fDefs.map(d => saveFigure({ ...d, defects: d.name.includes('苍岚') ? [{ id: uid('df-'), part: '武器/配件', desc: '剑尖轻微掉漆约2mm', level: '轻微', date: addDays(t, -40) }] : [] }));

  // ---------- 展柜与层板 ----------
  saveCabinet({
    name: '主展柜 A',
    innerWidthMm: 900, innerHeightMm: 1000,
    shelves: [
      { name: '顶层', yMm: 250, maxLoadG: 1500 },
      { name: '中层', yMm: 560, maxLoadG: 2000 },
      { name: '底层', yMm: 870, maxLoadG: 2500 }
    ]
  });
  const cabA = cabinets[0];
  const [shTop, shMid, shBot] = cabA.shelves;

  saveCabinet({
    name: '侧展柜 B',
    innerWidthMm: 700, innerHeightMm: 900,
    shelves: [
      { name: '上层', yMm: 300, maxLoadG: 1200 },
      { name: '下层', yMm: 650, maxLoadG: 1800 }
    ]
  });
  const cabB = cabinets[1];

  // ---------- 灯光 ----------
  saveLight({ cabinetId: cabA.id, name: 'A柜顶射灯带', angleDeg: 25, hoursPerDay: 8, intensity: 2.2 });
  saveLight({ cabinetId: cabA.id, name: 'A柜中层补光', angleDeg: 45, hoursPerDay: 5, intensity: 1.4 });
  saveLight({ cabinetId: cabB.id, name: 'B柜斜射灯', angleDeg: 60, hoursPerDay: 4, intensity: 1.0 });

  // ---------- 陈列摆位（含冲突）----------
  // 中层：机械少女(150宽) 与 龙裔(170宽) 间距不足；且中层总重 950+1100+680=2730 > 2000 承重
  placeFigure({ figureId: ids[2], cabinetId: cabA.id, shelfId: shMid.id, xMm: 20 });
  const plMk = placements.at(-1); plMk.placedOn = addDays(t, -130);
  placeFigure({ figureId: ids[5], cabinetId: cabA.id, shelfId: shMid.id, xMm: 190 }); // 间距 190-(20+150)=20mm < 30
  const plRy = placements.at(-1); plRy.placedOn = addDays(t, -95);
  placeFigure({ figureId: ids[1], cabinetId: cabA.id, shelfId: shMid.id, xMm: 420 });
  placements.at(-1).placedOn = addDays(t, -200);

  // 顶层：花嫁（树脂，UV 耐受低，长期照射 → 超标预警）
  placeFigure({ figureId: ids[3], cabinetId: cabA.id, shelfId: shTop.id, xMm: 60 });
  placements.at(-1).placedOn = addDays(t, -140);
  placeFigure({ figureId: ids[4], cabinetId: cabA.id, shelfId: shTop.id, xMm: 350 });
  placements.at(-1).placedOn = addDays(t, -120);

  // 底层：泳装 + 白模，间距合规
  placeFigure({ figureId: ids[6], cabinetId: cabA.id, shelfId: shBot.id, xMm: 40 });
  placements.at(-1).placedOn = addDays(t, -55);
  placeFigure({ figureId: ids[7], cabinetId: cabA.id, shelfId: shBot.id, xMm: 300 });
  placements.at(-1).placedOn = addDays(t, -18);

  // B 柜：星野
  placeFigure({ figureId: ids[0], cabinetId: cabB.id, shelfId: cabB.shelves[0].id, xMm: 80 });
  placements.at(-1).placedOn = addDays(t, -70);

  // ---------- 借展单据 ----------
  loans.push(
    {
      id: uid('ln-'), loanNo: 'JZ-20261001-1', borrower: '周衡', org: '市立动漫艺术馆', contact: '138****2046',
      figureIds: [ids[1]], startDate: addDays(t, -45), dueReturnDate: addDays(t, -6),
      actualOutDate: addDays(t, -45), actualReturnDate: null, stage: '在展',
      handler: '王馆长', notes: '秋季联合特展', damageRecordIds: [], yellow: false
    },
    {
      id: uid('ln-'), loanNo: 'JZ-20261101-2', borrower: '林策', org: '高校动漫社', contact: '139****8810',
      figureIds: [ids[6]], startDate: addDays(t, -10), dueReturnDate: addDays(t, 12),
      actualOutDate: addDays(t, -10), actualReturnDate: null, stage: '在展',
      handler: '王馆长', notes: '校园文化节', damageRecordIds: [], yellow: false
    },
    {
      id: uid('ln-'), loanNo: 'JZ-20261114-3', borrower: '沈砚', org: '商业美陈公司', contact: '137****5523',
      figureIds: [ids[4]], startDate: t, dueReturnDate: addDays(t, 21),
      actualOutDate: null, actualReturnDate: null, stage: '待出库',
      handler: '王馆长', notes: '新店开业展台', damageRecordIds: [], yellow: false
    }
  );

  // ---------- 养护：建档时已自动生成周期任务，这里只追加一条历史逾期任务制造看板预警 ----------
  maintenance.push(
    { id: uid('mt-'), figureId: ids[0], kind: '除尘', dueDate: addDays(t, -12), done: false },
    { id: uid('mt-'), figureId: ids[0], kind: '清洁', dueDate: addDays(t, 2), done: false }
  );

  // ---------- 损伤登记样例 ----------
  damages.push({
    id: uid('dm-'), figureId: ids[1], loanId: null, date: addDays(t, -40),
    desc: '剑尖搬运磕碰掉漆', handler: '养护员小赵',
    spots: [{ x: 0.72, y: 0.18, part: '武器/配件', note: '掉漆约2mm' }],
    photos: []
  });

  pushNotification({ level: 'info', title: '演示数据已载入', body: '已生成 8 件藏品、2 个展柜、3 张借展单，含承重/间距/UV/超期等冲突场景。' });
}
