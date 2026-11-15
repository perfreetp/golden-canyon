/**
 * 头皮曲面几何模型（单位：cm）—— 临床脑电图头模
 * 坐标系：+X = 受试者左侧，+Y = 头顶，+Z = 面部朝向（鼻尖方向）。
 *
 * 建模方式：水平截面扫掠
 *   y   = 由极角 θ 决定（θ=0 颅顶 → θ=π 颏下）
 *   a(y)= 该高度处的半宽（颞侧）
 *   b(y)= 该高度处的前/后半深（额-枕方向）
 *   点 = ( a(y)·sinφ , y , b(y)·cosφ )
 * 因此任意射线方向与曲面一一对应，投影可精确反解，
 * 电极吸附、法线计算、分区判定都共用同一套函数。
 */
import { clamp } from './mathutil.js';

export const HEAD = {
  A: 7.35,
  Bup: 10.35,
  Bdown: 9.55,
  Cfront: 9.55,
  Cback: 9.85,
  center: [0, 0.0, 0],
};

export { clamp };
export const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const gauss = (v, mu, sd) => Math.exp(-0.5 * ((v - mu) / sd) ** 2);
export { gauss };

export function dirFromAngles(thetaDeg, phiDeg) {
  const t = (thetaDeg * Math.PI) / 180;
  const p = (phiDeg * Math.PI) / 180;
  return [Math.sin(t) * Math.sin(p), Math.cos(t), Math.sin(t) * Math.cos(p)];
}

export function normalize(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

/* ------------------------------------------------------------------
 * 轮廓：由平滑解析函数生成密集关键点，再用单调三次插值，
 * 保证顶部为圆顶、下颌为圆滑收窄，不出现"方盒"侧面轮廓。
 * ------------------------------------------------------------------ */
const Y_TOP = 10.35;
const Y_BOT = 9.55;

/** 颅顶方向剖面形状（0..1，y=Y_TOP 处为 0） */
function crownShape(y) {
  // 顶部：接近半球（指数 0.5，即 sqrt），两侧收得比前后快
  if (y >= 0) {
    // 顶部用余弦截面：在顶点处斜率连续，不留亮斑
    const t = clamp(y / Y_TOP, 0, 1);
    return Math.cos((t * Math.PI) / 2) ** 0.75;
  }
  // 下半：下颌收窄更快
  const t = clamp(-y / Y_BOT, 0, 1);
  return Math.cos((t * Math.PI) / 2) ** 0.8;
}

/** 下颌收窄系数 */
function jawTaper(y) {
  return 1 - 0.22 * Math.pow(smooth(-3.6, -9.1, y), 2.0);
}

const A_HALF = 7.35;
const C_FRONT = 9.62;
const C_BACK = 9.85;

const WIDTH_KEYS = [];
const FRONT_KEYS = [];
const BACK_KEYS = [];

for (let y = Y_TOP; y >= -Y_BOT + 0.02; y -= 0.42) {
  const shape = crownShape(y);
  WIDTH_KEYS.push([y, A_HALF * Math.pow(shape, 0.72) * jawTaper(y)]);
  // 前侧：眼平面以上近圆柱，颏部略前突
  const frontBoost = 1 + 0.02 * gauss(y, -6.4, 1.0);
  // 额部近平：在 y=3..8 之间进深变化很小
  const flatFront = 1 - 0.06 * smooth(2.0, 6.0, y) * (1 - smooth(7.5, 10.2, y));
  FRONT_KEYS.push([y, C_FRONT * Math.pow(shape, 0.80) * frontBoost * flatFront]);
  BACK_KEYS.push([y, C_BACK * Math.pow(shape, 0.80)]);
}
// 顶部与底部必须收敛到 0
WIDTH_KEYS.push([Y_TOP, 0.0001], [-Y_BOT, 0.0001]);
FRONT_KEYS.push([Y_TOP, 0.0001], [-Y_BOT, 0.0001]);
BACK_KEYS.push([Y_TOP, 0.0001], [-Y_BOT, 0.0001]);

/** Fritsch–Carlson 单调三次插值（键按 x 升序） */
function makeProfile(rawKeys) {
  const keys = rawKeys.slice().sort((a, b) => a[0] - b[0]);
  const xs = keys.map((k) => k[0]);
  const ys = keys.map((k) => k[1]);
  const n = keys.length;
  const d = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m = new Array(n);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else {
      const avg = (d[i - 1] + d[i]) / 2;
      m[i] = Math.sign(avg) * Math.min(Math.abs(avg), 2 * Math.abs(d[i - 1]), 2 * Math.abs(d[i]));
    }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid] > x) hi = mid; else lo = mid;
    }
    const h = xs[hi] - xs[lo];
    const t = (x - xs[lo]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    return Math.max(0, h00 * ys[lo] + h10 * h * m[lo] + h01 * ys[hi] + h11 * h * m[hi]);
  };
}

const widthAt = makeProfile(WIDTH_KEYS);
const frontAt = makeProfile(FRONT_KEYS);
const backAt = makeProfile(BACK_KEYS);

