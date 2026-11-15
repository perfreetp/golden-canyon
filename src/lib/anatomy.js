// Anatomical layout for the three report panels.
// Coordinates are in panel pixels (viewBox 0 0 320 384); y grows downward.
// The shapes are stylised endoscopy schematic diagrams, not anatomical atlases.

export const PANEL = { w: 320, h: 384 };

export const PARTS = [
  { key: 'esophagus', name: '食管', short: '食管', accent: '#b56a62' },
  { key: 'stomach', name: '胃', short: '胃', accent: '#b56a62' },
  { key: 'duodenum', name: '十二指肠', short: '十二指肠', accent: '#b56a62' }
];

export const PART_ORDER = PARTS.map((p) => p.key);

export const PART_LABEL = { esophagus: '食管', stomach: '胃', duodenum: '十二指肠' };

export const EXAM_TYPES = {
  无痛胃镜: ['esophagus', 'stomach', 'duodenum'],
  普通胃镜: ['esophagus', 'stomach', 'duodenum'],
  食管镜: ['esophagus'],
  十二指肠镜: ['stomach', 'duodenum'],
  精查胃镜: ['esophagus', 'stomach', 'duodenum']
};

export const EXAM_TYPE_NAMES = Object.keys(EXAM_TYPES);

export const LESION_KINDS = [
  { key: '溃疡', color: '#b2352f', phrase: '溃疡，表面覆白苔' },
  { key: '息肉', color: '#a8761c', phrase: '息肉样隆起' },
  { key: '糜烂', color: '#bc6379', phrase: '黏膜糜烂' },
  { key: '隆起', color: '#5f7296', phrase: '黏膜隆起性病变' },
  { key: '狭窄', color: '#7d6a5b', phrase: '管腔狭窄' },
  { key: '静脉曲张', color: '#3f6f7a', phrase: '静脉曲张' }
];

export const KIND_COLOR = Object.fromEntries(LESION_KINDS.map((k) => [k.key, k.color]));
export const KIND_PHRASE = Object.fromEntries(LESION_KINDS.map((k) => [k.key, k.phrase]));

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const toPx = (pts) => pts.map(([x, y]) => ({ x: x * PANEL.w, y: y * PANEL.h }));

// ---------------------------------------------------------------- splines
// Catmull-Rom splines give smooth organic outlines without a d3 dependency
// in this module (rendering converts them to d3 line curves).

function resampleOpen(points, perSpan = 12) {
  if (points.length < 2) return points.slice();
  const p = [points[0], ...points, points[points.length - 1]];
  const out = [];
  for (let i = 1; i < p.length - 2; i++) {
    const p0 = p[i - 1];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2];
    for (let s = 0; s < perSpan; s++) {
      const t = s / perSpan;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x:
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
      });
    }
  }
  out.push({ ...points[points.length - 1] });
  return out;
}

function resampleClosed(points, perSpan = 12) {
  const n = points.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    for (let s = 0; s < perSpan; s++) {
      const t = s / perSpan;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x:
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
      });
    }
  }
  return out;
}

function tube(centerline, halfWidth, samplesPerSpan = 14) {
  const pts = resampleOpen(centerline, samplesPerSpan);
  const left = [];
  const right = [];
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    let dx = next.x - prev.x;
    let dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const w = typeof halfWidth === 'function' ? halfWidth(i / (pts.length - 1)) : halfWidth;
    left.push({ x: pts[i].x - dy * w, y: pts[i].y + dx * w });
    right.push({ x: pts[i].x + dy * w, y: pts[i].y - dx * w });
  }
  return [...left, ...right.reverse()];
}

// ---------------------------------------------------------------- anatomy

/**
 * Shrink a closed polygon toward its centroid by per-axis factors. A cheap,
 * stable "wall thickness" that keeps the lumen strictly inside its outline.
 */
function insetPolygon(points, fx, fy) {
  let cx = 0;
  let cy = 0;
  for (const p of points) {
    cx += p.x;
    cy += p.y;
  }
  cx /= points.length;
  cy /= points.length;
  const raw = points.map((p) => ({ x: cx + (p.x - cx) * (1 - fx), y: cy + (p.y - cy) * (1 - fy) }));
  return resampleClosed(raw, 2);
}
const ESOPHAGUS_CENTER = toPx([
  [0.5, 0.035],
  [0.484, 0.18],
  [0.507, 0.33],
  [0.489, 0.48],
  [0.514, 0.63],
  [0.5, 0.78],
  [0.522, 0.965]
]);
const ESOPHAGUS_INNER_WIDTH = (t) => 13 + 6.5 * Math.sin(Math.PI * t) - 2.5 * t;

