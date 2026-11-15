// Single source of truth for 北岭雪场's layout.
//
// Corridors are laid out first, as centrelines carrying a width profile and a
// design offset. The terrain module benches the mountain along those
// centrelines, and the trail analysis reads the same centrelines back off the
// benched surface — so every number the app reports (length, grade,
// cross-slope, coverage) follows from this file.
//
// World: x in [-320, 320], z in [-420, 400] metres. Summit north (z<0), village
// south (z≈380). Positive x is east.

import { naturalShape } from './natural.js';

// The tile is deliberately larger than the ski area: the outer ring falls away
// into haze, which keeps the mesh from ending in a cut edge behind the runs.
export const LAYOUT = {
  minX: -430,
  maxX: 430,
  minZ: -530,
  maxZ: 510,
};

export const BASE_STATIONS = [
  { id: 'A', name: '游客中心下站', x: 34, z: 386 },
  { id: 'B', name: '西麓下站', x: -196, z: 388 },
  { id: 'C', name: '北谷下站', x: 248, z: 386 },
];

// Each corridor runs from high on the mountain down toward a base station.
// Some carry deliberate defects for the review workflow:
//   T-01 top pitch exceeds 15° on a beginner run
//   T-04 pinches to 26 m through a gully
//   T-05 practice run opens on a steep pitch
//   T-06 fills a drift mid-traverse, creating an uphill (reverse grade)
export const CORRIDORS = [
  {
    id: 'T-02',
    name: '主槽雪道',
    level: 'intermediate',
    status: 'open',
    baseStation: 'A',
    season: { start: '12-01', end: '04-05' },
    dailyCapacity: 5200,
    notes: '雪场主槽，承担主要客流；下站与练习道共用。',
    widths: [[0, 34], [0.25, 36], [0.6, 40], [1, 36]],
    keys: [
      [-18, -380], [-14, -330], [-10, -272], [-2, -214], [4, -156],
      [6, -96], [8, -34], [10, 28], [12, 90], [14, 152],
      [16, 214], [20, 276], [26, 334], [30, 382],
    ],
  },
  {
    id: 'T-01',
    name: '云杉缓坡',
    level: 'beginner',
    status: 'open',
    baseStation: 'B',
    season: { start: '11-20', end: '03-31' },
    dailyCapacity: 3200,
    notes: '西麓初学者主道。上段落在陡坡上，坡度超限，需放缓。',
    widths: [[0, 46], [0.3, 48], [0.7, 50], [1, 46]],
    keys: [
      [-134, -40], [-154, 18], [-170, 76], [-180, 134], [-184, 192],
      [-184, 248], [-182, 300], [-184, 344], [-194, 380],
    ],
  },
  {
    id: 'T-03',
    name: '鹰嘴崖',
    level: 'advanced',
    status: 'open',
    baseStation: 'C',
    season: { start: '12-10', end: '03-20' },
    dailyCapacity: 1400,
    notes: '东侧高难道，上段穿越岩壁下的陡槽。',
    widths: [[0, 30], [0.3, 34], [0.7, 34], [1, 30]],
    keys: [
      [200, -380], [202, -330], [200, -274], [195, -216], [191, -158],
      [188, -104], [190, -44], [194, 16], [196, 76], [196, 136],
      [198, 196], [202, 256], [210, 314], [222, 362], [230, 384],
    ],
  },
  {
    id: 'T-04',
    name: '松涛环线',
    level: 'intermediate',
    status: 'draft',
    baseStation: 'B',
    season: { start: '11-25', end: '03-25' },
    dailyCapacity: 1600,
    notes: '西麓连接线，中段穿越窄沟，正在报审。',
    widths: [[0, 40], [0.4, 40], [0.47, 26], [0.54, 40], [1, 38]],
    keys: [
      [-272, -156], [-278, -96], [-276, -36], [-272, 24], [-270, 84],
      [-272, 144], [-276, 204], [-276, 262], [-270, 318], [-258, 368],
    ],
  },
  {
    id: 'T-05',
    name: '雪兔练习道',
    level: 'beginner',
    status: 'review',
    baseStation: 'A',
    season: { start: '11-15', end: '03-31' },
    dailyCapacity: 1400,
    notes: '拟新建的初学者练习道，线位已放缓，等待安全审核。',
    widths: [[0, 40], [0.5, 44], [1, 42]],
    // sited on the gentle lower bench: the beginner pod belongs at the bottom
    // of the mountain, not on the mid-face pitch
    // the beginner pod: sited in the flat ground between the main run and the
    // west station, which is where a resort would put a learning area
    keys: [
      [-150, 244], [-130, 268], [-106, 290], [-78, 310], [-48, 326],
      [-18, 338],
    ],
  },
  {
    id: 'T-06',
    name: '北谷连接道',
    level: 'advanced',
    status: 'review',
    baseStation: 'C',
    season: { start: '12-05', end: '03-28' },
    dailyCapacity: 1800,
    notes: '北谷横向连接线，横切风雪脊，正在报审。',
    widths: [[0, 32], [0.35, 34], [0.7, 32], [1, 30]],
    // joins T-03 high on the east face
    mergeInto: 'T-03',
    keys: [
      [62, -332], [94, -320], [126, -308], [152, -298], [176, -290],
      [188, -286],
    ],
  },
  {
    id: 'T-07',
    name: '鹰翼槽',
    level: 'advanced',
    status: 'closed',
    baseStation: 'C',
    season: { start: '12-15', end: '03-15' },
    dailyCapacity: 1100,
    notes: '雪崩防治施工封闭，预计 12 月下旬重开。',
    widths: [[0, 32], [0.5, 34], [1, 30]],
    // falls from the west shoulder across 云杉缓坡 — the crossing the review
    // workflow has to flag
    // falls from the west shoulder, crosses 云杉缓坡's upper pitch and ends
    // above the west station: the crossing the review workflow must flag
    keys: [
      // an east-west chute that crosses 云杉缓坡 square on about a third of
      // the way down: the plane crossing the review workflow has to flag
      [-290, 96], [-252, 118], [-214, 140], [-176, 162], [-138, 184],
      [-100, 206],
    ],
  },
];

