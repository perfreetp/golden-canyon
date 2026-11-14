// 多边形布尔运算（Greiner–Hormann，数组式稳定实现）
// 支持 union / subtract，处理交点、包含与分离三类情形
import type { Point } from '../types.ts';
import { dist, pointInPolygon, polygonArea } from './geometry-base.ts';

interface V {
  p: Point;
  alpha: number; // 在所属边上的位置 0..1
  isInter: boolean;
  entry: boolean;
  visited: boolean;
  neighbor: V | null;
  next: V;
  prev: V;
}

function segHit(a1: Point, a2: Point, b1: Point, b2: Point): { p: Point; t: number; u: number } | null {
  const d1x = a2.x - a1.x;
  const d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x;
  const d2y = b2.y - b1.y;
  const den = d1x * d2y - d1y * d2x;
  if (Math.abs(den) < 1e-10) return null;
  const t = ((b1.x - a1.x) * d2y - (b1.y - a1.y) * d2x) / den;
  const u = ((b1.x - a1.x) * d1y - (b1.y - a1.y) * d1x) / den;
  if (t <= 1e-9 || t >= 1 - 1e-9 || u <= 1e-9 || u >= 1 - 1e-9) return null;
  return { p: { x: a1.x + t * d1x, y: a1.y + t * d1y }, t, u };
}

function ccw(poly: Point[]): Point[] {
  const p = poly.map((q) => ({ ...q }));
  if (polygonArea(p) < 0) p.reverse();
  return p;
}

interface EdgeHit {
  edge: number;
  alpha: number;
  point: Point;
}

/** 把交点按所属边展开到顶点序列中，生成环形双链表 */
function buildRing(poly: Point[], hits: EdgeHit[]): V[] {
  const byEdge = new Map<number, EdgeHit[]>();
  for (const h of hits) {
    const arr = byEdge.get(h.edge) ?? [];
    arr.push(h);
    byEdge.set(h.edge, arr);
  }
  const nodes: V[] = [];
  for (let i = 0; i < poly.length; i++) {
    // 原始顶点 alpha=0
    nodes.push(mkNode(poly[i], 0, false));
    const onEdge = (byEdge.get(i) ?? []).sort((a, b) => a.alpha - b.alpha);
    for (const h of onEdge) nodes.push(mkNode(h.point, h.alpha, true));
  }
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].next = nodes[(i + 1) % nodes.length];
    nodes[i].prev = nodes[(i - 1 + nodes.length) % nodes.length];
  }
  return nodes;
}

function mkNode(p: Point, alpha: number, isInter: boolean): V {
  return { p: { ...p }, alpha, isInter, entry: false, visited: false, neighbor: null, next: null as unknown as V, prev: null as unknown as V };
}

function jitter(poly: Point[], seed: number): Point[] {
  return poly.map((p, i) => ({
    x: p.x + Math.sin((i + 1) * 12.9898 + seed * 78.233) * 0.012,
    y: p.y + Math.cos((i + 1) * 39.425 + seed * 17.13) * 0.012,
  }));
}

