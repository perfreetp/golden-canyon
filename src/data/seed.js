// Seed state for 北岭雪场 snow-ops console.
//
// Trail geometry is generated from the layout module so that the centrelines
// the app plots are exactly the corridors the terrain was benched to.

import { CORRIDORS, corridorCenterline, widthAt, BASE_STATIONS } from '../lib/layout.js';

export const SEED_TRAILS = CORRIDORS.map((c) => ({
  id: c.id,
  name: c.name,
  level: c.level,
  status: c.status,
  width: Math.round(widthAt(c, 0.35)),
  baseStation: c.baseStation,
  season: c.season,
  dailyCapacity: c.dailyCapacity,
  notes: c.notes,
  centerline: corridorCenterline(c, 16).map((p) => ({ x: Math.round(p.x * 10) / 10, z: Math.round(p.z * 10) / 10, w: p.w })),
  review: null,
}));

// Snow guns, laid out along each run's edge at roughly one per effective
// radius, which is what gives a piste complete coverage. Runs still in design
// or review get a deliberately incomplete plan, and the closed run has none.
function arcPoints(centerline, count) {
  const pts = centerline;
  const cum = [0];
  for (let i = 1; i < pts.length; i += 1) {
    cum[i] = cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
  }
  const total = cum[cum.length - 1];
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const target = (total * (i + 0.5)) / count;
    let k = 0;
    while (k < cum.length - 2 && cum[k + 1] < target) k += 1;
    const span = Math.max(0.0001, cum[k + 1] - cum[k]);
    const f = Math.min(1, Math.max(0, (target - cum[k]) / span));
    const p = {
      x: pts[k].x + (pts[k + 1].x - pts[k].x) * f,
      z: pts[k].z + (pts[k + 1].z - pts[k].z) * f,
      w: pts[k].w || 36,
    };
    const a = pts[k];
    const b = pts[k + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    p.nx = -dz / len;
    p.nz = dx / len;
    out.push(p);
  }
  return out;
}

const guns = [];
let gunSeq = 0;

const layRun = (trailId, { skip = [], count, side = 1 }) => {
  const trail = SEED_TRAILS.find((t) => t.id === trailId);
  const pts = arcPoints(trail.centerline, count);
  pts.forEach((p, i) => {
    if (skip.includes(i)) return;
    // every fourth post is a water lance for precision on the fringes
    const type = i % 4 === 3 ? 'lance' : 'fan';
    const off = p.w / 2 + 3;
    const dir = i % 2 === 0 ? side : -side;
    gunSeq += 1;
    guns.push({
      id: `G-${String(gunSeq).padStart(4, '0')}`,
      trailId,
      type,
      x: Math.round(p.x + p.nx * off * dir),
      z: Math.round(p.z + p.nz * off * dir),
    });
  });
};

// covered runs
layRun('T-02', { count: 14 });
layRun('T-01', { count: 9 });
layRun('T-03', { count: 14 });
// the clean beginner pod, ready for sign-off
layRun('T-05', { count: 4 });
// the connector is covered, but still under review for its reverse grade
layRun('T-06', { count: 4 });
// in design: the plan leaves the narrow middle of the gully section uncovered
layRun('T-04', { count: 9, skip: [4, 5] });
// closed: no equipment on the hill

export const SEED_GUNS = guns;

export const SEED_SNOW = {
  'T-01': { pct: 94, targetHours: 18, lastRun: '11-18 04:20' },
  'T-02': { pct: 86, targetHours: 26, lastRun: '11-18 03:10' },
  'T-03': { pct: 71, targetHours: 22, lastRun: '11-18 02:40' },
  'T-04': { pct: 38, targetHours: 16, lastRun: '11-17 23:50' },
  'T-05': { pct: 14, targetHours: 20, lastRun: '11-17 21:30' },
  'T-06': { pct: 44, targetHours: 14, lastRun: '11-17 22:15' },
  'T-07': { pct: 0, targetHours: 0, lastRun: '—' },
};

export const SEED_INCIDENTS = [
  { id: 'I-001', trailId: 'T-02', at: '11-16 10:42', type: '碰撞', severity: 'minor', note: '中级道中段两名滑雪者追尾，一人轻微擦伤，已现场处置。' },
  { id: 'I-002', trailId: 'T-03', at: '11-15 14:20', type: '摔伤', severity: 'moderate', note: '陡槽段单板滑手摔倒致腕部扭伤，巡逻队 6 分钟内到达并送医。' },
  { id: 'I-003', trailId: 'T-01', at: '11-14 09:05', type: '越界', severity: 'minor', note: '初学者越过西侧防护网，已由巡段人员带回。' },
  { id: 'I-004', trailId: 'T-02', at: '11-12 15:36', type: '设备', severity: 'moderate', note: '主槽下站闸机故障导致排队拥堵 25 分钟，已抢修。' },
];

export const SEED_LOG = [
  { id: 'L-01', at: '11-18 08:12', actor: '规划组 · 陈岚', kind: 'design', trailId: 'T-04', trailName: '松涛环线', summary: '窄沟段宽度收窄至 26 m，等待安全审核' },
  { id: 'L-02', at: '11-17 19:40', actor: '规划组 · 陈岚', kind: 'design', trailId: 'T-05', trailName: '雪兔练习道', summary: '练习道移入西侧缓坡场坪，坡度峰值由 30.2° 降至 13.9°，送审' },
  { id: 'L-03', at: '11-17 16:05', actor: '造雪组 · 赵岩', kind: 'gun', trailId: 'T-03', trailName: '鹰嘴崖', summary: '新增造雪炮 1 台，覆盖陡槽下段' },
  { id: 'L-04', at: '11-16 11:20', actor: '安全主管 · 周珂', kind: 'review', trailId: 'T-02', trailName: '主槽雪道', summary: '审核通过，转已开放' },
  { id: 'L-05', at: '11-16 09:02', actor: '安全主管 · 周珂', kind: 'status', trailId: 'T-07', trailName: '鹰翼槽', summary: '封闭：雪崩防治网施工' },
];

export const ROLES = {
  planner: '规划组 · 陈岚',
  snow: '造雪组 · 赵岩',
  safety: '安全主管 · 周珂',
};

export const ROLE = ROLES.planner;
export const REVIEWER = ROLES.safety;
export { BASE_STATIONS };
