// 全局响应式状态：站点/设备/进路/工作流/仿真结果，localStorage 持久化
import { computed, reactive, watch } from 'vue'
import type {
  Direction,
  Role,
  Route,
  RouteType,
  Section,
  SignalDevice,
  SimResult,
  Station,
  SwitchNode,
  TrackRow,
  WorkflowStatus
} from './types'
import { uid } from './lib/util'
import { analyzeConflicts } from './lib/conflict'
import { generateRoutes, recomputeRoute } from './lib/generator'

const STORE_KEY = 'rail-interlocking-v1'

interface PersistShape {
  role: Role
  stations: Station[]
  currentId: string
  simResults: Record<string, Record<string, SimResult>>
}

interface State extends PersistShape {}

function loadState(): PersistShape | null {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistShape
  } catch {
    return null
  }
}

const persisted = loadState()

export const state = reactive<State>(
  persisted ?? {
    role: 'designer',
    stations: [],
    currentId: '',
    simResults: {}
  }
)

watch(
  () => JSON.stringify({ role: state.role, stations: state.stations, currentId: state.currentId, simResults: state.simResults }),
  (val) => {
    try {
      localStorage.setItem(STORE_KEY, val)
    } catch {
      // 存储配额超限时静默（可改用导出备份）
    }
  }
)

// ---------- 选择器 ----------
export const currentStation = computed<Station | null>(
  () => state.stations.find((s) => s.id === state.currentId) ?? state.stations[0] ?? null
)

export const isLocked = computed(() => {
  const st = currentStation.value
  return !!st && st.status !== 'draft' && st.status !== 'rejected'
})

export const canEdit = computed(() => {
  const st = currentStation.value
  return !!st && (st.status === 'draft' || st.status === 'rejected')
})

export function conflictReport(station: Station) {
  return analyzeConflicts(station)
}

// ---------- 角色 ----------
export function setRole(role: Role) {
  state.role = role
}

