<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import StationCanvas from '../components/StationCanvas.vue'
import {
  conflictReport, currentStation, getSimResults, resetSimResults, saveSimResult, state
} from '../store'
import {
  buildSimSteps, lockRoute, releaseRoute, type RuntimeLock
} from '../lib/simulator'
import type { Route, SimResult, SimStep } from '../types'
import { dirLabel, routeTypeLabel } from '../lib/util'

const station = computed(() => currentStation.value!)
const report = computed(() => conflictReport(station.value))

const rt = reactive<RuntimeLock>({
  switchLocks: new Map(),
  sectionLocks: new Map(),
  switchBlocked: new Set(),
  sectionBlocked: new Set()
}) as RuntimeLock

const selectedId = ref<string>('')
const running = ref(false)
const timer = ref<number | null>(null)
const activeSteps = ref<SimStep[]>([])
const currentStepIdx = ref(-1)
const lastResult = ref<SimResult | null>(null)
const batchLog = ref<{ name: string; ok: boolean; reason?: string }[]>([])
const autoUnlock = ref(false)
const speed = ref(750)

const route = computed<Route | null>(() => station.value.routes.find((r) => r.id === selectedId.value) ?? null)
const results = computed(() => getSimResults(station.value.id))

watch(() => station.value.id, () => resetRuntime())

function resetRuntime() {
  stopTimer()
  rt.switchLocks = new Map()
  rt.sectionLocks = new Map()
  rt.switchBlocked = new Set(station.value.sections.filter((s) => s.blocked).map((s) => s.id))
  rt.sectionBlocked = new Set(station.value.sections.filter((s) => s.blocked).map((s) => s.id))
  activeSteps.value = []
  currentStepIdx.value = -1
  lastResult.value = null
  batchLog.value = []
  selectedId.value = station.value.routes[0]?.id ?? ''
}

function stopTimer() {
  if (timer.value !== null) {
    clearInterval(timer.value)
    timer.value = null
  }
  running.value = false
}

// 高亮：已执行成功步骤涉及的设备 + 当前进路
const activeSwitchIds = computed(() => {
  const ids = new Set<string>()
  for (const s of activeSteps.value) if (s.kind === 'switch' && s.ok) ids.add(s.targetId)
  return [...ids]
})
const activeSectionIds = computed(() => {
  const ids = new Set<string>()
  for (const s of activeSteps.value) if (s.kind === 'section' && s.ok) ids.add(s.targetId)
  return [...ids]
})
const openSignalIds = computed(() => {
  const ids: string[] = []
  for (const s of activeSteps.value) {
    if (s.kind === 'signal' && s.ok && s.label.includes('开放')) ids.push(s.targetId)
  }
  return ids
})
const failTarget = computed(() => {
  const f = activeSteps.value.find((s) => !s.ok)
  return f ? f.targetId : null
})

// buildSimSteps 需要拓扑，统一在这里构建
import { buildTopology } from '../lib/topology'

function buildStepsSafe(r: Route): SimStep[] {
  return buildSimSteps({
    station: station.value,
    topo: buildTopology(station.value),
    route: r,
    rt,
    hostileRouteIds: report.value.hostileRouteIds,
    by: state.role
  })
}

function selectRoute(id: string) {
  if (running.value) return
  selectedId.value = id
  activeSteps.value = []
  currentStepIdx.value = -1
  lastResult.value = results.value[id] ?? null
}

function play() {
  const r = route.value
  if (!r || running.value) return
  stopTimer()
  activeSteps.value = buildStepsSafe(r)
  currentStepIdx.value = -1
  running.value = true
  timer.value = window.setInterval(tick, speed.value)
}

function tick() {
  const steps = activeSteps.value
  if (currentStepIdx.value + 1 >= steps.length) {
    finish()
    return
  }
  currentStepIdx.value += 1
  const step = steps[currentStepIdx.value]
  if (!step.ok) {
    window.setTimeout(finish, speed.value)
    stopTimer()
  }
}

function finish() {
  stopTimer()
  const r = route.value
  if (!r) return
  const fail = activeSteps.value.find((s) => !s.ok)
  const result: SimResult = {
    routeId: r.id,
    ok: !fail,
    steps: [...activeSteps.value],
    failStep: fail ? fail.index : -1,
    reason: fail?.reason,
    at: Date.now(),
    by: state.role
  }
  lastResult.value = result
  saveSimResult(station.value.id, result)
  if (result.ok) lockRoute(rt, r)
  else if (autoUnlock.value) releaseRoute(rt, r)
}

