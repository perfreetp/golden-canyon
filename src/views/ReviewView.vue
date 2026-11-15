<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  canEdit, conflictReport, currentStation, downloadCsv, publishStation,
  rejectStation, resetSimResults, state, stats, submitForReview, unpublishStation
} from '../store'
import { formatTime, routeTypeLabel, statusLabel } from '../lib/util'

const station = computed(() => currentStation.value!)
const report = computed(() => conflictReport(station.value))
const stat = computed(() => stats.value.find((s) => s.stationId === station.value.id))

const rejectNote = ref('')
const showReject = ref(false)
const submitName = ref('')
const reviewName = ref('')

const roleName = computed(() =>
  ({ designer: '信号设计员', reviewer: '主管审核员', tester: '仿真测试员' }[state.role]))

function doSubmit() {
  const name = submitName.value.trim() || `信号设计员（${roleName.value}）`
  if (report.value.hostile.length > 0) {
    if (!confirm(`当前仍存在 ${report.value.hostile.length} 对敌对进路冲突，确认仍提交审核？`)) return
  }
  submitForReview(station.value, name)
  submitName.value = ''
}

function doReject() {
  const note = rejectNote.value.trim()
  if (!note) {
    alert('退回必须写明问题条目（涉及的进路名称、问题类型与修改要求）')
    return
  }
  const name = reviewName.value.trim() || '主管审核员'
  rejectStation(station.value, name, note)
  rejectNote.value = ''
  showReject.value = false
}

function doPublish() {
  if (report.value.hostile.length > 0) {
    alert(`存在 ${report.value.hostile.length} 对敌对进路冲突，不允许发布，请先退回修改`)
    return
  }
  const failed = station.value.routes.filter((r) => r.simStatus === 'failed').length
  if (failed > 0) {
    if (!confirm(`仍有 ${failed} 条进路仿真未通过，确认发布？`)) return
  }
  const name = reviewName.value.trim() || '主管审核员'
  publishStation(station.value, name)
}

function doUnpublish() {
  if (confirm('解除发布锁定后进路表可再次编辑，确认？')) unpublishStation(station.value)
}

const statusInfo = computed(() => ({
  draft: { cls: 'gray', text: '编制中（设计员可编辑）' },
  submitted: { cls: 'orange', text: '待主管审核（已锁定编辑）' },
  rejected: { cls: 'red', text: '已退回（设计员按问题条目修改后可重新提交）' },
  published: { cls: 'green', text: '已发布并锁定（记录审核人与审核时间）' }
}[station.value.status]))

const canSubmit = computed(() =>
  state.role === 'designer' && (station.value.status === 'draft' || station.value.status === 'rejected') &&
  station.value.routes.length > 0)
const canReview = computed(() => state.role === 'reviewer' && station.value.status === 'submitted')
const canUnpub = computed(() => state.role === 'reviewer' && station.value.status === 'published')
</script>

