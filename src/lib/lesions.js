// Deterministic report generation.
// A report body, both the diagram and the narrative text, is a pure function of
// the examination parameters and the seed. The same parameter group always
// yields the same lesion placement, size, narrative and mucosal texture.

import { createRng } from './prng.js';
import {
  EXAM_TYPES,
  getArt,
  lesionRadius,
  regionName,
  LESION_KINDS,
  KIND_PHRASE,
  formatSize
} from './anatomy.js';
import { pointInPolygon, polygonClearance } from './geometry.js';

export const DEFAULT_PARAMS = {
  examType: '无痛胃镜',
  seed: 'ENDO-2401',
  scope: 'GIF-H290',
  imageMode: '白光',
  position: '左侧卧位',
  insufflation: '适量',
  operator: '张伟',
  reporter: '张伟'
};

export const PARAM_FIELDS = [
  { key: 'examType', label: '检查类型', type: 'select', options: Object.keys(EXAM_TYPES) },
  { key: 'scope', label: '内镜型号', type: 'select', options: ['GIF-H290', 'GIF-HQ290', 'GIF-XP290N', 'TJF-Q290V'] },
  { key: 'imageMode', label: '图像模式', type: 'select', options: ['白光', 'NBI', 'BLI', 'LCI'] },
  { key: 'position', label: '体位', type: 'select', options: ['左侧卧位', '平卧位', '右侧卧位'] },
  { key: 'insufflation', label: '注气量', type: 'select', options: ['少量', '适量', '充分'] },
  { key: 'operator', label: '操作医生', type: 'select', options: ['张伟', '李敏', '王海涛', '陈晓芸', '刘建国'] },
  { key: 'reporter', label: '报告医生', type: 'select', options: ['张伟', '李敏', '王海涛', '陈晓芸', '刘建国'] }
];

export const OPERATORS = PARAM_FIELDS.find((f) => f.key === 'operator').options;

const PART_LESION_COUNT = {
  esophagus: [0, 1, 1, 1, 2],
  stomach: [1, 1, 1, 2, 2],
  duodenum: [0, 0, 1, 1, 1]
};

const PART_KIND_WEIGHTS = {
  esophagus: ['糜烂', '溃疡', '静脉曲张', '狭窄'],
  stomach: ['溃疡', '息肉', '糜烂', '隆起', '溃疡'],
  duodenum: ['糜烂', '溃疡', '息肉', '隆起']
};

const PART_SIZE_RANGE = {
  esophagus: [0.3, 1.6],
  stomach: [0.4, 2.8],
  duodenum: [0.3, 1.5]
};

function paramsKey(params) {
  return [
    params.examType,
    params.scope,
    params.imageMode,
    params.position,
    params.insufflation,
    params.operator,
    params.reporter,
    params.seed
  ].join('|');
}

/** Sample a marker centre that fully clears the lumen wall. */
function placeInside(part, region, radius, rng) {
  const art = getArt(part);
  const anchorX = region.x;
  const anchorY = region.y;
  for (let attempt = 0; attempt < 90; attempt++) {
    const spread = attempt < 55 ? 34 : 200;
    const x = anchorX + rng.normal(0, spread);
    const y = anchorY + rng.normal(0, spread * 0.85);
    if (x < 6 || x > 314 || y < 6 || y > 378) continue;
    if (!pointInPolygon(x, y, art.lumen)) continue;
    if (polygonClearance(x, y, art.lumen) < radius + 5) continue;
    return { x: x / 320, y: y / 384 };
  }
  // Fallback: centre of the largest labelled region.
  return { x: anchorX / 320, y: anchorY / 384 };
}

function pickKind(part, rng) {
  const weights = PART_KIND_WEIGHTS[part];
  return rng.pick(weights);
}

