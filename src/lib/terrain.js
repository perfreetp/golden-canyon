// 地形模块：程序化山区地形（高程、坡度、等高线）、林区与生态保护红线
// 坐标单位：米。区域范围 10000m × 7000m。

export const WORLD = { w: 10000, h: 7000 };

function gauss(x, y, cx, cy, sx, sy) {
  const dx = (x - cx) / sx;
  const dy = (y - cy) / sy;
  return Math.exp(-(dx * dx + dy * dy));
}

// 高程（米）：缓坡基底 + 若干山体 + 局部陡峭山峰 + 微地形起伏
export function elevation(x, y) {
  let e = 240;
  e += 620 * gauss(x, y, 2400, 1800, 1900, 1500);
  e += 760 * gauss(x, y, 7300, 4800, 2300, 1700);
  e += 520 * gauss(x, y, 4900, 6300, 1700, 1000);
  e += 430 * gauss(x, y, 8900, 1400, 1500, 1100);
  // 局部陡峭山体（峰顶附近坡度可超过 30°）
  e += 520 * gauss(x, y, 3300, 3700, 620, 480);
  e += 560 * gauss(x, y, 6400, 3300, 680, 520);
  e += 380 * gauss(x, y, 8600, 3600, 520, 420);
  // 微地形
  e += 70 * Math.sin(x / 720) * Math.cos(y / 880);
  e += 35 * Math.sin(x / 235 + y / 305);
  e += 25 * Math.sin(x / 97) * Math.sin(y / 131);
  return e;
}

// 坡度（度）：中心差分求梯度
export function slopeDeg(x, y) {
  const d = 8;
  const gx = (elevation(x + d, y) - elevation(x - d, y)) / (2 * d);
  const gy = (elevation(x, y + d) - elevation(x, y - d)) / (2 * d);
  return (Math.atan(Math.hypot(gx, gy)) * 180) / Math.PI;
}

// 多边形生成（带扰动的近似圆）
function poly(cx, cy, r, n, seed, irr = 0.25) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const w = 1 + irr * Math.sin(seed + i * 2.7) + irr * 0.5 * Math.cos(seed * 1.3 + i * 4.1);
    pts.push([cx + Math.cos(a) * r * w, cy + Math.sin(a) * r * w * 0.78]);
  }
  return pts;
}

// 林区（密集林木）：density 株/亩，treeH 平均树高（m）
export const FORESTS = [
  { id: 'F1', name: '青杠林Ⅰ区', pts: poly(2100, 4700, 950, 9, 1.7), density: 120, treeH: 16 },
  { id: 'F2', name: '松木林Ⅱ区', pts: poly(5500, 3300, 1050, 10, 4.2), density: 150, treeH: 20 },
  { id: 'F3', name: '杂木林Ⅲ区', pts: poly(8100, 5600, 850, 8, 2.9), density: 100, treeH: 14 },
];

// 生态保护红线
export const REDLINES = [
  { id: 'R1', name: '生态红线Ⅰ区（水源涵养）', pts: poly(3900, 3100, 820, 9, 7.1, 0.2) },
  { id: 'R2', name: '生态红线Ⅱ区（珍稀植物）', pts: poly(7100, 5400, 760, 8, 3.3, 0.2) },
];

export function pointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// 线段与多边形求交，返回线段落在多边形内部的 t 区间数组（t∈[0,1]）
export function segPolyIntervals(ax, ay, bx, by, pts) {
  const ts = [0, 1];
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [cx, cy] = pts[j];
    const [dx, dy] = pts[i];
    const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
    if (Math.abs(den) < 1e-12) continue;
    const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den;
    const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den;
    if (t > 0 && t < 1 && u >= 0 && u <= 1) ts.push(t);
  }
  ts.sort((p, q) => p - q);
  const out = [];
  for (let i = 0; i < ts.length - 1; i++) {
    const tm = (ts[i] + ts[i + 1]) / 2;
    if (pointInPoly(ax + (bx - ax) * tm, ay + (by - ay) * tm, pts)) {
      out.push([ts[i], ts[i + 1]]);
    }
  }
  return out;
}

// ---------- 等高线（ marching squares ） ----------
let _grid = null;
const GRID_NX = 220;
const GRID_NY = 154;

function elevGrid() {
  if (_grid) return _grid;
  const nx = GRID_NX;
  const ny = GRID_NY;
  const dx = WORLD.w / nx;
  const dy = WORLD.h / ny;
  const z = new Float64Array((nx + 1) * (ny + 1));
  let zmin = Infinity;
  let zmax = -Infinity;
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const e = elevation(i * dx, j * dy);
      z[j * (nx + 1) + i] = e;
      if (e < zmin) zmin = e;
      if (e > zmax) zmax = e;
    }
  }
  _grid = { nx, ny, dx, dy, z, zmin, zmax };
  return _grid;
}

const _contourCache = new Map();

// 返回 { level, segs: [[x1,y1,x2,y2], ...] } 的数组，按等高距 step（米）
export function contours(step = 20) {
  if (_contourCache.has(step)) return _contourCache.get(step);
  const g = elevGrid();
  const { nx, ny, dx, dy, z } = g;
  const levels = [];
  const start = Math.ceil(g.zmin / step) * step;
  for (let lv = start; lv <= g.zmax; lv += step) levels.push(lv);
  const result = levels.map((level) => {
    const segs = [];
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const z0 = z[j * (nx + 1) + i] - level; // 左下
        const z1 = z[j * (nx + 1) + i + 1] - level; // 右下
        const z2 = z[(j + 1) * (nx + 1) + i + 1] - level; // 右上
        const z3 = z[(j + 1) * (nx + 1) + i] - level; // 左上
        let idx = 0;
        if (z0 > 0) idx |= 1;
        if (z1 > 0) idx |= 2;
        if (z2 > 0) idx |= 4;
        if (z3 > 0) idx |= 8;
        if (idx === 0 || idx === 15) continue;
        const x0 = i * dx;
        const y0 = j * dy;
        // 各边插值点
        const bottom = [x0 + (dx * (0 - z0)) / (z1 - z0), y0];
        const right = [x0 + dx, y0 + (dy * (0 - z1)) / (z2 - z1)];
        const top = [x0 + (dx * (0 - z3)) / (z2 - z3), y0 + dy];
        const left = [x0, y0 + (dy * (0 - z0)) / (z3 - z0)];
        const push = (a, b) => segs.push([a[0], a[1], b[0], b[1]]);
        switch (idx) {
          case 1: case 14: push(left, bottom); break;
          case 2: case 13: push(bottom, right); break;
          case 3: case 12: push(left, right); break;
          case 4: case 11: push(right, top); break;
          case 6: case 9: push(bottom, top); break;
          case 7: case 8: push(left, top); break;
          case 5: push(left, bottom); push(right, top); break;
          case 10: push(left, top); push(bottom, right); break;
        }
      }
    }
    return { level, segs };
  });
  _contourCache.set(step, result);
  return result;
}