<template>
  <div v-if="station">
    <h2 class="page-title">审核与发布 —— {{ station.name }}</h2>

    <!-- 状态与流程 -->
    <div class="panel">
      <div class="flow">
        <div :class="['flow-node', ['draft', 'rejected'].includes(station.status) ? 'cur' : station.status === 'submitted' || station.status === 'published' ? 'done' : '']">
          <span class="fn-no">1</span><b>编制</b><small>信号设计员</small>
        </div>
        <div class="flow-line" :class="{ done: ['submitted', 'published'].includes(station.status) }"></div>
        <div :class="['flow-node', station.status === 'submitted' ? 'cur' : station.status === 'published' ? 'done' : '']">
          <span class="fn-no">2</span><b>提交审核</b><small>锁定编辑</small>
        </div>
        <div class="flow-line" :class="{ done: station.status === 'published' }"></div>
        <div :class="['flow-node', station.status === 'published' ? 'cur green' : '']">
          <span class="fn-no">3</span><b>发布锁定</b><small>主管审核员</small>
        </div>
      </div>

      <div class="status-line">
        <span :class="['tag', statusInfo.cls]">{{ statusInfo.text }}</span>
        <span class="muted">提交：{{ station.submitBy ?? '—' }} · {{ formatTime(station.submitAt) }}</span>
        <span class="muted">审核：{{ station.reviewBy ?? '—' }} · {{ formatTime(station.reviewAt) }}</span>
      </div>

      <div class="action-bar">
        <template v-if="canSubmit">
          <input v-model="submitName" placeholder="提交人姓名（选填，默认当前角色）" style="width: 260px" />
          <button class="primary" @click="doSubmit">提交主管审核</button>
          <span class="muted">提交后进路表与站场图进入只读锁定状态</span>
        </template>

        <template v-if="canReview">
          <input v-model="reviewName" placeholder="审核人姓名（选填，默认主管审核员）" style="width: 260px" />
          <button class="danger" @click="showReject = true">退回修改（需写明问题条目）</button>
          <button class="primary" @click="doPublish">审核通过并发布锁定</button>
        </template>

        <template v-if="canUnpub">
          <button @click="doUnpublish">解除发布锁定（退回编制状态）</button>
          <button class="ghost" @click="downloadCsv(station)">导出本站进路清单（CSV）</button>
        </template>

        <template v-if="!canSubmit && !canReview && !canUnpub">
          <span class="muted">
            当前角色/状态下无流程操作权限。
            {{ station.status === 'submitted' ? '请切换到主管审核员角色执行审核。' : '请切换到信号设计员角色。' }}
          </span>
        </template>
      </div>

      <div v-if="station.reviewNote" class="reject-note">
        <h4 class="danger-text">退回问题条目（{{ station.reviewBy }} · {{ formatTime(station.reviewAt) }}）</h4>
        <pre>{{ station.reviewNote }}</pre>
      </div>
    </div>

    <!-- 审核依据 -->
    <div class="grid-2">
      <div class="panel">
        <h3>联锁校验结果</h3>
        <table>
          <tbody>
            <tr><td>进路总条数</td><td><b>{{ stat?.routeCount ?? 0 }}</b></td></tr>
            <tr :class="report.hostile.length ? 'row-danger' : ''">
              <td>敌对进路对数（同区段同方向重复占用）</td>
              <td><b :class="report.hostile.length ? 'danger-text' : 'ok-text'">{{ report.hostile.length }}</b></td>
            </tr>
            <tr :class="report.switchConflicts.length ? 'row-warn' : ''">
              <td>防护道岔位置冲突对数</td>
              <td><b :class="report.switchConflicts.length ? 'warn-text' : 'ok-text'">{{ report.switchConflicts.length }}</b></td>
            </tr>
            <tr><td>仿真通过 / 未通过 / 未跑</td>
              <td>
                <b class="ok-text">{{ stat?.simPassed ?? 0 }}</b> /
                <b :class="(stat?.simFailed ?? 0) ? 'danger-text' : ''">{{ stat?.simFailed ?? 0 }}</b> /
                <b class="muted">{{ stat?.simUnrun ?? 0 }}</b>
              </td>
            </tr>
          </tbody>
        </table>
        <button v-if="state.role === 'reviewer'" class="sm" @click="resetSimResults(station.id)">清空仿真记录（要求测试员重跑）</button>
      </div>

      <div class="panel">
        <h3>进路逐条审核清单</h3>
        <div class="audit-list scroll">
          <div v-for="(r, i) in station.routes" :key="r.id" class="audit-row"
               :class="{ danger: report.hostileRouteIds.has(r.id), warn: report.switchConflictRouteIds.has(r.id) }">
            <span class="idx">{{ i + 1 }}</span>
            <div class="ar-body">
              <b>{{ r.name }}</b>
              <small class="muted">{{ routeTypeLabel(r.type) }} · {{ r.direction === 'left' ? '向左（下行）' : '向右（上行）' }} ·
                {{ r.switchReqs.length }} 道岔 · {{ r.sectionOrder.length }} 区段</small>
            </div>
            <span v-if="report.hostileRouteIds.has(r.id)" class="tag red">敌对</span>
            <span v-else-if="report.switchConflictRouteIds.has(r.id)" class="tag orange">道岔冲突</span>
            <span :class="['tag', r.simStatus === 'passed' ? 'green' : r.simStatus === 'failed' ? 'red' : 'gray']">
              {{ r.simStatus === 'passed' ? '仿真通过' : r.simStatus === 'failed' ? `仿真未通过：${r.simFailReason}` : '未仿真' }}
            </span>
          </div>
          <div v-if="!station.routes.length" class="empty">暂无进路</div>
        </div>
      </div>
    </div>

    <!-- 退回弹窗 -->
    <div v-if="showReject" class="modal-mask" @click.self="showReject = false">
      <div class="modal">
        <h3>退回进路表 —— 写明问题条目</h3>
        <p class="muted">请逐条列明问题进路名称、问题类型（敌对/道岔冲突/仿真失败/命名等）与修改要求，设计员将按此修改。</p>
        <textarea v-model="rejectNote" rows="9" style="width:100%"
                  placeholder="示例：&#10;1. 接车进路 X→S（3DG）与发车进路 D1→S 在 3DG 同方向敌对占用，请调整终端按钮；&#10;2. 调车进路 D3→D4 仿真卡在第 6 步：区段 7DG 封锁占用，请核对区段划分；&#10;3. 2# 道岔防护位置与 D2→D4 进路反位要求冲突。"></textarea>
        <div class="actions">
          <button @click="showReject = false">取消</button>
          <button class="danger" :disabled="!rejectNote.trim()" @click="doReject">确认退回</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flow { display: flex; align-items: center; justify-content: center; gap: 0; margin: 8px 0 18px; }
