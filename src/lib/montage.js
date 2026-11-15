/**
 * 国际 10-20 系统布点解算器
 * 通过"球面弹簧松弛"求解 21 个标准电极 + 双侧耳垂参考点，
 * 弹簧目标长度采用成人临床常用弦长（cm），保证左右镜像严格对称。
 */
import { scalpPoint, dirFromAngles, normalize, dist, HEAD, projectToScalp, dirOfPoint, sub, cross, dot } from './headgeo.js';

const D2R = Math.PI / 180;

/** 自由节点：theta 自头顶起算，phi 自正前方转向左侧（度） */
const SEEDS = {
  // 中线
  Fpz: [72, 0],
  Fz: [36, 0],
  Cz: [0, 0],
  Pz: [36, 180],
  Oz: [72, 180],
  // 左侧（右侧镜像）
  Fp1: [74, 22],
  F3: [40, 34],
  C3: [52, 64],
  P3: [44, 148],
  O1: [74, 152],
  F7: [70, 64],
  T3: [88, 90],
  T5: [104, 112],
  A1: [94, 96],
};

const PAIRS = [['Fp1', 'Fp2'], ['F3', 'F4'], ['C3', 'C4'], ['P3', 'P4'], ['O1', 'O2'],
  ['F7', 'F8'], ['T3', 'T4'], ['T5', 'T6'], ['A1', 'A2']];
const MIDLINE = ['Fpz', 'Fz', 'Cz', 'Pz', 'Oz'];

const mirrorPhi = (p) => (p > 0 ? -p : p);

const clampTheta = (node, theta) => {
  // 各方向的最大下探角（避免落到脸上或脖子上）
  if (node.startsWith('A') || node.startsWith('T')) return Math.min(theta, 196);
  if (node.startsWith('Fp')) return Math.min(theta, 118);
  if (node.startsWith('O')) return Math.min(theta, 275);
  return Math.min(theta, 214);
};

function dirFromThetaPhi(theta, phi) {
  return dirFromAngles(theta, phi);
}

/** 求某个方向下头皮点到球心的弧面距离（用于把弦长换算成角度步长） */
function tangentStep(node, d, stepCm) {
  const p0 = scalpPoint(d);
  const nrm = normalize([p0[0] - HEAD.center[0], p0[1] - HEAD.center[1], p0[2] - HEAD.center[2]]);
  const ref = Math.abs(nrm[1]) < 0.92 ? [0, 1, 0] : [1, 0, 0];
  let t1 = normalize(cross(ref, nrm));
  let t2 = cross(nrm, t1);
  if (stepCm[0] || stepCm[1]) {
    const p1 = scalpPoint(normalize([nrm[0] + t1[0] * 0.02, nrm[1] + t1[1] * 0.02, nrm[2] + t1[2] * 0.02]));
    const p2 = scalpPoint(normalize([nrm[0] + t2[0] * 0.02, nrm[1] + t2[1] * 0.02, nrm[2] + t2[2] * 0.02]));
    const l1 = dist(p1, p0) || 1e-6;
    const l2 = dist(p2, p0) || 1e-6;
    return [((stepCm[0] || 0) / l1) * 0.02, ((stepCm[1] || 0) / l2) * 0.02];
  }
  return [0, 0];
}

let CACHED = null;

