<template>
  <div class="grid" style="grid-template-columns: 380px 1fr; align-items:start">
    <!-- 待排队列 -->
    <div class="card">
      <div class="card-h">
        待排班队列
        <span class="pill">{{ pendingList.length }} 例</span>
        <div style="flex:1"></div>
        <button class="btn sm primary" :disabled="!pendingList.length" @click="runAuto">⚡ 自动排班</button>
      </div>
      <div class="card-b" style="padding:0;max-height:640px;overflow:auto">
        <table>
          <tbody>
            <tr v-for="a in pendingList" :key="a.id" :style="{ background: activeAppt?.id === a.id ? '#eef6ff' : '' }"
                style="cursor:pointer" @click="activeAppt = a">
              <td>
                <div style="display:flex;gap:6px;align-items:center">
                  <span class="tag" :class="a.priority">{{ priorityText(a.priority) }}</span>
                  <b>{{ maskName(a.patientName) }}</b>
                </div>
                <div class="muted" style="font-size:12px;margin-top:3px">{{ a.patientNo }} · {{ a.gender }}/{{ a.age }}岁 · {{ a.procName }}（{{ a.duration }}档）</div>
              </td>
            </tr>
            <tr v-if="!pendingList.length"><td class="muted">全部预约已排程 ✅</td></tr>
          </tbody>
        </table>
      </div>
      <div class="card-b" style="border-top:1px solid var(--border)">
        <div style="font-weight:600;margin-bottom:6px">冲突检测</div>
        <div v-if="!conflicts.length" class="muted" style="font-size:12.5px">未发现容量/医师/镜体冲突</div>
        <div v-for="(c, i) in conflicts" :key="i" style="font-size:12.5px;color:var(--danger);padding:3px 0">
          ⚠ {{ c.detail }}（{{ c.a }} / {{ c.b }}）
        </div>
        <button class="btn sm" style="margin-top:8px" @click="refreshConflicts">重新检测</button>
      </div>
    </div>

    <!-- 房间时段网格 -->
    <div class="card">
      <div class="card-h">
        检查间时段容量网格
        <select v-model="zoneFilter" style="width:110px">
          <option value="">全部区域</option>
          <option v-for="z in state.layout.zones" :key="z.key" :value="z.key">{{ z.key }} 区</option>
        </select>
        <div style="flex:1"></div>
        <span class="muted" style="font-size:12px">红=急诊 蓝=常规 紫边=洗消周转中 · 点击空白时段为当前选中预约排班</span>
      </div>
      <div class="card-b scroll-x" style="max-height:640px;overflow:auto">
        <table class="grid-table">
          <thead>
            <tr>
              <th style="position:sticky;left:0;background:#f7f9fc;z-index:2">检查间</th>
              <th v-for="s in 20" :key="s" :class="{ nowCol: s - 1 === currentSlot }">{{ slotLabel(s - 1) }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="room in filteredRooms" :key="room.id">
              <td style="position:sticky;left:0;background:#fff;z-index:2;white-space:nowrap">
                <b>{{ room.code }}</b>
                <div class="muted" style="font-size:11px">容量{{ room.slotCapacity }} · 加急{{ Math.round(room.urgentRatio * 100) }}%</div>
              </td>
              <td v-for="s in 20" :key="s" :class="{ nowCol: s - 1 === currentSlot }"
                  style="padding:2px;min-width:64px"
                  @click="onCellClick(room, s - 1)">
                <div v-for="a in cellItems(room.id, s - 1)" :key="a.id"
                     class="cell-appt" :class="a.priority"
                     :title="`${maskName(a.patientName)} ${a.procName} ${apptStatusText(a.status)}`">
                  {{ maskName(a.patientName) }}·{{ a.procName }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 候选时段弹窗 -->
    <div v-if="showCandidates" class="modal-mask" @click.self="showCandidates = false">
      <div class="modal">
        <div class="modal-h">
          候选时段 — {{ activeAppt ? maskName(activeAppt.patientName) : '' }} {{ activeAppt?.procName }}
          <span class="tag" :class="activeAppt?.priority">{{ activeAppt ? priorityText(activeAppt.priority) : '' }}</span>
        </div>
        <div class="modal-b">
          <p v-if="assignError" style="color:var(--danger);margin-top:0">⚠ {{ assignError }}，请改选以下候选时段：</p>
          <p v-else class="muted" style="margin-top:0">系统按急诊优先与镜体周转约束计算出的可行时段：</p>
          <table>
            <thead><tr><th>时段</th><th>检查间</th><th>指派医师</th><th>镜体</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="(c, i) in candidates" :key="i">
                <td>{{ slotLabel(c.slot) }}（{{ c.slot + 1 }}档）</td>
                <td><b>{{ c.roomCode }}</b></td>
                <td>{{ c.doctorName }}</td>
                <td>{{ c.scopeCode }}</td>
                <td><button class="btn sm primary" @click="applyCandidate(c)">采用</button></td>
              </tr>
            </tbody>
          </table>
          <p v-if="!candidates.length" class="muted">无可行候选时段：可能受限于镜体池/医师排班/房间容量，请调整配置后重试。</p>
        </div>
        <div class="modal-f">
          <button class="btn" @click="showCandidates = false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../store/store.js'
import { slotLabel } from '../utils/time.js'
import { apptStatusText, priorityText } from '../utils/format.js'
import { maskName } from '../utils/rng.js'

const route = useRoute()
const store = useStore()
const { state, scheduler, logAudit } = store
const zoneFilter = ref(route.query.zone || '')
const activeAppt = ref(null)
const showCandidates = ref(false)
const candidates = ref([])
const assignError = ref('')
const conflicts = ref([])

const pendingList = computed(() =>
  state.appointments
    .filter((a) => a.status === 'pending')
    .sort((a, b) => (a.priority === b.priority ? 0 : a.priority === 'urgent' ? -1 : 1))
)

const filteredRooms = computed(() =>
  state.roomConfigs.filter((r) => r.enabled && (!zoneFilter.value || r.zone === zoneFilter.value))
)

const currentSlot = computed(() => Math.max(0, Math.floor((state.nowMin - 8 * 60) / 30)))

// 初始定位：从平面图跳转带 room 参数
watch(() => route.query.room, (code) => {
  if (!code) return
  const room = state.roomConfigs.find((r) => r.code === code)
  if (room) zoneFilter.value = room.zone
}, { immediate: true })

function cellItems(roomId, slot) {
  return state.appointments.filter((a) => a.roomId === roomId && a.slot === slot &&
    !['cancelled', 'noshow'].includes(a.status))
}

function onCellClick(room, slot) {
  if (!activeAppt.value) {
    // 未选中预约时：展示该时段已有预约信息
    const items = cellItems(room.id, slot)
    if (items.length) activeAppt.value = items[0]
    return
  }
  const res = scheduler.tryAssign(activeAppt.value, {
    roomId: room.id, slot,
    doctorId: pickDoctor(activeAppt.value, room, slot)?.id || null,
    operator: state.operator.name
  })
  if (res.ok) {
    showCandidates.value = false
    if (!pendingList.value.length) activeAppt.value = null
    refreshConflicts()
  } else {
    assignError.value = res.reason
    candidates.value = res.candidates || scheduler.candidateSlots(activeAppt.value)
    showCandidates.value = true
  }
}

function pickDoctor(appt, room, slot) {
  return state.doctors.find((d) => !d.off && d.skills.includes(appt.procId) &&
    slot >= d.shiftStart && slot + appt.duration <= d.shiftEnd &&
    d.zone === room.zone) || state.doctors.find((d) => !d.off && d.skills.includes(appt.procId))
}

function applyCandidate(c) {
  const appt = activeAppt.value
  if (!appt) return
  const res = scheduler.tryAssign(appt, {
    roomId: c.roomId, slot: c.slot, doctorId: c.doctorId, operator: state.operator.name
  })
  if (res.ok) {
    showCandidates.value = false
    refreshConflicts()
    if (!pendingList.value.length) activeAppt.value = null
  }
}

function runAuto() {
  const r = scheduler.autoSchedule({ operator: state.operator.name })
  refreshConflicts()
  if (r.failed.length) {
    activeAppt.value = state.appointments.find((a) => a.id === r.failed[0].id) || null
    if (activeAppt.value) {
      candidates.value = scheduler.candidateSlots(activeAppt.value)
      assignError.value = r.failed[0].reason
      showCandidates.value = true
    }
  }
}

function refreshConflicts() {
  conflicts.value = scheduler.detectConflicts()
}
refreshConflicts()
</script>

<style scoped>
.grid-table { border-collapse: collapse; }
.cell-appt {
  font-size: 11px; border-radius: 5px; padding: 3px 5px; margin: 1px 0; color: #fff;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;
}
.cell-appt.urgent { background: #f5222d; }
.cell-appt.normal { background: #1677ff; }
td.nowCol, th.nowCol { background: #fffbe6; }
</style>
