<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  addStation, deleteStation, downloadJsonBackup, selectStation, state, stats
} from '../store'
import { buildSeedStation } from '../seed'
import { formatTime, statusLabel } from '../lib/util'

const router = useRouter()
const newName = ref('')

function createStation() {
  const st = addStation(newName.value.trim())
  newName.value = ''
  selectStation(st.id)
  router.push('/diagram')
}

function createSeed() {
  const st = buildSeedStation()
  state.stations.push(st)
  selectStation(st.id)
  router.push('/diagram')
}

function open(id: string) {
  selectStation(id)
  router.push('/diagram')
}

function remove(id: string, name: string) {
  if (confirm(`确认删除车站「${name}」？该站全部站场设备、进路表与仿真结果将被删除，不可恢复。`)) {
    deleteStation(id)
  }
}

const tagClass: Record<string, string> = {
  draft: 'gray', submitted: 'orange', rejected: 'red', published: 'green'
}
function statOf(id: string) {
  return stats.value.find((x) => x.stationId === id)
}
</script>

<template>
  <div>
    <h2 class="page-title">车站管理</h2>

    <div class="panel">
      <div class="toolbar">
        <input v-model="newName" placeholder="输入新车站名称，如：乙站" style="width: 260px"
               @keyup.enter="createStation" />
        <button class="primary" @click="createStation">新建空白车站</button>
        <button @click="createSeed">载入示例站（甲站）</button>
        <button class="ghost" @click="downloadJsonBackup">导出全部数据备份（JSON）</button>
      </div>

      <div v-if="state.stations.length === 0" class="empty">
        暂无车站。点击「新建空白车站」从零编制，或「载入示例站」快速体验完整流程。
      </div>

      <table v-else class="scroll">
        <thead>
          <tr>
            <th>车站名称</th>
            <th>状态</th>
            <th>股道/道岔/区段/信号机</th>
            <th>进路条数</th>
            <th>敌对/道岔冲突</th>
            <th>仿真（通过/未过/未跑）</th>
            <th>更新时间</th>
            <th style="width: 170px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="st in state.stations" :key="st.id">
            <td><b>{{ st.name }}</b></td>
            <td><span :class="['tag', tagClass[st.status]]">{{ statusLabel(st.status) }}</span></td>
            <td>{{ st.rows.length }} / {{ st.switches.length }} / {{ st.sections.length }} / {{ st.signals.length }}</td>
            <td>{{ st.routes.length }}</td>
            <td>
              <span :class="statOf(st.id)?.hostilePairs ? 'danger-text' : ''">
                {{ statOf(st.id)?.hostilePairs ?? 0 }}
              </span>
              /
              <span :class="statOf(st.id)?.switchConflictPairs ? 'warn-text' : ''">
                {{ statOf(st.id)?.switchConflictPairs ?? 0 }}
              </span>
            </td>
            <td>
              <span class="ok-text">{{ statOf(st.id)?.simPassed ?? 0 }}</span> /
              <span class="danger-text">{{ statOf(st.id)?.simFailed ?? 0 }}</span> /
              <span class="muted">{{ statOf(st.id)?.simUnrun ?? 0 }}</span>
            </td>
            <td class="muted">{{ formatTime(st.updatedAt) }}</td>
            <td>
              <button class="sm primary" @click="open(st.id)">打开</button>
              <button class="sm danger" @click="remove(st.id, st.name)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
