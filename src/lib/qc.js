// Automated QC for endoscopy diagram reports.
// Four primary checks (missing part, marker out of bounds, label text overlap,
// lesion size vs narrative) plus supporting typography checks. Every finding is
// graded 严重 / 一般 / 提示 and carries evidence the reviewer can act on.

import {
  PANEL,
  EXAM_TYPES,
  getArt,
  lesionRadius,
  formatSize,
  SEVERITY_MAP,
  CHECK_NAME
} from './anatomy.js';
import {
  pointInPolygon,
  polygonClearance,
  overlapRatio,
  clamp01
} from './geometry.js';
import { hash32 } from './prng.js';

const PART_NAME = { esophagus: '食管', stomach: '胃', duodenum: '十二指肠' };
const SECTION_NAMES = ['食管', '胃', '十二指肠'];
const SECTION_TO_PART = { 食管: 'esophagus', 胃: 'stomach', 十二指肠: 'duodenum' };

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

function issue(input, patch) {
  const key = [
    patch.checkType,
    patch.part || '',
    (patch.lesionIds || []).join('+'),
    (patch.annotationIds || []).join('+'),
    patch.key || ''
  ].join('|');
  const id = `I${(hash32(key) >>> 0).toString(36).toUpperCase().padStart(7, '0')}`;
  const severity = patch.severity || 'medium';
  return {
    id,
    checkType: patch.checkType,
    checkName: CHECK_NAME[patch.checkType] || patch.checkType,
    severity,
    severityName: SEVERITY_MAP[severity].name,
    part: patch.part || null,
    partName: patch.part ? PART_NAME[patch.part] : null,
    title: patch.title,
    detail: patch.detail || '',
    expected: patch.expected || '',
    actual: patch.actual || '',
    lesionIds: patch.lesionIds || [],
    annotationIds: patch.annotationIds || [],
    status: 'pending',
    note: '',
    decidedBy: null,
    decidedAt: null,
    // stable fingerprint of what the check saw
    observedAt: null
  };
}

/** Character width heuristic for the labels rendered at the given font size. */
export function measureText(text, fontSize) {
  let w = 0;
  for (const ch of String(text)) {
    const code = ch.codePointAt(0);
    let em = 0.55;
    if (
      (code >= 0x3000 && code <= 0x9fff) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xff00 && code <= 0xffef)
    ) {
      em = 1;
    } else if (ch === ' ') em = 0.32;
    else if (/[0-9]/.test(ch)) em = 0.56;
    else if (ch === '×' || ch === '·') em = 0.62;
    w += em * fontSize;
  }
  return w;
}

/** Split the narrative into per-part sections, preserving inner line breaks. */
export function splitSections(bodyText) {
  const text = (bodyText || '').replace(/\r\n?/g, '\n');
  const result = {};
  const markers = [];
  for (const name of SECTION_NAMES) {
    const idx = text.indexOf(`${name}：`);
    if (idx >= 0) markers.push({ name, idx });
  }
  markers.sort((a, b) => a.idx - b.idx);
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].idx + markers[i].name.length + 1;
    const end = i + 1 < markers.length ? markers[i + 1].idx : text.length;
    result[SECTION_TO_PART[markers[i].name]] = {
      name: markers[i].name,
      text: text.slice(start, end).replace(/\s+$/g, '')
    };
  }
  return result;
}

