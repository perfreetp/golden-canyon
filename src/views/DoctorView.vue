<template>
  <div class="grid" style="grid-template-columns: 1fr 320px; align-items:start">
    <div class="card">
      <div class="card-h">
        医师排班（{{ state.doctors.length }} 人）
        <div style="flex:1"></div>
        <input v-model="kw" placeholder="搜索姓名/职称" style="width:180px" />
      </div>
      <div class="card-b scroll-x">
        <table>
          <thead>
            <tr><th>医师</th><th>职称</th><th>责任区</th><th>班次时段</th><th>技能项目</th><th>在岗</th><th>今日排程</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="d in filtered" :key="d.id">
              <td><b>{{ d.name }}</b></td>
              <td>{{ d.title }}</td>
              <td>{{ d.zone }} 区</td>
              <td>
                <select :value="d.shift" @change="changeShift(d, $event.target.value)" style="width:170px">
                  <option value="全天 08:00-17:30">全天 08:00-17:30</option>
                  <option value="上午 08:00-12:30">上午 08:00-12:30</option>
                  <option value="下午 13:00-18:00">下午 13:00-18:00</option>
                </select>
              </td>
              <td style="font-size:12px">{{ d.skills.map(id => procName(id)).join('、') }}</td>
              <td>
                <label class="switch">
                  <input type="checkbox" :checked="!d.off" @change="updateDoctor(d.id, { off: !$event.target.checked })" />
                  <i></i>
                </label>
              </td>
              <td>{{ doctorApptCount(d.id) }} 例</td>
              <td>
                <button class="btn sm" @click="editing = d">技能</button>
                <button class="btn sm danger" :disabled="d.off" @click="updateDoctor(d.id, { off: true })">停班</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-h">排班统计</div>
      <div class="card-b" style="font-size:13px;line-height:2">
        <p>在班医师：<b>{{ state.doctors.filter(d => !d.off).length }}</b> / {{ state.doctors.length }} 人</p>
        <p>全天班：{{ state.doctors.filter(d => d.shiftStart === 0).length }} 人 · 上午班：{{ state.doctors.filter(d => d.shiftStart === 0 && d.shiftEnd === 9).length }} 人 · 下午班：{{ state.doctors.filter(d => d.shiftStart === 10).length }} 人</p>
        <p>可做 ERCP：{{ state.doctors.filter(d => d.skills.includes('ergo')).length }} 人</p>
        <p>可做超声内镜：{{ state.doctors.filter(d => d.skills.includes('eus')).length }} 人</p>
        <div class="muted" style="font-size:12px;margin-top:10px">所有排班修改均记录操作人与时间，可在「审计日志」追溯。</div>
      </div>
    </div>

    <div v-if="editing" class="modal-mask" @click.self="editing = null">
      <div class="modal" style="width:520px">
        <div class="modal-h">{{ editing.name }} — 技能项目授权</div>
        <div class="modal-b">
          <label v-for="p in state.procTypes" :key="p.id" style="display:flex;gap:10px;padding:8px 0;align-items:center">
            <input type="checkbox" :checked="editing.skills.includes(p.id)" @change="toggleSkill(p.id, $event.target.checked)" />
            <span style="flex:1">{{ p.name }}</span>
          </label>
        </div>
        <div class="modal-f"><button class="btn primary" @click="editing = null">完成</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useStore } from '../store/store.js'

const store = useStore()
const { state, updateDoctor } = store
const kw = ref('')
const editing = ref(null)

const filtered = computed(() =>
  state.doctors.filter((d) => !kw.value || d.name.includes(kw.value) || d.title.includes(kw.value))
)
function procName(id) { return state.procTypes.find((p) => p.id === id)?.name || id }
function doctorApptCount(id) {
  return state.appointments.filter((a) => a.doctorId === id && !['cancelled', 'noshow'].includes(a.status)).length
}
function changeShift(d, label) {
  const presets = {
    '全天 08:00-17:30': { shift: label, shiftStart: 0, shiftEnd: 19 },
    '上午 08:00-12:30': { shift: label, shiftStart: 0, shiftEnd: 9 },
    '下午 13:00-18:00': { shift: label, shiftStart: 10, shiftEnd: 20 }
  }
  updateDoctor(d.id, presets[label])
}
function toggleSkill(procId, on) {
  const d = editing.value
  const skills = on ? [...new Set([...d.skills, procId])] : d.skills.filter((x) => x !== procId)
  updateDoctor(d.id, { skills })
}
</script>
