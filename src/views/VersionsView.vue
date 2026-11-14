<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { buildReportHtml, downloadReport, openReportWindow } from '@/data/report'
import { countCrossings } from '@/data/diff'
import type { VersionDiff } from '@/types'

const route = useRoute()
const router = useRouter()
const store = useAppStore()
const drawingId = route.params.drawingId as string

const drawing = computed(() => store.drawings.find((d) => d.id === drawingId))
const versions = computed(() => store.versionsOfDrawing(drawingId))

const fromVer = ref<number | null>(null)
const toVer = ref<number | null>(null)
const diff = ref<VersionDiff | null>(null)

function runDiff() {
  if (fromVer.value == null || toVer.value == null) return
  diff.value = store.diffVersions(drawingId, fromVer.value, toVer.value)
}

function quickLatestDiff() {
  if (versions.value.length < 2) {
    alert('至少需要两个版本才能比对。')
    return
  }
  fromVer.value = versions.value[1].version
  toVer.value = versions.value[0].version
  runDiff()
}

function exportReport() {
  if (!diff.value || !drawing.value) return
  const from = versions.value.find((v) => v.version === diff.value!.fromVersion)
  const to = versions.value.find((v) => v.version === diff.value!.toVersion)
  if (!from || !to) return
  const html = buildReportHtml(diff.value, from.snapshot, to.snapshot, store.author)
  openReportWindow(html)
  downloadReport(
    html,
    `${drawing.value.docNo}_V${diff.value.fromVersion}-V${diff.value.toVersion}_比对说明.html`,
  )
}

async function restore(version: number) {
  if (!confirm(`确认将 V${version} 的内容恢复为当前在制图档？历史版本不会被删除，恢复后需重新提交版本。`)) return
  const restored = await store.restoreVersion(drawingId, version)
  if (restored) {
    alert('已恢复，请在编辑器中核对后提交新版本。')
    router.push({ name: 'editor', params: { drawingId } })
  }
}

const typeLabel: Record<string, string> = { added: '新增', removed: '删除', modified: '修改' }
const typeClass: Record<string, string> = { added: 'ok', removed: 'danger', modified: 'warn' }
</script>

<template>
  <div v-if="drawing" class="page scroll">
    <div class="head">
      <div>
        <h2>版本中心 · {{ drawing.title }}</h2>
        <p class="muted">
          <code>{{ drawing.docNo }}</code>　当前在制版本 V{{ drawing.version }}，共 {{ versions.length }} 个历史快照
        </p>
      </div>
      <div class="flex gap8">
        <button @click="router.push({ name: 'editor', params: { drawingId } })">返回编辑器</button>
        <button class="primary" :disabled="versions.length < 2" @click="quickLatestDiff">比对最新两版</button>
      </div>
    </div>

    <section class="panel block">
      <h3>版本快照</h3>
      <table class="data">
        <thead>
          <tr>
            <th style="width: 70px">版本</th>
            <th>变更说明</th>
            <th style="width: 110px">提交人</th>
            <th style="width: 170px">提交时间</th>
            <th style="width: 100px">图元数</th>
            <th style="width: 110px">洁污交叉</th>
            <th style="width: 150px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in versions" :key="v.id">
            <td><b>V{{ v.version }}</b></td>
            <td>{{ v.changeNote || '—' }}</td>
            <td>{{ v.author }}</td>
            <td>{{ new Date(v.createdAt).toLocaleString('zh-CN', { hour12: false }) }}</td>
            <td>{{ v.snapshot.entities.length }}</td>
            <td>
              <span class="tag" :class="countCrossings(v.snapshot) > 0 ? 'danger' : 'ok'">
                {{ countCrossings(v.snapshot) }} 处
              </span>
            </td>
            <td>
              <button @click="restore(v.version)">恢复为在制</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="panel block">
      <h3>自定义版本比对</h3>
      <div class="flex gap12 diff-bar">
        <label>旧版本
          <select v-model.number="fromVer">
            <option v-for="v in versions" :key="v.id" :value="v.version">V{{ v.version }}</option>
          </select>
        </label>
        <span class="arrow">→</span>
        <label>新版本
          <select v-model.number="toVer">
            <option v-for="v in versions" :key="v.id" :value="v.version">V{{ v.version }}</option>
          </select>
        </label>
        <button class="primary" :disabled="fromVer == null || toVer == null || fromVer === toVer" @click="runDiff">
          逐项比对
        </button>
        <button :disabled="!diff" @click="exportReport">导出说明报告（HTML/打印 PDF）</button>
      </div>

      <div v-if="diff" class="result">
        <div class="summary">
          <div class="card"><b>{{ diff.entries.filter(e => e.type === 'added').length }}</b><span>新增</span></div>
          <div class="card"><b>{{ diff.entries.filter(e => e.type === 'modified').length }}</b><span>修改</span></div>
          <div class="card"><b>{{ diff.entries.filter(e => e.type === 'removed').length }}</b><span>删除</span></div>
          <div class="card">
            <b :class="diff.crossingsAfter > diff.crossingsBefore ? 'danger-text' : 'ok-text'">
              {{ diff.crossingsBefore }} → {{ diff.crossingsAfter }}
            </b>
            <span>洁污交叉点</span>
          </div>
          <div class="card"><b>{{ diff.entries.length }}</b><span>差异条目</span></div>
        </div>

        <p v-if="!diff.entries.length" class="muted">两个版本内容完全一致，无差异。</p>
        <table v-else class="data">
          <thead>
            <tr>
              <th style="width: 70px">类型</th>
              <th style="width: 180px">图元</th>
              <th style="width: 130px">图元 ID</th>
              <th>字段级差异</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="e in diff.entries" :key="e.entityId + e.type">
              <tr>
                <td><span class="tag" :class="typeClass[e.type]">{{ typeLabel[e.type] }}</span></td>
                <td>{{ e.label }}</td>
                <td><code>{{ e.entityId }}</code></td>
                <td>{{ e.fields ? `${e.fields.length} 项字段` : '—' }}</td>
              </tr>
              <tr v-for="f in e.fields" :key="f.field" class="field-row">
                <td></td>
                <td colspan="3">
                  <b>{{ f.field }}</b>：
                  <span class="old">{{ f.before }}</span> → <span class="new">{{ f.after }}</span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
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
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
}
.block {
  padding: 14px 16px;
  margin-bottom: 16px;
}
h3 {
  margin: 0 0 10px;
  font-size: 15px;
}
.diff-bar {
  align-items: flex-end;
}
.diff-bar label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12.5px;
  color: var(--c-text-2);
}
.arrow {
  padding-bottom: 8px;
  font-size: 18px;
  color: var(--c-text-2);
}
.summary {
  display: flex;
  gap: 12px;
  margin: 16px 0;
  flex-wrap: wrap;
}
.card {
  border: 1px solid var(--c-border);
  border-radius: 6px;
  padding: 10px 22px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.card b {
  font-size: 22px;
}
.card span {
  font-size: 12px;
  color: var(--c-text-2);
}
.danger-text {
  color: var(--c-danger);
}
.ok-text {
  color: var(--c-ok);
}
.field-row td {
  background: #fafbfc;
  font-size: 12.5px;
}
.old {
  color: var(--c-danger);
  word-break: break-all;
}
.new {
  color: var(--c-ok);
  word-break: break-all;
}
</style>
