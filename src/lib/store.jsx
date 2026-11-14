// 全局状态：用户、图层开关、任务流转、答卷、审计日志
import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { generateSeries } from './data.js'
import { load, save, nowStamp } from './storage.js'
import { scoreAnswer } from './geometry.js'

export const TASK_STATUS = {
  draft: { label: '草稿', color: '#8a93a6' },
  published: { label: '已发布', color: '#3d9bf2' },
  ongoing: { label: '进行中', color: '#e8b526' },
  review: { label: '待复核', color: '#a06bff' },
  archived: { label: '已归档', color: '#4caf78' }
}

export const USERS = [
  { id: 'sec-zhang', name: '张秘书', role: 'secretary' },
  { id: 'teacher-li', name: '李老师', role: 'teacher' },
  { id: 'teacher-wang', name: '王老师', role: 'teacher' },
  { id: 'stu-chen', name: '陈同学', role: 'student', group: 'A' },
  { id: 'stu-lin', name: '林同学', role: 'student', group: 'A' },
  { id: 'stu-zhao', name: '赵同学', role: 'student', group: 'B' },
  { id: 'stu-sun', name: '孙同学', role: 'student', group: 'B' }
]

export const GROUPS = [
  { id: 'A', name: '学员 A 组', members: ['stu-chen', 'stu-lin'] },
  { id: 'B', name: '学员 B 组', members: ['stu-zhao', 'stu-sun'] }
]

export const userName = (id) => USERS.find((u) => u.id === id)?.name || id

const initialState = {
  user: load('user', USERS[0]),
  seriesImported: load('seriesImported', false),
  importedAt: load('importedAt', null),
  layerVisibility: load('layerVisibility', {
    artery: true, vein: true, nerve: true, functional: true, lesion: true
  }),
  tasks: load('tasks', []),
  submissions: load('submissions', []),
  audit: load('audit', [])
}