// ---------- 车站 ----------
export function addStation(name: string): Station {
  const station: Station = {
    id: uid('st'),
    name: name || `车站 ${state.stations.length + 1}`,
    width: 1180,
    height: 560,
    rows: [],
    switches: [],
    sections: [],
    signals: [],
    routes: [],
    status: 'draft',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  state.stations.push(station)
  state.currentId = station.id
  return station
}

export function deleteStation(id: string) {
  const idx = state.stations.findIndex((s) => s.id === id)
  if (idx >= 0) {
    state.stations.splice(idx, 1)
    delete state.simResults[id]
    if (state.currentId === id) state.currentId = state.stations[0]?.id ?? ''
  }
}

export function selectStation(id: string) {
  state.currentId = id
}

function touch(st: Station) {
  st.updatedAt = Date.now()
}

// ---------- 股道 ----------
export function addRow(st: Station, name: string, y: number, main = false): TrackRow {
  const row: TrackRow = { id: uid('row'), name, y, x1: 40, x2: st.width - 40, main }
  st.rows.push(row)
  touch(st)
  return row
}

export function updateRow(st: Station, id: string, patch: Partial<TrackRow>) {
  const row = st.rows.find((r) => r.id === id)
  if (row) Object.assign(row, patch)
  touch(st)
}

export function removeRow(st: Station, id: string) {
  st.rows = st.rows.filter((r) => r.id !== id)
  st.switches = st.switches.filter((s) => s.rowId !== id)
  st.sections = st.sections.filter((s) => s.rowId !== id)
  st.signals = st.signals.filter((s) => s.rowId !== id)
  touch(st)
}

// ---------- 道岔 ----------
export function addSwitch(st: Station, rowId: string, x: number): SwitchNode {
  const n = st.switches.length + 1
  const sw: SwitchNode = { id: uid('sw'), name: `${n}#`, rowId, x }
  st.switches.push(sw)
  touch(st)
  return sw
}

export function updateSwitch(st: Station, id: string, patch: Partial<SwitchNode>) {
  const sw = st.switches.find((s) => s.id === id)
  if (sw) Object.assign(sw, patch)
  touch(st)
}

export function removeSwitch(st: Station, id: string) {
  st.switches = st.switches.filter((s) => s.id !== id)
  touch(st)
}

// ---------- 轨道区段（自动吸附股道中心线，y 由所属股道决定） ----------
export function addSection(st: Station, rowId: string, x: number): Section {
  const n = st.sections.length + 1
  const half = 70
  const sec: Section = {
    id: uid('sec'),
    name: `${n}DG`,
    rowId,
    x1: Math.max(10, x - half),
    x2: Math.min(st.width - 10, x + half)
  }
  st.sections.push(sec)
  touch(st)
  return sec
}

export function updateSection(st: Station, id: string, patch: Partial<Section>) {
  const sec = st.sections.find((s) => s.id === id)
  if (sec) Object.assign(sec, patch)
  touch(st)
}

export function removeSection(st: Station, id: string) {
  st.sections = st.sections.filter((s) => s.id !== id)
  touch(st)
}

// ---------- 信号机 ----------
const SIG_PREFIX: Record<string, string> = { entry: 'X', exit: 'S', shunt: 'D' }
export function addSignal(st: Station, rowId: string, x: number, kind: SignalDevice['kind'], direction: Direction): SignalDevice {
  const sameKind = st.signals.filter((s) => s.kind === kind).length + 1
  const sig: SignalDevice = {
    id: uid('sig'),
    name: `${SIG_PREFIX[kind]}${sameKind}`,
    kind,
    rowId,
    x,
    direction
  }
  st.signals.push(sig)
  touch(st)
  return sig
}

export function updateSignal(st: Station, id: string, patch: Partial<SignalDevice>) {
  const sig = st.signals.find((s) => s.id === id)
  if (sig) Object.assign(sig, patch)
  touch(st)
}

export function removeSignal(st: Station, id: string) {
  st.signals = st.signals.filter((s) => s.id !== id)
  touch(st)
}

// ---------- 进路 ----------
export function batchAddRoutes(st: Station, direction: Direction, types: RouteType[]): Route[] {
  const created = generateRoutes(st, { direction, types })
  st.routes.push(...created)
  touch(st)
  return created
}

export function addManualRoute(st: Station, route: Route) {
  st.routes.push(route)
  touch(st)
}

export function updateRoute(st: Station, id: string, patch: Partial<Route>) {
  const r = st.routes.find((x) => x.id === id)
  if (r) Object.assign(r, patch)
  touch(st)
}

export function removeRoute(st: Station, id: string) {
  st.routes = st.routes.filter((r) => r.id !== id)
  if (state.simResults[st.id]) delete state.simResults[st.id][id]
  touch(st)
}

export function fixRoute(st: Station, id: string): boolean {
  const r = st.routes.find((x) => x.id === id)
  if (!r) return false
  const fixed = recomputeRoute(st, r)
  if (!fixed) return false
  Object.assign(r, fixed)
  touch(st)
  return true
}

// ---------- 工作流 ----------
export function submitForReview(st: Station, by: string) {
  st.status = 'submitted'
  st.submitAt = Date.now()
  st.submitBy = by
  st.reviewNote = undefined
  touch(st)
}

export function rejectStation(st: Station, reviewer: string, note: string) {
  st.status = 'rejected'
  st.reviewAt = Date.now()
  st.reviewBy = reviewer
  st.reviewNote = note
  touch(st)
}

export function publishStation(st: Station, reviewer: string) {
  st.status = 'published'
  st.reviewAt = Date.now()
  st.reviewBy = reviewer
  touch(st)
}

export function unpublishStation(st: Station) {
  st.status = 'draft'
  st.reviewAt = undefined
  st.reviewBy = undefined
  touch(st)
}

export function setStatus(st: Station, status: WorkflowStatus) {
  st.status = status
  touch(st)
}

// ---------- 仿真结果 ----------
export function saveSimResult(stationId: string, result: SimResult) {
  if (!state.simResults[stationId]) state.simResults[stationId] = {}
  state.simResults[stationId][result.routeId] = result
  const st = state.stations.find((s) => s.id === stationId)
  const route = st?.routes.find((r) => r.id === result.routeId)
  if (route) {
    route.simStatus = result.ok ? 'passed' : 'failed'
    route.simFailStep = result.ok ? undefined : result.failStep
    route.simFailReason = result.ok ? undefined : result.reason
    route.simAt = result.at
    route.simBy = result.by
  }
}

export function getSimResults(stationId: string): Record<string, SimResult> {
  return state.simResults[stationId] ?? {}
}

export function resetSimResults(stationId: string) {
  state.simResults[stationId] = {}
  const st = state.stations.find((s) => s.id === stationId)
  if (st) {
    for (const r of st.routes) {
      r.simStatus = 'unrun'
      r.simFailStep = undefined
      r.simFailReason = undefined
      r.simAt = undefined
      r.simBy = undefined
    }
  }
}

// ---------- 导出 ----------
function csvCell(v: unknown): string {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function exportStationCsv(st: Station): string {
  const swName = (id: string) => st.switches.find((s) => s.id === id)?.name ?? id
  const secName = (id: string) => st.sections.find((s) => s.id === id)?.name ?? id
  const sigName = (id: string) => st.signals.find((s) => s.id === id)?.name ?? id
  const header = [
    '序号', '进路名称', '类型', '运行方向', '始端按钮', '终端按钮',
    '道岔定反位要求', '防护道岔', '区段占用顺序', '仿真结果', '失败步骤', '失败原因'
  ]
  const lines = [header.join(',')]
  st.routes.forEach((r, i) => {
    const typeText = r.type === 'arrival' ? '接车' : r.type === 'departure' ? '发车' : '调车'
    const swText = r.switchReqs.map((x) => `${swName(x.switchId)}=${x.position === 'normal' ? '定位' : '反位'}`).join('；')
    const protText = r.protectiveSwitches.map(swName).join('；')
    const secText = r.sectionOrder.map(secName).join('→')
    const simText = r.simStatus === 'passed' ? '通过' : r.simStatus === 'failed' ? '未通过' : '未仿真'
    lines.push([
      i + 1, r.name, typeText, r.direction === 'left' ? '向左（下行）' : '向右（上行）',
      sigName(r.startSignalId), sigName(r.endSignalId), swText, protText, secText,
      simText, r.simFailStep != null ? r.simFailStep + 1 : '', r.simFailReason ?? ''
    ].map(csvCell).join(','))
  })
  return '﻿' + lines.join('\n')
}

export function downloadCsv(st: Station) {
  const blob = new Blob([exportStationCsv(st)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${st.name}_进路清单_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadJsonBackup() {
  const blob = new Blob([JSON.stringify({ stations: state.stations, simResults: state.simResults }, null, 2)], {
    type: 'application/json'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `联锁进路数据备份_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ---------- 统计 ----------
export interface StationStat {
  stationId: string
  stationName: string
  routeCount: number
  hostilePairs: number
  switchConflictPairs: number
  simPassed: number
  simFailed: number
  simUnrun: number
  status: WorkflowStatus
}

export const stats = computed<StationStat[]>(() =>
  state.stations.map((st) => {
    const report = analyzeConflicts(st)
    const results = state.simResults[st.id] ?? {}
    let passed = 0
    let failed = 0
    for (const r of st.routes) {
      if (r.simStatus === 'passed' || results[r.id]?.ok) passed++
      else if (r.simStatus === 'failed') failed++
    }
    return {
      stationId: st.id,
      stationName: st.name,
      routeCount: st.routes.length,
      hostilePairs: report.hostile.length,
      switchConflictPairs: report.switchConflicts.length,
      simPassed: passed,
      simFailed: failed,
      simUnrun: st.routes.length - passed - failed,
      status: st.status
    }
  })
)
