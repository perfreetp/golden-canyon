// 线路计算：档距、高差、弧垂、对地距离、林木砍伐、造价与占地
import { elevation, slopeDeg, FORESTS, REDLINES, segPolyIntervals } from './terrain.js';

// 校核限值
export const LIMITS = { maxSpan: 800, minClear: 7, steepSlope: 30 };

// 电压等级参数：塔高(m)、走廊宽度(m)、塔基永久占地(亩/基)、塔材单价(万元/基)、导线造价(万元/km)
export const VOLTAGES = {
  '110kV': { towerH: 24, corridor: 20, baseMu: 0.18, towerCost: 28, lineCost: 35 },
  '220kV': { towerH: 30, corridor: 26, baseMu: 0.25, towerCost: 42, lineCost: 55 },
  '500kV': { towerH: 42, corridor: 40, baseMu: 0.42, towerCost: 95, lineCost: 120 },
};

// 弧垂模板：按电压等级 × 气象条件，K 为抛物线弧垂系数（f = K·L²，单位 m）
export const SAG_TEMPLATES = {
  '110kV': { 最高气温: 2.8e-5, 覆冰: 3.8e-5, 大风: 2.3e-5 },
  '220kV': { 最高气温: 3.5e-5, 覆冰: 4.6e-5, 大风: 2.9e-5 },
  '500kV': { 最高气温: 4.2e-5, 覆冰: 5.6e-5, 大风: 3.5e-5 },
};

export const WEATHERS = ['最高气温', '覆冰', '大风'];

const MU_M2 = 666.67; // 1 亩 = 666.67 m²
const TREE_PRICE = 0.012; // 林木补偿 万元/株（120 元/株）
const MOUNTAIN_FACTOR = 1.25; // 山地施工系数
const STEEP_TOWER_FACTOR = 1.15; // 陡坡塔位附加系数
const ACCESS_ROAD_COST = 8; // 陡坡塔位施工便道费 万元/基
const ACCESS_ROAD_MU = 0.5; // 陡坡塔位便道临时占地 亩/基

export function towerInfo(t, voltage) {
  const vc = VOLTAGES[voltage];
  const ground = elevation(t.x, t.y);
  const slope = slopeDeg(t.x, t.y);
  return {
    ...t,
    ground,
    slope,
    steep: slope > LIMITS.steepSlope,
    towerH: vc.towerH,
    attach: ground + vc.towerH, // 挂点高程
  };
}

// 单档分析
function spanAnalysis(ta, tb, idx, mileStart, K, vc) {
  const dx = tb.x - ta.x;
  const dy = tb.y - ta.y;
  const L = Math.hypot(dx, dy);
  const dh = tb.attach - ta.attach;
  const sag = K * L * L;

  // 对地距离：沿档采样，导线按抛物线弧垂
  const N = 60;
  let minClear = Infinity;
  let minT = 0;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const px = ta.x + dx * t;
    const py = ta.y + dy * t;
    const cond = ta.attach + (tb.attach - ta.attach) * t - 4 * sag * t * (1 - t);
    const clr = cond - elevation(px, py);
    if (clr < minClear) {
      minClear = clr;
      minT = t;
    }
  }

  // 林木砍伐：与各林区求交
  const forests = [];
  let trees = 0;
  for (const f of FORESTS) {
    const intervals = segPolyIntervals(ta.x, ta.y, tb.x, tb.y, f.pts);
    const len = intervals.reduce((s, [a, b]) => s + (b - a) * L, 0);
    if (len > 1) {
      const width = vc.corridor + 2 * f.treeH; // 砍伐宽度 = 走廊宽度 + 两侧倒树距离
      const n = Math.round((len * width * f.density) / MU_M2);
      trees += n;
      forests.push({ id: f.id, name: f.name, len, width, trees: n, intervals });
    }
  }

  // 生态红线穿越
  const redlines = [];
  for (const r of REDLINES) {
    const intervals = segPolyIntervals(ta.x, ta.y, tb.x, tb.y, r.pts);
    const len = intervals.reduce((s, [a, b]) => s + (b - a) * L, 0);
    if (len > 1) redlines.push({ id: r.id, name: r.name, len, intervals });
  }

  const spanOver = L > LIMITS.maxSpan;
  const clearBad = minClear < LIMITS.minClear;
  return {
    idx,
    from: ta.id,
    to: tb.id,
    L,
    dh,
    sag,
    minClear,
    minT,
    mileStart,
    spanOver,
    clearBad,
    bad: spanOver || clearBad,
    forests,
    trees,
    redlines,
    redlineLen: redlines.reduce((s, r) => s + r.len, 0),
  };
}

// 方案整体分析
export function analyze(scheme) {
  const vc = VOLTAGES[scheme.voltage];
  const K = SAG_TEMPLATES[scheme.voltage][scheme.weather];
  const towers = scheme.towers.map((t) => towerInfo(t, scheme.voltage));
  const spans = [];
  let mile = 0;
  for (let i = 0; i < towers.length - 1; i++) {
    const s = spanAnalysis(towers[i], towers[i + 1], i, mile, K, vc);
    spans.push(s);
    mile += s.L;
  }

  const totalLen = mile;
  const steepTowers = towers.filter((t) => t.steep).length;
  const treesTotal = spans.reduce((s, x) => s + x.trees, 0);
  const redlineTotal = spans.reduce((s, x) => s + x.redlineLen, 0);

  // 造价估算（万元）
  const towerCost = towers.reduce(
    (s, t) =>
      s + vc.towerCost * MOUNTAIN_FACTOR * (t.steep ? STEEP_TOWER_FACTOR : 1) + (t.steep ? ACCESS_ROAD_COST : 0),
    0
  );
  const lineCost = (totalLen / 1000) * vc.lineCost * 1.05;
  const forestCost = treesTotal * TREE_PRICE;
  const cost = towerCost + lineCost + forestCost;

  // 占地（亩）：塔基永久占地 + 陡坡便道临时占地
  const landMu = towers.length * vc.baseMu + steepTowers * ACCESS_ROAD_MU;

  return {
    towers,
    spans,
    totalLen,
    steepTowers,
    treesTotal,
    redlineTotal,
    badSpans: spans.filter((s) => s.bad).length,
    cost: { tower: towerCost, line: lineCost, forest: forestCost, total: cost },
    landMu,
    K,
    vc,
  };
}

// 提交复核后，设计员又改动的档（与快照对比）
export function modifiedSpans(scheme) {
  const snap = scheme.snapshot;
  const out = new Set();
  if (!snap) return out;
  const cur = scheme.towers;
  const n = Math.max(cur.length, snap.length);
  const moved = (i) => {
    if (i >= cur.length || i >= snap.length) return true;
    return Math.hypot(cur[i].x - snap[i].x, cur[i].y - snap[i].y) > 2;
  };
  for (let i = 0; i < n - 1; i++) {
    if (moved(i) || moved(i + 1)) out.add(i);
  }
  return out;
}