function addAudit(state, by, action, detail) {
  return [{ at: nowStamp(), by, action, detail }, ...state.audit].slice(0, 500)
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.user }

    case 'IMPORT_SERIES':
      return { ...state, seriesImported: true, importedAt: nowStamp(),
        audit: addAudit(state, state.user.id, '导入断层序列', `${action.seriesName}，共 ${action.sliceCount} 层`) }

    case 'TOGGLE_LAYER': {
      const layerVisibility = { ...state.layerVisibility, [action.layer]: !state.layerVisibility[action.layer] }
      return { ...state, layerVisibility }
    }

    case 'SET_LAYERS':
      return { ...state, layerVisibility: { ...action.value } }

    case 'TASK_SAVE': {
      const exists = state.tasks.some((t) => t.id === action.task.id)
      const tasks = exists
        ? state.tasks.map((t) => (t.id === action.task.id ? action.task : t))
        : [action.task, ...state.tasks]
      const audit = exists
        ? addAudit(state, state.user.id, '编辑任务', action.task.title)
        : addAudit(state, state.user.id, '创建任务（草稿）', action.task.title)
      return { ...state, tasks, audit }
    }

    case 'TASK_TRANSITION': {
      const tasks = state.tasks.map((t) => {
        if (t.id !== action.taskId) return t
        return { ...t, status: action.to, transitionAt: nowStamp(),
          audit: [...(t.audit || []), { at: nowStamp(), by: state.user.id, to: action.to, note: action.note || '' }] }
      })
      return { ...state, tasks,
        audit: addAudit(state, state.user.id, `任务流转：${action.from} → ${action.to}`,
          `${action.taskTitle}${action.note ? '（' + action.note + '）' : ''}`) }
    }

    case 'TASK_DELETE':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.taskId),
        audit: addAudit(state, state.user.id, '删除草稿任务', action.taskTitle) }

    case 'SUBMIT_EXAM': {
      const { submission, taskId } = action
      const submissions = [submission, ...state.submissions.filter((s) => s.id !== submission.id)]
      const task = state.tasks.find((t) => t.id === taskId)
      const tasks = state.tasks.map((t) => t.id === taskId && t.status === 'published'
        ? { ...t, status: 'ongoing', transitionAt: nowStamp(),
          audit: [...(t.audit || []), { at: nowStamp(), by: submission.studentId, to: 'ongoing', note: '首份答卷提交' }] }
        : t)
      return { ...state, submissions, tasks,
        audit: addAudit(state, submission.studentId, '提交答卷',
          `${task?.title || ''}，自动评分 ${submission.totalAuto} 分`) }
    }

    case 'REVIEW_QUESTION': {
      const submissions = state.submissions.map((s) => {
        if (s.id !== action.submissionId) return s
        const answers = { ...s.answers,
          [action.questionId]: { ...s.answers[action.questionId],
            finalScore: action.finalScore, comment: action.comment,
            reviewedBy: state.user.id, reviewedAt: nowStamp() } }
        const totalFinal = Object.values(answers).reduce((sum, a) => sum + (a.finalScore ?? a.auto.autoScore), 0)
        const allReviewed = Object.values(answers).every((a) => a.reviewedBy)
        return { ...s, answers, totalFinal: Math.round(totalFinal * 10) / 10,
          status: allReviewed ? 'reviewed' : 'partial' }
      })
      const sub = submissions.find((s) => s.id === action.submissionId)
      return { ...state, submissions,
        audit: addAudit(state, state.user.id, '复核评分',
          `答卷 ${action.submissionId.slice(0, 8)} 题 ${action.questionNo} → ${action.finalScore} 分`) }
    }

    case 'ARCHIVE_TASK': {
      const tasks = state.tasks.map((t) => t.id === action.taskId
        ? { ...t, status: 'archived', transitionAt: nowStamp(),
          audit: [...(t.audit || []), { at: nowStamp(), by: state.user.id, to: 'archived' }] }
        : t)
      return { ...state, tasks,
        audit: addAudit(state, state.user.id, '归档任务', action.taskTitle) }
    }

    case 'RESET_DEMO':
      return { ...initialState, user: state.user, tasks: [], submissions: [], audit: [],
        seriesImported: false, importedAt: null }

    default:
      return state
  }
}

const StoreCtx = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const series = useMemo(() => generateSeries(20261115), [])

  useEffect(() => save('user', state.user), [state.user])
  useEffect(() => save('seriesImported', state.seriesImported), [state.seriesImported])
  useEffect(() => save('importedAt', state.importedAt), [state.importedAt])
  useEffect(() => save('layerVisibility', state.layerVisibility), [state.layerVisibility])
  useEffect(() => save('tasks', state.tasks), [state.tasks])
  useEffect(() => save('submissions', state.submissions), [state.submissions])
  useEffect(() => save('audit', state.audit), [state.audit])

  const value = useMemo(() => ({
    state, dispatch, series,
    // 提交答卷并自动评分
    gradeSubmission(task, studentId, answerMap) {
      const answers = {}
      let totalAuto = 0
      for (const q of task.questions) {
        const ans = answerMap[q.id]
        if (!ans || ans.length < 3) {
          answers[q.id] = { pts: ans || [], auto: null, finalScore: null, comment: '' }
          continue
        }
        const auto = scoreAnswer(ans, q.answer, q.tolerance, q.maxScore)
        answers[q.id] = { pts: ans, auto, finalScore: auto.autoScore, comment: '' }
        totalAuto += auto.autoScore
      }
      const submission = {
        id: `sub-${task.id}-${studentId}`,
        taskId: task.id, studentId,
        status: 'submitted',
        answers,
        totalAuto: Math.round(totalAuto * 10) / 10,
        totalFinal: Math.round(totalAuto * 10) / 10,
        submittedAt: nowStamp()
      }
      dispatch({ type: 'SUBMIT_EXAM', submission, taskId: task.id })
      return submission
    }
  }), [state, series])

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore 必须在 StoreProvider 内使用')
  return ctx
}