// ------------------------------------------------------------- primitives

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerpv = (a, b, t) => a + (b - a) * t;

const smooth = (t) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a, b, c, d) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return { x: f(p0.x, p1.x, p2.x, p3.x), z: f(p0.z, p1.z, p2.z, p3.z) };
}

// Hermite interpolation over [u, value] keys. Interpolating a width (or a
// vertical offset) this way keeps the *rate of change* smooth, which is what a
// design profile needs.
function hermite(keys, u) {
  const uu = clamp(u, 0, 1);
  let i = 0;
  while (i < keys.length - 2 && uu > keys[i + 1][0]) i += 1;
  const k1 = keys[i];
  const k2 = keys[i + 1];
  const k0 = keys[Math.max(0, i - 1)];
  const k3 = keys[Math.min(keys.length - 1, i + 2)];
  const t = (uu - k1[0]) / Math.max(0.0001, k2[0] - k1[0]);
  const m1 = ((k2[1] - k0[1]) / Math.max(0.0001, k2[0] - k0[0])) * (k2[0] - k1[0]);
  const m2 = ((k3[1] - k1[1]) / Math.max(0.0001, k3[0] - k1[0])) * (k2[0] - k1[0]);
  const t2 = t * t;
  const t3 = t2 * t;
  return k1[1] * (2 * t3 - 3 * t2 + 1) + m1 * (t3 - 2 * t2 + t) + k2[1] * (-2 * t3 + 3 * t2) + m2 * (t3 - t2);
}

export function widthAt(corridor, u) {
  return hermite(corridor.widths, u);
}

