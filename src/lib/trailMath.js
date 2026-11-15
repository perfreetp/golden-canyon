import { heightAt } from './terrain.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const toDeg = (v) => (Math.atan(v) * 180) / Math.PI;
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export const LEVELS = {
  beginner: { key: 'beginner', label: '初级道', short: '初', color: '#4ade9b' },
  intermediate: { key: 'intermediate', label: '中级道', short: '中', color: '#5aa9ff' },
  advanced: { key: 'advanced', label: '高级道', short: '高', color: '#ff6b6b' },
};

export const STATUSES = {
  draft: { label: '设计中', color: '#f2b84b', bg: 'rgba(242,184,75,.14)' },
  review: { label: '待审核', color: '#7aa8ff', bg: 'rgba(122,168,255,.14)' },
  open: { label: '已开放', color: '#3ddc97', bg: 'rgba(61,220,151,.14)' },
  closed: { label: '封闭', color: '#98a6bd', bg: 'rgba(152,166,189,.14)' },
};

export const GUN_TYPES = {
  fan: { label: '造雪炮', range: 58, icon: 'fan' },
  lance: { label: '水枪', range: 40, icon: 'lance' },
};

// ---------------------------------------------------------------- geometry

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a, b, c, d) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return {
    x: f(p0.x, p1.x, p2.x, p3.x),
    z: f(p0.z, p1.z, p2.z, p3.z),
  };
}

// Resample a keypoint polyline into evenly spaced samples carrying
// elevation, width and a distance coordinate.
export function resample(centerline, baseWidth = 40, step = 5) {
  const pts = centerline.map((p) => ({ x: p.x, z: p.z, w: p.w || baseWidth }));
  if (pts.length < 2) {
    return pts.map((p, i) => ({
      x: p.x,
      z: p.z,
      y: heightAt(p.x, p.z),
      width: p.w,
      s: i * step,
    }));
  }
  const dense = [];
  const n = pts.length;
  for (let i = 0; i < n - 1; i += 1) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    const span = dist2(p1, p2);
    const steps = Math.max(2, Math.ceil(span / 2));
    for (let k = 0; k < steps; k += 1) {
      const t = k / steps;
      const p = catmullRom(p0, p1, p2, p3, t);
      dense.push({ x: p.x, z: p.z, width: lerp(p1.w, p2.w, t) });
    }
  }
  dense.push({ x: pts[n - 1].x, z: pts[n - 1].z, width: pts[n - 1].w });

  let acc = 0;
  dense[0].sRaw = 0;
  for (let i = 1; i < dense.length; i += 1) {
    acc += Math.hypot(dense[i].x - dense[i - 1].x, dense[i].z - dense[i - 1].z);
    dense[i].sRaw = acc;
  }
  const total = acc;
  if (total < 1) return dense.map((p) => ({ ...p, y: heightAt(p.x, p.z) }));

  const out = [];
  const count = Math.max(2, Math.round(total / step));
  let cursor = 0;
  for (let i = 0; i <= count; i += 1) {
    const target = (total * i) / count;
    while (cursor < dense.length - 2 && dense[cursor + 1].sRaw < target) cursor += 1;
    const a = dense[cursor];
    const b = dense[cursor + 1];
    const t = clamp((target - a.sRaw) / Math.max(0.0001, b.sRaw - a.sRaw), 0, 1);
    const x = lerp(a.x, b.x, t);
    const z = lerp(a.z, b.z, t);
    out.push({
      x,
      z,
      y: heightAt(x, z),
      width: lerp(a.width, b.width, t),
      s: (total * i) / count,
    });
  }
  return out;
}

function smoothSeries(values, radius = 2) {
  return values.map((_, i) => {
    let sum = 0;
    let w = 0;
    for (let k = -radius; k <= radius; k += 1) {
      sum += values[clamp(i + k, 0, values.length - 1)];
      w += 1;
    }
    return sum / w;
  });
}

