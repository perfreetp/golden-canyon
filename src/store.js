import { reactive, watch, computed } from 'vue'
import { REGIONS, paintByNo } from './data/paints.js'

// ---- 状态机:待分色 → 分色中 → 待审批 → 退回 / 通过 ----
export const STATUS = {
  PENDING: '待分色',
  PAINTING: '分色中',
  REVIEW: '待审批',
  RETURNED: '退回',
  APPROVED: '通过'
}

const LS_KEY = 'figure-paint-approval-v1'

function emptyRegions() {
  const o = {}
  for (const r of REGIONS) o[r.key] = { paintNo: '', color: '', gloss: '哑光', coats: 1 }
  return o
}

let seq = 100
function makeOrder(batch, modelName, sculptor, daysFromNow, status = STATUS.PENDING) {
  const id = 'PO-' + (++seq)
  const now = Date.now()
  return {
    id,
    batch,
    modelName,
    sculptor,
    status,
    regions: emptyRegions(),
    reworkCount: 0,
    returnRecords: [],        // {time, reason, deltaList}
    history: [],            // 每次提交打样时的分色快照 [{time, regions}]
    createdAt: now,
    submittedAt: null,
    approvedAt: null,
    deadline: now + daysFromNow * 86400000
  }
}

function seed() {
  const d = 86400000
  const now = Date.now()
  const orders = [
    // 一批进行中的
    Object.assign(makeOrder('B2026-11A', '苍蓝骑士 1/7', '王工', 5), {
      status: STATUS.REVIEW,
      regions: {
        head:  { paintNo: 'FS-101', color: '#f2c9a8', gloss: '哑光', coats: 2 },
        torso: { paintNo: 'FS-401', color: '#1f3a6e', gloss: '半光', coats: 2 },
        cape:  { paintNo: 'FS-301', color: '#c0272d', gloss: '亮光', coats: 3 },
        base:  { paintNo: 'FS-201', color: '#1c1c22', gloss: '半光', coats: 1 }
      },
      submittedAt: now - 1 * d,
      history: []
    }),
    Object.assign(makeOrder('B2026-11A', '苍蓝骑士 1/7', '王工', 3), {
      status: STATUS.RETURNED,
      reworkCount: 1,
      regions: {
        head:  { paintNo: 'FS-101', color: '#f2c9a8', gloss: '哑光', coats: 2 },
        torso: { paintNo: 'FS-401', color: '#1f3a6e', gloss: '半光', coats: 2 },
        cape:  { paintNo: 'FS-302', color: '#7b1e2b', gloss: '半光', coats: 2 },
        base:  { paintNo: 'FS-203', color: '#8a8f98', gloss: '金属', coats: 1 }
      },
      returnRecords: [{ time: now - 2 * d, reason: '披风色差ΔE=6.2超差,底座漆号用错', deltaList: ['cape', 'base'] }],
      submittedAt: now - 2 * d
    }),
    Object.assign(makeOrder('B2026-11A', '星尘魔女 1/8', '李工', -2), {
      // 超期未通过 → 超期打样单
      status: STATUS.PAINTING,
      regions: {
        ...emptyRegions(),
        head: { paintNo: 'FS-101', color: '#f2c9a8', gloss: '哑光', coats: 2 }
      }
    }),
    Object.assign(makeOrder('B2026-10C', '钢羽机娘 1/6', '赵工', 10), {
      status: STATUS.APPROVED,
      regions: {
        head:  { paintNo: 'FS-101', color: '#f2c9a8', gloss: '哑光', coats: 2 },
        torso: { paintNo: 'FS-203', color: '#8a8f98', gloss: '金属', coats: 3 },
        cape:  { paintNo: 'FS-701', color: '#6b4a9e', gloss: '半光', coats: 2 },
        base:  { paintNo: 'FS-201', color: '#1c1c22', gloss: '半光', coats: 1 }
      },
      submittedAt: now - 6 * d,
      approvedAt: now - 5 * d
    }),
    Object.assign(makeOrder('B2026-10C', '钢羽机娘 1/6', '赵工', 8), {
      status: STATUS.APPROVED,
      reworkCount: 2,
      regions: {
        head:  { paintNo: 'FS-102', color: '#d9a075', gloss: '哑光', coats: 2 },
        torso: { paintNo: 'FS-203', color: '#8a8f98', gloss: '金属', coats: 3 },
        cape:  { paintNo: 'FS-401', color: '#1f3a6e', gloss: '哑光', coats: 2 },
        base:  { paintNo: 'FS-502', color: '#8c6239', gloss: '金属', coats: 2 }
      },
      returnRecords: [
        { time: now - 9 * d, reason: '躯干金属漆遍数不足', deltaList: ['torso'] },
        { time: now - 8 * d, reason: '头雕肤色偏红ΔE=4.1', deltaList: ['head'] }
      ],
      submittedAt: now - 7 * d,
      approvedAt: now - 6 * d
    }),
    makeOrder('B2026-11B', '白翼天使 1/7', '王工', 7),
    makeOrder('B2026-11B', '白翼天使 1/7', '李工', 7),
    Object.assign(makeOrder('B2026-10C', '苍蓝骑士 1/7', '王工', -1), {
      // 超期退回单
      status: STATUS.RETURNED,
      reworkCount: 1,
      regions: {
        head:  { paintNo: 'FS-101', color: '#f2c9a8', gloss: '哑光', coats: 2 },
        torso: { paintNo: 'FS-401', color: '#1f3a6e', gloss: '半光', coats: 2 },
        cape:  { paintNo: 'FS-301', color: '#c0272d', gloss: '亮光', coats: 3 },
        base:  { paintNo: 'FS-201', color: '#1c1c22', gloss: '半光', coats: 1 }
      },
      returnRecords: [{ time: now - 4 * d, reason: '底座漏喷光油', deltaList: ['base'] }],
      submittedAt: now - 4 * d
    })
  ]
  // 给有提交历史的单补一条快照(修改前对照用)
  for (const o of orders) {
    if (o.submittedAt && o.history.length === 0) {
      o.history.push({ time: o.submittedAt, regions: JSON.parse(JSON.stringify(o.regions)) })
    }
    if (o.reworkCount > 0) {
      // 再造一条"更早版本"快照,颜色略不同,体现修改前后
      const older = JSON.parse(JSON.stringify(o.regions))
      for (const k of Object.keys(older)) older[k].coats = Math.max(1, older[k].coats - 1)
      if (older.cape.paintNo === 'FS-302') older.cape.paintNo = 'FS-301'
      o.history.unshift({ time: o.submittedAt - 86400000, regions: older })
    }
  }
  return { orders }
}

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (Array.isArray(data.orders) && data.orders.length) return data
    }
  } catch (e) { /* 损坏则重播种 */ }
  return seed()
}