function core(subjectIn: Point[], clipIn: Point[], op: 'union' | 'subtract'): Point[][] | null {
  const subject = ccw(subjectIn);
  const clip = ccw(clipIn);
  const sHits: EdgeHit[] = [];
  const cHits: EdgeHit[] = [];
  const pairs: { s: EdgeHit; c: EdgeHit }[] = [];

  for (let i = 0; i < subject.length; i++) {
    const a1 = subject[i];
    const a2 = subject[(i + 1) % subject.length];
    for (let j = 0; j < clip.length; j++) {
      const b1 = clip[j];
      const b2 = clip[(j + 1) % clip.length];
      const hit = segHit(a1, a2, b1, b2);
      if (!hit) continue;
      const sh: EdgeHit = { edge: i, alpha: hit.t, point: hit.p };
      const ch: EdgeHit = { edge: j, alpha: hit.u, point: hit.p };
      sHits.push(sh);
      cHits.push(ch);
      pairs.push({ s: sh, c: ch });
    }
  }
  if (!pairs.length) return null;

  const sRing = buildRing(subject, sHits);
  const cRing = buildRing(clip, cHits);

  // 配对：同坐标的交点互为 neighbor
  for (const { s, c } of pairs) {
    const sn = sRing.find((n) => n.isInter && dist(n.p, s.point) < 1e-6 && !n.neighbor);
    const cn = cRing.find((n) => n.isInter && dist(n.p, c.point) < 1e-6 && !n.neighbor);
    if (sn && cn) {
      sn.neighbor = cn;
      cn.neighbor = sn;
    }
  }

  // 标志 entry/exit（Greiner–Hormann 推导 + 实测验证）
  // 交集语义：首顶点在另一多边形外 → 首个交点 entry；在内 → exit，逐交点交替
  // union：两环都取反；subtract(A-B)：仅主体环 A 取反，裁剪环 B 保持交集语义
  // （B 环据此在交点处沿内边界反向行走，形成正确的挖剪轮廓）
  let sOutside = !pointInPolygon(subject[0], clip);
  let cOutside = !pointInPolygon(clip[0], subject);
  const invertS = op === 'union' || op === 'subtract';
  const invertC = op === 'union';
  for (const n of sRing) {
    if (n.isInter) {
      n.entry = invertS ? !sOutside : sOutside;
      sOutside = !sOutside;
    }
  }
  for (const n of cRing) {
    if (n.isInter) {
      n.entry = invertC ? !cOutside : cOutside;
      cOutside = !cOutside;
    }
  }

  // 追踪：每个未访问交点起一条轮廓。
  // 规则（GH）：站在交点上，entry → 沿当前环 forward 走到下一交点（含沿途顶点）；
  //            exit → 沿当前环 backward 走到上一交点；到达后切换到邻居环继续。
  const contours: Point[][] = [];
  for (const start of sRing) {
    if (!start.isInter || start.visited) continue;
    const contour: Point[] = [];
    let v: V = start;
    let guard = 0;
    do {
      v.visited = true;
      if (v.neighbor) v.neighbor.visited = true;
      contour.push({ ...v.p });
      if (v.entry) {
        let w = v.next;
        while (!w.isInter) {
          contour.push({ ...w.p });
          w = w.next;
        }
        v = w; // 落在下一交点（下一轮先入轮廓再切换）
      } else {
        let w = v.prev;
        while (!w.isInter) {
          contour.push({ ...w.p });
          w = w.prev;
        }
        v = w;
      }
      v = v.neighbor!; // 切换到另一环的对应交点
      guard++;
    } while (v !== start && guard < 10000);
    const clean = dedupe(contour);
    if (clean.length >= 3) contours.push(clean);
  }
  return contours.length ? contours : null;
}

function dedupe(poly: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of poly) {
    const last = out[out.length - 1];
    if (!last || dist(last, p) > 1e-6) out.push(p);
  }
  if (out.length > 1 && dist(out[0], out[out.length - 1]) < 1e-6) out.pop();
  return out;
}

/** 孔洞用零宽走廊连到外轮廓，拼成弱简单多边形 */
function withHoleCorridor(outerIn: Point[], holeIn: Point[]): Point[] {
  const outer = ccw(outerIn);
  const hole = ccw(holeIn).reverse();
  let bi = 0;
  let hi = 0;
  let best = Infinity;
  for (let i = 0; i < outer.length; i++) {
    for (let j = 0; j < hole.length; j++) {
      const d = dist(outer[i], hole[j]);
      if (d < best) {
        best = d;
        bi = i;
        hi = j;
      }
    }
  }
  const out: Point[] = [];
  for (let k = 0; k < outer.length; k++) out.push(outer[(bi + k) % outer.length]);
  out.push({ ...outer[bi] });
  for (let k = 0; k < hole.length; k++) out.push(hole[(hi + k) % hole.length]);
  out.push({ ...hole[hi] });
  out.push({ ...outer[bi] });
  return dedupe(out);
}

export function polygonBoolean(
  subjectIn: Point[],
  clipIn: Point[],
  op: 'union' | 'subtract',
): Point[][] {
  if (subjectIn.length < 3 || clipIn.length < 3) return [subjectIn.map((p) => ({ ...p }))];

  let result = core(subjectIn, clipIn, op);
  if (!result) result = core(jitter(subjectIn, 1), jitter(clipIn, 2), op);

  if (!result) {
    const sInside = pointInPolygon(subjectIn[0], clipIn);
    const cInside = pointInPolygon(clipIn[0], subjectIn);
    if (op === 'union') {
      if (sInside) return [dedupe(clipIn)];
      if (cInside) return [dedupe(subjectIn)];
      return [dedupe(subjectIn), dedupe(clipIn)];
    }
    // subtract
    if (sInside) return [];
    if (cInside) return [withHoleCorridor(subjectIn, clipIn)];
    return [dedupe(subjectIn)];
  }
  return result;
}