function stepOnce() {
  const r = route.value
  if (!r || running.value) return
  if (!activeSteps.value.length) {
    activeSteps.value = buildStepsSafe(r)
    currentStepIdx.value = -1
  }
  if (currentStepIdx.value + 1 >= activeSteps.value.length) return
  currentStepIdx.value += 1
  const step = activeSteps.value[currentStepIdx.value]
  if (!step.ok) finish()
  else if (currentStepIdx.value === activeSteps.value.length - 1) finish()
}

function runAll() {
  stopTimer()
  // 干净环境下全量回归
  rt.switchLocks = new Map()
  rt.sectionLocks = new Map()
  batchLog.value = []
  let i = 0
  running.value = true
  const next = () => {
    if (i >= station.value.routes.length) {
      running.value = false
      return
    }
    const r = station.value.routes[i++]
    const steps = buildStepsSafe(r)
    const fail = steps.find((s) => !s.ok)
    const result: SimResult = {
      routeId: r.id,
      ok: !fail,
      steps,
      failStep: fail ? fail.index : -1,
      reason: fail?.reason,
      at: Date.now(),
      by: state.role
    }
    saveSimResult(station.value.id, result)
    batchLog.value.push({ name: r.name, ok: result.ok, reason: result.reason })
    if (result.ok) {
      lockRoute(rt, r)
      if (autoUnlock.value) releaseRoute(rt, r)
    }
    timer.value = window.setTimeout(next, 120) as unknown as number
  }
  next()
}

function clearAll() {
  stopTimer()
  resetSimResults(station.value.id)
  resetRuntime()
}

// 故障注入
function toggleSwitchBlocked(id: string) {
  if (rt.switchBlocked.has(id)) rt.switchBlocked.delete(id)
  else rt.switchBlocked.add(id)
}
function toggleSectionBlocked(id: string) {
  if (rt.sectionBlocked.has(id)) {
    rt.sectionBlocked.delete(id)
    const sec = station.value.sections.find((s) => s.id === id)
    if (sec) sec.blocked = false
  } else {
    rt.sectionBlocked.add(id)
    const sec = station.value.sections.find((s) => s.id === id)
    if (sec) sec.blocked = true
  }
}

function stepTagClass(step: SimStep, idx: number) {
  if (idx > currentStepIdx.value) return 'pending'
  if (!step.ok) return 'fail'
  return 'done'
}

const nameOf = {
  switch: (id: string) => station.value.switches.find((s) => s.id === id)?.name ?? id,
  section: (id: string) => station.value.sections.find((s) => s.id === id)?.name ?? id,
  signal: (id: string) => station.value.signals.find((s) => s.id === id)?.name ?? id
}

const switchLockList = computed(() =>
  [...rt.switchLocks.entries()].map(([k, v]) => ({
    key: k,
    position: v.position,
    routeName: station.value.routes.find((r) => r.id === v.routeId)?.name ?? v.routeId
  }))
)
const sectionLockList = computed(() =>
  [...rt.sectionLocks.entries()].map(([k, rid]) => ({
    key: k,
    routeName: station.value.routes.find((r) => r.id === rid)?.name ?? rid
  }))
)

onBeforeUnmount(stopTimer)
</script>