.flow-node {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  width: 130px; padding: 12px 8px;
  border: 2px solid var(--line);
  border-radius: 12px;
  background: #fafbfd;
  opacity: 0.55;
}
.flow-node.cur { border-color: var(--primary); background: #e6effd; opacity: 1; }
.flow-node.cur.green { border-color: var(--ok); background: var(--ok-bg); }
.flow-node.done { opacity: 1; border-color: var(--ok); background: var(--ok-bg); }
.fn-no {
  width: 26px; height: 26px; border-radius: 50%;
  background: var(--band); display: grid; place-items: center; font-weight: 800;
}
.flow-node.cur .fn-no { background: var(--primary); color: #fff; }
.flow-node.cur.green .fn-no, .flow-node.done .fn-no { background: var(--ok); color: #fff; }
.flow-node small { color: var(--muted); }
.flow-line { width: 70px; height: 3px; background: var(--line); }
.flow-line.done { background: var(--ok); }
.status-line { display: flex; gap: 18px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
.action-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.reject-note {
  margin-top: 16px;
  border: 1px solid #efb0b0;
  background: var(--danger-bg);
  border-radius: 10px;
  padding: 12px 14px;
}
.reject-note h4 { margin: 0 0 6px; }
.reject-note pre { white-space: pre-wrap; font-family: inherit; margin: 0; line-height: 1.7; }
.grid-2 { display: grid; grid-template-columns: 1fr 1.3fr; gap: 14px; margin-top: 14px; }
.audit-list { max-height: 360px; overflow: auto; display: flex; flex-direction: column; gap: 6px; }
.audit-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--line);
}
.audit-row.danger { border-left: 4px solid var(--danger); background: var(--danger-bg); }
.audit-row.warn { border-left: 4px solid var(--warn); background: var(--warn-bg); }
.idx { font-weight: 800; color: var(--muted); width: 24px; }
.ar-body { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ar-body small { font-size: 11px; }
</style>
