// 分层平面图要素生成器：检查间 / 镜位 / 洗消间 / 镜库 / 复苏位 / 候诊区 / 医师工位
// 全部要素确定性生成，刷新后布局不变。要素总数 2000+（见 smoke-test 统计）。
import { createRng } from '../utils/rng.js'

export const WORLD_W = 4600
export const WORLD_H = 3200

// 四个检查区
const ZONES = [
  { key: 'A', name: 'A 区 · 胃肠镜检查', x: 1380, y: 40, w: 1680, h: 1520, kind: 'gastro' },
  { key: 'B', name: 'B 区 · 胃肠镜检查', x: 3100, y: 40, w: 1680, h: 1520, kind: 'gastro' },
  { key: 'C', name: 'C 区 · 治疗性内镜', x: 1380, y: 1600, w: 1680, h: 1560, kind: 'therapy' },
  { key: 'D', name: 'D 区 · 超声/小肠镜', x: 3100, y: 1600, w: 1680, h: 1560, kind: 'special' }
]

const DEVICE_DEFS = [
  { type: 'pendant', name: '吊塔', x: 92, y: 10, w: 40, h: 22 },
  { type: 'monitor', name: '监护仪', x: 150, y: 10, w: 34, h: 24 },
  { type: 'scopePosition', name: '镜位', x: 170, y: 52, w: 28, h: 28, selectable: true },
  { type: 'cart', name: '内镜台车', x: 176, y: 92, w: 36, h: 30 },
  { type: 'bed', name: '检查床', x: 24, y: 74, w: 96, h: 42 },
  { type: 'light', name: '无影灯', x: 97, y: 53, w: 26, h: 26, round: true },
  { type: 'anesthesia', name: '麻醉机', x: 16, y: 130, w: 38, h: 28 },
  { type: 'suction', name: '吸引器', x: 62, y: 132, w: 24, h: 24 },
  { type: 'pump', name: '输液泵', x: 120, y: 130, w: 16, h: 16 },
  { type: 'cabinet', name: '储物柜', x: 150, y: 138, w: 48, h: 18 }
]

function el(seq, base) {
  const e = {
    id: base.id || `el-${seq.seq++}`,
    type: base.type,
    name: base.name,
    layer: base.layer || 'device',
    x: base.x, y: base.y, w: base.w, h: base.h,
    zoneId: base.zoneId || null,
    roomId: base.roomId || null,
    status: base.status || 'idle',
    selectable: !!base.selectable,
    round: !!base.round,
    meta: base.meta || {}
  }
  seq.elements.push(e)
  seq.byId[e.id] = e
  return e
}