const SPRINGS = [
  // 中线链（Nasion-Inion 五等分）
  ['Fpz', 'Fz', 5.6, 1.6],
  ['Fz', 'Cz', 6.5, 1.6],
  ['Cz', 'Pz', 6.5, 1.6],
  ['Pz', 'Oz', 5.6, 1.6],
  // 旁矢状链
  ['Fp1', 'F3', 6.5, 1.0],
  ['F3', 'C3', 6.5, 1.2],
  ['C3', 'P3', 6.5, 1.2],
  ['P3', 'O1', 6.0, 1.0],
  // 额横链
  ['F7', 'F3', 7.0, 0.8],
  ['F3', 'Fz', 6.0, 1.2],
  // 中央横链
  ['T3', 'C3', 6.6, 0.9],
  ['C3', 'Cz', 6.7, 1.4],
  // 顶横链
  ['T5', 'P3', 6.8, 0.8],
  ['P3', 'Pz', 6.0, 1.2],
  // 赤道环
  ['Fpz', 'F7', 8.0, 0.7],
  ['F7', 'T3', 6.6, 0.8],
  ['T3', 'T5', 7.2, 0.8],
  ['T5', 'Oz', 6.8, 0.6],
  // 额极/枕极
  ['Fp1', 'Fpz', 4.0, 0.9],
  ['Fp1', 'F7', 5.4, 0.6],
  ['O1', 'Oz', 4.2, 0.9],
  ['O1', 'T5', 5.6, 0.6],
  ['O1', 'P3', 6.0, 0.8],
  // 对称约束
  ['Fp1', 'Fp2', 5.5, 0.7],
  ['F3', 'F4', 9.5, 0.7],
  ['C3', 'C4', 13.0, 0.7],
  ['P3', 'P4', 9.5, 0.7],
  ['O1', 'O2', 8.0, 0.7],
  ['F7', 'F8', 14.0, 0.5],
  ['T3', 'T4', 15.5, 0.5],
  ['T5', 'T6', 12.0, 0.5],
  // 耳垂参考
  ['A1', 'T3', 4.5, 0.12],
  ['A1', 'T5', 5.4, 0.08],
].map(([a, b, t, w]) => [a, b, t * 0.8, w]);

export function solveMontage() {
  if (CACHED) return CACHED;
  const nodes = {};
  for (const [name, [t, p]] of Object.entries(SEEDS)) nodes[name] = { theta: t, phi: p };
  for (const [l, r] of PAIRS) nodes[r] = { theta: nodes[l].theta, phi: -nodes[l].phi };

  const freeL = [...PAIRS.map((p) => p[0]), ...MIDLINE];
  const lone = new Set([...PAIRS.map((p) => p[0]), ...MIDLINE]);
  const ear = new Set(['A1', 'A2']);

  const dirOf = (n) => dirFromAngles(nodes[n].theta, nodes[n].phi);
  const posOf = (n) => scalpPoint(dirOf(n));
  const mirror = (n) => mirrorName(n);

  // 位置缓存的镜像同步
  const posCache = {};
  const refresh = () => {
    for (const n of Object.keys(nodes)) posCache[n] = posOf(n);
  };
  refresh();

  const energy = () => {
    let e = 0;
    for (const [a, b, t, w] of SPRINGS) e += w * (dist(posCache[a], posCache[b]) - t) ** 2;
    return e;
  };

  let E0 = energy();
  const ITER = 1600;
  let step = 0.004;
  for (let it = 0; it < ITER; it++) {
    // 计算每个角度上的梯度（通过有限差分，稳定且简单）
    const grads = [];
    const h = 0.0004;
    for (const n of freeL) {
      const node = nodes[n];
      for (const axis of ['theta', 'phi']) {
        const t0 = node.theta, p0 = node.phi;
        if (axis === 'theta') node.theta = t0 + h; else node.phi = p0 + h;
        refresh();
        const e1 = energy();
        if (axis === 'theta') node.theta = t0 - h; else node.phi = p0 - h;
        refresh();
        const e2 = energy();
        if (axis === 'theta') node.theta = t0; else node.phi = p0;
        refresh();
        const g = (e1 - e2) / (2 * h);
        grads.push({ n, axis, g });
      }
    }
    const gmax = Math.max(1e-9, ...grads.map((d) => Math.abs(d.g)));
    for (const { n, axis, g } of grads) {
      const node = nodes[n];
      const damp = ear.has(n) ? 0.15 : 1;
      const delta = (-g / gmax) * step * damp;
      if (axis === 'theta') node.theta += delta;
      else if (!MIDLINE.includes(n)) node.phi += delta;
    }
    // 越界回退 + 镜像同步
    for (const [l, r] of PAIRS) {
      const nl = nodes[l];
      const nr = nodes[r];
      nr.theta = nl.theta;
      nr.phi = -nl.phi;
    }
    for (const n of MIDLINE) {
      const isBack = n === 'Pz' || n === 'Oz';
      nodes[n].phi = isBack ? 180 : 0;
    }
    refresh();
    const E = energy();
    if (E < E0) { step *= 1.02; E0 = E; } else { step *= 0.7; }
    step = Math.max(1e-5, Math.min(0.02, step));
  }

  const out = {};
  for (const name of Object.keys(nodes)) {
    const n = nodes[name];
    const d = dirFromAngles(n.theta, n.phi);
    out[name] = { name, theta: n.theta, phi: n.phi, dir: d, pos: scalpPoint(d) };
  }
  const quality = SPRINGS.map(([a, b, target]) => ({
    a, b, target: +target.toFixed(2), actual: +dist(out[a].pos, out[b].pos).toFixed(2),
    dev: +(dist(out[a].pos, out[b].pos) - target).toFixed(2),
  }));
  CACHED = { nodes: out, quality };
  return CACHED;
}

