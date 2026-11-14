import { createRouter, createWebHashHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/archive-tree' },
    { path: '/archive-tree', name: 'tree', component: () => import('@/views/ArchiveTreeView.vue') },
    { path: '/photos/:roomId?', name: 'photos', component: () => import('@/views/PhotoArchiveView.vue') },
    { path: '/editor/:drawingId', name: 'editor', component: () => import('@/views/EditorView.vue') },
    { path: '/versions/:drawingId', name: 'versions', component: () => import('@/views/VersionsView.vue') },
    { path: '/archive-search', name: 'search', component: () => import('@/views/ArchiveSearchView.vue') },
  ],
})
