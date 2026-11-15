// 项目状态管理（含版本、复核记录）与持久化
import { useEffect, useMemo, useRef, useState } from 'react'
import { finalizeSurvey, emptySurvey } from '../lib/survey.js'
import { buildDEM, channelProfiles } from '../lib/dem.js'
import { MEASURE_TYPES, computeMeasure } from '../lib/measures.js'
import { validatePlan } from '../lib/validate.js'
import { DEMO_WATERSHEDS, DEMO_PATCHES, DEMO_MEASURES } from '../data/demo.js'
import { LAND_TYPES } from '../lib/measures.js'

const KEY = 'sb-plan-project-v1'

export const ROLES = [
  { id: 'designer', name: '技术员', desc: '勾绘图斑、布设措施、核算工程量' },
  { id: 'reviewer', name: '复核工程师', desc: '逐图斑审阅、填写意见、退回或通过' },
  { id: 'manager', name: '站长', desc: '查看小流域治理成效与工程量汇总' },
]

let seq = 0
export const uid = (p = 'id') => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`

export const SURVEY_URL = '/demo-survey.json'

export async function loadDemoSurvey() {
  const res = await fetch(SURVEY_URL)
  if (!res.ok) throw new Error('示例测绘成果加载失败')
  return finalizeSurvey(await res.json())
}

const iso = (s) => new Date(s).toISOString()
const daysAgo = (n, h = 9) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(h, 24, 0, 0)
  return iso(d)
}

export function makeSeed(survey) {
  const watersheds = DEMO_WATERSHEDS.map((w) => ({ ...w, points: w.points.map((p) => [...p]) }))
  const patches = DEMO_PATCHES.map((p) => ({
    ...p,
    landTypeName: LAND_TYPES[p.landType]?.name,
    points: p.points.map((q) => [...q]),
    createdAt: daysAgo(12, 10),
  }))
  const measures = DEMO_MEASURES.map((m) => ({ ...m, params: { ...m.params }, shape: cloneShape(m.shape), createdAt: daysAgo(9, 15) }))
  const versions = []
  // 历史版本：v1 退回、v2 退回、v3 通过
  const histSpec = [
    { no: 1, sub: daysAgo(24, 10), ret: daysAgo(22, 16), status: 'returned', by: '张工', reviewer: '李慧', comments: [
      { patchId: 'p5', text: '上坡坡耕地梯田田面宽偏大，坡面 15°以上建议田面宽 5 m 以内，请调整后重算土方。' },
      { patchId: 'p3', text: '沟道出口谷坊未按回水衔接确定间距，两座谷坊间坡面仍有冲刷，需加密。' },
    ], overall: '方案整体思路可行，梯田与谷坊参数需按上述意见调整，退回修改。' },
    { no: 2, sub: daysAgo(17, 11), ret: daysAgo(15, 9), status: 'returned', by: '张工', reviewer: '李慧', comments: [
      { patchId: 'p2', text: '荒草地鱼鳞坑株行距与植草配置需与图斑坡度分区对应，请补充分区说明。' },
    ], overall: '补充坡度分区与措施对应关系后重新提交。' },
    { no: 3, sub: daysAgo(8, 10), ret: daysAgo(6, 14), status: 'approved', by: '张工', reviewer: '李慧', comments: [
      { patchId: 'p1', text: '西坡坡耕地梯田布设合理，田埂沿等高线走向，同意。' },
      { patchId: 'p6', text: '鱼鳞坑整地与植草范围清晰，同意。' },
    ], overall: '措施布设与工程量核算满足要求，同意通过。' },
  ]
  for (const h of histSpec) {
    versions.push({
      id: `ver-${h.no}`,
      no: h.no,
      status: h.status,
      submittedAt: h.sub,
      submittedBy: h.by,
      reviewedAt: h.ret,
      reviewedBy: h.reviewer,
      comments: h.comments.map((c, i) => ({ id: `c-${h.no}-${i}`, ...c, createdAt: h.ret, author: h.reviewer })),
      overall: h.overall,
      summary: { measures: measures.length, area: patches.reduce((s, p) => s + 0, 0) },
      snapshot: null,
    })
  }
  return {
    id: 'proj-qsh',
    name: '青山沟、柳树沟小流域坡面治理工程',
    county: '示范县水土保持站',
    survey,
    watersheds,
    patches,
    measures,
    versions,
    status: 'draft',
    currentVersionNo: 4,
    createdAt: daysAgo(30, 8),
    updatedAt: daysAgo(1, 17),
  }
}

function cloneShape(s) {
  if (s.kind === 'rect') return { ...s, center: [...s.center] }
  if (s.kind === 'point') return { ...s, center: [...s.center] }
  if (s.kind === 'line') return { ...s, points: s.points.map((p) => [...p]) }
  if (s.kind === 'polygon') return { ...s, points: s.points.map((p) => [...p]) }
  return { ...s }
}

export function useProject() {
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dirty, setDirty] = useState(false)
  const saveTimer = useRef(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const saved = localStorage.getItem(KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          const survey = finalizeSurvey(parsed.survey)
          if (alive) {
            setState({ ...parsed, survey })
            setLoading(false)
          }
          return
        }
        const survey = await loadDemoSurvey()
        const seed = makeSeed(survey)
        if (alive) {
          setState(seed)
          setLoading(false)
        }
      } catch (e) {
        if (alive) {
          setError(e.message)
          setLoading(false)
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // 持久化（去抖）
  useEffect(() => {
    if (!state) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(state))
      } catch (e) {
        /* 忽略配额错误 */
      }
    }, 400)
    return () => clearTimeout(saveTimer.current)
  }, [state])

  const dem = useMemo(() => (state?.survey ? buildDEM(state.survey, 8) : null), [state?.survey])

  const channels = useMemo(() => (dem && state?.survey ? channelProfiles(state.survey, dem) : state?.survey?.channels || []), [dem, state?.survey])

  const ctx = useMemo(
    () => ({ dem, patches: state?.patches || [], channels }),
    [dem, state?.patches, channels],
  )

  // 计算每个措施的工程量并挂到对象上（每次数据变化重算）
  const measuresWithCalc = useMemo(() => {
    if (!state) return []
    return state.measures.map((m) => {
      const calc = computeMeasure(m, ctx)
      return { ...m, calc, coverage: calc.coverage }
    })
  }, [state?.measures, ctx])

  const validation = useMemo(() => {
    if (!state) return { issues: [], errors: [], warnings: [], ok: true }
    return validatePlan({
      dem,
      channels,
      patches: state.patches,
      measures: measuresWithCalc,
      watersheds: state.watersheds,
      activeWatershedId: null,
    })
  }, [dem, channels, state?.patches, state?.watersheds, measuresWithCalc])

  const api = useMemo(() => {
    const update = (fn) => setState((s) => (s ? { ...fn(s), updatedAt: iso(Date.now()) } : s))
    return {
      update,
      resetDemo: async () => {
        localStorage.removeItem(KEY)
        const survey = await loadDemoSurvey()
        setState(makeSeed(survey))
      },
      setSurvey: (survey) => update((s) => ({ ...s, survey })),
      addWatershed: (w) => update((s) => ({ ...s, watersheds: [...s.watersheds, w] })),
      updateWatershed: (id, patch) =>
        update((s) => ({ ...s, watersheds: s.watersheds.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
      removeWatershed: (id) =>
        update((s) => ({
          ...s,
          watersheds: s.watersheds.filter((w) => w.id !== id),
          patches: s.patches.filter((p) => p.watershedId !== id),
          measures: s.measures.filter((m) => m.watershedId !== id),
        })),
      addPatch: (p) => update((s) => ({ ...s, patches: [...s.patches, p] })),
      updatePatch: (id, patch) => update((s) => ({ ...s, patches: s.patches.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      removePatch: (id) =>
        update((s) => ({
          ...s,
          patches: s.patches.filter((p) => p.id !== id),
          measures: s.measures.filter((m) => m.patchId !== id),
        })),
      addMeasure: (m) => update((s) => ({ ...s, measures: [...s.measures, m] })),
      updateMeasure: (id, patch) =>
        update((s) => ({ ...s, measures: s.measures.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      removeMeasure: (id) => update((s) => ({ ...s, measures: s.measures.filter((m) => m.id !== id) })),
      submitReview: (note) =>
        update((s) => {
          const no = (s.versions?.length ? Math.max(...s.versions.map((v) => v.no)) : 0) + 1
          const ver = {
            id: uid('ver'),
            no,
            status: 'pending',
            submittedAt: iso(Date.now()),
            submittedBy: '张工',
            reviewedAt: null,
            comments: [],
            overall: '',
            note: note || '',
            snapshot: {
              measures: s.measures.map((m) => ({ ...m, params: { ...m.params }, shape: cloneShape(m.shape) })),
              patches: s.patches.map((p) => ({ ...p, points: p.points.map((q) => [...q]) })),
              watersheds: s.watersheds.map((w) => ({ ...w })),
            },
          }
          return { ...s, versions: [...(s.versions || []), ver], status: 'pending', currentVersionNo: no }
        }),
      returnVersion: (versionId, overall) =>
        update((s) => ({
          ...s,
          status: 'returned',
          versions: (s.versions || []).map((v) =>
            v.id === versionId ? { ...v, status: 'returned', overall, reviewedAt: iso(Date.now()), reviewedBy: '李慧' } : v,
          ),
        })),
      approveVersion: (versionId, overall) =>
        update((s) => ({
          ...s,
          status: 'approved',
          versions: (s.versions || []).map((v) =>
            v.id === versionId ? { ...v, status: 'approved', overall, reviewedAt: iso(Date.now()), reviewedBy: '李慧' } : v,
          ),
        })),
      addMeasureForReview: (m) => update((s) => ({ ...s, measures: [...s.measures, m] })),
      addComment: (versionId, comment) =>
        update((s) => ({
          ...s,
          versions: (s.versions || []).map((v) =>
            v.id === versionId ? { ...v, comments: [...v.comments, { ...comment, id: uid('c'), createdAt: iso(Date.now()) }] } : v,
          ),
        })),
      removeComment: (versionId, commentId) =>
        update((s) => ({
          ...s,
          versions: (s.versions || []).map((v) =>
            v.id === versionId ? { ...v, comments: v.comments.filter((c) => c.id !== commentId) } : v,
          ),
        })),
      convertToForest: (measureId) =>
        update((s) => ({
          ...s,
          measures: s.measures.map((m) =>
            m.id === measureId
              ? {
                  ...m,
                  type: 'forest',
                  params: { ...MEASURE_TYPES.forest.defaults },
                  convertedFrom: 'terrace',
                }
              : m,
          ),
        })),
    }
  }, [])

  return { state, setState, loading, error, dem, ctx, measures: measuresWithCalc, validation, api }
}

export function currentVersion(state) {
  if (!state?.versions?.length) return null
  return state.versions[state.versions.length - 1]
}
