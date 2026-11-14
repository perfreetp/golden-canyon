// Canvas2D 要素绘制：三档缩放细节、图层过滤、状态配色
import { statusText } from '../utils/format.js'

export const LAYERS = {
  base: { key: 'base', label: '建筑/房间轮廓', toggleable: false },
  device: { key: 'device', label: '设备层' },
  schedule: { key: 'schedule', label: '排程层' },
  alert: { key: 'alert', label: '告警层' }
}

// 状态配色（临床看板风格）
export const STATUS_COLORS = {
  idle: '#9fb3c8',
  available: '#52c41a',
  running: '#f5222d',
  reprocessing: '#722ed1',
  maintenance: '#fa8c16',
  reserved: '#1677ff',
  occupied: '#fa541c',
  waiting: '#faad14',
  disabled: '#8c8c8c'
}

const TYPE_COLOR = {
  room: '#e8f1fb',
  recoveryBay: '#f0f7ff',
  washRoom: '#f9f0ff',
  scopeLibrary: '#f6ffed',
  zoneSign: '#1d3a5f',
  sign: '#5b7393',
  corridor: '#f0f2f5',
  scopePosition: '#e6f4ff',
  bed: '#d6e4ff',
  recoveryBed: '#e6fffb',
  waitingSeat: '#f5f5f5',
  infusionChair: '#fff7e6',
  workstation: '#f0f5ff',
  washStation: '#f9f0ff',
  scopeCabinet: '#f6ffed',
  cart: '#d9d9d9',
  pendant: '#bfbfbf',
  monitor: '#262626',
  cartParking: '#e8e8e8',
  emergencyCart: '#ffccc7',
  fireExtinguisher: '#ff7875',
  sanitizer: '#b7eb8f',
  oxygenOutlet: '#91d5ff',
  kiosk: '#ffd591',
  display: '#85a5ff',
  reception: '#adc6ff',
  computer: '#595959',
  water: '#87e8de',
  default: '#d9d9d9'
}

