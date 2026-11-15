// Deterministic procedural mucosal texture.
// Uses d3-contour over a seeded scalar field for organic mottling, then adds
// part-specific fold geometry: nested rugal folds in the stomach, longitudinal
// folds in the oesophagus and circular plicae in the duodenum. Every value is a
// pure function of the texture key, which derives from the exam parameters.

import * as d3 from 'd3';
import { createRng } from './prng.js';
import { getArt, PANEL, stomachAxis } from './anatomy.js';
import { pointInPolygon } from './geometry.js';

const cache = new Map();

function valueNoise2D(rng, gridSize) {
  const lat = [];
  for (let y = 0; y <= gridSize; y++) {
    const row = [];
    for (let x = 0; x <= gridSize; x++) row.push(rng.next());
    lat.push(row);
  }
  return (u, v) => {
    const x = u * gridSize;
    const y = v * gridSize;
    const x0 = Math.min(gridSize - 1, Math.floor(x));
    const y0 = Math.min(gridSize - 1, Math.floor(y));
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = lat[y0][x0];
    const b = lat[y0][x0 + 1];
    const c = lat[y0 + 1][x0];
    const d = lat[y0 + 1][x0 + 1];
    return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
  };
}

function buildField(key) {
  const rng = createRng('texture', key);
  const n1 = valueNoise2D(rng, 3);
  const n2 = valueNoise2D(rng, 6);
  const blobs = Array.from({ length: 7 }, () => ({
    x: rng.range(0.08, 0.92),
    y: rng.range(0.08, 0.92),
    r: rng.range(0.07, 0.2),
    amp: rng.range(0.3, 1)
  }));
  const W = 30;
  const H = 36;
  const values = new Float64Array(W * H);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const u = i / (W - 1);
      const v = j / (H - 1);
      let val = 0.66 * n1(u, v) + 0.34 * n2(u, v);
      for (const b of blobs) {
        const d2 = (u - b.x) ** 2 + (v - b.y) ** 2;
        val += b.amp * 0.42 * Math.exp(-d2 / (2 * b.r * b.r));
      }
      values[j * W + i] = val;
    }
  }
  return { values, W, H };
}

function contourLevels({ values }) {
  const sorted = Array.from(values).sort((a, b) => a - b);
  const q = (p) => sorted[Math.floor(p * (sorted.length - 1))];
  return [q(0.42), q(0.62), q(0.79), q(0.91)];
}

/** Turn the scalar field into filled contour polygons, scaled to the panel. */
function contourPaths(key) {
  const { values, W, H } = buildField(key);
  const sx = PANEL.w / (W - 1);
  const sy = PANEL.h / (H - 1);
  const projection = d3.geoTransform({
    point(x, y) {
      this.stream.point(x * sx, y * sy);
    }
  });
  const pathGen = d3.geoPath(projection);
  return d3
    .contours()
    .size([W, H])
    .thresholds(contourLevels({ values }))(values)
    .map((c) => ({ value: c.value, path: pathGen(c) }));
}

/** Convert a polygon to an SVG path string. */
function polyPath(pts, closed = true) {
  if (!pts.length) return '';
  const d = 'M' + pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join('L');
  return closed ? d + 'Z' : d;
}

/** Scale a closed polygon toward a centre point — used for nested rugae. */
function scalePolygon(pts, cx, cy, k) {
  return pts.map((p) => ({ x: cx + (p.x - cx) * k, y: cy + (p.y - cy) * k }));
}

function centroid(pts) {
  let x = 0;
  let y = 0;
  for (const p of pts) {
    x += p.x;
    y += p.y;
  }
  return { x: x / pts.length, y: y / pts.length };
}

