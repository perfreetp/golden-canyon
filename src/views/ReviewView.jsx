import { useMemo, useState } from 'react'
import SliceCanvas from '../components/SliceCanvas.jsx'
import TaskStatusPill from '../components/TaskStatusPill.jsx'
import { useStore, userName } from '../lib/store.jsx'
import { layerMeta } from '../lib/data.js'

export default function ReviewView() {
  const { series, state, dispatch } = useStore()
  const [taskId, setTaskId] = useState(state.tasks.find((t) => ['ongoing', 'review', 'archived'].includes(t.status))?.id || '')
  const [subId, setSubId] = useState('')
  const structureMap = useMemo(() => new Map(series.structures.map((s) => [s.id, s])), [series])

  const reviewable = state.tasks.filter((t) => ['ongoing', 'review', 'archived'].includes(t.status))
  const task = state.tasks.find((t) => t.id === taskId)
  const subs = state.submissions.filter((s) => s.taskId === taskId)
  const submission = subs.find((s) => s.id === subId) || subs[0]

  return (
    <div>
      <div className="section-title">复核中心 · 逐题改分与评语</div>

      <div className="canvas-toolbar">
        <label className="q-meta">任务：
          <select value={taskId} onChange={(e) => { setTaskId(e.target.value); setSubId('') }}>
            <option value="">请选择任务</option>
            {reviewable.map((t) => <option key={t.id} value={t.id}>{t.title}（{TASK_LABEL(t.status)}）</option>)}
          </select>
        </label>
        {task && <label className="q-meta">学员答卷：
          <select value={submission?.id || ''} onChange={(e) => setSubId(e.target.value)}>
            {subs.map((s) => (
              <option key={s.id} value={s.id}>
                {userName(s.studentId)} · {s.status === 'reviewed' ? '已复核' : '待复核'} · {s.totalFinal ?? s.totalAuto} 分
              </option>
            ))}
          </select>
        </label>}
      </div>

      {!task && <div className="empty-state"><div className="icon">🗂️</div><div>暂无可复核任务（任务进入「进行中/待复核」后显示）</div></div>}
      {task && subs.length === 0 && <div className="empty-state"><div className="icon">⏳</div><div>该任务还没有学员提交答卷</div></div>}

      {task && submission && (
        <ReviewDetail
          key={submission.id}
          task={task}
          submission={submission}
          structureMap={structureMap}
          series={series}
          dispatch={dispatch}
        />
      )}
    </div>
  )
}

const TASK_LABEL = (s) => ({ ongoing: '进行中', review: '待复核', archived: '已归档' })[s] || s