/** 高度 y 处的半宽（含颞窝/颧弓细节） */
export function halfWidth(y) {
  let a = Math.max(0, widthAt(y));
  // 颞窝内凹：外耳上方、眼后区域
  a *= 1 - 0.055 * gauss(y, 2.2, 2.6);
  // 颧弓外扩
  a *= 1 + 0.028 * gauss(y, -2.8, 1.2);
  // 下颌角
  a *= 1 + 0.02 * gauss(y, -5.0, 1.1);
  return a;
}

/**
 * 面部解剖特征：以方位角 φ 与高度 y 表示的法向起伏（cm）。
 * 全部并入曲面本���，因此不存在贴片悬浮或 z-fighting。
 */
const bell = (v, mu, sd) => Math.exp(-0.5 * ((v - mu) / sd) ** 2);

function faceFeatures(y, phi) {
  let dz = 0;
  const ap = Math.abs(phi);
  const front = Math.cos(phi); // 1 正前

  // ---------- 鼻 ----------
  if (y < 1.3 && y > -3.1) {
    const v = (1.3 - y) / 4.4; // 0 鼻根 → 1 鼻底
    // 鼻梁高度曲线：鼻根 0.1 → 鼻尖 1.18 → 鼻底 0.95
    const protr = 0.05 + 1.5 * smooth(0.02, 0.74, v) * (1 - 0.22 * smooth(0.80, 1.0, v));
    // 半宽（弧度）：鼻根窄 → 鼻翼宽
    const halfW = 0.045 + 0.135 * smooth(0.34, 0.96, v);
    if (ap < halfW) {
      const t = ap / halfW;
      // 余弦断面：边界处斜率为零，与面颊平滑相接
      dz += protr * 0.5 * (1 + Math.cos(Math.PI * t));
    }
  }

  // ---------- 眉弓（左右各一） ----------
  for (const sgn of [1, -1]) {
    const pc = (sgn * 16 * Math.PI) / 180;
    const band = bell(ap, Math.abs(pc), 0.175) * bell(y, 2.6, 0.6);
    dz += 0.18 * band * front;
    // ---------- 眼窝 ----------
    const socket = bell(ap, 0.255, 0.14) * bell(y, 0.95, 0.55);
    dz -= 0.26 * socket * front;
    // ---------- 颊 ----------
    const cheek = bell(ap, 0.46, 0.16) * bell(y, -3.1, 1.15);
    dz += 0.12 * cheek * front;
  }

  // ---------- 唇 ----------
  const lipBand = bell(ap, 0, 0.19);
  dz += 0.2 * lipBand * bell(y, -4.3, 0.24) * front;
  dz += 0.24 * lipBand * bell(y, -5.02, 0.29) * front;
  dz -= 0.1 * bell(ap, 0, 0.16) * bell(y, -4.68, 0.1) * front; // 口裂
  dz -= 0.06 * bell(ap, 0, 0.1) * bell(y, -3.0, 0.22) * front; // 人中

  // ---------- 颏 ----------
  dz += 0.34 * bell(ap, 0, 0.32) * bell(y, -6.9, 0.85) * front;
  dz -= 0.13 * bell(ap, 0, 0.26) * bell(y, -4.1, 0.38) * front; // 颏唇沟

  return dz;
}

/** 高度 y、方位角 φ 处的进深（前/后不等，耳平面平滑过渡） */
export function halfDepth(y, phi) {
  const cosphi = Math.cos(phi);
  const f = Math.max(0, frontAt(y));
  const b = Math.max(0, backAt(y));
  const s = smooth(-0.62, 0.62, cosphi);
  let d = b + (f - b) * s;
  if (cosphi > 0) {
    d += faceFeatures(y, phi) * smooth(0.2, 0.85, cosphi);
  } else {
    // 枕外粗隆
    d += 0.24 * gauss(y, 0.6, 1.9) * smooth(-0.05, -0.7, cosphi);
  }
  return Math.max(0, d);
}

/** 极角 θ（度） <-> 局部高度 y */
export function thetaToY(thetaDeg) {
  const t = clamp(thetaDeg, 0, 180) * (Math.PI / 180);
  return Math.cos(t) * (Math.cos(t) >= 0 ? HEAD.Bup : HEAD.Bdown);
}
export function yToTheta(y) {
  const b = y >= 0 ? HEAD.Bup : HEAD.Bdown;
  return (Math.acos(clamp(y / b, -1, 1)) * 180) / Math.PI;
}

/** 方向 → 头皮点 */
export function scalpPoint(d, offset = 0) {
  const n = normalize(d);
  const theta = (Math.acos(clamp(n[1], -1, 1)) * 180) / Math.PI;
  const y = thetaToY(theta);
  const phi = Math.atan2(n[0], n[2]);
  const cphi = Math.cos(phi);
  let a = halfWidth(y);
  let b = halfDepth(y, phi);
  if (offset) {
    const grow = 1 + offset / Math.max(1, Math.hypot(a, b));
    a *= grow;
    b *= grow;
  }
  return [a * Math.sin(phi) + HEAD.center[0], y + HEAD.center[1], b * cphi + HEAD.center[2]];
}

