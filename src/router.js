import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/floorplan' },
  { path: '/floorplan', name: 'floorplan', component: () => import('./views/FloorPlanView.vue'), meta: { title: '分层平面图', icon: '▦' } },
  { path: '/scheduling', name: 'scheduling', component: () => import('./views/SchedulingView.vue'), meta: { title: '排程工作台', icon: '▤' } },
  { path: '/rooms', name: 'rooms', component: () => import('./views/RoomConfigView.vue'), meta: { title: '检查间容量配置', icon: '▣' } },
  { path: '/doctors', name: 'doctors', component: () => import('./views/DoctorView.vue'), meta: { title: '医师排班', icon: '☷' } },
  { path: '/scopes', name: 'scopes', component: () => import('./views/ScopePoolView.vue'), meta: { title: '镜体池管理', icon: '◉' } },
  { path: '/patient', name: 'patient', component: () => import('./views/PatientPortalView.vue'), meta: { title: '患者端', icon: '☺' } },
  { path: '/board', name: 'board', component: () => import('./views/CallBoardView.vue'), meta: { title: '叫号大屏', icon: '📢' } },
  { path: '/attendance', name: 'attendance', component: () => import('./views/AttendanceView.vue'), meta: { title: '爽约/迟到记录', icon: '⏰' } },
  { path: '/dashboard', name: 'dashboard', component: () => import('./views/DashboardView.vue'), meta: { title: '运营看板', icon: '📊' } },
  { path: '/audit', name: 'audit', component: () => import('./views/AuditView.vue'), meta: { title: '审计日志', icon: '📝' } }
]

export const router = createRouter({ history: createWebHashHistory(), routes })