function buildExamZone(seq, zone, rng) {
  const { key, x, y, w, h } = zone
  el(seq, { id: `zone-${key}`, type: 'zoneSign', name: zone.name, layer: 'base', x: x + 20, y: y + 12, w: 320, h: 36, zoneId: key, meta: { zone: true } })

  // 28 间检查间：7 列 × 4 行
  const COLS = 7, ROWS = 4, GAP = 12
  const gx = x + 20, gy = y + 70
  const rw = (w - 40 - (COLS - 1) * GAP) / COLS // 224
  const rh = 181
  const rooms = []
  let n = 1
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const rx = gx + c * (rw + GAP)
      const ry = gy + r * (rh + GAP)
      const code = `${key}${String(n).padStart(2, '0')}`
      const room = el(seq, {
        id: `room-${code}`, type: 'room', name: `${code} 检查间`, layer: 'base',
        x: rx, y: ry, w: rw, h: rh, zoneId: key, selectable: true,
        status: 'idle',
        meta: { code, zone: key, kind: zone.kind, devices: [] }
      })
      rooms.push(room)
      for (const d of DEVICE_DEFS) {
        const dev = el(seq, {
          id: d.type === 'scopePosition' ? `scope-pos-${code}` : undefined,
          type: d.type, name: d.name,
          x: rx + d.x, y: ry + d.y, w: d.w, h: d.h,
          zoneId: key, roomId: room.id,
          selectable: d.selectable || false, round: d.round || false,
          meta: { code }
        })
        room.meta.devices.push(dev.id)
        if (d.type === 'scopePosition') room.meta.scopePositionId = dev.id
      }
      n++
    }
  }

  // 复苏区：8 个复苏单元，每单元 2 张复苏床（共 16 床/区）
  const recY = gy + ROWS * rh + (ROWS - 1) * GAP + 16
  const BAYS = 8
  const bayW = 196, bayGap = 10, bayH = 300
  for (let b = 0; b < BAYS; b++) {
    const bx = gx + b * (bayW + bayGap)
    const bayId = `bay-${key}-${b + 1}`
    el(seq, { id: bayId, type: 'recoveryBay', name: `复苏单元 ${key}${b + 1}`, layer: 'base', x: bx, y: recY, w: bayW, h: bayH, zoneId: key })
    for (let k = 0; k < 2; k++) {
      el(seq, {
        id: `recbed-${key}-${b + 1}-${k + 1}`, type: 'recoveryBed', name: `复苏床 ${key}${b + 1}-${k + 1}`,
        x: bx + 23, y: recY + 40 + k * 130, w: 150, h: 46,
        zoneId: key, roomId: bayId, selectable: true, status: 'idle'
      })
    }
  }

  // 底部：2 洗消间 + 2 镜库
  const by = recY + bayH + 16
  const bh = (y + h - 20) - by
  const widths = [440, 440, 365, 365]
  let cx = gx
  for (let i = 0; i < 4; i++) {
    const cw = widths[i]
    const isWash = i < 2
    const roomCode = `${key}-${isWash ? '洗消' : '镜库'}${(i % 2) + 1}`
    el(seq, {
      id: `support-${key}-${isWash ? 'wash' : 'store'}-${(i % 2) + 1}`,
      type: isWash ? 'washRoom' : 'scopeLibrary',
      name: `${zone.name.slice(0, 3)}${isWash ? '洗消间' : '镜库'} ${(i % 2) + 1}`,
      layer: 'base', x: cx, y: by, w: cw - 10, h: bh, zoneId: key, selectable: true,
      meta: { code: roomCode }
    })
    if (isWash) {
      // 8 个洗消工位
      for (let s = 0; s < 8; s++) {
        const col = s % 4, row = Math.floor(s / 4)
        el(seq, {
          id: `wash-${key}-${(i % 2) + 1}-${s + 1}`, type: 'washStation', name: '洗消工位',
          x: cx + 24 + col * 102, y: by + 60 + row * 110, w: 76, h: 62,
          zoneId: key, selectable: true, status: 'idle'
        })
      }
    } else {
      // 14 个镜柜
      for (let s = 0; s < 14; s++) {
        const col = s % 7, row = Math.floor(s / 7)
        el(seq, {
          id: `cab-${key}-${(i % 2) + 1}-${s + 1}`, type: 'scopeCabinet', name: '储镜柜',
          x: cx + 16 + col * 48, y: by + 70 + row * 90, w: 44, h: 30,
          zoneId: key, selectable: true, status: 'idle'
        })
      }
    }
    cx += cw
  }
  return rooms.map((r) => r.meta.code)
}

function buildWaitingHall(seq) {
  const x = 40, y = 40, w = 1300, h = 1440
  el(seq, { id: 'hall-waiting', type: 'room', name: '候诊大厅', layer: 'base', x, y, w, h, selectable: false, meta: { hall: true } })
  el(seq, { id: 'reception-desk', type: 'reception', name: '护士站/接待台', x: x + 60, y: y + 90, w: 260, h: 44 })
  el(seq, { id: 'reception-pc-1', type: 'computer', name: '分诊电脑', x: x + 92, y: y + 100, w: 26, h: 18 })
  el(seq, { id: 'reception-pc-2', type: 'computer', name: '分诊电脑', x: x + 142, y: y + 100, w: 26, h: 18 })
  for (let i = 0; i < 6; i++) {
    el(seq, { id: `kiosk-${i + 1}`, type: 'kiosk', name: '自助签到机', x: x + 36, y: y + 200 + i * 80, w: 44, h: 56, selectable: true })
  }
  for (let i = 0; i < 4; i++) {
    el(seq, { id: `display-${i + 1}`, type: 'display', name: '叫号显示屏', x: x + 700 + i * 140, y: y + 90, w: 110, h: 60 })
  }
  // 候诊座椅 18 列 × 20 排 = 360
  for (let r = 0; r < 20; r++) {
    for (let c = 0; c < 18; c++) {
      el(seq, {
        id: `seat-${r + 1}-${c + 1}`, type: 'waitingSeat', name: '候诊椅',
        x: x + 120 + c * 60, y: y + 200 + r * 60, w: 40, h: 40,
        status: 'available'
      })
    }
  }
  // 输液椅 2 列 × 24 排 = 48
  el(seq, { id: 'infusion-sign', type: 'sign', name: '输液/留观区', layer: 'base', x: x + 1196, y: y + 168, w: 96, h: 24 })
  for (let r = 0; r < 24; r++) {
    for (let c = 0; c < 2; c++) {
      el(seq, {
        id: `infseat-${r + 1}-${c + 1}`, type: 'infusionChair', name: '输液椅',
        x: x + 1204 + c * 50, y: y + 210 + r * 50, w: 34, h: 34, status: 'available'
      })
    }
  }
  // 卫生间 / 饮水
  el(seq, { id: 'wc-m', type: 'room', name: '男卫', layer: 'base', x: x + 40, y: y + 1290, w: 130, h: 120 })
  el(seq, { id: 'wc-f', type: 'room', name: '女卫', layer: 'base', x: x + 190, y: y + 1290, w: 130, h: 120 })
  el(seq, { id: 'water-1', type: 'water', name: '饮水点', x: x + 360, y: y + 1330, w: 30, h: 30 })
  el(seq, { id: 'water-2', type: 'water', name: '饮水点', x: x + 430, y: y + 1330, w: 30, h: 30 })
}