// Smooth centreline through the corridor keys, resampled every `step` metres.
export function corridorPath(corridor, step = 4) {
  const pts = corridor.keys.map(([x, z]) => ({ x, z }));
  const dense = [];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const span = Math.hypot(p2.x - p1.x, p2.z - p1.z);
    const n = Math.max(2, Math.ceil(span / 2));
    for (let k = 0; k < n; k += 1) dense.push(catmull(p0, p1, p2, p3, k / n));
  }
  dense.push(pts[pts.length - 1]);

  const cum = [0];
  for (let i = 1; i < dense.length; i += 1) {
    cum[i] = cum[i - 1] + Math.hypot(dense[i].x - dense[i - 1].x, dense[i].z - dense[i - 1].z);
  }
  const total = cum[cum.length - 1];
  const count = Math.max(2, Math.round(total / step));
  const out = [];
  let cur = 0;
  for (let i = 0; i <= count; i += 1) {
    const target = (total * i) / count;
    while (cur < dense.length - 2 && cum[cur + 1] < target) cur += 1;
    const span = Math.max(0.0001, cum[cur + 1] - cum[cur]);
    const t = clamp((target - cum[cur]) / span, 0, 1);
    out.push({
      x: lerpv(dense[cur].x, dense[cur + 1].x, t),
      z: lerpv(dense[cur].z, dense[cur + 1].z, t),
      s: target,
    });
  }
  return { path: out, length: total };
}

export const CORRIDOR_GEOM = CORRIDORS.map((c) => {
  const { path, length } = corridorPath(c, 5);
  return { corridor: c, path, length };
});

// ------------------------------------------------------------- spatial index

// A bucket grid over each corridor's samples keeps terrain evaluation cheap
// enough to build a 60k-vertex mesh. Samples are registered into every cell
// within MAX_QUERY metres, so a query anywhere inside a corridor's influence
// always finds its nearest sample — a grid that under-registers would silently
// fall back to natural ground and put a step in the middle of a piste.
const CELL = 40;
export const MAX_QUERY = 120;
const RADIUS = Math.ceil(MAX_QUERY / CELL);

const GRIDS = CORRIDOR_GEOM.map((geom) => {
  const buckets = new Map();
  geom.path.forEach((p, i) => {
    const cx = Math.floor(p.x / CELL);
    const cz = Math.floor(p.z / CELL);
    for (let dx = -RADIUS; dx <= RADIUS; dx += 1) {
      for (let dz = -RADIUS; dz <= RADIUS; dz += 1) {
        const key = `${cx + dx},${cz + dz}`;
        const list = buckets.get(key);
        if (list) list.push(i);
        else buckets.set(key, [i]);
      }
    }
  });
  return buckets;
});