function buildLesions(params) {
  const rng = createRng('lesion-layout', paramsKey(params));
  const required = EXAM_TYPES[params.examType] || [];
  const lesions = [];
  const texture = {};

  for (const part of required) {
    const art = getArt(part);
    const counts = PART_LESION_COUNT[part];
    let count = rng.pick(counts);
    // make sure at least one lesion exists across the whole examination
    if (lesions.length === 0 && part === required[required.length - 1] && count === 0) count = 1;

    const usedRegions = new Set();
    for (let i = 0; i < count; i++) {
      let region = rng.pick(art.regions);
      for (let tries = 0; tries < 4 && usedRegions.has(region.name); tries++) {
        region = rng.pick(art.regions);
      }
      usedRegions.add(region.name);

      const kind = pickKind(part, rng);
      const [lo, hi] = PART_SIZE_RANGE[part];
      const longCm = Math.max(0.2, Math.round(rng.range(lo, hi) * 10) / 10);
      const shortCm = Math.max(0.2, Math.round(longCm * rng.range(0.45, 0.92) * 10) / 10);
      const radius = lesionRadius(part, longCm, shortCm);
      const pos = placeInside(part, region, radius, rng);
      lesions.push({
        id: `${part}-L${i + 1}`,
        part,
        kind,
        x: pos.x,
        y: pos.y,
        longCm,
        shortCm,
        region: regionName(part, pos.x * 320, pos.y * 384),
        manualPos: false,
        manualSize: false
      });
    }
    texture[part] = `${paramsKey(params)}::${part}`;
  }

  // A stable panel order regardless of lesion distribution.
  lesions.sort((a, b) => {
    const pi = required.indexOf(a.part) - required.indexOf(b.part);
    return pi !== 0 ? pi : a.id.localeCompare(b.id);
  });
  return { lesions, texture, required };
}

const ANN_W = 0.44;
const ANN_H = 0.108;

function rectGap(a, bx, by) {
  const dx = Math.max(bx - (a.x + a.w), a.x - (bx + ANN_W), 0);
  const dy = Math.max(by - (a.y + a.h), a.y - (by + ANN_H), 0);
  if (dx === 0 && dy === 0) return -1; // intersecting boxes are never acceptable
  return Math.hypot(dx, dy);
}

/**
 * Place a label box next to its lesion, preferring positions that stay inside
 * the panel and clear of labels already placed on the same panel. Deterministic:
 * candidates are tried in a fixed order, then a fixed grid scan as a fallback.
 */
export function makeAnnotation(lesion, existing = []) {
  const same = existing.filter((a) => a.part === lesion.part);
  const fit = (cx, cy) => ({
    x: Math.min(Math.max(cx, 0.012), 0.988 - ANN_W),
    y: Math.min(Math.max(cy, 0.012), 0.988 - ANN_H)
  });
  const minGapTo = (x, y) => {
    let gap = 0.2;
    for (const other of same) gap = Math.min(gap, rectGap(other, x, y));
    return gap;
  };

  const candidates = [];
  for (const dy of [-(ANN_H + 0.045), 0.055, -(ANN_H * 0.5)]) {
    for (const dx of [0.052, -(ANN_W + 0.052)]) candidates.push([lesion.x + dx, lesion.y + dy]);
  }
  for (const ax of [-0.06, 0, 0.06]) {
    candidates.push([lesion.x + 0.03 + ax, lesion.y - ANN_H - 0.13]);
    candidates.push([lesion.x - ANN_W - 0.03 + ax, lesion.y - ANN_H - 0.13]);
    candidates.push([lesion.x + 0.03 + ax, lesion.y + ANN_H * 0.65]);
    candidates.push([lesion.x - ANN_W - 0.03 + ax, lesion.y + ANN_H * 0.65]);
  }

  let best = null;
  for (const [cx, cy] of candidates) {
    const p = fit(cx, cy);
    const gap = minGapTo(p.x, p.y);
    const shift = Math.hypot(p.x - cx, p.y - cy);
    const score = gap * 100 - shift * 6;
    if (!best || score > best.score) best = { ...p, gap, score };
  }

  if (!best || best.gap < 0.02) {
    // Fixed grid scan for a clear slot; prefer slots near the lesion.
    let grid = null;
    for (let gy = 0.012; gy <= 0.988 - ANN_H + 1e-9; gy += 0.045) {
      for (let gx = 0.012; gx <= 0.988 - ANN_W + 1e-9; gx += 0.04) {
        const gap = minGapTo(gx, gy);
        if (gap < 0.012) continue;
        const dist = Math.hypot(gx - lesion.x, gy - lesion.y);
        if (!grid || dist < grid.dist) grid = { x: gx, y: gy, dist };
      }
    }
    if (grid) best = grid;
  }

  const pos = best || { ...fit(lesion.x + 0.06, lesion.y - ANN_H - 0.05) };
  return {
    id: `ann-${lesion.id}`,
    lesionId: lesion.id,
    part: lesion.part,
    x: pos.x,
    y: pos.y,
    w: ANN_W,
    h: ANN_H,
    manual: false
  };
}

