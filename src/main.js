import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import PainterView from './views/PainterView.vue'
import QcView from './views/QcView.vue'
import DashboardView from './views/DashboardView.vue'
import WorkshopView from './views/WorkshopView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/paint' },
    { path: '/paint', component: PainterView, meta: { title: '涂装分色台' } },
    { path: '/qc', component: QcView, meta: { title: '品控审批' } },
    { path: '/dashboard', component: DashboardView, meta: { title: '主管看板' } },
    { path: '/workshop', component: WorkshopView, meta: { title: '车间分色表' } }
  ]
})

createApp(App).use(router).mount('#app')