// Nearest point on a corridor's polyline, with the projected point, arc
// position and signed lateral offset. Returns null past `maxD`.
export function nearestOnPath(geomIndex, x, z, maxD = MAX_QUERY) {
  const geom = CORRIDOR_GEOM[geomIndex];
  const { path, length } = geom;
  const list = GRIDS[geomIndex].get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`);
  if (!list) return null;

  let bestD2 = Infinity;
  let bestI = -1;
  for (const i of list) {
    const p = path[i];
    const d2 = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d2 < bestD2) {
      bestD2 = d2;
      bestI = i;
    }
  }
  if (bestI < 0 || bestD2 > maxD * maxD) return null;

  let d = Math.sqrt(bestD2);
  let s = path[bestI].s;
  let px = path[bestI].x;
  let pz = path[bestI].z;
  let dir = { x: 0, z: 0 };

  for (const j of [bestI - 1, bestI]) {
    if (j < 0 || j >= path.length - 1) continue;
    const a = path[j];
    const b = path[j + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const seg2 = dx * dx + dz * dz;
    if (seg2 < 0.0001) continue;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / seg2, 0, 1);
    const qx = a.x + dx * t;
    const qz = a.z + dz * t;
    const dd = Math.hypot(x - qx, z - qz);
    if (dd <= d + 1e-6) {
      d = dd;
      s = lerpv(a.s, b.s, t);
      px = qx;
      pz = qz;
      const sl = Math.hypot(dx, dz) || 1;
      dir = { x: dx / sl, z: dz / sl };
    }
  }

  return { d, s, u: s / Math.max(1, length), px, pz, side: (x - px) * -dir.z + (z - pz) * dir.x };
}

// -------------------------------------------------------------- grade lines

// The graded bench along each corridor.
//
// A piste follows the natural fall line closely — that is what keeps cut and
// fill shallow — but is graded to a steady line over ~130 m so it does not
// inherit every bump in the hill. A small per-run design offset then expresses
// the designer's intent: easing a beginner pitch, or filling across a drift.
//
// The offsets are also where deliberate defects live: T-06's fill across the
// wind drift is what makes the traverse climb.
const SMOOTH_PASSES = 3;
const SMOOTH_WINDOW = 13;

const OFFSETS = {
  'T-01': [[0, 3], [0.2, 2.5], [0.35, 0], [0.7, 0], [1, 0]],
  'T-02': [[0, 0], [0.5, -1], [1, 0]],
  'T-03': [[0, 0], [0.5, -1], [1, 0]],
  'T-04': [[0, 0], [0.5, -1], [1, 0]],
  'T-05': [[0, 0], [0.25, -2], [0.6, -2], [1, 0]],
  'T-06': [[0, 0], [0.25, 0], [0.42, 7], [0.58, 7], [0.75, 0], [1, 0]],
  'T-07': [[0, 0], [1, 0]],
};

function smoothedNatural(geom) {
  const raw = geom.path.map((p) => naturalShape(p.x, p.z));
  let vals = raw;
  for (let pass = 0; pass < SMOOTH_PASSES; pass += 1) {
    vals = vals.map((_, i) => {
      let sum = 0;
      let n = 0;
      for (let k = -SMOOTH_WINDOW; k <= SMOOTH_WINDOW; k += 1) {
        sum += vals[clamp(i + k, 0, vals.length - 1)];
        n += 1;
      }
      return sum / n;
    });
  }
  // tie the ends back to natural ground so the piste merges into the hill
  const tail = 24;
  return vals.map((v, i) => {
    const endT = clamp(Math.min(i, vals.length - 1 - i) / tail, 0, 1);
    return lerpv(raw[i], v, 0.2 + 0.8 * smooth(endT));
  });
}

const BENCH_BASE = CORRIDOR_GEOM.map((geom) => smoothedNatural(geom));

function buildBench(geom, base) {
  const keys = OFFSETS[geom.corridor.id] || [[0, 0], [1, 0]];
  return base.map((v, i) => v + hermite(keys, i / Math.max(1, base.length - 1)));
}

const BENCH = CORRIDOR_GEOM.map((geom, i) => buildBench(geom, BENCH_BASE[i]));

// Sample an array keyed on arc position.
export function sampleArc(values, geom, s) {
  const n = values.length;
  const t = clamp(s / Math.max(1, geom.length), 0, 1) * (n - 1);
  const i = Math.floor(t);
  const f = t - i;
  return lerpv(values[clamp(i, 0, n - 1)], values[clamp(i + 1, 0, n - 1)], f);
}

// Graded bench elevation at arc position s on corridor `geomIndex`.
export function benchElev(geomIndex, s) {
  return sampleArc(BENCH[geomIndex], CORRIDOR_GEOM[geomIndex], s);
}

// Re-pin a corridor that joins another, so the two benches meet at the
// junction instead of stepping. Applied after the base benches exist.
CORRIDOR_GEOM.forEach((geom, i) => {
  const into = geom.corridor.mergeInto;
  if (!into) return;
  const target = CORRIDOR_GEOM.findIndex((g) => g.corridor.id === into);
  if (target < 0) return;
  const tail = geom.path[geom.path.length - 1];
  const n = nearestOnPath(target, tail.x, tail.z, 200);
  if (!n) return;
  const wanted = benchElev(target, n.s) - 1;
  const have = BENCH[i][BENCH[i].length - 1];
  const shift = wanted - have;
  // taper the re-pin upstream so the run keeps its own line for most of its
  // length but is already at the host's level before the two surfaces touch
  const m = BENCH[i].length;
  BENCH[i] = BENCH[i].map((v, k) => v + shift * smooth((k / (m - 1) - 0.32) / 0.68));
});

// The groomed centreline as trail keypoints, carrying the width profile. This
// is what the app loads as a trail.
export function corridorCenterline(corridor, count = 16) {
  const geom = CORRIDOR_GEOM.find((g) => g.corridor.id === corridor.id);
  const { path, length } = geom;
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const target = length * t;
    let k = 0;
    while (k < path.length - 1 && path[k].s < target) k += 1;
    out.push({ x: path[k].x, z: path[k].z, w: Math.round(widthAt(corridor, t)) });
  }
  return out;
}
