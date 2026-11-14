<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import type { Drawing } from '@/types'

const store = useAppStore()
const router = useRouter()

const q = ref({
  campusId: '',
  floorId: '',
  roomNo: '',
  renovationYear: undefined as number | undefined,
  keyword: '',
})
const searched = ref(false)
const results = ref<Drawing[]>([])

const years = computed(() =>
  [...new Set(store.drawings.map((d) => d.renovationYear))].sort((a, b) => b - a),
)
const floors = computed(() =>
  store.floors.filter((f) => !q.value.campusId || f.campusId === q.value.campusId),
)

function doSearch() {
  results.value = store.searchArchive({
    campusId: q.value.campusId || undefined,
    floorId: q.value.floorId || undefined,
    roomNo: q.value.roomNo.trim() || undefined,
    renovationYear: q.value.renovationYear,
    keyword: q.value.keyword.trim() || undefined,
  })
  searched.value = true
}

function reset() {
  q.value = { campusId: '', floorId: '', roomNo: '', renovationYear: undefined, keyword: '' }
  results.value = []
  searched.value = false
}

function roomOf(d: Drawing) {
  return store.rooms.find((r) => r.id === d.roomId)
}
function campusOf(d: Drawing) {
  return store.campuses.find((c) => c.id === d.campusId)
}
function floorOf(d: Drawing) {
  return store.floors.find((f) => f.id === d.floorId)
}
const stageLabel: Record<string, string> = { before: '改造前', scheme: '方案', asbuilt: '竣工' }

function open(d: Drawing) {
  store.selectContext(d.campusId, d.floorId, d.roomId, d.id)
  router.push({ name: 'versions', params: { drawingId: d.id } })
}
</script>

<template>
  <div class="page scroll">
    <div class="head">
      <h2>归档图档检索</h2>
      <p class="muted">仅检索已归档图档，支持院区、楼层、房间号、改造年份与关键字组合查询。</p>
    </div>

    <section class="panel query">
      <div class="grid">
        <label>院区
          <select v-model="q.campusId" @change="q.floorId = ''">
            <option value="">全部院区</option>
            <option v-for="c in store.campuses" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>
        <label>楼层
          <select v-model="q.floorId">
            <option value="">全部楼层</option>
            <option v-for="f in floors" :key="f.id" :value="f.id">{{ f.name }}（{{ f.code }}）</option>
          </select>
        </label>
        <label>房间号（模糊）
          <input v-model="q.roomNo" placeholder="如 NJ-08" />
        </label>
        <label>改造年份
          <select v-model="q.renovationYear">
            <option :value="undefined">全部年份</option>
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </label>
        <label class="wide">关键字
          <input v-model="q.keyword" placeholder="图档编号 / 标题 / 房间名" @keyup.enter="doSearch" />
        </label>
      </div>
      <div class="flex gap8 btns">
        <button class="primary" @click="doSearch">检索</button>
        <button @click="reset">重置</button>
      </div>
    </section>

    <section class="panel result">
      <table v-if="results.length" class="data">
        <thead>
          <tr>
            <th>图档编号</th>
            <th>图档名称</th>
            <th>院区</th>
            <th>楼层</th>
            <th>房间号</th>
            <th style="width: 90px">改造年份</th>
            <th style="width: 80px">阶段</th>
            <th style="width: 80px">版本</th>
            <th style="width: 160px">归档时间</th>
            <th style="width: 90px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in results" :key="d.id">
            <td><code>{{ d.docNo }}</code></td>
            <td>{{ d.title }}</td>
            <td>{{ campusOf(d)?.name }}</td>
            <td>{{ floorOf(d)?.name }}</td>
            <td>{{ roomOf(d)?.roomNo }}</td>
            <td>{{ d.renovationYear }}</td>
            <td><span class="tag">{{ stageLabel[d.stage] }}</span></td>
            <td>V{{ d.version }}</td>
            <td>{{ d.archivedAt ? new Date(d.archivedAt).toLocaleDateString('zh-CN') : '—' }}</td>
            <td><button @click="open(d)">查看版本</button></td>
          </tr>
        </tbody>
      </table>
      <div v-else-if="searched" class="empty muted">
        未检索到符合条件的已归档图档。
      </div>
      <div v-else class="empty muted">请输入条件后点击「检索」。</div>
    </section>
  </div>
</template>

<style scoped>
.page {
  padding: 20px 24px;
  height: 100%;
}
h2 {
  margin: 0 0 4px;
  font-size: 18px;
}
.head {
  margin-bottom: 14px;
}
.query {
  padding: 16px;
  margin-bottom: 14px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12.5px;
  color: var(--c-text-2);
}
label.wide {
  grid-column: span 2;
}
.btns {
  margin-top: 14px;
}
.result {
  padding: 14px 16px;
}
.empty {
  padding: 48px;
  text-align: center;
}
code {
  font-size: 12px;
  color: var(--c-primary);
}
</style>