function buildStaffArea(seq) {
  const x = 40, y = 1520, w = 1300, h = 1640
  el(seq, { id: 'staff-area', type: 'room', name: '医师办公区', layer: 'base', x, y, w, h, meta: { hall: true } })
  const rooms = [
    { id: 'office-head', name: '主任办公室' },
    { id: 'office-teach', name: '示教室' },
    { id: 'office-consult', name: '会诊室' },
    { id: 'office-duty', name: '值班室' }
  ]
  rooms.forEach((r, i) => {
    el(seq, { id: r.id, type: 'room', name: r.name, layer: 'base', x: x + 60 + i * 300, y: y + 80, w: 280, h: 180, selectable: true })
  })
  // 64 个医师工位 8×8
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      el(seq, {
        id: `workstation-${r + 1}-${c + 1}`, type: 'workstation', name: '医师工位',
        x: x + 80 + c * 140, y: y + 320 + r * 90, w: 120, h: 70, selectable: true
      })
    }
  }
  el(seq, { id: 'staff-sign', type: 'sign', name: '开放办公区', layer: 'base', x: x + 60, y: y + 286, w: 140, h: 24 })
}

function buildCorridor(seq, rng) {
  el(seq, { id: 'corridor-main', type: 'corridor', name: '中央主通道', layer: 'base', x: 1340, y: 0, w: 40, h: WORLD_H, meta: { corridor: true } })
  el(seq, { id: 'corridor-cross', type: 'corridor', name: '横向通道', layer: 'base', x: 0, y: 1560, w: WORLD_W, h: 40, meta: { corridor: true } })
  // 各区入口指示牌 12
  ZONES.forEach((z, zi) => {
    for (let i = 0; i < 3; i++) {
      el(seq, {
        id: `sign-${zi}-${i}`, type: 'sign', name: `${z.key} 区指示牌`, layer: 'base',
        x: 1346, y: z.y + 120 + i * 380, w: 28, h: 60
      })
    }
  })
  // 灭火器 10、手消点 20、台车停放 10、抢救车 5、氧气接口 8
  for (let i = 0; i < 10; i++) {
    el(seq, { id: `fire-${i + 1}`, type: 'fireExtinguisher', name: '灭火器', x: 1350, y: 120 + i * 300, w: 20, h: 20 })
  }
  for (let i = 0; i < 20; i++) {
    el(seq, { id: `sanitizer-${i + 1}`, type: 'sanitizer', name: '手消点', x: 1352, y: 60 + i * 155, w: 16, h: 22 })
  }
  for (let i = 0; i < 10; i++) {
    const z = ZONES[i % 4]
    el(seq, { id: `park-${i + 1}`, type: 'cartParking', name: '台车停放点', x: z.x + z.w - 70, y: z.y + 14 + (i > 3 ? 1560 : 0), w: 46, h: 26 })
  }
  for (let i = 0; i < 5; i++) {
    const z = ZONES[i % 4]
    el(seq, { id: `emerg-${i + 1}`, type: 'emergencyCart', name: '抢救车', x: z.x + 40, y: z.y + 14 + (i > 1 ? 1560 : 0), w: 36, h: 26, selectable: true })
  }
  for (let i = 0; i < 8; i++) {
    const z = ZONES[i % 4]
    el(seq, { id: `oxygen-${i + 1}`, type: 'oxygenOutlet', name: '氧气接口', x: z.x + z.w - 130, y: z.y + 16 + (i > 3 ? 1560 : 0), w: 22, h: 22 })
  }
}

export function buildLayout() {
  const seq = { seq: 1, elements: [], byId: {} }
  const rng = createRng(20261115)
  const roomCodes = []
  ZONES.forEach((z) => roomCodes.push(...buildExamZone(seq, z, rng)))
  buildWaitingHall(seq)
  buildStaffArea(seq)
  buildCorridor(seq, rng)
  return {
    world: { w: WORLD_W, h: WORLD_H },
    zones: ZONES,
    elements: seq.elements,
    byId: seq.byId,
    roomCodes
  }
}
