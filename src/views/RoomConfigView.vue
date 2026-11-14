<template>
  <div class="grid" style="grid-template-columns: 1fr 360px; align-items:start">
    <div class="card">
      <div class="card-h">
        检查间配置（共 {{ state.roomConfigs.length }} 间）
        <div style="flex:1"></div>
        <select v-model="zoneFilter" style="width:110px">
          <option value="">全部区域</option>
          <option v-for="z in state.layout.zones" :key="z.key" :value="z.key">{{ z.key }} 区</option>
        </select>
      </div>
      <div class="card-b scroll-x">
        <table>
          <thead>
            <tr>
              <th>编号</th><th>区域</th><th>类型</th><th>时段容量</th><th>加急比例</th>
              <th>支持项目</th><th>启用</th><th>当日排程</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in filtered" :key="r.id">
              <td><b>{{ r.code }}</b></td>
              <td>{{ r.zone }} 区</td>
              <td>{{ kindText(r.kind) }}</td>
              <td>
                <select :value="r.slotCapacity" @change="patch(r, { slotCapacity: +$event.target.value })">
                  <option :value="1">1 例/档</option>
                  <option :value="2">2 例/档</option>
                </select>
              </td>
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  <input type="range" min="0" max="50" step="5" :value="Math.round(r.urgentRatio * 100)"
                         @input="patch(r, { urgentRatio: +$event.target.value / 100 })" style="width:90px" />
                  <span style="width:42px">{{ Math.round(r.urgentRatio * 100) }}%</span>
                </div>
              </td>
              <td style="font-size:12px">{{ r.supported.map(id => procName(id)).join('、') }}</td>
              <td>
                <label class="switch">
                  <input type="checkbox" :checked="r.enabled" @change="patch(r, { enabled: $event.target.checked })" />
                  <i></i>
                </label>
              </td>
              <td>{{ roomApptCount(r.id) }} 例</td>
              <td><button class="btn sm" @click="openEdit(r)">编辑项目</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 侧栏：规则说明 + 当日容量概览 -->
    <div class="grid">
      <div class="card">
        <div class="card-h">排程规则（系统自动执行）</div>
        <div class="card-b" style="font-size:13px;line-height:1.9">
          <p>① <b>急诊优先</b>：加急预约在待排队列中最先处理，优先占用当天最早可行时段；</p>
          <p>② <b>镜体周转</b>：镜体使用后进入 {{ REPROCESS_MINUTES }} 分钟洗消，周转完成前不可再派；</p>
          <p>③ <b>时段容量</b>：每档 30 分钟，房间并行数不超过配置容量；</p>
          <p>④ <b>加急比例</b>：普通预约自动避开加急配额未达标的房间早期时段，为急诊预留通道；</p>
          <p>⑤ 硬冲突（容量满/医师重叠/无镜体）时系统不强行落位，输出候选时段由人工改期。</p>
        </div>
      </div>
      <div class="card">
        <div class="card-h">当日容量概览</div>
        <div class="card-b">
          <div v-for="z in state.layout.zones" :key="z.key" style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
              <b>{{ z.key }} 区</b>
              <span class="muted">{{ zoneLoad(z.key).used }} / {{ zoneLoad(z.key).cap }} 时段</span>
            </div>
            <div class="bar"><i :style="{ width: (zoneLoad(z.key).rate * 100) + '%' }"></i></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑支持项目 -->
    <div v-if="editing" class="modal-mask" @click.self="editing = null">
      <div class="modal" style="width:520px">
        <div class="modal-h">{{ editing.code }} 检查间 — 支持检查项目</div>
        <div class="modal-b">
          <label v-for="p in state.procTypes" :key="p.id" style="display:flex;gap:10px;padding:8px 0;align-items:center">
            <input type="checkbox" :checked="editing.supported.includes(p.id)"
                   @change="toggleProc(p.id, $event.target.checked)" />
            <span style="flex:1">{{ p.name }}（{{ p.duration }} 档 · 需{{ scopeTypeName(p.scopeType) }}）</span>
          </label>
        </div>
        <div class="modal-f">
          <button class="btn primary" @click="editing = null">完成</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useStore } from '../store/store.js'
import { REPROCESS_MINUTES } from '../utils/time.js'

const store = useStore()
const { state, updateRoomConfig } = store
const zoneFilter = ref('')
const editing = ref(null)

const filtered = computed(() => state.roomConfigs.filter((r) => !zoneFilter.value || r.zone === zoneFilter.value))

function kindText(k) {
  return { gastro: '常规胃肠镜', therapy: '治疗内镜', special: '超声/小肠镜' }[k] || k
}
function procName(id) { return state.procTypes.find((p) => p.id === id)?.name || id }
function scopeTypeName(id) {
  const map = { gastroscope: '胃镜', colonoscope: '肠镜', duodenoscope: '十二指肠镜', eus: '超声内镜', enteroscope: '小肠镜' }
  return map[id]
}
function patch(room, p) { updateRoomConfig(room.id, p) }
function openEdit(r) { editing.value = r }
function toggleProc(procId, on) {
  const r = editing.value
  const supported = on ? [...new Set([...r.supported, procId])] : r.supported.filter((x) => x !== procId)
  updateRoomConfig(r.id, { supported })
}
function roomApptCount(roomId) {
  return state.appointments.filter((a) => a.roomId === roomId && a.slot != null && !['cancelled'].includes(a.status)).length
}
function zoneLoad(zone) {
  const rooms = state.roomConfigs.filter((r) => r.zone === zone && r.enabled)
  const cap = rooms.length * 20
  let used = 0
  for (const a of state.appointments) {
    if (a.slot == null || ['cancelled', 'noshow'].includes(a.status)) continue
    if (rooms.some((r) => r.id === a.roomId)) used += a.duration
  }
  return { used, cap, rate: cap ? used / cap : 0 }
}
</script>