export function analyzeTrail(trail, guns = [], { step = 5 } = {}) {
  const samples = resample(trail.centerline, trail.width || 40, step);
  const width = trail.width || 40;

  if (samples.length < 3) {
    return {
      samples: samples.map((s, i) => ({ ...s, index: i, grade: 0, slope: 0, reverse: false, covered: false, crossPct: 0 })),
      segments: samples.map((s, i) => ({ ...s, index: i, grade: 0, slope: 0, reverse: false, covered: false, crossPct: 0 })),
      length: 0,
      drop: 0,
      avgGrade: 0,
      maxGrade: 0,
      maxCross: 0,
      minWidth: width,
      warnings: [],
      uncovered: [],
      coveredPct: 0,
      gunStats: guns.map((g) => ({ ...g, covered: 0 })),
    };
  }

  let length = 0;
  for (let i = 1; i < samples.length; i += 1) {
    length += Math.hypot(samples[i].x - samples[i - 1].x, samples[i].z - samples[i - 1].z);
  }
  const drop = samples[0].y - samples[samples.length - 1].y;

  // uphill gradient per sample over a ~20 m window
  const rawGrades = samples.map((p, i) => {
    const a = samples[Math.max(0, i - 2)];
    const b = samples[Math.min(samples.length - 1, i + 2)];
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    return d < 0.5 ? 0 : (b.y - a.y) / d;
  });
  const grades = smoothSeries(rawGrades, 2);

  const crossSlopes = samples.map((p, i) => {
    const a = samples[Math.max(0, i - 2)];
    const b = samples[Math.min(samples.length - 1, i + 2)];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    const half = p.width / 2;
    const hL = heightAt(p.x + nx * half, p.z + nz * half);
    const hR = heightAt(p.x - nx * half, p.z - nz * half);
    return Math.abs((hL - hR) / p.width) * 100;
  });

  const gunStats = guns.map((g) => ({
    ...g,
    typeLabel: GUN_TYPES[g.type]?.label || '造雪炮',
    range: g.range || GUN_TYPES[g.type]?.range || 55,
    covered: 0,
  }));
  const covered = samples.map((p) => {
    for (const g of gunStats) {
      const d = Math.hypot(p.x - g.x, p.z - g.z);
      const dy = Math.abs(p.y - heightAt(g.x, g.z));
      if (d <= g.range && dy <= 45) return true;
    }
    return false;
  });
  for (const g of gunStats) {
    g.covered = samples.filter((p) => {
      const d = Math.hypot(p.x - g.x, p.z - g.z);
      const dy = Math.abs(p.y - heightAt(g.x, g.z));
      return d <= g.range && dy <= 45;
    }).length;
  }

  const segments = samples.map((p, i) => {
    const grade = grades[i];
    return {
      ...p,
      index: i,
      grade,
      slope: -toDeg(grade), // positive = downhill degrees
      crossPct: crossSlopes[i],
      reverse: -toDeg(grade) < -0.3,
      covered: covered[i],
    };
  });

  const avgGrade = length > 0 ? toDeg(drop / length) : 0;
  const maxGrade = Math.max(...segments.map((s) => s.slope));
  const maxCross = Math.max(...crossSlopes);
  const minWidth = Math.min(...samples.map((s) => s.width));

  const coveredLength = segments.reduce((acc, s, i) => {
    if (i === 0) return acc;
    const prev = segments[i - 1];
    if (s.covered && prev.covered) return acc + (s.s - prev.s);
    return acc;
  }, 0);
  const coveredPct = length > 0 ? (coveredLength / length) * 100 : 0;

  const intervals = (predicate) => {
    const out = [];
    let start = null;
    for (let i = 0; i < segments.length; i += 1) {
      const ok = predicate(segments[i], i);
      if (ok && start === null) start = i;
      if (!ok && start !== null) {
        out.push([start, i - 1]);
        start = null;
      }
    }
    if (start !== null) out.push([start, segments.length - 1]);
    return out;
  };

  const warnings = [];
  if (trail.level === 'beginner') {
    for (const [a, b] of intervals((s) => s.slope > 15)) {
      if (b <= a) continue;
      const slice = segments.slice(a, b + 1);
      warnings.push({
        type: 'grade',
        severity: 'warn',
        title: '初级道坡度超限',
        detail: `该段坡度最高 ${Math.max(...slice.map((s) => s.slope)).toFixed(1)}°，超过初级道 15° 上限，新手易失控，建议调整线位或局部放缓。`,
        startIdx: a,
        endIdx: b,
        startS: segments[a].s,
        endS: segments[b].s,
        peak: Math.max(...slice.map((s) => s.slope)),
      });
    }
  }
  if (trail.level === 'advanced') {
    for (const [a, b] of intervals((s) => s.reverse)) {
      if (b <= a) continue;
      const slice = segments.slice(a, b + 1);
      warnings.push({
        type: 'reverse',
        severity: 'warn',
        title: '高级道出现反坡',
        detail: `该段存在 ${Math.abs(Math.min(...slice.map((s) => s.slope))).toFixed(1)}° 上坡，高速滑行重心突变，需调整线位消除反坡。`,
        startIdx: a,
        endIdx: b,
        startS: segments[a].s,
        endS: segments[b].s,
        peak: Math.min(...slice.map((s) => s.slope)),
      });
    }
  }
  for (const [a, b] of intervals((s) => s.width < 30)) {
    if (b <= a) continue;
    const slice = segments.slice(a, b + 1);
    warnings.push({
      type: 'width',
      severity: 'warn',
      title: '会车宽度不足',
      detail: `该段宽度最小 ${Math.min(...slice.map((s) => s.width)).toFixed(0)} m，低于 30 m，双向会车与救护通行存在风险，建议局部加宽或设为单向。`,
      startIdx: a,
      endIdx: b,
      startS: segments[a].s,
      endS: segments[b].s,
      peak: Math.min(...slice.map((s) => s.width)),
      unit: 'm',
    });
  }

  const uncovered = [];
  for (const [a, b] of intervals((s) => !s.covered)) {
    if (b <= a) continue;
    uncovered.push({
      startIdx: a,
      endIdx: b,
      startS: segments[a].s,
      endS: segments[b].s,
      length: segments[b].s - segments[a].s,
    });
  }

  return {
    samples,
    segments,
    length,
    drop,
    avgGrade,
    maxGrade,
    maxCross,
    minWidth,
    warnings,
    uncovered,
    coveredPct,
    coveredLength,
    gunStats,
  };
}