export function annotationLines(lesion, index) {
  return {
    title: `${index}  ${lesion.kind}`,
    detail: formatSize(lesion.longCm, lesion.shortCm)
  };
}

/** Narrative section for one part. */
function partNarrative(part, lesionsInPart) {
  const partName = part === 'esophagus' ? '食管' : part === 'stomach' ? '胃' : '十二指肠';
  if (!lesionsInPart.length) return `${partName}：黏膜光滑，未见明显异常。`;
  const phrases = lesionsInPart.map((l) => {
    const sizeText = `${l.longCm.toFixed(1)}cm×${l.shortCm.toFixed(1)}cm`;
    if (part === 'esophagus') {
      const distance = 15 + Math.round(l.y * 25);
      return `距门齿约${distance}cm见${sizeText}${KIND_PHRASE[l.kind] || l.kind}，表面黏膜粗糙`;
    }
    return `${l.region}见${sizeText}${KIND_PHRASE[l.kind] || l.kind}，边界清楚`;
  });
  return `${partName}：${phrases.join('；')}。`;
}

function diagnosisList(lesions) {
  if (!lesions.length) return '1. 慢性非萎缩性胃炎\n2. 食管、十二指肠未见明显异常';
  const groups = new Map();
  for (const l of lesions) {
    const label = `${KIND_PHRASE[l.kind] || l.kind}（${l.region}）`;
    groups.set(label, (groups.get(label) || 0) + 1);
  }
  const lines = [...groups.entries()].map(([label, n], i) => `${i + 1}. ${label}${n > 1 ? ` ×${n}` : ''}`);
  if (!lesions.some((l) => l.part === 'stomach')) lines.push(`${lines.length + 1}. 慢性非萎缩性胃炎`);
  return lines.join('\n');
}

export function buildBodyText(params, lesions, partsPresent = {}) {
  const order = EXAM_TYPES[params.examType] || ['esophagus', 'stomach'];
  const sections = order
    .filter((part) => partsPresent[part] !== false)
    .map((part) => partNarrative(part, lesions.filter((l) => l.part === part)));
  return [
    '检查所见：',
    ...sections,
    '',
    '内镜诊断：',
    diagnosisList(lesions)
  ].join('\n');
}

export function generateCase(params, options = {}) {
  const { lesions, texture, required } = buildLesions(params);
  const parts = {};
  for (const part of ['esophagus', 'stomach', 'duodenum']) {
    parts[part] = required.includes(part) && options.omitParts?.[part] !== true;
  }
  const effective = lesions.filter((l) => parts[l.part]);
  const annotations = [];
  const counters = {};
  for (const lesion of effective) {
    counters[lesion.part] = (counters[lesion.part] || 0) + 1;
    annotations.push(makeAnnotation(lesion, annotations));
  }
  return {
    parts,
    lesions: effective,
    annotations,
    texture,
    bodyText: buildBodyText(params, effective, parts),
    generatedFrom: { ...params },
    required
  };
}

/** Apply locally edited values on top of freshly generated content. */
export function applyManualEdits(generated, manual = {}, preserve = true) {
  if (!preserve) return generated;
  const lesions = generated.lesions.map((l) => {
    const m = manual.lesions?.[l.id];
    if (!m) return l;
    return {
      ...l,
      x: m.x ?? l.x,
      y: m.y ?? l.y,
      longCm: m.longCm ?? l.longCm,
      shortCm: m.shortCm ?? l.shortCm,
      manualPos: Boolean(m.manualPos),
      manualSize: Boolean(m.manualSize)
    };
  });
  const annotations = generated.annotations.map((a) => {
    const m = manual.annotations?.[a.id];
    if (!m) return a;
    return { ...a, x: m.x ?? a.x, y: m.y ?? a.y, manual: Boolean(m.manual) };
  });
  const bodyText = manual.text ?? generated.bodyText;
  return { ...generated, lesions, annotations, bodyText };
}

export function defaultManual() {
  return { lesions: {}, annotations: {} };
}

export { KIND_PHRASE };
