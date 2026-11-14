// 插值 / 数学工具
export const TAU = Math.PI * 2;

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const dist = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1);
export const angleTo = (x1: number, y1: number, x2: number, y2: number) => Math.atan2(y2 - y1, x2 - x1);

/** 最短弧夹角插值 */
export function lerpAngle(a: number, b: number, t: number) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}

export function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeInQuad(t: number) { return t * t; }

function cubicPoint(p1: number, p2: number, t: number) {
  // 一维三次贝塞尔，端点固定 0、1
  const mt = 1 - t;
  return 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t;
}

/** 贝塞尔缓动：给定 x（时间进度）求 y（值进度），二分求解 */
export function bezierEase(cp1: [number, number], cp2: [number, number], x: number) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const mx = cubicPoint(cp1[0], cp2[0], mid);
    if (mx < x) lo = mid; else hi = mid;
  }
  const t = (lo + hi) / 2;
  return cubicPoint(cp1[1], cp2[1], t);
}

export function easeValue(type: 'linear' | 'easeInOut' | 'bezier', cp1: [number, number], cp2: [number, number], t: number) {
  if (type === 'linear') return t;
  if (type === 'easeInOut') return easeInOutCubic(t);
  return bezierEase(cp1, cp2, t);
}

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

export function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1).padStart(4, '0');
  return `${m}:${s}`;
}

export function monthOf(iso: string) {
  return iso.slice(0, 7);
}