// ------------------------------------------------------------- conflicts

function segIntersect(a, b, c, d) {
  const r = { x: b.x - a.x, z: b.z - a.z };
  const s = { x: d.x - c.x, z: d.z - c.z };
  const denom = r.x * s.z - r.z * s.x;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((c.x - a.x) * s.z - (c.z - a.z) * s.x) / denom;
  const u = ((c.x - a.x) * r.z - (c.z - a.z) * r.x) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: a.x + r.x * t, z: a.z + r.z * t, sa: a.s, sb: c.s };
}

export function seasonsOverlap(a, b) {
  const order = (md) => {
    const [m, d] = (md || '11-15').split('-').map(Number);
    return (m - 8) * 31 + d;
  };
  const span = (t) => {
    const s = order(t.season?.start);
    let e = order(t.season?.end);
    if (e < s) e += 12 * 31;
    return [s, e];
  };
  const [s1, e1] = span(a);
  const [s2, e2] = span(b);
  return s1 <= e2 && s2 <= e1;
}

export function detectConflicts(trails, analyses) {
  const live = trails.filter((t) => (t.centerline || []).length >= 2);
  const issues = [];

  for (let i = 0; i < live.length; i += 1) {
    for (let j = i + 1; j < live.length; j += 1) {
      const ta = live[i];
      const tb = live[j];
      const aa = analyses[ta.id];
      const ab = analyses[tb.id];
      if (!aa || !ab || !aa.samples.length || !ab.samples.length) continue;
      const overlap = seasonsOverlap(ta, tb);
      const bothOpen = ta.status === 'open' && tb.status === 'open';

      // a merge is where one run's lower end runs into the other's body;
      // detect it first so a crossing at the same spot is not double-reported
      const mergeHit = findMerge(aa, ta, ab, tb) || findMerge(ab, tb, aa, ta);

      // plane crossings
      const hits = [];
      const A = aa.samples;
      const B = ab.samples;
      for (let x = 0; x < A.length - 1; x += 1) {
        for (let y = 0; y < B.length - 1; y += 1) {
          const hit = segIntersect(A[x], A[x + 1], B[y], B[y + 1]);
          if (!hit) continue;
          if (hits.some((h) => Math.hypot(h.x - hit.x, h.z - hit.z) < 60)) continue;
          if (mergeHit && Math.hypot(mergeHit.x - hit.x, mergeHit.z - hit.z) < 60) continue;
          hits.push(hit);
        }
      }

      if (mergeHit) {
        const { src, dst } = mergeHit;
        issues.push({
          id: `MG-${src.id}-${dst.id}`,
          kind: 'merge',
          x: mergeHit.x,
          z: mergeHit.z,
          trails: [src.id, dst.id],
          label: `${src.name} 汇入 ${dst.name}`,
          detail: overlap
            ? `汇入点缺少缓冲段，主道滑行者与汇入人流存在冲突${bothOpen ? '，高峰时段需安排引导员' : ''}。建议增设汇入减速带与观察区。`
            : '主道与支线开放季不重叠，可按分时开放处理。',
          severity: overlap ? (bothOpen ? 'severe' : 'warn') : 'info',
          seasonOverlap: overlap,
        });
      }

      for (const h of hits) {
        issues.push({
          id: `CX-${ta.id}-${tb.id}-${Math.round(h.x)}-${Math.round(h.z)}`,
          kind: 'crossing',
          x: h.x,
          z: h.z,
          trails: [ta.id, tb.id],
          label: `${ta.name} × ${tb.name} 平面交叉`,
          detail: overlap
            ? `交汇处需设置减速标识、防护网与交汇瞭望岗${bothOpen ? '；两条雪道当前均为开放状态，交叉口冲突等级最高' : ''}。`
            : '两条雪道开放季不重叠，交汇口可按分时使用处理。',
          severity: overlap ? (bothOpen ? 'severe' : 'warn') : 'info',
          seasonOverlap: overlap,
        });
      }
    }
  }

  // base-station queue pressure
  const groups = {};
  for (const t of trails) {
    if (!t.baseStation || t.status === 'closed') continue;
    (groups[t.baseStation] ||= []).push(t);
  }
  for (const [station, list] of Object.entries(groups)) {
    if (list.length < 2) continue;
    const sharing = list.filter((t) => list.some((u) => u !== t && seasonsOverlap(t, u)));
    if (sharing.length < 2) continue;
    const unique = [...new Map(sharing.map((t) => [t.id, t])).values()];
    const totalCap = unique.reduce((s, t) => s + (t.dailyCapacity || 0), 0);
    issues.push({
      id: `QS-${station}`,
      kind: 'queue',
      station,
      trails: unique.map((t) => t.id),
      label: `${station} 下站排队冲突`,
      detail: `${unique.length} 条雪道同季共用 ${station} 下站，合计日均承载 ${totalCap.toLocaleString('zh-CN')} 人次，${
        totalCap > 8600 ? '超过下站闸机设计通行能力 8,600 人次/日，建议错峰开放或增开索道分流。' : '已接近闸机设计通行能力 8,600 人次/日，建议错峰开放。'
      }`,
      severity: totalCap > 8600 ? 'severe' : 'warn',
      capacity: totalCap,
    });
  }
  return issues;
}

