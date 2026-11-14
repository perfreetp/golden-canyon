/**
 * 版本逐项比对：图元级 added/removed/modified + 字段级差异 + 洁污交叉统计。
 */
import type {
  DiffEntry,
  Drawing,
  DrawingEntity,
  VersionDiff,
} from '@/types'
import { polylineCrossings } from '@/render/geometry'

function entityLabel(e: DrawingEntity): string {
  if (e.device) return e.device.name
  if (e.label) return `标注「${e.label.text}」`
  if (e.flow) return e.flow.flowType === 'clean' ? '清洁流线' : '污物流线'
  const map: Record<string, string> = {
    'room-outline': '房间轮廓',
    'wash-sink': '清洗槽',
    'disinfect-tank': '消毒槽',
    'dry-bench': '干燥台',
    'scope-cabinet': '储镜柜',
    'dirt-zone': '污物通道',
    wall: '墙体',
    door: '门',
    'flow-line': '流线',
    label: '标注',
  }
  return map[e.kind] ?? e.kind
}

function fmt(v: unknown): string {
  if (v == null) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

/** 比较两个图元的可变字段，返回字段级差异 */
function diffFields(a: DrawingEntity, b: DrawingEntity): { field: string; before: string; after: string }[] {
  const out: { field: string; before: string; after: string }[] = []
  const fields: [string, (e: DrawingEntity) => unknown][] = [
    ['图层', (e) => e.layer],
    ['位置/几何', (e) => e.geom],
    ['折线节点', (e) => e.polyline],
    ['流线节点', (e) => e.flow?.points],
    ['流线类型', (e) => e.flow?.flowType],
    ['标注文本', (e) => e.label?.text],
    ['设备资产编号', (e) => e.device?.assetNo],
    ['设备名称', (e) => e.device?.name],
    ['型号规格', (e) => e.device?.model],
    ['最近检修日期', (e) => e.device?.lastMaintenanceDate],
    ['检修周期(天)', (e) => e.device?.maintenanceCycleDays],
    ['锁定', (e) => e.locked],
  ]
  for (const [name, get] of fields) {
    const va = get(a)
    const vb = get(b)
    if (JSON.stringify(va) !== JSON.stringify(vb)) {
      out.push({ field: name, before: fmt(va), after: fmt(vb) })
    }
  }
  return out
}

export function countCrossings(d: Drawing): number {
  const clean = d.entities.filter((e) => e.flow?.flowType === 'clean')
  const dirt = d.entities.filter((e) => e.flow?.flowType === 'dirt')
  const all = new Set<string>()
  for (const c of clean) {
    for (const dt of dirt) {
      for (const p of polylineCrossings(c.flow!.points, dt.flow!.points)) {
        all.add(`${Math.round(p.x)}_${Math.round(p.y)}`)
      }
    }
  }
  return all.size
}

export function diffDrawings(before: Drawing, after: Drawing): VersionDiff {
  const oldMap = new Map(before.entities.map((e) => [e.id, e]))
  const newMap = new Map(after.entities.map((e) => [e.id, e]))
  const entries: DiffEntry[] = []

  for (const e of after.entities) {
    const old = oldMap.get(e.id)
    if (!old) {
      entries.push({
        type: 'added',
        entityId: e.id,
        kind: e.kind,
        layer: e.layer,
        label: entityLabel(e),
      })
      continue
    }
    const fields = diffFields(old, e)
    if (fields.length) {
      entries.push({
        type: 'modified',
        entityId: e.id,
        kind: e.kind,
        layer: e.layer,
        label: entityLabel(e),
        fields,
      })
    }
  }
  for (const e of before.entities) {
    if (!newMap.has(e.id)) {
      entries.push({
        type: 'removed',
        entityId: e.id,
        kind: e.kind,
        layer: e.layer,
        label: entityLabel(e),
      })
    }
  }

  const order = { added: 0, modified: 1, removed: 2 }
  entries.sort((a, b) => order[a.type] - order[b.type] || a.label.localeCompare(b.label, 'zh'))

  return {
    drawingId: after.id,
    docNo: after.docNo,
    fromVersion: before.version,
    toVersion: after.version,
    entries,
    crossingsBefore: countCrossings(before),
    crossingsAfter: countCrossings(after),
    generatedAt: Date.now(),
  }
}
