// Pure 2D geometry helpers shared by the diagram renderer and the QC engine.
// Everything works in normalized panel space (0..1), which keeps generation,
// hit-testing and checks independent of the rendered pixel size.

/** Ray-casting point-in-polygon test. `poly` is an array of {x,y}. */
export function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Approximate signed clearance from the polygon boundary (0 if outside). */
export function polygonClearance(px, py, poly) {
  let min = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    min = Math.min(min, distanceToSegment(px, py, poly[j].x, poly[j].y, poly[i].x, poly[i].y));
  }
  return pointInPolygon(px, py, poly) ? min : 0;
}

function intersectionArea(a, b) {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.w, b.x + b.w);
  const bottom = Math.min(a.y + a.h, b.y + b.h);
  if (right <= x || bottom <= y) return 0;
  return (right - x) * (bottom - y);
}

/** 0..1, relative to the smaller of the two boxes. */
export function overlapRatio(a, b) {
  const ia = intersectionArea(a, b);
  if (ia <= 0) return 0;
  return ia / Math.min(a.w * a.h, b.w * b.h);
}

export function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function formatSize(longCm, shortCm) {
  const fmt = (v) => (v < 1 ? `${Math.round(v * 10)}mm` : `${(Math.round(v * 10) / 10).toFixed(1)}cm`);
  return `${fmt(longCm)}×${fmt(shortCm)}`;
}
