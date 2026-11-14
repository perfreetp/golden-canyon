// 确定性伪随机数（mulberry32），保证种子数据可复现
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

/** 点到线段距离 */
export function pointSegDist(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(px, py, ax, ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** 折线段是否与矩形相交（含端点在矩形内的情形） */
export function polylineIntersectsRect(
  path: [number, number][],
  rx: number,
  ry: number,
  rw: number,
  rh: number
): boolean {
  const inside = (x: number, y: number) =>
    x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;

  for (const [x, y] of path) {
    if (inside(x, y)) return true;
  }
  for (let i = 1; i < path.length; i++) {
    const [ax, ay] = path[i - 1];
    const [bx, by] = path[i];
    if (segIntersectsRect(ax, ay, bx, by, rx, ry, rw, rh)) return true;
  }
  return false;
}

/** Liang–Barsky 线段-矩形裁剪判定 */
function segIntersectsRect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  let t0 = 0;
  let t1 = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [ax - rx, rx + rw - ax, ay - ry, ry + rh - ay];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const r = q[i] / p[i];
      if (p[i] < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
    }
  }
  return true;
}

export function minPairDistance<T>(
  items: T[],
  getXY: (t: T) => [number, number]
): { a: T; b: T; d: number } | null {
  let best: { a: T; b: T; d: number } | null = null;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const [ax, ay] = getXY(items[i]);
      const [bx, by] = getXY(items[j]);
      const d = dist(ax, ay, bx, by);
      if (!best || d < best.d) best = { a: items[i], b: items[j], d };
    }
  }
  return best;
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fmtMm(v: number): string {
  return `${(v / 1000).toFixed(2)}m`;
}