<template>
  <div v-if="station">
    <h2 class="page-title">
      进路排列仿真校验 —— {{ station.name }}
      <span class="tag blue">角色：{{ { designer: '信号设计员', reviewer: '主管审核员', tester: '仿真测试员' }[state.role] }}</span>
    </h2>

    <div class="sim-layout">
      <!-- 左：进路列表 -->
      <aside class="panel list-panel">
        <h3>进路列表（{{ station.routes.length }}）</h3>
        <div class="sim-controls">
          <button class="primary sm" :disabled="!route || running" @click="play">▶ 排列选中进路</button>
          <button class="sm" :disabled="!route || running" @click="stepOnce">单步执行</button>
          <button class="sm" :disabled="running || !station.routes.length" @click="runAll">批量回归</button>
          <button class="sm danger" @click="clearAll">清空仿真结果</button>
        </div>
        <div class="opt-line">
          <label class="ck"><input type="checkbox" v-model="autoUnlock" /> 排列成功后自动解锁（独立回归）</label>
          <label class="speed">动画间隔
            <select v-model.number="speed">
              <option :value="1200">慢速 1.2s</option>
              <option :value="750">常速 0.75s</option>
              <option :value="350">快速 0.35s</option>
            </select>
          </label>
        </div>
        <div class="route-list scroll">
          <div v-for="r in station.routes" :key="r.id" class="route-item"
               :class="{ on: selectedId === r.id, danger: report.hostileRouteIds.has(r.id), warn: report.switchConflictRouteIds.has(r.id) }"
               @click="selectRoute(r.id)">
            <div class="ri-top">
              <b>{{ r.name }}</b>
              <span :class="['tag', (results[r.id]?.ok || r.simStatus === 'passed') ? 'green' : r.simStatus === 'failed' ? 'red' : 'gray']">
                {{ (results[r.id]?.ok || r.simStatus === 'passed') ? '通过' : r.simStatus === 'failed' ? '未通过' : '未跑' }}
              </span>
            </div>
            <div class="muted ri-sub">{{ routeTypeLabel(r.type) }} · {{ dirLabel(r.direction) }} · {{ r.sectionOrder.length }} 区段 / {{ r.switchReqs.length }} 道岔</div>
          </div>
          <div v-if="!station.routes.length" class="empty">暂无进路，请先在进路表页生成</div>
        </div>
      </aside>

      <!-- 中：画布 + 步骤 -->
      <section class="center-col">
        <div class="canvas-box">
          <StationCanvas
            :station="station"
            :locked="true"
            :highlight-route="route"
            :active-switch-ids="activeSwitchIds"
            :active-section-ids="activeSectionIds"
            :open-signal-ids="openSignalIds"
            :fail-target-id="failTarget"
          />
        </div>

        <div class="panel steps-panel">
          <h3>
            排列步骤
            <span v-if="lastResult" :class="['tag', lastResult.ok ? 'green' : 'red']">
              {{ lastResult.ok ? '排列成功，信号已开放' : `排列失败：卡在第 ${lastResult.failStep + 1} 步` }}
            </span>
          </h3>
          <div v-if="lastResult && !lastResult.ok" class="fail-banner">
            ❌ 失败原因：<b>{{ lastResult.reason }}</b>
          </div>
          <div class="steps scroll">
            <div v-for="(s, idx) in activeSteps" :key="idx" :class="['step', stepTagClass(s, idx)]">
              <span class="step-no">{{ idx + 1 }}</span>
              <span class="step-icon">
                {{ s.kind === 'switch' ? '⤚' : s.kind === 'section' ? '▬' : s.kind === 'signal' ? '🚦' : '✓' }}
              </span>
              <span class="step-label">{{ s.label }}</span>
              <span v-if="idx <= currentStepIdx" class="step-state">
                <b v-if="s.ok" class="ok-text">通过</b>
                <b v-else class="danger-text">失败：{{ s.reason }}</b>
              </span>
              <span v-else class="muted">待执行</span>
            </div>
            <div v-if="!activeSteps.length" class="empty">选择左侧进路并点击「排列选中进路」，仿真将按按钮检查→选路→敌对检查→道岔转动→防护道岔→区段点亮→信号开放逐步执行</div>
          </div>
        </div>
      </section>

      <!-- 右：锁闭状态 + 故障注入 -->
      <aside class="panel fault-panel">
        <h3>故障注入</h3>
        <p class="muted tip">勾选后对应设备进入故障/封锁状态，再次排列相关进路将在对应步骤失败。</p>
        <h4>道岔故障</h4>
        <div v-for="s in station.switches" :key="s.id" class="fault-row">
          <label :class="{ blocked: rt.switchBlocked.has(s.id) }">
            <input type="checkbox" :checked="rt.switchBlocked.has(s.id)" @change="toggleSwitchBlocked(s.id)" />
            道岔 {{ s.name }} 故障封锁
          </label>
        </div>
        <div v-if="!station.switches.length" class="muted">无道岔</div>
        <h4>区段封锁/占用</h4>
        <div v-for="s in station.sections" :key="s.id" class="fault-row">
          <label :class="{ blocked: rt.sectionBlocked.has(s.id) }">
            <input type="checkbox" :checked="rt.sectionBlocked.has(s.id)" @change="toggleSectionBlocked(s.id)" />
            区段 {{ s.name }} 封锁占用
          </label>
        </div>
        <div v-if="!station.sections.length" class="muted">无区段</div>

        <h3 class="mt">当前锁闭状态</h3>
        <h4>已锁道岔（{{ switchLockList.length }}）</h4>
        <div v-for="item in switchLockList" :key="item.key" class="lock-row">
          {{ nameOf.switch(item.key) }} → {{ item.position === 'normal' ? '定位' : '反位' }}
          <span class="muted">{{ item.routeName }}</span>
        </div>
        <div v-if="!switchLockList.length" class="muted">无</div>
        <h4>已锁区段（{{ sectionLockList.length }}）</h4>
        <div v-for="item in sectionLockList" :key="item.key" class="lock-row">
          {{ nameOf.section(item.key) }}
          <span class="muted">{{ item.routeName }}</span>
        </div>
        <div v-if="!sectionLockList.length" class="muted">无</div>

        <h4>批量回归日志</h4>
        <div class="batch-log scroll">
          <div v-for="(l, i) in batchLog" :key="i" :class="l.ok ? 'ok-text' : 'danger-text'">
            {{ l.ok ? '✓' : '✗' }} {{ l.name }}<span v-if="!l.ok" class="fail-reason">（{{ l.reason }}）</span>
          </div>
          <div v-if="!batchLog.length" class="muted">尚未执行批量回归</div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.sim-layout {
  display: grid;
  grid-template-columns: 250px 1fr 280px;
  gap: 14px;
  height: calc(100vh - 200px);
  min-height: 520px;
}
.panel { overflow: hidden; display: flex; flex-direction: column; }
h3 { margin: 2px 0 10px; font-size: 15px; display: flex; align-items: center; gap: 10px; }
h4 { margin: 14px 0 6px; font-size: 13px; color: #33475c; }
.sim-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px; }
.opt-line { display: flex; flex-direction: column; gap: 6px; font-size: 12px; margin-bottom: 8px; }
.ck { display: flex; align-items: center; gap: 5px; }
.speed { display: flex; align-items: center; gap: 6px; color: var(--muted); }
.route-list { overflow: auto; flex: 1; }
.route-item { padding: 8px 10px; border-radius: 8px; cursor: pointer; border: 1px solid transparent; margin-bottom: 6px; }
.route-item:hover { background: var(--band); }
.route-item.on { background: #e6effd; border-color: var(--primary); }
.route-item.danger { border-left: 3px solid var(--danger); }
.route-item.warn:not(.danger) { border-left: 3px solid var(--warn); }
.ri-top { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
.ri-sub { font-size: 11px; margin-top: 3px; }
.center-col { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.canvas-box { flex: 1.1; min-height: 300px; }
.steps-panel { flex: 1; min-height: 0; }
.steps { overflow: auto; flex: 1; }
.step {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 10px;
  border-radius: 8px;
  margin-bottom: 4px;
  border: 1px solid var(--line);
  font-size: 13px;
}
.step.done { background: var(--ok-bg); border-color: #bfe3d0; }
.step.fail { background: var(--danger-bg); border-color: #efb0b0; }
.step.pending { opacity: 0.55; }
.step-no {
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--band);
  display: grid; place-items: center;
  font-size: 12px; font-weight: 700;
  flex-shrink: 0;
}
.step.fail .step-no { background: var(--danger); color: #fff; }
.step.done .step-no { background: var(--ok); color: #fff; }
.step-icon { width: 18px; text-align: center; }
.step-label { flex: 1; }
.fail-banner {
  background: var(--danger-bg);
  border: 1px solid #efb0b0;
  color: var(--danger);
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 10px;
  font-size: 13px;
}
.tip { font-size: 12px; }
.fault-panel { overflow: auto; }
.fault-row { font-size: 13px; padding: 3px 0; }
.fault-row label.blocked { color: var(--danger); font-weight: 600; }
.mt { margin-top: 16px; }
.lock-row { font-size: 12px; padding: 3px 0; display: flex; justify-content: space-between; gap: 8px; }
.lock-row .muted { font-size: 11px; text-align: right; }
.batch-log { max-height: 180px; overflow: auto; font-size: 12px; line-height: 1.7; }
.fail-reason { font-size: 11px; }
</style>
