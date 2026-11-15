import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './styles.css'
import StationListView from './views/StationListView.vue'
import DiagramView from './views/DiagramView.vue'
import RouteTableView from './views/RouteTableView.vue'
import SimulationView from './views/SimulationView.vue'
import ReviewView from './views/ReviewView.vue'
import StatsView from './views/StatsView.vue'

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

createApp(App).use(router).mount('#app')
