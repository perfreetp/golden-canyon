<template>
  <div>
    <div class="panel">
      <h3>校验复核 <small>自动检查结果按 严重 / 一般 / 提示 三级列出，复核员逐条确认或驳回</small></h3>
      <div class="row">
        <label class="field" style="min-width:280px">批次
          <select v-model="currentId">
            <option v-for="b in reviewable" :key="b.id" :value="b.id">
              {{ b.id }} · {{ b.supplier }} · {{ BATCH_STATUS[b.status].name }}
            </option>
          </select>
        </label>
        <template v-if="batch">
          <span class="chip" :style="{ background: BATCH_STATUS[batch.status].color }">{{ BATCH_STATUS[batch.status].name }}</span>
          <span class="tag">严重 {{ counts.severe }}</span>
          <span class="tag">一般 {{ counts.major }}</span>
          <span class="tag">提示 {{ counts.minor }}</span>
          <span class="tag">待复核 {{ verdict.pendingCount }}</span>
        </template>
      </div>
    </div>

    <template v-if="batch">
      <div class="grid" style="grid-template-columns: 1.2fr 1fr">
        <!-- 问题清单 -->
        <div class="panel" style="margin-bottom:0">
          <h3>问题清单 <small>{{ issues.length }} 条</small></h3>
          <div v-if="!issues.length" class="empty">该批次暂无检查问题。可先在「参数生成」页运行自动检查。</div>
          <div v-for="sev in ['severe', 'major', 'minor']" :key="sev">
            <template v-if="bySeverity(sev).length">
              <h4 :style="{ color: SEVERITY[sev].color }">{{ SEVERITY[sev].name }}（{{ bySeverity(sev).length }}）</h4>
              <div
                v-for="i in bySeverity(sev)" :key="i.id"
                class="issue-card"
                :class="{ active: selectedIssue === i.id }"
                @click="selectIssue(i)"
              >
                <div class="row" style="justify-content:space-between">
                  <div>
                    <span class="tag">{{ CHECK_NAMES[i.type] }}</span>
                    <span class="muted" style="font-size:12px">切面 #{{ i.viewIndex + 1 }}</span>
                  </div>
                  <span class="chip" :style="{ background: statusColor(i.status) }">{{ statusName(i.status) }}</span>
                </div>
                <div style="margin:6px 0">{{ i.message }}</div>
                <template v-if="can('review') && i.status === 'pending' && batch.status === 'submitted'">
                  <div class="row" @click.stop>
                    <input v-model="comments[i.id]" placeholder="复核意见…" style="flex:1; min-width:140px" />
                    <button class="btn sm bad" @click="decide(i, 'confirmed')">确认</button>
                    <button class="btn sm ok" @click="decide(i, 'rejected')">驳回</button>
                  </div>
                </template>
                <div v-else-if="i.status !== 'pending'" class="muted" style="font-size:12px">
                  复核人：{{ i.reviewer }} · 意见：{{ i.comment || '（无）' }}
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- 关联切面预览 + 放行/退回 -->
        <div>
          <div class="panel" v-if="previewView">
            <h3>切面 #{{ previewView.index + 1 }} <small>红色为问题相关标注</small></h3>
            <EchoView
              :view="previewView" :palette="batch.palette" :line-width="batch.lineWidth"
              :highlight-targets="previewTargets"
            />
          </div>
          <div class="panel" v-if="can('release') && batch.status === 'submitted'">
            <h3>复核结论</h3>
            <p class="muted" style="font-size:12px">
              放行条件：所有问题均已确认或驳回，且没有被确认的严重问题。
              当前：待复核 {{ verdict.pendingCount }} 条，已确认严重 {{ verdict.confirmedSevereCount }} 条。
            </p>
            <label class="field">复核人
              <input v-model="reviewerName" placeholder="姓名" />
            </label>
            <label class="field mt">结论意见
              <textarea v-model="verdictComment" rows="2"></textarea>
            </label>
            <div class="row mt">
              <button class="btn ok" :disabled="!verdict.releasable || !reviewerName" @click="doRelease">放行</button>
              <button class="btn bad" :disabled="!reviewerName" @click="doReturn">退回供应方</button>
            </div>
          </div>
          <div class="panel" v-else-if="batch.status === 'released' || batch.status === 'returned'">
            <h3>复核结论</h3>
            <p>
              结论：<b :style="{ color: batch.status === 'released' ? 'var(--ok)' : 'var(--bad)' }">{{ batch.verdict }}</b>
               · 复核人：{{ batch.reviewer }}
            </p>
            <p class="muted">{{ batch.verdictComment }}</p>
          </div>
        </div>
      </div>
    </template>
    <div v-else class="panel empty">暂无可复核的批次</div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import {
  store, can, BATCH_STATUS, issuesOf, verdictOf,
  reviewIssue, releaseBatch, returnBatch, visibleBatches
} from '../store'
import { SEVERITY, CHECK_NAMES } from '../qc'
import EchoView from '../components/EchoView.vue'

const props = defineProps({ focusBatch: { type: String, default: '' } })

const reviewable = computed(() =>
  visibleBatches().filter((b) => b.status !== 'draft')
)
const currentId = ref(props.focusBatch || reviewable.value[0]?.id || '')
watch(() => props.focusBatch, (v) => { if (v) currentId.value = v })

const batch = computed(() => store.batches.find((b) => b.id === currentId.value))
const issues = computed(() => (batch.value ? issuesOf(batch.value.id) : []))
const verdict = computed(() => (batch.value ? verdictOf(batch.value.id) : { releasable: false, pendingCount: 0, confirmedSevereCount: 0 }))

const counts = computed(() => {
  const c = { severe: 0, major: 0, minor: 0 }
  issues.value.forEach((i) => c[i.severity]++)
  return c
})
const bySeverity = (sev) => issues.value.filter((i) => i.severity === sev)

const selectedIssue = ref('')
const comments = reactive({})
const reviewerName = ref('')
const verdictComment = ref('')

const previewView = computed(() => {
  if (!batch.value) return null
  const iss = issues.value.find((i) => i.id === selectedIssue.value)
  const idx = iss ? iss.viewIndex : 0
  return batch.value.views[idx] || null
})
const previewTargets = computed(() => {
  if (!previewView.value) return []
  return issues.value
    .filter((i) => i.viewIndex === previewView.value.index && i.targetKey && i.status !== 'rejected')
    .map((i) => i.targetKey)
})

function selectIssue(i) {
  selectedIssue.value = i.id
}
function decide(i, decision) {
  reviewIssue(i, decision, comments[i.id] || '', reviewerName.value || '复核员')
}
function doRelease() {
  releaseBatch(batch.value, reviewerName.value, verdictComment.value)
  alert(`批次 ${batch.value.id} 已放行`)
}
function doReturn() {
  returnBatch(batch.value, reviewerName.value, verdictComment.value)
  alert(`批次 ${batch.value.id} 已退回供应方，并附问题清单`)
}
function statusName(s) {
  return { pending: '待复核', confirmed: '已确认', rejected: '已驳回' }[s]
}
function statusColor(s) {
  return { pending: '#8a94a8', confirmed: 'var(--bad)', rejected: 'var(--ok)' }[s]
}
</script>

<style scoped>
.issue-card {
  border: 1px solid var(--border); border-radius: 8px;
  padding: 10px 12px; margin-bottom: 8px; cursor: pointer;
}
.issue-card.active { border-color: var(--accent); background: rgba(91, 141, 239, 0.08); }
</style>
