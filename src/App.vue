<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="logo">
        消化内镜中心
        <small>平面图与运营排程系统</small>
      </div>
      <nav class="nav">
        <router-link v-for="r in routes" :key="r.path" :to="r.path">
          <span class="icon">{{ r.meta.icon }}</span>
          <span class="label">{{ r.meta.title }}</span>
        </router-link>
      </nav>
    </aside>
    <div class="main">
      <header class="topbar">
        <h1>{{ currentTitle }}</h1>
        <span class="pill">在院预约 {{ stats.total }} 例</span>
        <span class="pill" style="background:#fff1f0;color:#cf1322">待处理 {{ pendingCount }} 例</span>
        <button class="btn sm" @click="toggleRun">{{ state.running ? '⏸ 暂停模拟' : '▶ 继续模拟' }}</button>
        <select v-model.number="raw.speed" style="width:96px">
          <option :value="0.5">0.5× 速度</option>
          <option :value="1">1× 速度</option>
          <option :value="2">2× 速度</option>
          <option :value="4">4× 速度</option>
        </select>
        <span class="clock">🕐 {{ clockLabel(state.nowMin) }}</span>
        <select :value="state.operator.id" @change="switchOperator($event.target.value)" style="width:130px">
          <option v-for="op in state.operators" :key="op.id" :value="op.id">{{ op.name }} · {{ op.role }}</option>
        </select>
      </header>
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { router } from './router.js'
import { useStore } from './store/store.js'
import { useStats } from './store/stats.js'
import { clockLabel } from './utils/time.js'

const route = useRoute()
const store = useStore()
const { state, raw, tick, setOperator } = store
const { stats } = useStats(store)
const routes = router.options.routes.filter((r) => r.meta)
const currentTitle = computed(() => route.meta.title || '')
const pendingCount = computed(() => state.appointments.filter((a) => a.status === 'pending').length)

let timer = null
onMounted(() => { timer = setInterval(tick, 1000) })
onUnmounted(() => clearInterval(timer))

function toggleRun() { raw.running = !raw.running }
function switchOperator(id) {
  const op = state.operators.find((x) => x.id === id)
  if (op) setOperator(op)
}
</script>
