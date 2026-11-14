// 基础几何工具：吸附、参考线、圆滑路径、面积、点包含、线段求交
import type { Point, RegionNode } from '../types.ts';

let counter = 0;
export function uid(prefix = 'id'): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function bbox(points: Point[]): { x: number; y: number; w: number; h: number } {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

// ---------- 吸附 --------//

export interface SnapResult {
  point: Point;
  source: 'grid' | 'node' | 'endpoint' | 'template' | null;
}

export function snapPoint(
  p: Point,
  opts: { gridSize: number; threshold?: number; anchors?: Point[]; gridEnabled: boolean },
): SnapResult {
  const threshold = opts.threshold ?? 10;
  let best: SnapResult = { point: { ...p }, source: null };
  let bestD = threshold;

  if (opts.gridEnabled) {
    const gx = Math.round(p.x / opts.gridSize) * opts.gridSize;
    const gy = Math.round(p.y / opts.gridSize) * opts.gridSize;
    const d = dist(p, { x: gx, y: gy });
    if (d < bestD) {
      bestD = d;
      best = { point: { x: gx, y: gy }, source: 'grid' };
    }
  }
  for (const a of opts.anchors ?? []) {
    const d = dist(p, a);
    if (d < bestD) {
      bestD = d;
      best = { point: { x: a.x, y: a.y }, source: 'node' };
    }
  }
  return best;
}

export interface Guide {
  type: 'v' | 'h';
  pos: number;
  from: Point;
  to: Point;
}

export function findGuides(p: Point, anchors: Point[], threshold = 8): Guide[] {
  const guides: Guide[] = [];
  for (const a of anchors) {
    if (Math.abs(a.x - p.x) <= threshold) {
      guides.push({ type: 'v', pos: a.x, from: { x: a.x, y: 0 }, to: { x: a.x, y: 1 } });
    }
    if (Math.abs(a.y - p.y) <= threshold) {
      guides.push({ type: 'h', pos: a.y, from: { x: 0, y: a.y }, to: { x: 1, y: a.y } });
    }
  }
  return guides;
}

// ---------- 路径生成 --------//

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

export function smoothPathD(nodes: RegionNode[], closed: boolean): string {
  if (nodes.length < 2) return '';
  const pts = nodes.map((n) => ({ x: n.x, y: n.y }));
  if (!closed && pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

  const tensionOf = (i: number) => clamp(nodes[i]?.smooth ?? 0, 0, 1);
  const parts: string[] = [`M ${pts[0].x} ${pts[0].y}`];
  const n = pts.length;
  const at = (i: number): Point => {
    if (closed) return pts[(i + n) % n];
    return pts[clamp(i, 0, n - 1)];
  };
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const t = tensionOf(i) * 0.5;
    if (t <= 0.01) {
      parts.push(`L ${p2.x} ${p2.y}`);
    } else {
      const c1x = p1.x + (p2.x - p0.x) * t;
      const c1y = p1.y + (p2.y - p0.y) * t;
      const c2x = p2.x - (p3.x - p1.x) * t;
      const c2y = p2.y - (p3.y - p1.y) * t;
      parts.push(`C ${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(p2.x)} ${round(p2.y)}`);
    }
  }
  if (closed) parts.push('Z');
  return parts.join(' ');
}

export function straightPathD(nodes: RegionNode[], closed: boolean): string {
  const d = nodes.map((p, i) => `${i === 0 ? 'M' : 'L'} ${round(p.x)} ${round(p.y)}`).join(' ');
  return closed ? `${d} Z` : d;
}

export function shapePathD(nodes: RegionNode[], closed: boolean): string {
  const anySmooth = nodes.some((n) => n.smooth > 0.01);
  return anySmooth ? smoothPathD(nodes, closed) : straightPathD(nodes, closed);
}

// ---------- 多边形基础运算 --------//

export function polygonArea(poly: Point[]): number {
  let a = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % n];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

export function pointInPolygon(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const hit = yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

export function segmentIntersection(a1: Point, a2: Point, b1: Point, b2: Point): Point | null {
  const d1x = a2.x - a1.x;
  const d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x;
  const d2y = b2.y - b1.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-10) return null;
  const t = ((b1.x - a1.x) * d2y - (b1.y - a1.y) * d2x) / denom;
  const u = ((b1.x - a1.x) * d1y - (b1.y - a1.y) * d1x) / denom;
  if (t < 1e-9 || t > 1 - 1e-9 || u < 1e-9 || u > 1 - 1e-9) return null;
  return { x: a1.x + t * d1x, y: a1.y + t * d1y };
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
