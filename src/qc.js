// 自动质检：标注出界 / 腔室面积比例偏差 / 文字重叠 / 缺失必要标注 / 引线交叉
// 严重等级：severe(严重) / major(一般) / minor(提示)
import { CANVAS_W, CANVAS_H } from './generator'

export const SEVERITY = {
  severe: { name: '严重', color: '#e5484d' },
  major: { name: '一般', color: '#f0a94e' },
  minor: { name: '提示', color: '#5b8def' }
}

export const CHECK_NAMES = {
  outOfBounds: '标注出界',
  areaRatio: '腔室面积比例偏差',
  textOverlap: '文字重叠',
  missing: '缺失必要标注',
  leaderCross: '引线交叉'
}

// 估算文字包围盒（中文按全宽计）
export function textBBox(ann, fontSize = 12) {
  let w = 0
  for (const ch of ann.text) w += ch.charCodeAt(0) > 255 ? fontSize : fontSize * 0.55
  return { x: ann.x, y: ann.y - fontSize, w, h: fontSize + 4 }
}

function segIntersect(p1, p2, p3, p4) {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x)
  if (Math.abs(d) < 1e-9) return false
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d
  return t > 0.02 && t < 0.98 && u > 0.02 && u < 0.98
}

function bboxOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

let seq = 0
function issue(batchId, viewIndex, type, severity, message, targetKey = null) {
  return {
    id: `IS-${batchId}-${viewIndex}-${type}-${targetKey || seq++}`,
    batchId, viewIndex, type, severity, message, targetKey,
    status: 'pending', // pending | confirmed | rejected
    comment: '', reviewer: ''
  }
}

/** 对单个视图跑全部检查，返回问题数组 */
export function checkView(batchId, view) {
  const out = []
  const M = 4 // 安全边距

  // 1. 标注出界（严重）
  for (const ann of view.annotations) {
    const b = textBBox(ann)
    if (b.x < M || b.y < M || b.x + b.w > CANVAS_W - M || b.y + b.h > CANVAS_H - M) {
      out.push(issue(batchId, view.index, 'outOfBounds', 'severe',
        `标注「${ann.text}」超出图幅边界 (x=${ann.x}, y=${ann.y})`, ann.targetKey))
    }
  }

  // 2. 腔室面积比例偏差：>5 个百分点为严重，3~5 为一般
  for (const c of view.chambers) {
    const dev = (c.actualRatio - c.targetRatio) * 100
    const adev = Math.abs(dev)
    if (adev > 5) {
      out.push(issue(batchId, view.index, 'areaRatio', 'severe',
        `「${c.label}」面积占比 ${(c.actualRatio * 100).toFixed(1)}%，标准 ${(c.targetRatio * 100).toFixed(1)}%，偏差 ${dev > 0 ? '+' : ''}${dev.toFixed(1)} 个百分点（>5）`, c.key))
    } else if (adev > 3) {
      out.push(issue(batchId, view.index, 'areaRatio', 'major',
        `「${c.label}」面积占比偏差 ${dev > 0 ? '+' : ''}${dev.toFixed(1)} 个百分点（3~5）`, c.key))
    }
  }

  // 3. 文字重叠（一般）
  const anns = view.annotations
  for (let i = 0; i < anns.length; i++) {
    for (let j = i + 1; j < anns.length; j++) {
      if (bboxOverlap(textBBox(anns[i]), textBBox(anns[j]))) {
        out.push(issue(batchId, view.index, 'textOverlap', 'major',
          `标注「${anns[i].text}」与「${anns[j].text}」文字重叠`, anns[i].targetKey))
      }
    }
  }

  // 4. 缺失必要标注（严重）
  for (const req of view.requiredTargets) {
    if (!anns.some((a) => a.targetKey === req.key)) {
      out.push(issue(batchId, view.index, 'missing', 'severe',
        `缺失必要标注「${req.label}」`, req.key))
    }
  }

  // 5. 引线交叉（提示）
  for (let i = 0; i < anns.length; i++) {
    for (let j = i + 1; j < anns.length; j++) {
      const a = anns[i], b = anns[j]
      if (segIntersect(a.anchor, a, b.anchor, b)) {
        out.push(issue(batchId, view.index, 'leaderCross', 'minor',
          `「${a.text}」与「${b.text}」的标注引线交叉`, a.targetKey))
      }
    }
  }
  return out
}

/** 对整批跑检查 */
export function checkBatch(batch) {
  seq = 0
  return batch.views.flatMap((v) => checkView(batch.id, v))
}

/** 放行判定：所有问题均已复核（确认或驳回），且没有被确认的严重问题 */
export function releaseVerdict(issues) {
  const pending = issues.filter((i) => i.status === 'pending')
  const confirmedSevere = issues.filter((i) => i.severity === 'severe' && i.status === 'confirmed')
  return {
    releasable: pending.length === 0 && confirmedSevere.length === 0,
    pendingCount: pending.length,
    confirmedSevereCount: confirmedSevere.length
  }
}
