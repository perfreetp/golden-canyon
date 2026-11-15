<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { currentStation, setRole, state } from './store'
import { statusLabel } from './lib/util'
import type { Role } from './types'

const router = useRouter()

const roles: { value: Role; label: string; desc: string }[] = [
  { value: 'designer', label: '信号设计员', desc: '站场编制 / 进路表编制' },
  { value: 'reviewer', label: '主管审核员', desc: '审核退回 / 发布锁定' },
  { value: 'tester', label: '仿真测试员', desc: '排列仿真 / 故障注入' }
]

const station = computed(() => currentStation.value)

const nav = computed(() => {
  const has = !!station.value
  return [
    { to: '/', label: '车站管理' },
    { to: '/diagram', label: '站场图编制', disabled: !has },
    { to: '/routes', label: '进路表编制', disabled: !has },
    { to: '/simulation', label: '仿真校验', disabled: !has },
    { to: '/review', label: '审核发布', disabled: !has },
    { to: '/stats', label: '统计汇总' }
  ]
})

const statusTag = computed(() => {
  const s = station.value?.status
  if (!s) return ''
  return { draft: 'gray', submitted: 'orange', rejected: 'red', published: 'green' }[s] ?? 'gray'
})

function go(to: string, disabled?: boolean) {
  if (!disabled) router.push(to)
}
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <div class="brand" @click="go('/')">
        <span class="logo">铁</span>
        <div>
          <div class="title">铁路车站信号联锁进路表编制与仿真校验系统</div>
          <div class="subtitle">Interlocking Route Table Design &amp; Simulation Platform</div>
        </div>
      </div>
      <div class="role-switch">
        <span class="muted role-label">当前角色</span>
        <div class="role-btns">
          <button
            v-for="r in roles"
            :key="r.value"
            :class="['sm', state.role === r.value ? 'primary' : '']"
            :title="r.desc"
            @click="setRole(r.value)"
          >
            {{ r.label }}
          </button>
        </div>
      </div>
    </header>

    <nav class="nav">
      <template v-for="item in nav" :key="item.to">
        <RouterLink v-if="!item.disabled" :to="item.to" class="nav-item" active-class="active">
          {{ item.label }}
        </RouterLink>
        <span v-else class="nav-item disabled">{{ item.label }}</span>
      </template>
      <div v-if="station" class="nav-station">
        当前车站：<b>{{ station.name }}</b>
        <span :class="['tag', statusTag]">{{ statusLabel(station.status) }}</span>
      </div>
    </nav>

    <main class="content">
      <RouterView />
    </main>

    <footer class="footer">
      数据保存在本机浏览器（localStorage） · 支持 JSON 备份与单站进路清单 CSV 导出 · {{ new Date().getFullYear() }}
    </footer>
  </div>
</template>

<style scoped>
.shell { display: flex; flex-direction: column; min-height: 100%; }
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 10px 22px;
  background: linear-gradient(120deg, #16366e, #1d5fd0);
  color: #fff;
}
.brand { display: flex; align-items: center; gap: 12px; cursor: pointer; }
.logo {
  width: 42px; height: 42px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.16);
  display: grid; place-items: center;
  font-size: 20px; font-weight: 800;
}
.title { font-size: 17px; font-weight: 700; letter-spacing: 0.5px; }
.subtitle { font-size: 11px; opacity: 0.75; }
.role-switch { display: flex; align-items: center; gap: 10px; }
.role-label { color: rgba(255, 255, 255, 0.75) !important; font-size: 12px; }
.role-btns { display: flex; gap: 6px; }
.role-btns button { background: rgba(255, 255, 255, 0.12); color: #fff; border-color: rgba(255, 255, 255, 0.35); }
.role-btns button.primary { background: #fff; color: var(--primary); border-color: #fff; }

.nav {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 18px;
  background: #fff;
  border-bottom: 1px solid var(--line);
  flex-wrap: wrap;
}
.nav-item {
  padding: 13px 16px;
  text-decoration: none;
  color: var(--muted);
  font-weight: 600;
  border-bottom: 3px solid transparent;
}
.nav-item.active { color: var(--primary); border-bottom-color: var(--primary); }
.nav-item.disabled { opacity: 0.4; cursor: not-allowed; }
.nav-station { margin-left: auto; font-size: 13px; color: var(--muted); display: flex; gap: 8px; align-items: center; }

.content { flex: 1; padding: 20px 22px; max-width: 1480px; width: 100%; margin: 0 auto; }
.footer { text-align: center; color: var(--muted); font-size: 12px; padding: 14px; }
</style>