function mirrorName(n) {
  for (const [l, r] of PAIRS) {
    if (l === n) return r;
    if (r === n) return l;
  }
  return null;
}
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];

/** 标准电极元数据 */
export const ELECTRODE_INFO = {
  Fp1: { cn: '左额极', side: 'L', region: 'frontopolar' },
  Fp2: { cn: '右额极', side: 'R', region: 'frontopolar' },
  Fpz: { cn: '额极中线', side: 'Z', region: 'frontopolar' },
  F7: { cn: '左前颞', side: 'L', region: 'frontal' },
  F3: { cn: '左额', side: 'L', region: 'frontal' },
  Fz: { cn: '额中线', side: 'Z', region: 'frontal' },
  F4: { cn: '右额', side: 'R', region: 'frontal' },
  F8: { cn: '右前颞', side: 'R', region: 'frontal' },
  T3: { cn: '左中颞', side: 'L', region: 'temporal' },
  C3: { cn: '左中央', side: 'L', region: 'central' },
  Cz: { cn: '中央顶点', side: 'Z', region: 'central' },
  C4: { cn: '右中央', side: 'R', region: 'central' },
  T4: { cn: '右中颞', side: 'R', region: 'temporal' },
  T5: { cn: '左后颞', side: 'L', region: 'parietal' },
  P3: { cn: '左顶', side: 'L', region: 'parietal' },
  Pz: { cn: '顶中线', side: 'Z', region: 'parietal' },
  P4: { cn: '右顶', side: 'R', region: 'parietal' },
  T6: { cn: '右后颞', side: 'R', region: 'parietal' },
  O1: { cn: '左枕', side: 'L', region: 'occipital' },
  Oz: { cn: '枕中线', side: 'Z', region: 'occipital' },
  O2: { cn: '右枕', side: 'R', region: 'occipital' },
  A1: { cn: '左耳垂', side: 'L', region: 'auricular' },
  A2: { cn: '右耳垂', side: 'R', region: 'auricular' },
};