export function typeColor(type) {
  return TYPE_COLOR[type] || TYPE_COLOR.default
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

// zoom: 0=小档（房间轮廓）1=中档（设备床位）2=大档（编号+状态）
export function visibleAtZoom(type, zoom) {
  if (zoom === 0) {
    return ['room', 'recoveryBay', 'washRoom', 'scopeLibrary', 'zoneSign', 'corridor', 'reception'].includes(type)
  }
  if (zoom === 1) {
    return !['sign'].includes(type)
  }
  return true
}

function elementLayer(type) {
  return ['room', 'recoveryBay', 'washRoom', 'scopeLibrary', 'zoneSign', 'sign', 'corridor', 'reception'].includes(type)
    ? 'base'
    : 'device'
}

export function drawElement(ctx, e, zoom, opts = {}) {
  const layer = opts.layerOverride || elementLayer(e.type)
  if (layer !== e._drawLayer && !opts.layerOverride) {
    // 统一由 tiles 决定调用，这里容错
  }
  const x = e.x, y = e.y, w = e.w, h = e.h
  const statusColor = STATUS_COLORS[e.status] || STATUS_COLORS.idle

  ctx.save()
  if (e.selectable && opts.selectedId === e.id) {
    ctx.shadowColor = '#ff4d4f'
    ctx.shadowBlur = 18
    ctx.lineWidth = 3
    ctx.strokeStyle = '#ff4d4f'
  } else if (opts.hoverId === e.id) {
    ctx.lineWidth = 2
    ctx.strokeStyle = '#faad14'
  }

  switch (e.type) {
    case 'room':
    case 'recoveryBay':
    case 'washRoom':
    case 'scopeLibrary':
      ctx.fillStyle = TYPE_COLOR[e.type]
      roundRect(ctx, x, y, w, h, 6)
      ctx.fill()
      ctx.strokeStyle = '#8ca6c2'
      ctx.lineWidth = 1.5
      ctx.stroke()
      // 状态条（顶部）
      ctx.fillStyle = statusColor
      roundRect(ctx, x, y, w, 7, 4)
      ctx.fill()
      if (zoom >= 1) {
        ctx.fillStyle = '#1f3b57'
        ctx.font = '600 13px "Segoe UI", sans-serif'
        ctx.textBaseline = 'top'
        ctx.fillText(e.name, x + 8, y + 12)
      }
      if (zoom >= 2) {
        ctx.font = '11px "Segoe UI", sans-serif'
        ctx.fillStyle = statusColor
        ctx.fillText(statusText(e.status), x + 8, y + h - 20)
      }
      break
    case 'zoneSign':
      ctx.fillStyle = TYPE_COLOR.zoneSign
      roundRect(ctx, x, y, w, h, 5)
      ctx.fill()
      if (zoom >= 1) {
        ctx.fillStyle = '#fff'
        ctx.font = '700 18px "Segoe UI", sans-serif'
        ctx.textBaseline = 'middle'
        ctx.fillText(e.name, x + 12, y + h / 2)
      }
      break
    case 'corridor':
      ctx.fillStyle = TYPE_COLOR.corridor
      ctx.fillRect(x, y, w, h)
      ctx.strokeStyle = '#d9d9d9'
      ctx.setLineDash([8, 8])
      ctx.strokeRect(x, y, w, h)
      ctx.setLineDash([])
      break
    case 'sign':
      ctx.fillStyle = TYPE_COLOR.sign
      roundRect(ctx, x, y, w, h, 3)
      ctx.fill()
      break
    case 'light':
      ctx.beginPath()
      ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2)
      ctx.fillStyle = '#fffbe6'
      ctx.fill()
      ctx.strokeStyle = '#faad14'
      ctx.lineWidth = 1.5
      ctx.stroke()
      break
    case 'monitor':
      ctx.fillStyle = '#1f1f1f'
      roundRect(ctx, x, y, w, h, 3)
      ctx.fill()
      if (e.status === 'running') {
        ctx.strokeStyle = '#52c41a'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(x + 4, y + h / 2)
        ctx.lineTo(x + 10, y + h / 2 - 5)
        ctx.lineTo(x + 16, y + h / 2 + 4)
        ctx.lineTo(x + w - 4, y + h / 2 - 6)
        ctx.stroke()
      }
      break
    case 'waitingSeat':
    case 'infusionChair':
      ctx.fillStyle = e.status === 'occupied' ? statusColor : TYPE_COLOR[e.type]
      roundRect(ctx, x, y, w, h, 6)
      ctx.fill()
      ctx.strokeStyle = '#bfbfbf'
      ctx.lineWidth = 1
      ctx.stroke()
      break
    case 'workstation':
      ctx.fillStyle = e.status === 'occupied' ? '#fff2e8' : TYPE_COLOR.workstation
      roundRect(ctx, x, y, w, h, 4)
      ctx.fill()
      ctx.strokeStyle = '#adc6ff'
      ctx.stroke()
      if (zoom >= 2 && e.meta?.doctorName) {
        ctx.fillStyle = '#1d3a5f'
        ctx.font = '11px "Segoe UI", sans-serif'
        ctx.textBaseline = 'top'
        ctx.fillText(e.meta.doctorName, x + 6, y + 6)
      }
      break
    case 'scopePosition':
      ctx.fillStyle = e.status === 'idle' ? TYPE_COLOR.scopePosition : statusColor + '33'
      roundRect(ctx, x, y, w, h, 5)
      ctx.fill()
      ctx.strokeStyle = e.status === 'idle' ? '#1677ff' : statusColor
      ctx.lineWidth = e.selectable ? 2 : 1
      ctx.stroke()
      if (zoom >= 2) {
        ctx.fillStyle = e.status === 'idle' ? '#1677ff' : statusColor
        ctx.font = '700 11px "Segoe UI", sans-serif'
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'center'
        ctx.fillText('镜', x + w / 2, y + h / 2 + 1)
        ctx.textAlign = 'left'
      }
      break
    case 'bed':
    case 'recoveryBed':
      ctx.fillStyle = e.status === 'idle' ? TYPE_COLOR[e.type] : statusColor + '44'
      roundRect(ctx, x, y, w, h, 8)
      ctx.fill()
      ctx.strokeStyle = e.status === 'idle' ? '#85a5ff' : statusColor
      ctx.lineWidth = 1.5
      ctx.stroke()
      // 枕头
      ctx.fillStyle = '#ffffffaa'
      roundRect(ctx, x + 4, y + 6, 16, h - 12, 4)
      ctx.fill()
      if (e.type === 'recoveryBed' && zoom >= 2 && e.meta?.patientNo) {
        ctx.fillStyle = '#cf1322'
        ctx.font = '10px "Segoe UI", sans-serif'
        ctx.textBaseline = 'top'
        ctx.fillText(e.meta.patientNo, x + 26, y + 6)
      }
      break
    case 'washStation':
      ctx.fillStyle = e.status === 'reprocessing' ? '#efdbff' : '#f9f0ff'
      roundRect(ctx, x, y, w, h, 6)
      ctx.fill()
      ctx.strokeStyle = e.status === 'reprocessing' ? '#722ed1' : '#b37feb'
      ctx.lineWidth = 1.5
      ctx.stroke()
      if (zoom >= 2) {
        ctx.fillStyle = '#531dab'
        ctx.font = '10px "Segoe UI", sans-serif'
        ctx.textBaseline = 'top'
        ctx.fillText(e.name, x + 6, y + 6)
      }
      break
    case 'scopeCabinet':
      ctx.fillStyle = e.status === 'maintenance' ? '#fff1f0' : TYPE_COLOR.scopeCabinet
      roundRect(ctx, x, y, w, h, 4)
      ctx.fill()
      ctx.strokeStyle = '#73d13d'
      ctx.lineWidth = 1
      ctx.stroke()
      break
    case 'reception':
    case 'kiosk':
    case 'display':
    case 'computer':
    case 'cart':
    case 'pendant':
    case 'anesthesia':
    case 'suction':
    case 'pump':
    case 'cabinet':
    case 'cartParking':
    case 'emergencyCart':
    case 'fireExtinguisher':
    case 'sanitizer':
    case 'oxygenOutlet':
    case 'water':
    default: {
      ctx.fillStyle = e.status && STATUS_COLORS[e.status] && !['idle', 'available'].includes(e.status)
        ? statusColor
        : TYPE_COLOR[e.type] || TYPE_COLOR.default
      roundRect(ctx, x, y, w, h, 4)
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'
      ctx.lineWidth = 1
      ctx.stroke()
      if (zoom >= 2 && w >= 34) {
        ctx.fillStyle = '#333'
        ctx.font = '10px "Segoe UI", sans-serif'
        ctx.textBaseline = 'top'
        ctx.fillText(e.name, x + 3, y + 3)
      }
    }
  }
  ctx.restore()
}

// 告警层：闪烁脉冲标记
export function drawAlertMark(ctx, element, phase) {
  const cx = element.x + element.w / 2
  const cy = element.y + element.h / 2
  const r = 14 + (phase % 20) * 0.6
  ctx.save()
  ctx.strokeStyle = `rgba(245,34,45,${0.8 - (phase % 20) * 0.035})`
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#f5222d'
  ctx.beginPath()
  ctx.arc(cx, cy, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = '700 9px "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('!', cx, cy + 0.5)
  ctx.textAlign = 'left'
  ctx.restore()
}
