<template>
  <header class="topbar">
    <h1>心脏超声切面示意图 · 参数化生成与批次质检<small>Vue3 + SVG + D3</small></h1>
    <label class="field" style="min-width:120px">
      当前身份
      <select v-model="store.role">
        <option v-for="(r, k) in ROLES" :key="k" :value="k">{{ r.name }}</option>
      </select>
    </label>
    <label v-if="store.role === 'supplier'" class="field" style="min-width:150px">
      供应方
      <select v-model="store.supplierName">
        <option v-for="s in SUPPLIERS" :key="s" :value="s">{{ s }}</option>
      </select>
    </label>
    <span class="tag">{{ ROLES[store.role].desc }}</span>
  </header>

  <nav class="tabs">
    <button
      v-for="t in tabs" :key="t.key"
      :class="{ active: tab === t.key }"
      @click="tab = t.key"
    >{{ t.name }}</button>
  </nav>

  <BatchManage v-if="tab === 'batch'" @goto="goto" />
  <ParamGenerate v-else-if="tab === 'gen'" :focus-batch="focusBatch" @goto="goto" />
  <QcReview v-else-if="tab === 'qc'" :focus-batch="focusBatch" />
  <Archive v-else />
</template>

<script setup>
import { ref } from 'vue'
import { store, ROLES, SUPPLIERS } from './store'
import BatchManage from './views/BatchManage.vue'
import ParamGenerate from './views/ParamGenerate.vue'
import QcReview from './views/QcReview.vue'
import Archive from './views/Archive.vue'

const tabs = [
  { key: 'batch', name: '批次管理' },
  { key: 'gen', name: '参数生成' },
  { key: 'qc', name: '校验复核' },
  { key: 'archive', name: '归档检索' }
]
const tab = ref('batch')
const focusBatch = ref('')

function goto(t, batchId) {
  tab.value = t
  if (batchId) focusBatch.value = batchId
}
</script>
