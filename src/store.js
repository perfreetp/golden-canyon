// 全局状态：批次 / 问题 / 角色，localStorage 持久化
import { reactive, watch, computed } from 'vue'
import { generateBatchViews, regenerateKeepingLocks } from './generator'
import { checkBatch, releaseVerdict } from './qc'

const LS_KEY = 'echo-qc-store-v1'

export const ROLES = {
  instructor: { name: '教研员', desc: '建批次、生成、编辑锁定、提交复核' },
  reviewer: { name: '复核员', desc: '逐条确认/驳回问题、放行或退回' },
  supplier: { name: '供应方', desc: '查看本供应方批次与退回问题清单' }
}

export const BATCH_STATUS = {
  draft: { name: '待生成', color: '#8a94a8' },
  generated: { name: '已生成', color: '#5b8def' },
  submitted: { name: '复核中', color: '#f0a94e' },
  released: { name: '已放行', color: '#3fc1a8' },
  returned: { name: '已退回', color: '#e5484d' }
}

export const SUPPLIERS = ['华影医疗素材', '心韵教具科技', '联影教学资源部']

const state = reactive({
  role: 'instructor',
  supplierName: SUPPLIERS[0],
  batches: [],
  issues: [],
  seq: 1
})

// ---------- 持久化 ----------
function save() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      batches: state.batches, issues: state.issues, seq: state.seq
    }))
  } catch (e) { /* 存储不可用时静默降级 */ }
}
watch(() => [state.batches, state.issues], save, { deep: true })

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return false
    const d = JSON.parse(raw)
    state.batches = d.batches || []
    state.issues = d.issues || []
    state.seq = d.seq || 1
    return state.batches.length > 0
  } catch (e) { return false }
}

// ---------- 批次操作 ----------
export function createBatch(form) {
  const id = `B${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${String(state.seq++).padStart(2, '0')}`
  const batch = {
    id,
    supplier: form.supplier,
    viewType: form.viewType,
    probeAngle: Number(form.probeAngle),
    level: form.level,
    lineWidth: Number(form.lineWidth),
    palette: form.palette,
    seed: String(form.seed),
    count: Number(form.count),
    status: 'draft',
    views: [],
    createdAt: now(),
    submittedAt: '', reviewer: '', verdict: '', verdictComment: ''
  }
  state.batches.unshift(batch)
  return batch
}

export function generateBatch(batch) {
  batch.views = generateBatchViews(batch)
  batch.status = 'generated'
  clearIssues(batch.id)
}

export function regenerateBatch(batch) {
  batch.views = regenerateKeepingLocks(batch, batch.views)
  clearIssues(batch.id) // 几何变了，需重新检查
}

export function runQc(batch) {
  clearIssues(batch.id)
  state.issues.push(...checkBatch(batch))
}

export function submitBatch(batch) {
  batch.status = 'submitted'
  batch.submittedAt = now()
}

export function reviewIssue(iss, decision, comment, reviewer) {
  iss.status = decision // confirmed | rejected
  iss.comment = comment
  iss.reviewer = reviewer
}

export function releaseBatch(batch, reviewer, comment) {
  batch.status = 'released'
  batch.reviewer = reviewer
  batch.verdict = '放行'
  batch.verdictComment = comment || ''
}

export function returnBatch(batch, reviewer, comment) {
  batch.status = 'returned'
  batch.reviewer = reviewer
  batch.verdict = '退回'
  batch.verdictComment = comment || ''
}

export function deleteBatch(batch) {
  clearIssues(batch.id)
  state.batches = state.batches.filter((b) => b.id !== batch.id)
}

function clearIssues(batchId) {
  state.issues = state.issues.filter((i) => i.batchId !== batchId)
}

// ---------- 查询 ----------
export function issuesOf(batchId) {
  return state.issues.filter((i) => i.batchId === batchId)
}
export function verdictOf(batchId) {
  return releaseVerdict(issuesOf(batchId))
}
export function visibleBatches() {
  if (state.role === 'supplier') {
    return state.batches.filter((b) => b.supplier === state.supplierName)
  }
  return state.batches
}
export function searchArchive(batchNo, supplier) {
  const kw = (batchNo || '').trim().toLowerCase()
  return state.batches.filter((b) => {
    if (b.status !== 'released' && b.status !== 'returned') return false
    if (kw && !b.id.toLowerCase().includes(kw)) return false
    if (supplier && b.supplier !== supplier) return false
    if (state.role === 'supplier' && b.supplier !== state.supplierName) return false
    return true
  })
}

// 角色权限
export function can(action) {
  const map = {
    instructor: ['create', 'generate', 'edit', 'qc', 'submit', 'delete'],
    reviewer: ['review', 'release', 'return'],
    supplier: []
  }
  return map[state.role]?.includes(action) || false
}

function now() {
  return new Date().toLocaleString('zh-CN', { hour12: false })
}

// ---------- 预置演示数据 ----------
function seed() {
  const mk = (over) => createBatch({
    supplier: SUPPLIERS[0], viewType: 'A4C', probeAngle: 6, level: 'L3',
    lineWidth: 2, palette: 'standard', seed: 'SEED-1001', count: 3, ...over
  })
  // 1. 已放行批次（严重问题经复核判为误报）
  const b1 = mk({ supplier: SUPPLIERS[0], seed: 'SEED-1001', viewType: 'PLAX', probeAngle: 6, count: 3 })
  generateBatch(b1); runQc(b1)
  issuesOf(b1.id).forEach((i) => reviewIssue(i, i.severity === 'severe' ? 'rejected' : 'confirmed', i.severity === 'severe' ? '经人工测量复核，偏差在示教容差内，判为误报。' : '情况属实，已记录供下一版修订。', '王复核'))
  submitBatch(b1)
  releaseBatch(b1, '王复核', '全部问题已复核，无确认的严重问题，同意放行。')
  b1.submittedAt = '2026/11/10 09:32:18'

  // 2. 复核中批次（含待复核严重问题）
  const b2 = mk({ supplier: SUPPLIERS[1], seed: 'SEED-2042', viewType: 'A4C', probeAngle: 10, count: 4 })
  generateBatch(b2); runQc(b2); submitBatch(b2)

  // 3. 已退回批次（严重问题被确认）
  const b3 = mk({ supplier: SUPPLIERS[1], seed: 'SEED-5555', viewType: 'PLAX', probeAngle: 0, count: 2 })
  generateBatch(b3); runQc(b3)
  issuesOf(b3.id).forEach((i) => reviewIssue(i, 'confirmed', '属实。', '李复核'))
  submitBatch(b3)
  returnBatch(b3, '李复核', '存在确认的严重问题，请供应方修订后重新提交。')
  b3.submittedAt = '2026/11/12 14:05:41'

  // 4. 待生成草稿
  mk({ supplier: SUPPLIERS[2], seed: 'SEED-4100', viewType: 'SC', count: 2 })
}

if (!load()) seed()

export const store = state
export const roleName = computed(() => ROLES[state.role].name)