/** Parse "1.4cm×0.9cm" pairs (accepting mm) from narrative. */
export function parseSizes(text) {
  const out = [];
  const re = /(\d+(?:\.\d+)?)\s*(cm|mm|厘米|毫米)\s*[×xX*]\s*(\d+(?:\.\d+)?)\s*(cm|mm|厘米|毫米)/g;
  let m;
  while ((m = re.exec(text || ''))) {
    const unit = (u) => (/cm|厘米/.test(u) ? 1 : 0.1);
    const a = parseFloat(m[1]) * unit(m[2]);
    const b = parseFloat(m[3]) * unit(m[4]);
    out.push({ longCm: round2(a), shortCm: round2(b), raw: m[0] });
  }
  return out;
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

/** Is the narrative order normalised? Return both sizes sorted for fair compare? */
function sortedSize(l, s) {
  return [Math.max(l, s), Math.min(l, s)];
}

export function runChecks(input, options = {}) {
  const issues = [];
  const examType = input.examType || '无痛胃镜';
  const expected = EXAM_TYPES[examType] || ['esophagus', 'stomach'];
  const parts = input.parts || {};
  const lesions = (input.lesions || []).filter((l) => parts[l.part] !== false);
  const annotations = (input.annotations || []).filter((a) => parts[a.part] !== false);

  // ---------------------------------------------------------- missing part
  for (const part of expected) {
    if (parts[part] === false) {
      issues.push(
        issue(input, {
          checkType: 'missing-part',
          severity: 'high',
          part,
          title: `缺少「${PART_NAME[part]}」分段示意图`,
          detail: `检查类型「${examType}」的标准报告需包含${expected
            .map((p) => PART_NAME[p])
            .join('、')}，当前报告中该部位示意图缺失，无法核对病灶位置。`,
          expected: `${PART_NAME[part]} 分段图 1 幅`,
          actual: '未生成',
          key: part
        })
      );
    }
  }

  // ------------------------------------------------------ marker out of bounds
  for (const lesion of lesions) {
    const art = getArt(lesion.part);
    const px = lesion.x * PANEL.w;
    const py = lesion.y * PANEL.h;
    const radius = lesionRadius(lesion.part, lesion.longCm, lesion.shortCm);
    const inside = pointInPolygon(px, py, art.lumen);
    const clearance = polygonClearance(px, py, art.lumen);
    const outPx = Math.max(0, radius - clearance);
    const panelOut = px < 0 || py < 0 || px > PANEL.w || py > PANEL.h;
    if (!inside || outPx > 0.5 || panelOut) {
      let where;
      if (!inside) where = '标记中心已落在管腔轮廓之外';
      else if (panelOut) where = '标记超出图幅边界';
      else where = `标记圆越出管腔壁约 ${((outPx / art.pxPerCm) * 10).toFixed(1)}mm`;
      const severity = 'high';
      issues.push(
        issue(input, {
          checkType: 'marker-oob',
          severity,
          part: lesion.part,
          lesionIds: [lesion.id],
          title: `${PART_NAME[lesion.part]}「${lesion.region}」病灶标记越界`,
          detail: `${where}。病灶标记直径为 ${formatSize(lesion.longCm, lesion.shortCm)}，应在管腔轮廓内且与管壁保留安全边距。`,
          expected: '标记完全位于管腔内',
          actual: inside
            ? `中心距管壁 ${((clearance / art.pxPerCm) * 10).toFixed(1)}mm，所需半径 ${((radius / art.pxPerCm) * 10).toFixed(1)}mm`
            : '标记中心位于管腔外',
          key: lesion.id
        })
      );
    }
  }

  // ------------------------------------------------------ annotation overlap
  const rects = annotations.map((a) => ({
    a,
    r: { x: a.x, y: a.y, w: a.w, h: a.h }
  }));
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const A = rects[i];
      const B = rects[j];
      if (A.a.part !== B.a.part) continue;
      const ratio = overlapRatio(A.r, B.r);
      if (ratio < 0.03) continue;
      const severity = ratio >= 0.45 ? 'high' : 'medium';
      issues.push(
        issue(input, {
          checkType: 'label-overlap',
          severity,
          part: A.a.part,
          annotationIds: [A.a.id, B.a.id],
          lesionIds: [A.a.lesionId, B.a.lesionId],
          title: `${PART_NAME[A.a.part]}标注框重叠 ${Math.round(ratio * 100)}%`,
          detail: `两个标注框在图中相互覆盖，文字无法完整辨认，需挪开至互不遮挡的位置。`,
          expected: '标注框互不重叠（重叠占比 < 3%）',
          actual: `重叠面积约占较小标注框的 ${Math.round(ratio * 100)}%`,
          key: `${A.a.id}|${B.a.id}`
        })
      );
    }
  }

  // ---------------------------------------- annotation text overflow / panel
  for (const ann of annotations) {
    const lesion = lesions.find((l) => l.id === ann.lesionId);
    const index = lesion ? annotationIndex(lesions, ann.part, lesion.id) : 1;
    const title = `${index}  ${lesion ? lesion.kind : '病灶'}`;    const detail = lesion ? formatSize(lesion.longCm, lesion.shortCm) : '';
    const pxW = ann.w * PANEL.w;
    const needed = Math.max(measureText(title, 8.6), measureText(detail, 7.4)) + 10;
    if (needed > pxW + 0.5) {
      issues.push(
        issue(input, {
          checkType: 'label-overflow',
          severity: 'low',
          part: ann.part,
          annotationIds: [ann.id],
          lesionIds: [ann.lesionId],
          title: `标注文字超出文本框（${PART_NAME[ann.part]}）`,
          detail: `标注行宽约 ${needed.toFixed(0)}px，文本框仅 ${pxW.toFixed(0)}px，末尾字符可能被截断。`,
          expected: '文字完整显示在标注框内',
          actual: `溢出约 ${(needed - pxW).toFixed(0)}px`,
          key: ann.id
        })
      );
    }
    const outOfPanel =
      ann.x < 0 || ann.y < 0 || ann.x + ann.w > 1.002 || ann.y + ann.h > 1.002;
    if (outOfPanel) {
      issues.push(
        issue(input, {
          checkType: 'label-outside',
          severity: 'low',
          part: ann.part,
          annotationIds: [ann.id],
          lesionIds: [ann.lesionId],
          title: `标注框越出图幅（${PART_NAME[ann.part]}）`,
          detail: '标注框超出 320×384 图幅边界，归档打印时会被裁切。',
          expected: '标注框完整位于图幅内',
          actual: `右下边界 (${Math.round((ann.x + ann.w) * 100)}%, ${Math.round((ann.y + ann.h) * 100)}%)`,
          key: ann.id
        })
      );
    }
  }

  // ------------------------------------------- annotation covers its lesion
  for (const ann of annotations) {
    const lesion = lesions.find((l) => l.id === ann.lesionId);
    if (!lesion) continue;
    const r = lesionRadius(lesion.part, lesion.longCm, lesion.shortCm) / PANEL.w;
    const dx = Math.abs(lesion.x - (ann.x + ann.w / 2));
    const dy = Math.abs(lesion.y - (ann.y + ann.h / 2));
    const coversCenter =
      lesion.x > ann.x && lesion.x < ann.x + ann.w && lesion.y > ann.y && lesion.y < ann.y + ann.h;
    const nearCenter = dx < ann.w / 2 - r * 0.3 && dy < ann.h / 2 - r * 0.3;
    if (!coversCenter && !nearCenter) continue;
    const idx = annotationIndex(lesions, ann.part, lesion.id);
    issues.push(
      issue(input, {
        checkType: 'label-covered',
        severity: 'medium',
        part: ann.part,
        annotationIds: [ann.id],
        lesionIds: [lesion.id],
        title: `标注框遮挡病灶（${PART_NAME[ann.part]}第${idx}处）`,
        detail: '标注框盖住了它以标注的病灶标记，阅片人无法同时看到病灶与文字，需把标注移到标记旁边。',
        expected: '标注框与对应病灶标记不重叠',
        actual: `标注框中心距标记 ${((Math.hypot(dx, dy) * PANEL.w) / 1).toFixed(0)}px`,
        key: ann.id
      })
    );
  }

  // -------------------------------------------------------- size vs narrative
  const sections = splitSections(input.bodyText || '');
  const byPart = new Map();
  for (const l of lesions) {
    if (!byPart.has(l.part)) byPart.set(l.part, []);
    byPart.get(l.part).push(l);
  }
  for (const [part, partLesions] of byPart) {
    const name = PART_NAME[part];
    const section = sections[part];
    if (!section || !section.text.trim()) {
      issues.push(
        issue(input, {
          checkType: 'size-mismatch',
          severity: 'medium',
          part,
          title: `正文缺少「${name}」段描述`,
          detail: `图中${name}有 ${partLesions.length} 处病灶标记，但报告正文的「${name}」段为空。`,
          expected: `${name}段描述 ${partLesions.length} 处病灶尺寸`,
          actual: '未描述',
          key: `${part}-nosection`
        })
      );
      continue;
    }
    const textSizes = parseSizes(section.text);
    const n = Math.min(textSizes.length, partLesions.length);
    for (let i = 0; i < n; i++) {
      const lesion = partLesions[i];
      const t = textSizes[i];
      const diffLong = Math.abs(lesion.longCm - t.longCm);
      const diffShort = Math.abs(lesion.shortCm - t.shortCm);
      const tol = 0.08;
      if (diffLong > tol || diffShort > tol) {
        const maxDiff = Math.max(diffLong, diffShort);
        const rel = maxDiff / Math.max(lesion.longCm, 0.1);
        const severity = maxDiff >= 0.4 || rel >= 0.25 ? 'high' : 'medium';
        issues.push(
          issue(input, {
            checkType: 'size-mismatch',
            severity,
            part,
            lesionIds: [lesion.id],
            title: `${name}第${i + 1}处病灶尺寸与正文不一致`,
            detail: `示意图标记直径由病灶尺寸换算，与正文「${t.raw}」不一致，需统一后重新出具。`,
            expected: `正文 ${t.longCm.toFixed(1)}×${t.shortCm.toFixed(1)}cm`,
            actual: `图中 ${lesion.longCm.toFixed(1)}×${lesion.shortCm.toFixed(1)}cm`,
            key: `${lesion.id}-${i}`
          })
        );
      }
    }
    for (let i = n; i < partLesions.length; i++) {
      const lesion = partLesions[i];
      issues.push(
        issue(input, {
          checkType: 'size-mismatch',
          severity: 'medium',
          part,
          lesionIds: [lesion.id],
          title: `正文未描述${name}第${i + 1}处病灶`,
          detail: `图中该处有 ${formatSize(lesion.longCm, lesion.shortCm)} 的病灶标记，但正文段落只有 ${textSizes.length} 处尺寸描述。`,
          expected: `${name}段 ${partLesions.length} 处尺寸描述`,
          actual: `仅 ${textSizes.length} 处`,
          key: `${lesion.id}-missing`
        })
      );
    }
    for (let i = n; i < textSizes.length; i++) {
      const t = textSizes[i];
      issues.push(
        issue(input, {
          checkType: 'size-mismatch',
          severity: 'low',
          part,
          title: `正文尺寸在图中无对应病灶（${name}）`,
          detail: `正文提到「${t.raw}」，但图中${name}仅 ${partLesions.length} 处病灶标记，存在孤立描述。`,
          expected: '正文尺寸与图中标记一一对应',
          actual: `孤立尺寸 ${t.raw}`,
          key: `${part}-orphan-${i}`
        })
      );
    }
  }
  // narrative names a part panel that is missing
  for (const [part, section] of Object.entries(sections)) {
    if (parts[part] === false && parseSizes(section.text).length) {
      issues.push(
        issue(input, {
          checkType: 'missing-part',
          severity: 'high',
          part,
          title: `正文描述了${PART_NAME[part]}，但该部位无示意图`,
          detail: `正文在「${PART_NAME[part]}」段记录了病灶尺寸，示意图却缺失，图文不一致。`,
          expected: '图文均包含该部位',
          actual: '仅有文字描述',
          key: `${part}-textonly`
        })
      );
    }
  }

  const summary = { high: 0, medium: 0, low: 0, total: issues.length };
  const byCheck = {};
  for (const it of issues) {
    summary[it.severity]++;
    byCheck[it.checkType] = (byCheck[it.checkType] || 0) + 1;
  }
  issues.sort((a, b) => {
    const sa = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sa !== 0) return sa;
    const pa = ORDER_PART[a.part] ?? 9;
    const pb = ORDER_PART[b.part] ?? 9;
    return pa - pb || a.title.localeCompare(b.title, 'zh');
  });
  return { issues, summary, byCheck };
}

const ORDER_PART = { esophagus: 0, stomach: 1, duodenum: 2 };

function annotationIndex(lesions, part, lesionId) {
  let idx = 0;
  for (const l of lesions) {
    if (l.part !== part) continue;
    idx++;
    if (l.id === lesionId) return idx;
  }
  return 1;
}

export function combineSummaries(summaries) {
  const out = { high: 0, medium: 0, low: 0, total: 0 };
  for (const s of summaries) {
    out.high += s?.high || 0;
    out.medium += s?.medium || 0;
    out.low += s?.low || 0;
    out.total += s?.total || 0;
  }
  return out;
}

export { PART_NAME, SEVERITY_ORDER, ORDER_PART, clamp01 };
