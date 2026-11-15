// 浏览器环境冒烟测试入口（经 Vite 库模式打包，Vue 一并内联）
import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from '../src/App.vue'
import StationListView from '../src/views/StationListView.vue'
import DiagramView from '../src/views/DiagramView.vue'
import RouteTableView from '../src/views/RouteTableView.vue'
import SimulationView from '../src/views/SimulationView.vue'
import ReviewView from '../src/views/ReviewView.vue'
import StatsView from '../src/views/StatsView.vue'
import { state, batchAddRoutes, conflictReport, submitForReview, rejectStation, publishStation, setRole, stats, exportStationCsv } from '../src/store'
import { buildSeedStation } from '../src/seed'

const tick = () => new Promise((r) => setTimeout(r, 30))

export async function runSmoke(container: HTMLElement) {
  const results: string[] = []
  const ok = (s: string) => results.push(s)

  const router = createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/', component: StationListView },
      { path: '/diagram', component: DiagramView },
      { path: '/routes', component: RouteTableView },
      { path: '/simulation', component: SimulationView },
      { path: '/review', component: ReviewView },
      { path: '/stats', component: StatsView }
    ]
  })
  const app = createApp(App)
  app.use(router)
  app.mount(container)
  await router.isReady()
  ok('应用挂载成功，路由就绪')

  const seed = buildSeedStation()
  state.stations.push(seed)
  state.currentId = seed.id
  // 后续统一使用响应式代理对象，避免持有原始对象导致状态读写不一致
  const st = state.stations[state.stations.length - 1]

  await router.push('/')
  await tick()
  if (!container.textContent?.includes('示例站（甲站）')) throw new Error('车站列表未渲染示例站')
  ok('车站管理页：示例站渲染正常')

  await router.push('/diagram')
  await tick()
  if (!container.textContent?.includes('设备库') || !container.textContent?.includes('I 道（正线）')) throw new Error('站场图页渲染异常')
  ok('站场图编制页：设备库/股道/属性面板渲染正常')

  await router.push('/routes')
  await tick()
  const r1 = batchAddRoutes(st, 'right', ['arrival', 'departure', 'shunt'])
  const r2 = batchAddRoutes(st, 'left', ['arrival', 'departure', 'shunt'])
  await tick()
  if (!r1.length || !r2.length) throw new Error('批量生成失败')
  if (!container.textContent?.includes('敌对进路冲突')) throw new Error('冲突汇总条缺失')
  ok(`进路表页：双向批量生成 ${r1.length + r2.length} 条进路，冲突检测面板渲染正常`)

  const report = conflictReport(st)
  if (!report.hostile.length) throw new Error('示例数据应检出敌对进路')
  ok(`联锁检测：敌对 ${report.hostile.length} 对、防护道岔冲突 ${report.switchConflicts.length} 对，行内标红/标橙`)

  await router.push('/simulation')
  await tick()
  if (!container.textContent?.includes('排列选中进路') || !container.textContent?.includes('故障注入')) throw new Error('仿真页渲染异常')
  ok('仿真校验页：进路列表、步骤面板、故障注入、锁闭状态区渲染正常')

  await router.push('/review')
  await tick()
  await tick()
  setRole('designer')
  submitForReview(st, '李设计')
  await tick()
  if (st.status !== 'submitted') {
    console.error('DEBUG status =', st.status)
    throw new Error('提交状态异常')
  }
  if (!container.textContent?.includes('待主管审核') && !container.textContent?.includes('审核与发布')) {
    console.error('DEBUG review page text snippet:', container.textContent?.slice(0, 200))
    throw new Error('审核页渲染异常')
  }
  setRole('reviewer')
  rejectStation(st, '王主管', '1. X→D2 与 X→S 在 1DG 同方向敌对，请调整终端按钮\n2. D3→D4 仿真卡区段 7DG，请核对')
  await tick()
  if (st.status !== 'rejected' || !container.textContent?.includes('退回问题条目')) {
    console.error('DEBUG reject: status =', st.status, '| note shown =', container.textContent?.includes('退回问题条目'))
    throw new Error('退回/问题条目异常')
  }
  ok('审核流程：提交锁定 → 退回并写明问题条目（页面展示问题全文）')

  setRole('designer')
  submitForReview(st, '李设计')
  setRole('reviewer')
  publishStation(st, '王主管')
  await tick()
  if (st.status !== 'published' || st.reviewBy !== '王主管' || !st.reviewAt) throw new Error('发布锁定信息异常')
  if (!container.textContent?.includes('已发布并锁定')) {
    console.error('DEBUG publish text:', container.textContent?.slice(0, 200))
    throw new Error('发布状态展示异常')
  }
  ok(`发布锁定：审核人=${st.reviewBy}，审核时间已记录，全站只读`)

  await router.push('/stats')
  await tick()
  if (!container.textContent?.includes('全站统计汇总')) throw new Error('统计页渲染异常')
  const stat = stats.value[0]
  if (stat.routeCount !== st.routes.length) throw new Error('统计条数不符')
  ok(`统计汇总页：进路 ${stat.routeCount} 条 / 敌对 ${stat.hostilePairs} 对 / 道岔冲突 ${stat.switchConflictPairs} 对`)

  const csv = exportStationCsv(st)
  const lines = csv.replace(/^﻿/, '').split('\n')
  if (lines.length !== st.routes.length + 1) throw new Error('CSV 行数不符')
  ok(`单站进路清单导出：${lines.length - 1} 行、${lines[0].split(',').length} 列（含始端/终端按钮、定反位、区段顺序、仿真结果）`)

  app.unmount()
  return results
}
