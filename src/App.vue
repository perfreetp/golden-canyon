<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { buildSeed } from '@/data/seed'
import { idb, resetDatabase } from '@/data/idb'

const store = useAppStore()
// 种子结构变更时提升此版本，自动清库重建（仅在无业务数据的演示初始化路径生效）
const SEED_VERSION = 4

onMounted(async () => {
  let meta = await idb.get<{ id: string; value: number }>('meta', 'seedVersion').catch(() => undefined)
  // 种子版本落后：关闭连接并整库删除，下一次 idb 调用会按最新 schema 重建
  if (meta && meta.value < SEED_VERSION) {
    await resetDatabase()
    meta = undefined
  }
  await store.loadAll()
  // 首次启动，或种子版本落后：写入演示数据
  if (store.campuses.length === 0 || !meta) {
    const seed = buildSeed()
    await idb.putMany('campuses', seed.campuses)
    await idb.putMany('floors', seed.floors)
    await idb.putMany('rooms', seed.rooms)
    await idb.putMany('drawings', seed.drawings)
    await idb.putMany('versions', seed.versions)
    for (const p of seed.photos) {
      await idb.put('blobs', { id: p.record.blobKey, blob: p.blob })
      await idb.put('photos', p.record)
    }
    await idb.put('meta', { id: 'seedVersion', value: SEED_VERSION })
    await store.loadAll()
  }
})
</script>

<template>
  <div class="shell">
    <aside class="side">
      <div class="brand">
        <div class="logo">镜</div>
        <div>
          <div class="title">内镜洗消间图档系统</div>
          <div class="sub">工艺布局 · 版本 · 归档</div>
        </div>
      </div>
      <nav>
        <RouterLink to="/archive-tree">
          <span class="ico">🏗</span>院区楼层房间建档
        </RouterLink>
        <RouterLink to="/photos">
          <span class="ico">📷</span>改造前照片/图纸
        </RouterLink>
        <RouterLink to="/archive-search">
          <span class="ico">🗄</span>归档检索
        </RouterLink>
      </nav>
      <div class="side-foot muted">
        数据保存在本机浏览器 IndexedDB<br />Vue 3 + WebGL2 · 毫米级坐标
      </div>
    </aside>
    <main class="main">
      <RouterView v-if="store.loaded" />
      <div v-else class="loading">正在加载图档数据库…</div>
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  height: 100%;
}
.side {
  width: 232px;
  flex-shrink: 0;
  background: #1f2a3a;
  color: #dce4ef;
  display: flex;
  flex-direction: column;
}
.brand {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 18px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.logo {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82c4, #2b6cb0);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
}
.title {
  font-weight: 700;
  font-size: 14px;
}
.sub {
  font-size: 11px;
  color: #8fa0b6;
  margin-top: 2px;
}
nav {
  display: flex;
  flex-direction: column;
  padding: 10px 8px;
  gap: 4px;
}
nav a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  color: #c6d2e1;
  text-decoration: none;
  font-size: 13.5px;
}
nav a:hover {
  background: rgba(255, 255, 255, 0.07);
}
nav a.router-link-active {
  background: #2b6cb0;
  color: #fff;
}
.ico {
  font-size: 16px;
}
.side-foot {
  margin-top: auto;
  padding: 14px 16px;
  font-size: 11px;
  line-height: 1.7;
  color: #7e8da1;
}
.main {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.loading {
  margin: auto;
  color: var(--c-text-2);
}
</style>