const STOMACH_OUTER = toPx([
  [0.560, 0.095],
  [0.470, 0.050],
  [0.372, 0.068],
  [0.300, 0.130],
  [0.252, 0.222],
  [0.232, 0.325],
  [0.238, 0.428],
  [0.268, 0.525],
  [0.320, 0.612],
  [0.392, 0.686],
  [0.478, 0.742],
  [0.572, 0.772],
  [0.668, 0.778],
  [0.752, 0.752],
  [0.812, 0.700],
  [0.838, 0.640],
  [0.826, 0.585],
  [0.784, 0.552],
  [0.726, 0.540],
  [0.690, 0.505],
  [0.676, 0.430],
  [0.672, 0.345],
  [0.678, 0.255],
  [0.640, 0.160]
]);

const STOMACH_INNER = insetPolygon(STOMACH_OUTER, 0.055, 0.066);

/** Medial path from cardia to pylorus, used for rugal fold direction. */
const STOMACH_AXIS = toPx([
  [0.575, 0.155],
  [0.492, 0.19],
  [0.432, 0.268],
  [0.408, 0.362],
  [0.428, 0.456],
  [0.488, 0.534],
  [0.566, 0.588],
  [0.652, 0.602],
  [0.734, 0.604],
  [0.792, 0.61]
]);

const DUODENUM_CENTER = toPx([
  [0.30, 0.145],
  [0.40, 0.115],
  [0.505, 0.108],
  [0.590, 0.132],
  [0.652, 0.190],
  [0.688, 0.272],
  [0.702, 0.372],
  [0.702, 0.478],
  [0.688, 0.582],
  [0.652, 0.678],
  [0.590, 0.752],
  [0.505, 0.798],
  [0.412, 0.812],
  [0.324, 0.794],
  [0.248, 0.748],
  [0.192, 0.678],
  [0.160, 0.592],
  [0.148, 0.5]
]);
const DUODENUM_OUTER_WIDTH = (t) => 27 - 8 * t + 4 * Math.sin(Math.PI * t);
const DUODENUM_INNER_WIDTH = (t) => 22 - 7 * t + 3 * Math.sin(Math.PI * t);

const REGIONS = {
  esophagus: [
    { name: '食管上段', x: 0.5, y: 0.18 },
    { name: '食管中段', x: 0.5, y: 0.52 },
    { name: '食管下段', x: 0.51, y: 0.82 }
  ],
  stomach: [
    { name: '贲门', x: 0.585, y: 0.145 },
    { name: '胃底', x: 0.392, y: 0.212 },
    { name: '胃体', x: 0.360, y: 0.430 },
    { name: '胃角', x: 0.664, y: 0.462 },
    { name: '胃窦', x: 0.660, y: 0.655 },
    { name: '幽门', x: 0.778, y: 0.606 }
  ],
  duodenum: [
    { name: '球部', x: 0.352, y: 0.125 },
    { name: '降部', x: 0.702, y: 0.420 },
    { name: '水平部', x: 0.470, y: 0.800 },
    { name: '升部', x: 0.232, y: 0.735 }
  ]
};

/** Exported medial axis for texture generation. */
export function stomachAxis() {
  return resampleOpen(STOMACH_AXIS, 10);
}

const artCache = new Map();