export const store = reactive(load())

watch(store, () => {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ orders: store.orders })) } catch (e) {}
}, { deep: true })

// ---- 派生与动作 ----

export function getOrder(id) {
  return store.orders.find(o => o.id === id)
}

// 校验:漏涂(无颜色)与空漆号 → 返回 {regionKey: '漏涂'|'空漆号'}
export function validateOrder(order) {
  const errs = {}
  for (const r of REGIONS) {
    const reg = order.regions[r.key]
    if (!reg.color) errs[r.key] = '漏涂'
    else if (!reg.paintNo) errs[r.key] = '空漆号'
  }
  return errs
}

export function startPainting(order) {
  if (order.status === STATUS.PENDING) order.status = STATUS.PAINTING
}

export function submitProof(order) {
  const errs = validateOrder(order)
  if (Object.keys(errs).length) return errs
  order.history.push({ time: Date.now(), regions: JSON.parse(JSON.stringify(order.regions)) })
  order.submittedAt = Date.now()
  order.status = STATUS.REVIEW
  return null
}

export function returnOrder(order, reason, deltaList) {
  order.status = STATUS.RETURNED
  order.reworkCount += 1
  order.returnRecords.push({ time: Date.now(), reason, deltaList })
}

export function approveOrder(order) {
  order.status = STATUS.APPROVED
  order.approvedAt = Date.now()
}

export function isOverdue(order) {
  return order.status !== STATUS.APPROVED && Date.now() > order.deadline
}

// 车间:漆号用量清单(仅已通过) 用量 = 区域系数 × 遍数 (ml)
export function usageList() {
  const map = new Map()
  for (const o of store.orders.filter(o => o.status === STATUS.APPROVED)) {
    for (const r of REGIONS) {
      const reg = o.regions[r.key]
      if (!reg.paintNo) continue
      const ml = r.area * reg.coats * 4 // 4ml/单位系数
      const cur = map.get(reg.paintNo) || { paintNo: reg.paintNo, name: paintByNo(reg.paintNo)?.name || '未知', usage: 0, orders: 0 }
      cur.usage += ml
      cur.orders += 1
      map.set(reg.paintNo, cur)
    }
  }
  return [...map.values()].sort((a, b) => b.usage - a.usage)
}

export function fmtTime(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