/** 默认分区词典（可在后台维护） */
export const DEFAULT_REGIONS = [
  {
    id: 'frontopolar', name: '额极区', short: 'Fp', color: '#7aa2ff',
    members: ['Fp1', 'Fp2', 'Fpz'],
    note: '位于额叶最前端，覆盖额极皮质；眼动伪迹最明显，需重点观察。',
  },
  {
    id: 'frontal', name: '额区', short: 'F', color: '#59c3a8',
    members: ['F3', 'F4', 'Fz', 'F7', 'F8'],
    note: '包含额叶背外侧与前颞（F7/F8）；F7/F8 常用于颞叶癫痫辅助定位。',
  },
  {
    id: 'central', name: '中央区', short: 'C', color: '#f0bd68',
    members: ['C3', 'C4', 'Cz'],
    note: '中央沟两侧，C3/C4 对应手运动区，是体感诱发电位与睡眠纺锤波重点区。',
  },
  {
    id: 'parietal', name: '顶区', short: 'P', color: '#b98cf0',
    members: ['P3', 'P4', 'Pz', 'T5', 'T6'],
    note: '顶叶及后颞（T5/T6）；Pz 为 P300 事件相关电位核心记录点。',
  },
  {
    id: 'occipital', name: '枕区', short: 'O', color: '#57b8f0',
    members: ['O1', 'O2', 'Oz'],
    note: '枕叶视觉皮质，α 节律最显著；Oz 对枕区棘波定位敏感。',
  },
  {
    id: 'temporal', name: '颞区', short: 'T', color: '#ef7f7f',
    members: ['T3', 'T4'],
    note: '中颞区，覆盖颞叶外侧面；T3/T4 阻抗易受颞肌活动干扰。',
  },
  {
    id: 'auricular', name: '耳垂/乳突区', short: 'A', color: '#9aa7b4',
    members: ['A1', 'A2'],
    note: '参考电极常用位置，A1/A2 与同侧乳突 M1/M2 可互换。',
  },
];

export const REGION_BY_ID = Object.fromEntries(DEFAULT_REGIONS.map((r) => [r.id, r]));

/** 命名规则解析 */
export function parseName(raw) {
  const name = String(raw || '').trim();
  const m = name.match(/^(Fp|F|C|P|O|T|A)([0-9]{1,2})?(z)?$/i);
  if (!m) return { ok: false, reason: '不符合「字母+数字」命名格式（如 Fp1、C3、Cz、O2）' };
  const prefix = m[1][0].toUpperCase() + (m[1].length > 1 ? m[1][1].toLowerCase() : '');
  const num = m[2] ? Number(m[2]) : null;
  const isZ = !!m[3];
  if (isZ && num !== null) return { ok: false, reason: '中线电极不携带数字（正确写法如 Fz、Cz、Pz）' };
  if (!isZ && num === null) return { ok: false, reason: '非中线电极必须带编号（奇数=左、偶数=右）' };
  if (!isZ && (num < 1 || num > 8)) return { ok: false, reason: '编号超出 10-20 系统 1–8 的有效范围' };
  const side = isZ ? 'Z' : num % 2 === 1 ? 'L' : 'R';
  const prefixRegion = { Fp: 'frontopolar', F: 'frontal', C: 'central', P: 'parietal', O: 'occipital', T: 'temporal', A: 'auricular' }[prefix];
  return {
    ok: true, prefix, num, isZ, side, prefixRegion,
    canonical: `${prefix}${isZ ? 'z' : num}`,
  };
}

/** 判断点落在哪个分区：最近标准电极所属分区 */
export function classifyRegion(dir, regionDict = DEFAULT_REGIONS, landmarks = null) {
  const lm = landmarks || solveMontage().nodes;
  const point = scalpPoint(dir);
  let best = null;
  let bestD = Infinity;
  for (const [name, node] of Object.entries(lm)) {
    const d = dist(point, node.pos);
    if (d < bestD) { bestD = d; best = { name, d, dir: node.dir }; }
  }
  // 找到该电极归属的分区（允许词典改写成员表）
  let region = null;
  for (const r of regionDict) {
    if (r.members.includes(best.name)) { region = r; break; }
  }
  if (!region) region = DEFAULT_REGIONS.find((r) => r.id === ELECTRODE_INFO[best.name]?.region) || regionDict[0];
  return { region, nearest: best, distance: bestD };
}

/** 相机预设（球坐标系 radius, theta 极角, phi 方位角：从 +Z 起算） */
export const CAMERA_PRESETS = {
  top: { radius: 62, theta: 1, phi: 0, label: '俯视' },
  front: { radius: 64, theta: 88, phi: 0, label: '正前' },
  left: { radius: 64, theta: 88, phi: 90, label: '左侧' },
  right: { radius: 64, theta: 88, phi: -90, label: '右侧' },
  back: { radius: 64, theta: 88, phi: 180, label: '后枕' },
  iso: { radius: 66, theta: 60, phi: 36, label: '斜视' },
};