export function getArt(part) {
  if (artCache.has(part)) return artCache.get(part);
  let lumen;
  let outline;
  let centerline;
  let pxPerCm;
  let regions = REGIONS[part].map((r) => ({ ...r, x: r.x * PANEL.w, y: r.y * PANEL.h }));
  let landmarks = [];

  if (part === 'esophagus') {
    centerline = ESOPHAGUS_CENTER;
    lumen = tube(centerline, ESOPHAGUS_INNER_WIDTH);
    outline = tube(centerline, (t) => ESOPHAGUS_INNER_WIDTH(t) + 9);
    pxPerCm = 13.4;
    landmarks = [
      { type: 'zline', points: zLine(centerline) },
      { type: 'hiatus', y: 0.905 }
    ];
  } else if (part === 'stomach') {
    centerline = resampleOpen(STOMACH_AXIS, 8);
    lumen = resampleClosed(STOMACH_INNER, 8);
    outline = resampleClosed(STOMACH_OUTER, 8);
    pxPerCm = 13.8;
    landmarks = [
      { type: 'incisura', points: incisuraPoints() },
      { type: 'pylorus', x: 296, y: 248, r: 9 }
    ];
  } else {
    centerline = DUODENUM_CENTER;
    lumen = tube(centerline, DUODENUM_INNER_WIDTH);
    outline = tube(centerline, DUODENUM_OUTER_WIDTH);
    pxPerCm = 15.2;
    landmarks = [
      { type: 'papilla', ...pointAt(centerline, 0.53, 6) },
      { type: 'flexure', ...pointAt(centerline, 0.86, -2) }
    ];
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of lumen) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const res = {
    part,
    lumen,
    outline,
    centerline,
    pxPerCm,
    regions,
    landmarks,
    bounds: { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
  };
  artCache.set(part, res);
  return res;
}

function zLine(centerline) {
  const pts = resampleOpen(centerline, 10);
  const i = Math.floor(pts.length * 0.88);
  const p = pts[i];
  const out = [];
  for (let k = -9; k <= 9; k++) {
    out.push({ x: p.x + k * 1.6, y: p.y + Math.sin(k * 0.9) * 2.4 + 3 });
  }
  return out;
}

function incisuraPoints() {
  const p = STOMACH_INNER[17];
  return [
    { x: p.x - 4, y: p.y + 6 },
    { x: p.x + 8, y: p.y + 2 },
    { x: p.x + 20, y: p.y - 2 }
  ];
}

/** Point along a polyline (resampled) plus a normal offset. */
function pointAt(centerline, t, offset = 0) {
  const pts = resampleOpen(centerline, 18);
  const idx = Math.min(pts.length - 1, Math.max(0, Math.round(t * (pts.length - 1))));
  const p = pts[idx];
  const q = pts[Math.min(pts.length - 1, idx + 1)];
  const r = pts[Math.max(0, idx - 1)];
  let dx = q.x - r.x;
  let dy = q.y - r.y;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  return { x: p.x - dy * offset, y: p.y + dx * offset };
}

export function regionName(part, x, y) {
  const art = getArt(part);
  let best = art.regions[0];
  let bestD = Infinity;
  for (const r of art.regions) {
    const d = (r.x - x) ** 2 + (r.y - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = r;
    }
  }
  return best.name;
}

export function lesionRadius(part, longCm, shortCm) {
  const art = getArt(part);
  const longest = Math.max(longCm || 0, shortCm || 0);
  return clamp((longest / 2) * art.pxPerCm, 7, 30);
}

/** Short normalised label used by the typography estimator. */
export function formatSize(longCm, shortCm) {
  const f = (v) => {
    if (!v && v !== 0) return '—';
    if (v < 1) return `${Math.round(v * 10)}mm`;
    return `${(Math.round(v * 10) / 10).toFixed(1)}cm`;
  };
  return `${f(longCm)}×${f(shortCm)}`;
}

export const SEVERITIES = [
  { key: 'high', name: '严重', color: '#b2332c', bg: '#fbebe9', order: 0 },
  { key: 'medium', name: '一般', color: '#9a6a12', bg: '#fbf3e2', order: 1 },
  { key: 'low', name: '提示', color: '#2c697f', bg: '#eaf3f7', order: 2 }
];

export const SEVERITY_MAP = Object.fromEntries(SEVERITIES.map((s) => [s.key, s]));

export const CHECK_TYPES = [
  { key: 'label-overflow', name: '标注文字溢出', defaultSeverity: 'low' },
  { key: 'label-outside', name: '标注框越界', defaultSeverity: 'low' },
  { key: 'label-covered', name: '标注遮挡病灶', defaultSeverity: 'medium' },
  { key: 'missing-part', name: '缺部位', defaultSeverity: 'high' },
  { key: 'marker-oob', name: '标记超界', defaultSeverity: 'high' },
  { key: 'label-overlap', name: '标注文字重叠', defaultSeverity: 'medium' },
  { key: 'size-mismatch', name: '病灶尺寸与正文不一致', defaultSeverity: 'medium' }
];

export const CHECK_NAME = {
  ...Object.fromEntries(CHECK_TYPES.map((c) => [c.key, c.name])),
  'label-overflow': '标注文字溢出',
  'label-outside': '标注框越界',
  'label-covered': '标注遮挡病灶'
};
