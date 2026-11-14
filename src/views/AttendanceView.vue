<template>
  <div>
    <div class="grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom:14px">
      <div class="kpi"><div class="v" style="color:var(--danger)">{{ lateList.length }}</div><div class="l">迟到人次</div></div>
      <div class="kpi"><div class="v" style="color:#a8071a">{{ noshowList.length }}</div><div class="l">爽约人次</div></div>
      <div class="kpi"><div class="v">{{ pct(stats.noshowRate) }}</div><div class="l">爽约率（已定论）</div></div>
      <div class="kpi"><div class="v">{{ round1(stats.avgWait) }} 分</div><div class="l">平均等待时长</div></div>
    </div>

    <div class="card">
      <div class="card-h">
        爽约 / 迟到记录（原因必填，全部留痕）
        <div style="flex:1"></div>
        <div class="toolbar">
          <select v-model="tab" style="width:120px">
            <option value="all">全部异常</option>
            <option value="late">仅迟到</option>
            <option value="noshow">仅爽约</option>
          </select>
          <select v-model="reasonFilter" style="width:150px">
            <option value="">全部原因</option>
            <option v-for="r in reasonOptions" :key="r" :value="r">{{ r }}</option>
          </select>
        </div>
      </div>
      <div class="card-b scroll-x">
        <table>
          <thead>
            <tr><th>患者编号</th><th>患者</th><th>项目</th><th>检查间</th><th>预约时段</th><th>类型</th><th>原因</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="a in filtered" :key="a.id">
              <td>{{ a.patientNo }}</td>
              <td>{{ maskName(a.patientName) }}</td>
              <td>{{ a.procName }}</td>
              <td>{{ roomCode(a.roomId) }}</td>
              <td>{{ a.slot != null ? slotLabel(a.slot) : '—' }}</td>
              <td><span class="tag" :class="a.status === 'late' ? 'late' : 'noshow'">{{ a.status === 'late' ? '迟到' : '爽约' }}</span></td>
              <td style="max-width:260px">
                <span v-if="a.status === 'late'">{{ a.lateReason || '—' }}</span>
                <span v-else>{{ a.noshowReason || '—' }}</span>
              </td>
              <td>
                <button class="btn sm" @click="editing = a">补录/修改原因</button>
                <button v-if="a.status === 'late'" class="btn sm danger" @click="quickNoShow(a)">转爽约</button>
              </td>
            </tr>
            <tr v-if="!filtered.length"><td colspan="8" class="muted" style="text-align:center;padding:26px 0">暂无匹配记录</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="editing" class="modal-mask" @click.self="editing = null">
      <div class="modal" style="width:480px">
        <div class="modal-h">补录原因 — {{ editing.patientNo }} {{ maskName(editing.patientName) }}</div>
        <div class="modal-b">
          <label style="display:block;margin-bottom:8px">记录类型</label>
          <select v-model="editing.status" style="width:100%;margin-bottom:14px">
            <option value="late">迟到</option>
            <option value="noshow">爽约</option>
          </select>
          <label style="display:block;margin-bottom:8px">原因（必选，可补充说明）</label>
          <select v-model="reasonDraft" style="width:100%;margin-bottom:10px">
            <option v-for="r in reasonOptions" :key="r" :value="r">{{ r }}</option>
          </select>
          <textarea v-model="noteDraft" rows="3" style="width:100%" placeholder="补充说明（可选）"></textarea>
        </div>
        <div class="modal-f">
          <button class="btn" @click="editing = null">取消</button>
          <button class="btn primary" @click="save">保存留痕</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useStore } from '../store/store.js'
import { useStats } from '../store/stats.js'
import { slotLabel } from '../utils/time.js'
import { pct, round1 } from '../utils/format.js'
import { maskName } from '../utils/rng.js'

const store = useStore()
const { state, markLate, markNoShow, logAudit } = store
const { stats } = useStats(store)
const tab = ref('all')
const reasonFilter = ref('')
const editing = ref(null)
const reasonDraft = ref('')
const noteDraft = ref('')

const reasonOptions = ['交通拥堵', '检查前准备未完成', '家属未到', '信息核对问题', '联系不上', '身体不适改期', '已在外院检查', '未禁食无法检查', '个人原因放弃']

const lateList = computed(() => state.appointments.filter((a) => a.status === 'late' || (a.status !== 'noshow' && a.lateReason)))
const noshowList = computed(() => state.appointments.filter((a) => a.status === 'noshow'))

const filtered = computed(() => {
  let list = state.appointments.filter((a) => a.status === 'late' || a.status === 'noshow')
  if (tab.value !== 'all') list = list.filter((a) => a.status === tab.value)
  if (reasonFilter.value) {
    list = list.filter((a) => a.lateReason === reasonFilter.value || a.noshowReason === reasonFilter.value)
  }
  return list
})

watch(editing, (a) => {
  if (a) {
    reasonDraft.value = a.status === 'late' ? (a.lateReason || reasonOptions[0]) : (a.noshowReason || reasonOptions[0])
    noteDraft.value = a.note || ''
  }
})

function roomCode(id) { return state.roomConfigs.find((r) => r.id === id)?.code || '—' }
function save() {
  const a = editing.value
  const fullReason = noteDraft.value ? `${reasonDraft.value}（${noteDraft.value}）` : reasonDraft.value
  if (a.status === 'late') markLate(a.id, fullReason)
  else markNoShow(a.id, fullReason)
  editing.value = null
}
function quickNoShow(a) {
  markNoShow(a.id, a.lateReason || '迟到超时未到，转爽约')
}
</script>