/** 任意点 → 头皮点（保持高度不变，沿水平面归位） */
export function projectToScalp(p) {
  const y = clamp(p[1] - HEAD.center[1], -HEAD.Bdown, HEAD.Bup);
  const a = halfWidth(y) || 1e-6;
  const z = p[2] - HEAD.center[2];
  const bRef = halfDepth(y, z >= 0 ? 0 : Math.PI);
  // 椭圆参数反解，再迭代两次修正
  let phi = Math.atan2((p[0] - HEAD.center[0]) / Math.max(a, 1e-6), z / Math.max(bRef, 1e-6));
  for (let i = 0; i < 3; i++) {
    const bb = halfDepth(y, phi);
    phi = Math.atan2((p[0] - HEAD.center[0]) / Math.max(a, 1e-6), z / Math.max(bb, 1e-6));
  }
  const bb = halfDepth(y, phi);
  return [a * Math.sin(phi) + HEAD.center[0], y + HEAD.center[1], bb * Math.cos(phi) + HEAD.center[2]];
}

export function dirOfPoint(p) {
  return normalize([p[0] - HEAD.center[0], p[1] - HEAD.center[1], p[2] - HEAD.center[2]]);
}

/** 在给定高度与方位角求表面点 */
export function surfaceAt(y, phiDeg) {
  const yy = clamp(y, -HEAD.Bdown + 0.02, HEAD.Bup - 0.02);
  const phi = (phiDeg * Math.PI) / 180;
  const cphi = Math.cos(phi);
  const a = halfWidth(yy);
  const b = halfDepth(yy, phi);
  return [a * Math.sin(phi) + HEAD.center[0], yy + HEAD.center[1], b * cphi + HEAD.center[2]];
}

/** 在前/后半球上寻找 x、y 都接近目标的表面点 */
export function surfaceNear(x, y, front = 1) {
  const side = x < 0 ? -1 : 1;
  let lo = 0;
  let hi = 89;
  for (let i = 0; i < 34; i++) {
    const mid = (lo + hi) / 2;
    const p = surfaceAt(y, side * front * mid);
    if (Math.abs(p[0]) < Math.abs(x)) lo = mid; else hi = mid;
  }
  return surfaceAt(y, side * front * ((lo + hi) / 2));
}

export function scalpNormal(dir) {
  const d = normalize(dir);
  const p0 = scalpPoint(d);
  const ref = Math.abs(d[1]) < 0.92 ? [0, 1, 0] : [1, 0, 0];
  const t1 = normalize(cross(ref, d));
  const t2 = cross(d, t1);
  const e = 0.014;
  const p1 = scalpPoint(normalize(add(d, mul(t1, e))));
  const p2 = scalpPoint(normalize(add(d, mul(t2, e))));
  let n = cross(sub(p1, p0), sub(p2, p0));
  if (dot(n, d) < 0) n = mul(n, -1);
  const len = Math.hypot(n[0], n[1], n[2]) || 1;
  return [n[0] / len, n[1] / len, n[2] / len];
}

export function normalAt(y, phiDeg) {
  return scalpNormal(dirOfPoint(surfaceAt(y, phiDeg)));
}

export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const lerp3 = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/**
 * 可贴电极属性 0..1：
 * 发际线以上为 1；面部（眉弓以下）、颈项、耳廓周围趋近 0。
 */
export function scalpMask(d) {
  const p = scalpPoint(d);
  const y = p[1] - HEAD.center[1];
  const z = p[2] - HEAD.center[2];
  const ax = Math.abs(p[0] - HEAD.center[0]);

  // 发际线：前中央（Fpz/Fp1/Fp2）为额部头皮，高度较低；
  // 向颞侧逐步抬高到颞线上方
  const lateral = smooth(1.0, 5.4, ax);
  const hairlineY = 1.95 - 0.55 * lateral;
  // 仅在前半侧判定发际线
  const front = smooth(2.2, 4.2, z);
  const face = front * (1 - smooth(hairlineY - 0.45, hairlineY + 0.55, y));

  // 颈项与下颌
  const neck = 1 - smooth(-6.0, -4.6, y);
  // 耳廓周围（不贴电极）
  const ear = gauss(ax, 7.15, 0.62) * gauss(y, -1.35, 1.15) * gauss(z, 0.0, 2.2);
  // 耳垂参考点（A1/A2）单独放行
  const lobe = gauss(ax, 7.25, 0.55) * gauss(y, -1.4, 0.9) * gauss(z, -0.2, 1.6);
  // 前颞（F7/F8）位置略高于耳廓，属可贴区
  const preTemporal = smooth(y, -1.2, 1.0) * smooth(2.6, 4.2, z) * smooth(3.6, 5.2, ax);

  return clamp(1 - Math.max(face, neck, ear * 1.2 * (1 - lobe) * (1 - preTemporal)), 0, 1);
}

export function isScalp(d) {
  return scalpMask(d) > 0.2;
}

