<template>
  <div class="grid" style="grid-template-columns: 1fr 1fr; align-items:start">
    <!-- 患者查询 -->
    <div class="card">
      <div class="card-h">患者端 · 预约与排队查询</div>
      <div class="card-b">
        <div class="toolbar" style="margin-bottom:14px">
          <input v-model="query" placeholder="输入患者编号（如 P20260008）或姓名" style="flex:1" @keyup.enter="search" />
          <button class="btn primary" @click="search">查询</button>
        </div>
        <div v-if="!result" class="muted">提示：可在下方列表直接选择一条预约体验。患者姓名已做脱敏显示。</div>
        <div v-if="result" class="patient-card">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div><b style="font-size:16px">{{ maskName(result.patientName) }}</b>
              <span class="muted" style="margin-left:8px">{{ result.patientNo }} · {{ result.gender }}/{{ result.age }}岁</span>
            </div>
            <span class="tag" :class="result.status">{{ apptStatusText(result.status) }}</span>
          </div>
          <div class="info-grid">
            <div><span>检查项目</span><b>{{ result.procName }}</b></div>
            <div><span>优先级</span><span class="tag" :class="result.priority">{{ priorityText(result.priority) }}</span></div>
            <div><span>预约时段</span><b>{{ result.slot != null ? slotLabel(result.slot) : '待排班' }}</b></div>
            <div><span>检查间</span><b>{{ roomCode(result.roomId) || '等待分配' }}</b></div>
            <div><span>前面排队</span><b class="queue-num">{{ queuePosition(result) }} 人</b></div>
            <div><span>预计等待</span><b>{{ queuePosition(result) * 12 }} 分钟</b></div>
          </div>
          <div v-if="result.status === 'scheduled' || result.status === 'pending'" style="margin-top:12px;display:flex;gap:10px">
            <button class="btn primary" :disabled="result.slot == null" @click="doCheckIn">自助签到</button>
            <button class="btn danger" @click="doCancel">申请取消</button>
          </div>
          <div v-if="result.status === 'late' || result.status === 'noshow'" style="margin-top:10px;color:var(--warn);font-size:13px">
            {{ result.status === 'late' ? '迟到原因：' + (result.lateReason || '登记中') : '爽约原因：' + (result.noshowReason || '登记中') }}
          </div>
        </div>

        <div style="margin-top:18px;font-weight:600">今日预约（脱敏）</div>
        <div class="scroll-x" style="max-height:300px;overflow:auto;margin-top:8px">
          <table>
            <thead><tr><th>编号</th><th>患者</th><th>项目</th><th>时段</th><th>状态</th></tr></thead>
            <tbody>
              <tr v-for="a in state.appointments.slice(0, 60)" :key="a.id" style="cursor:pointer" @click="result = a">
                <td>{{ a.patientNo }}</td>
                <td>{{ maskName(a.patientName) }}</td>
                <td>{{ a.procName }}</td>
                <td>{{ a.slot != null ? slotLabel(a.slot) : '—' }}</td>
                <td><span class="tag" :class="a.status">{{ apptStatusText(a.status) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 术前须知 -->
    <div class="grid">
      <div class="card">
        <div class="card-h">术前须知</div>
        <div class="card-b notice">
          <h4>胃镜检查</h4>
          <ul>
            <li>检查前至少禁食 8 小时、禁水 2 小时；</li>
            <li>高血压患者可少量白水送服降压药；</li>
            <li>携带近期检验报告与既往内镜报告；</li>
            <li>检查后 24 小时内禁止驾车、饮酒及高空作业。</li>
          </ul>
          <h4>肠镜检查</h4>
          <ul>
            <li>按医嘱提前 1-2 天低渣饮食，检查当日清肠；</li>
            <li>分次服用聚乙二醇等肠道清洁剂，排出清水样便为佳；</li>
            <li>无痛检查需家属陪同，检查后留观至清醒。</li>
          </ul>
          <h4>急诊绿色通道</h4>
          <ul>
            <li>急诊加急预约自动排到最早可行时段，不受常规队列限制；</li>
            <li>消化道出血、异物等请直接联系分诊护士站。</li>
          </ul>
          <h4>迟到与爽约</h4>
          <ul>
            <li>超过预约时间 15 分钟标记迟到，30 分钟未到标记爽约并记录原因；</li>
            <li>爽约记录将影响后续预约优先级，请提前通过患者端取消或改期。</li>
          </ul>
        </div>
      </div>
      <div class="card">
        <div class="card-h">当前叫号排队</div>
        <div class="card-b" style="max-height:260px;overflow:auto">
          <table>
            <thead><tr><th>序</th><th>编号</th><th>项目</th><th>检查间</th><th>优先级</th></tr></thead>
            <tbody>
              <tr v-for="(a, i) in queue" :key="a.id">
                <td>{{ i + 1 }}</td>
                <td>{{ a.patientNo }}</td>
                <td>{{ a.procName }}</td>
                <td>{{ roomCode(a.roomId) || '—' }}</td>
                <td><span class="tag" :class="a.priority">{{ priorityText(a.priority) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useStore } from '../store/store.js'
import { useStats } from '../store/stats.js'
import { slotLabel } from '../utils/time.js'
import { apptStatusText, priorityText } from '../utils/format.js'
import { maskName } from '../utils/rng.js'

const store = useStore()
const { state, checkIn, cancelAppt, logAudit } = store
const { stats } = useStats(store)
const query = ref('')
const result = ref(null)
const queue = computed(() => stats.value.queue)

function search() {
  const q = query.value.trim()
  result.value = state.appointments.find((a) => a.patientNo === q || a.patientName === q) || null
}
function roomCode(id) { return state.roomConfigs.find((r) => r.id === id)?.code || '' }
function queuePosition(a) {
  if (!['scheduled', 'checkedin', 'late'].includes(a.status)) return 0
  const idx = queue.value.findIndex((x) => x.id === a.id)
  return idx < 0 ? queue.value.length : idx
}
function doCheckIn() {
  checkIn(result.value.id)
  logAudit({ action: 'self-checkin', target: result.value.id, detail: `${result.value.patientName} 患者端自助签到` })
}
function doCancel() {
  const reason = prompt('请输入取消原因', '个人原因申请改期')
  if (reason) cancelAppt(result.value.id, reason)
}
</script>

<style scoped>
.patient-card { border: 1px solid var(--border); border-radius: 10px; padding: 16px; background: #f8fbff; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
.info-grid div { display: flex; flex-direction: column; gap: 4px; }
.info-grid span { color: var(--text-2); font-size: 12px; }
.queue-num { color: var(--danger); font-size: 18px; }
.notice h4 { margin: 14px 0 6px; color: var(--primary-dark); }
.notice h4:first-child { margin-top: 0; }
.notice ul { margin: 0; padding-left: 20px; line-height: 1.9; color: #43546a; font-size: 13px; }
</style>