function ReviewDetail({ task, submission, structureMap, series, dispatch }) {
  const [qIdx, setQIdx] = useState(0)
  const q = task.questions[qIdx]
  const ans = submission.answers[q.id]
  const [finalScore, setFinalScore] = useState(ans?.finalScore ?? ans?.auto?.autoScore ?? 0)
  const [comment, setComment] = useState(ans?.comment || '')
  const [toast, setToast] = useState('')

  const slice = series.slices[q.slice]
  const visible = useMemo(() => {
    const v = { artery: false, vein: false, nerve: false, functional: false, lesion: false }
    task.allowedLayers.forEach((l) => { v[l] = true })
    return v
  }, [task])

  const committed = ans?.pts?.length >= 3
    ? [{ points: ans.pts, color: 0x3d9bf2, alpha: 0.16 }]
    : []
  const reviewOverlays = ans?.auto ? {
    ref: q.answer,
    referenceRegions: ans.auto.referenceRegions,
    extraRegions: ans.auto.extraRegions
  } : null

  const reviewedCount = Object.values(submission.answers).filter((a) => a.reviewedBy).length

  const saveReview = () => {
    if (finalScore < 0 || finalScore > q.maxScore) {
      alert(`分数必须在 0 ~ ${q.maxScore} 之间`); return
    }
    dispatch({
      type: 'REVIEW_QUESTION',
      submissionId: submission.id,
      questionId: q.id,
      questionNo: qIdx + 1,
      finalScore: Number(finalScore),
      comment
    })
    setToast(`第 ${qIdx + 1} 题复核已保存：${finalScore} 分`)
    setTimeout(() => setToast(''), 2400)
  }

  const a = ans?.auto
  const pct = (x) => (x * 100).toFixed(1) + '%'

  return (
    <div className="layout-2">
      <div className="stack">
        <div className="panel">
          <div className="panel-title">
            答卷：{userName(submission.studentId)}
            <span className="tag">{reviewedCount}/{task.questions.length} 已复核</span>
            {submission.status === 'reviewed' ? <span className="tag green">复核完成</span> : <span className="tag yellow">复核中</span>}
          </div>
          <div className="score-big" style={{ color: 'var(--green)' }}>
            {submission.totalFinal ?? submission.totalAuto}
            <span style={{ fontSize: 15, color: 'var(--muted)' }}> / {task.questions.reduce((s, x) => s + x.maxScore, 0)} 分</span>
          </div>
          <div className="q-meta" style={{ marginTop: 6 }}>
            <span>自动评分 {submission.totalAuto} 分</span>
            <span>提交时间 {submission.submittedAt}</span>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">题目列表</div>
          {task.questions.map((qq, i) => {
            const r = submission.answers[qq.id]
            return (
              <div key={qq.id}
                style={{
                  border: i === qIdx ? '1px solid var(--accent)' : '1px solid var(--line)',
                  background: i === qIdx ? 'rgba(61,155,242,.08)' : 'var(--bg-2)',
                  borderRadius: 9, padding: '9px 12px', marginBottom: 8, cursor: 'pointer'
                }}
                onClick={() => { setQIdx(i); setFinalScore(r?.finalScore ?? r?.auto?.autoScore ?? 0); setComment(r?.comment || '') }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <b>第 {i + 1} 题 · 第 {qq.slice + 1} 层</b>
                  {r?.reviewedBy ? <span className="tag green">已改分</span> : <span className="tag">机评分</span>}
                </div>
                <div className="q-meta" style={{ marginTop: 4 }}>
                  <span>{layerMeta(qq.layer).name}</span>
                  <span>{r?.finalScore ?? r?.auto?.autoScore ?? 0}/{qq.maxScore} 分</span>
                  {r?.auto && !r.auto.withinTolerance && <span className="tag red">超差</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="stack">
        <div className="canvas-toolbar">
          <button className="tool-btn" onClick={() => {
            const i = Math.max(0, qIdx - 1); setQIdx(i)
            const r = submission.answers[task.questions[i].id]
            setFinalScore(r?.finalScore ?? r?.auto?.autoScore ?? 0); setComment(r?.comment || '')
          }} disabled={qIdx === 0}>‹ 上一题</button>
          <div className="slice-meta">第 <b>{q.slice + 1}</b> 层 · {q.prompt}</div>
          <button className="tool-btn" onClick={() => {
            const i = Math.min(task.questions.length - 1, qIdx + 1); setQIdx(i)
            const r = submission.answers[task.questions[i].id]
            setFinalScore(r?.finalScore ?? r?.auto?.autoScore ?? 0); setComment(r?.comment || '')
          }} disabled={qIdx === task.questions.length - 1}>下一题 ›</button>
        </div>

        <SliceCanvas
          slice={slice}
          structureMap={structureMap}
          visibleLayers={visible}
          mode="browse"
          selectedId={null}
          committedPolygons={committed}
          reviewOverlays={reviewOverlays}
          height={480}
        />

        <div className="panel">
          <div className="panel-title">评分复核</div>
          {!ans?.auto ? (
            <div className="tag red">学员未作答，本题按 0 分处理</div>
          ) : (
            <div className="form-grid">
              <div className="form-field">
                <label>机评指标</label>
                <div className="q-meta" style={{ lineHeight: 2 }}>
                  <span>覆盖率 {pct(a.recall)}</span>
                  <span>容差精确率 {pct(a.precisionTol)}</span>
                  <span>IoU {pct(a.iou)}</span>
                  <span>机评 {a.autoScore}/{q.maxScore}</span>
                </div>
              </div>
              <div className="form-field">
                <label>复核分数（0 ~ {q.maxScore}）</label>
                <input type="number" min={0} max={q.maxScore} step={0.5} value={finalScore}
                  onChange={(e) => setFinalScore(e.target.value)} />
              </div>
              <div className="form-field full">
                <label>评语（学员可见）</label>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)}
                  placeholder="例：主干定位正确，但远端分支遗漏较多，注意大脑中动脉分叉后的走形…" />
              </div>
            </div>
          )}
          <div className="q-actions" style={{ marginTop: 12 }}>
            <button className="tool-btn primary" onClick={saveReview}>保存本题复核</button>
            {ans?.auto && (
              <button className="tool-btn" onClick={() => setFinalScore(a.autoScore)}>恢复机评分</button>
            )}
            {ans?.reviewedBy && <span className="tag green">已于 {ans.reviewedAt} 复核</span>}
          </div>
          <div className="q-meta" style={{ marginTop: 10 }}>
            <span><i style={{ display: 'inline-block', width: 12, height: 12, background: '#35d07f', borderRadius: 3 }} /> 标准答案</span>
            <span><i style={{ display: 'inline-block', width: 12, height: 12, background: '#ff4d57', borderRadius: 3 }} /> 超差参考位置</span>
            <span><i style={{ display: 'inline-block', width: 12, height: 12, background: '#ffd24d', borderRadius: 3 }} /> 多画区域</span>
            <span><i style={{ display: 'inline-block', width: 12, height: 12, background: '#3d9bf2', borderRadius: 3 }} /> 学员作答</span>
          </div>
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