// Does the tail of `src` land on the body of `dst`? Returns the join point.
function findMerge(srcA, src, dstA, dst) {
  if (!srcA.samples.length || !dstA.samples.length) return null;
  const tail = srcA.samples.filter((p) => p.s > srcA.length * 0.78);
  // "into the body" means well inside the other run, not its own bottom end:
  // two trails that share a base station are a queue issue, not a merge
  const body = dstA.samples.filter((p) => p.s < dstA.length * 0.78);
  let best = null;
  for (const p of tail) {
    for (const q of body) {
      const d = Math.hypot(p.x - q.x, p.z - q.z);
      if (!best || d < best.d) best = { d, x: q.x, z: q.z };
    }
  }
  if (!best || best.d > 20) return null;
  return { x: best.x, z: best.z, src, dst };
}

// ------------------------------------------------------- snowcat / patrol

export function buildOperations(trail, analysis, conflictIssues = []) {
  const segs = analysis.segments || [];
  const steep = segs.filter((s) => s.slope > 22).length;
  const cats = Math.max(1, Math.ceil(analysis.length / 180));

  const catWindows = [];
  const startHours = [17.5, 21, 0.5, 4];
  for (let i = 0; i < cats; i += 1) {
    const from = (analysis.length * i) / cats;
    const to = (analysis.length * (i + 1)) / cats;
    catWindows.push({
      id: `${trail.id}-CAT-${i + 1}`,
      machine: `PB-${300 + i + (trail.id.charCodeAt(1) || 0) % 5}`,
      from: Math.round(from),
      to: Math.round(to),
      window: `${String(Math.floor(startHours[i % 4])).padStart(2, '0')}:${startHours[i % 4] % 1 ? '30' : '00'}–${String(
        Math.floor(startHours[i % 4] + 2) % 24,
      ).padStart(2, '0')}:${startHours[i % 4] % 1 ? '30' : '00'}`,
      note: steep > 0 ? '陡坡段（>22°）需用绞盘辅助' : '常规压雪',
    });
  }

  const posts = Math.max(1, Math.round(analysis.length / 320));
  const patrol = [];
  for (let i = 0; i < posts; i += 1) {
    const s = (analysis.length * (i + 0.5)) / posts;
    patrol.push({
      id: `${trail.id}-PT-${i + 1}`,
      post: `巡段 ${i + 1}`,
      station: `${Math.round(s)} m 处`,
      shift: i % 2 === 0 ? '08:30–12:30' : '12:30–16:30',
      headcount: analysis.maxGrade > 25 ? 2 : 1,
      duty: analysis.maxGrade > 25 ? '陡坡瞭望 + 急救值守' : '常规巡滑 + 雪面检查',
    });
  }

  return {
    cats: catWindows,
    patrol,
    conflictNotes: conflictIssues.filter((c) => c.kind !== 'queue' && c.trails.includes(trail.id)),
    generatedAt: null,
  };
}
