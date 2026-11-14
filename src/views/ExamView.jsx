import { useMemo, useState } from 'react'
import SliceCanvas from '../components/SliceCanvas.jsx'
import TaskStatusPill from '../components/TaskStatusPill.jsx'
import { useStore, GROUPS } from '../lib/store.jsx'
import { layerMeta } from '../lib/data.js'

export default function ExamView() {
  const { series, state, gradeSubmission } = useStore()
  const [activeTaskId, setActiveTaskId] = useState(null)
  const structureMap = useMemo(() => new Map(series.structures.map((s) => [s.id, s])), [series])

  const myGroup = state.user.group
  const myTasks = state.tasks.filter((t) => t.group === myGroup && t.status !== 'draft')
  const mySubmission = (taskId) => state.submissions.find((s) => s.taskId === taskId && s.studentId === state.user.id)

  if (activeTaskId) {
    const task = state.tasks.find((t) => t.id === activeTaskId)
    const sub = mySubmission(task.id)
    return (
      <ExamRunner
        task={task}
        submission={sub}
        structureMap={structureMap}
        series={series}
        studentId={state.user.id}
        gradeSubmission={gradeSubmission}
        onExit={() => setActiveTaskId(null)}
      />
    )
  }

  return (
    <div>
      <div className="section-title">考核任务（{myGroup} 组指派）</div>
      {myTasks.length === 0 && (
        <div className="empty-state"><div className="icon">📭</div><div>暂无指派给本组的考核任务</div></div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>任务名称</th><th>题量</th><th>截止时间</th><th>状态</th><th>我的成绩</th><th>操作</th></tr>
          </thead>
          <tbody>
            {myTasks.map((t) => {
              const sub = mySubmission(t.id)
              const overdue = new Date(t.deadline).getTime() < Date.now()
              return (
                <tr key={t.id}>
                  <td className="wrap"><b>{t.title}</b>
                    <div className="q-meta" style={{ marginTop: 4 }}>{t.description}</div>
                  </td>
                  <td>{t.questions.length} 题 / {t.questions.reduce((s, q) => s + q.maxScore, 0)} 分</td>
                  <td>{t.deadline.replace('T', ' ')} {overdue && t.status !== 'archived' && <span className="tag red">已截止</span>}</td>
                  <td><TaskStatusPill status={t.status} /></td>
                  <td>
                    {sub ? (
                      <span>
                        <b style={{ color: 'var(--green)' }}>{sub.totalFinal ?? sub.totalAuto}</b>
                        <span style={{ color: 'var(--muted)' }}> / {t.questions.reduce((s, q) => s + q.maxScore, 0)}</span>
                        {sub.status === 'partial' && <div className="tag yellow" style={{ marginTop: 4 }}>部分复核中</div>}
                        {sub.status === 'reviewed' && <div className="tag green" style={{ marginTop: 4 }}>教师已复核</div>}
                      </span>
                    ) : <span className="tag">未提交</span>}
                  </td>
                  <td>
                    <div className="q-actions">
                      <button className="tool-btn primary" onClick={() => setActiveTaskId(t.id)}>
                        {sub ? '查看答卷与解析' : (t.status === 'archived' ? '查看' : '进入答题')}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="panel" style={{ marginTop: 14 }}>
        <div className="panel-title">答题规则</div>
        <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--muted)', fontSize: 12.5, lineHeight: 2 }}>
          <li>进入答题后系统锁定图层，仅保留题干要求的图层，其余图层强制隐藏且不可切换；</li>
          <li>每题自动跳转到命题层号，在套索模式下按住鼠标圈出目标结构；</li>
          <li>提交后系统按圈画与标准答案的栅格重合度自动算分，并对超出允许偏差半径的部分标注参考位置；</li>
          <li>教师复核后可逐题调整分数并添加评语，以复核成绩为最终成绩。</li>
        </ol>
      </div>
    </div>
  )
}

function ExamRunner({ task, submission, structureMap, series, studentId, gradeSubmission, onExit }) {
  const readOnly = !!submission
  const [qIdx, setQIdx] = useState(0)
  const [answers, setAnswers] = useState(() => {
    const m = {}
    if (submission) for (const [id, a] of Object.entries(submission.answers)) m[id] = a.pts
    return m
  })
  const [toast, setToast] = useState('')

  const q = task.questions[qIdx]
  const slice = series.slices[q.slice]
  const lockedVisibility = useMemo(() => {
    const v = { artery: false, vein: false, nerve: false, functional: false, lesion: false }
    task.allowedLayers.forEach((l) => { v[l] = true })
    return v
  }, [task])

  const currentAnswer = answers[q.id]
  const committed = currentAnswer?.length >= 3
    ? [{ points: currentAnswer, color: readOnly ? 0x3d9bf2 : 0x35d07f, alpha: 0.2 }]
    : []

  const reviewOverlays = readOnly && submission.answers[q.id]?.auto ? {
    ref: q.answer,
    referenceRegions: submission.answers[q.id].auto.referenceRegions,
    extraRegions: submission.answers[q.id].auto.extraRegions
  } : null

  const answeredCount = Object.values(answers).filter((a) => a && a.length >= 3).length

  const submit = () => {
    if (answeredCount < task.questions.length) {
      if (!confirm(`还有 ${task.questions.length - answeredCount} 题未作答，确认提交？未答题计 0 分`)) return
    } else if (!confirm('确认提交答卷？提交后将自动评分且不能修改')) return
    gradeSubmission(task, studentId, answers)
    setToast('答卷已提交，自动评分完成')
    setTimeout(() => setToast(''), 2800)
  }

  const ansRecord = readOnly ? submission.answers[q.id] : null

  return (
    <div>
      <div className="section-title" style={{ justifyContent: 'space-between' }}>
        <span>{task.title} {readOnly && <span className="tag green">答卷回看（只读）</span>}</span>
        <button className="tool-btn" onClick={onExit}>← 返回任务列表</button>
      </div>

      <div className="layout-2">
        <div className="stack">
          <div className="panel">
            <div className="panel-title">答题卡 · {answeredCount}/{task.questions.length} 已作答</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {task.questions.map((qq, i) => {
                const done = answers[qq.id]?.length >= 3
                return (
                  <button key={qq.id}
                    style={{
                      width: 38, height: 38, borderRadius: 8, cursor: 'pointer',
                      border: i === qIdx ? '2px solid var(--accent)' : '1px solid var(--line)',
                      background: done ? 'rgba(53,208,127,.18)' : 'var(--panel-2)',
                      color: done ? 'var(--green)' : 'var(--muted)', fontWeight: 700
                    }}
                    onClick={() => setQIdx(i)}
                  >{i + 1}</button>
                )
              })}
            </div>
            <div className="lock-note" style={{ marginTop: 12 }}>
              🔒 图层已锁定：仅开放 {task.allowedLayers.map((l) => layerMeta(l).name).join('、')}
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">第 {qIdx + 1} 题</div>
            <div className="q-card" style={{ background: 'var(--bg-2)' }}>
              <div className="q-meta" style={{ marginBottom: 8 }}>
                <span className="tag" style={{ color: '#' + layerMeta(q.layer).color.toString(16).padStart(6, '0') }}>
                  {layerMeta(q.layer).name}
                </span>
                <span>命题层号：第 {q.slice + 1} 层</span>
                <span>{q.maxScore} 分</span>
                {!readOnly && <span>允许偏差半径 ±{q.tolerance}</span>}
              </div>
              <div style={{ lineHeight: 1.7 }}>{q.prompt}</div>
            </div>

            {!readOnly ? (
              <div className="q-actions">
                <button className="tool-btn danger" disabled={!currentAnswer}
                  onClick={() => setAnswers((m) => ({ ...m, [q.id]: undefined }))}>
                  清除本题圈画
                </button>
                <span className="tag">{currentAnswer ? `已圈画 ${currentAnswer.length} 点` : '请在右侧画布套索圈画'}</span>
              </div>
            ) : (
              <AnswerFeedback ans={ansRecord} q={q} />
            )}
          </div>

          {!readOnly && (
            <button className="tool-btn green" style={{ padding: '12px', fontSize: 14 }} onClick={submit}>
              提交答卷并自动评分
            </button>
          )}
        </div>

        <div className="stack">
          <div className="canvas-toolbar">
            <button className="tool-btn" onClick={() => setQIdx((i) => Math.max(0, i - 1))} disabled={qIdx === 0}>‹ 上一题</button>
            <div className="slice-meta">本题锁定层号 <b>{q.slice + 1}</b>（层号随题目自动切换）</div>
            <button className="tool-btn" onClick={() => setQIdx((i) => Math.min(task.questions.length - 1, i + 1))}
              disabled={qIdx === task.questions.length - 1}>下一题 ›</button>
          </div>
          <SliceCanvas
            slice={slice}
            structureMap={structureMap}
            visibleLayers={lockedVisibility}
            mode={readOnly ? 'browse' : 'lasso'}
            selectedId={null}
            onLassoComplete={(pts) => !readOnly && setAnswers((m) => ({ ...m, [q.id]: pts }))}
            committedPolygons={committed}
            reviewOverlays={reviewOverlays}
            height={600}
          />
          {readOnly && (
            <div className="panel">
              <div className="panel-title">图例说明</div>
              <div className="q-meta" style={{ lineHeight: 2 }}>
                <span><i style={{ display: 'inline-block', width: 12, height: 12, background: '#35d07f', borderRadius: 3 }} /> 标准答案轮廓</span>
                <span><i style={{ display: 'inline-block', width: 12, height: 12, background: '#ff4d57', borderRadius: 3 }} /> 漏画/超差参考位置</span>
                <span><i style={{ display: 'inline-block', width: 12, height: 12, background: '#ffd24d', borderRadius: 3 }} /> 多画区域</span>
                <span><i style={{ display: 'inline-block', width: 12, height: 12, background: '#3d9bf2', borderRadius: 3 }} /> 我的作答</span>
              </div>
            </div>
          )}
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function AnswerFeedback({ ans, q }) {
  if (!ans?.auto) {
    return <div className="tag red" style={{ display: 'inline-block', marginTop: 8 }}>未作答，本题 0 分</div>
  }
  const a = ans.auto
  const pct = (x) => (x * 100).toFixed(1) + '%'
  return (
    <div style={{ marginTop: 10 }}>
      <div className="metric-row"><span>自动评分</span><b>{ans.finalScore ?? a.autoScore} / {q.maxScore} 分</b></div>
      <div className="metric-row"><span>标准答案覆盖率（召回）</span><b>{pct(a.recall)}</b></div>
      <div className="metric-row"><span>容差内精确率</span><b>{pct(a.precisionTol)}</b></div>
      <div className="metric-row"><span>重合度 IoU</span><b>{pct(a.iou)}</b></div>
      <div className="metric-row">
        <span>偏差判定</span>
        {a.withinTolerance
          ? <span className="tag green">偏差在允许半径 ±{q.tolerance} 内</span>
          : <span className="tag red">存在超差，红色区域为参考位置</span>}
      </div>
      {ans.comment && (
        <div className="q-card" style={{ background: 'rgba(160,107,255,.1)', borderColor: 'rgba(160,107,255,.35)', marginTop: 10 }}>
          <div className="q-title" style={{ fontSize: 13 }}>教师评语</div>
          <div style={{ marginTop: 6, lineHeight: 1.7 }}>{ans.comment}</div>
        </div>
      )}
      {ans.reviewedBy && (
        <div className="q-meta" style={{ marginTop: 8 }}>
          <span className="tag green">复核成绩：{ans.finalScore} 分 · {ans.reviewedAt}</span>
        </div>
      )}
    </div>
  )
}