function foldGeometry(part, key) {
  const art = getArt(part);
  const rng = createRng('folds', key, part);
  const lines = [];
  const bands = [];

  const c = centroid(art.lumen);
  const insetLevels =
    part === 'stomach'
      ? [0.88, 0.74, 0.6, 0.46]
      : part === 'duodenum'
        ? [0.82, 0.62]
        : [0.8, 0.58];
  for (const k of insetLevels) {
    const inset = scalePolygon(art.lumen, c.x, c.y, k);
    const wob = inset.map((p, i) => {
      const a = Math.atan2(p.y - c.y, p.x - c.x);
      const n = Math.sin(a * (part === 'stomach' ? 6 : 9) + i * 0.3) * (part === 'stomach' ? 1.8 : 1.1);
      return { x: p.x + Math.cos(a) * n, y: p.y + Math.sin(a) * n };
    });
    lines.push(polyPath(wob, true));
    bands.push({ k, path: polyPath(wob, true), weight: rng.range(0.7, 1.2) });
  }

  if (part === 'stomach') {
    // rugal folds run perpendicular to the medial axis (cardia -> pylorus)
    const axis = stomachAxis();
    for (let i = 3; i < axis.length - 2; i += 2) {
      const p = axis[i];
      const q = axis[Math.min(axis.length - 1, i + 1)];
      const r = axis[Math.max(0, i - 1)];
      let dx = q.x - r.x;
      let dy = q.y - r.y;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      const nx = -dy;
      const ny = dx;
      const half = 34 + rng.range(-4, 4);
      const bend = rng.range(3, 8) * (i % 4 === 0 ? 1 : -1);
      const a = { x: p.x + nx * half, y: p.y + ny * half };
      const b = { x: p.x - nx * half, y: p.y - ny * half };
      const mid = { x: p.x + dx * bend, y: p.y + dy * bend };
      const arc = [];
      for (let s = 0; s <= 10; s++) {
        const t = s / 10;
        arc.push({
          x: a.x * (1 - t) ** 2 + 2 * mid.x * (1 - t) * t + b.x * t ** 2,
          y: a.y * (1 - t) ** 2 + 2 * mid.y * (1 - t) * t + b.y * t ** 2
        });
      }
      lines.push(polyPath(arc, false));
    }
  }

  if (part === 'esophagus') {
    // longitudinal striae following the tube
    const pts = getArt(part).centerline;
    for (const off of [-9, -4.5, 0, 4.5, 9]) {
      const line = [];
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const q = pts[Math.min(pts.length - 1, i + 1)];
        const r = pts[Math.max(0, i - 1)];
        let dx = q.x - r.x;
        let dy = q.y - r.y;
        const len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;
        const t = i / (pts.length - 1);
        const wob = Math.sin(t * Math.PI * 2.6 + off) * 1.3;
        line.push({ x: p.x - dy * off + dx * wob, y: p.y + dx * off + dy * wob });
      }
      lines.push(polyPath(line, false));
    }
  }

  if (part === 'duodenum') {
    // circular folds (plicae) perpendicular to the tube
    const pts = getArt(part).centerline;
    for (let i = 5; i < pts.length - 4; i += 3) {
      const p = pts[i];
      const q = pts[Math.min(pts.length - 1, i + 1)];
      const r = pts[Math.max(0, i - 1)];
      let dx = q.x - r.x;
      let dy = q.y - r.y;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      const nx = -dy;
      const ny = dx;
      const half = 19 - (i / pts.length) * 7;
      const bend = 3.4;
      const a = { x: p.x + nx * half, y: p.y + ny * half };
      const b = { x: p.x - nx * half, y: p.y - ny * half };
      const mid = { x: p.x + dx * bend, y: p.y + dy * bend };
      const arc = [];
      for (let s = 0; s <= 8; s++) {
        const t = s / 8;
        arc.push({
          x: a.x * (1 - t) ** 2 + 2 * mid.x * (1 - t) * t + b.x * t ** 2,
          y: a.y * (1 - t) ** 2 + 2 * mid.y * (1 - t) * t + b.y * t ** 2
        });
      }
      lines.push(polyPath(arc, false));
    }
  }

  return { lines, bands, centroid: c };
}

export const SURFACE_PALETTE = {
  白光: { base: '#efc9bd', mid: '#e3ab9e', deep: '#cf8b80', fold: '#b06f66', mottle: '#f9e6dd', shadow: '#7d4b47', wall: '#c39089' },
  NBI: { base: '#b6c9ae', mid: '#93ab90', deep: '#758f79', fold: '#5c7a63', mottle: '#d5e2cc', shadow: '#3d5645', wall: '#7d9a80' },
  BLI: { base: '#c2c8dc', mid: '#a1a8c8', deep: '#868eb4', fold: '#6c7499', mottle: '#dde1ec', shadow: '#4b527a', wall: '#8b92b3' },
  LCI: { base: '#ecd89b', mid: '#d6bd6f', deep: '#bda457', fold: '#a38a44', mottle: '#f7ecc4', shadow: '#7b6530', wall: '#c4ab66' }
};

export function getTexture(part, key, imageMode = '白光') {
  const cacheKey = `${part}|${key}|${imageMode}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const palette = SURFACE_PALETTE[imageMode] || SURFACE_PALETTE['白光'];
  const contours = contourPaths(`${key}|${part}`);
  const folds = foldGeometry(part, key);
  const art = getArt(part);

  const res = {
    palette,
    lumenPath: polyPath(art.lumen),
    outlinePath: polyPath(art.outline),
    mottlePaths: contours.map((c) => c.path),
    mottleValues: contours.map((c) => c.value),
    folds: folds.lines,
    foldBands: folds.bands,
    rugaeCenter: folds.centroid,
    ridges: buildStipple(part, key),
    foldsByPart: true
  };
  cache.set(cacheKey, res);
  return res;
}

/** Fine stippling used for the mucosal highlight — deterministic positions. */
function buildStipple(part, key) {
  const rng = createRng('ridges', key, part);
  const art = getArt(part);
  const b = art.bounds;
  const dots = [];
  let guard = 0;
  while (dots.length < 190 && guard < 6000) {
    guard++;
    const x = rng.range(b.minX, b.maxX);
    const y = rng.range(b.minY, b.maxY);
    if (!pointInPolygon(x, y, art.lumen)) continue;
    dots.push({ x, y, r: rng.range(0.7, 2.0), o: rng.range(0.15, 0.45) });
  }
  return dots;
}
