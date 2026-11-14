import { useMemo, useState } from 'react'
import SliceCanvas from '../components/SliceCanvas.jsx'
import TaskStatusPill from '../components/TaskStatusPill.jsx'
import { useStore, GROUPS, userName, TASK_STATUS } from '../lib/store.jsx'
import { LAYERS, layerMeta } from '../lib/data.js'

const uid = (p) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
const todayPlus = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 16)

const emptyDraft = () => ({
  id: uid('task'),
  title: '',
  description: '',
  group: 'A',
  deadline: todayPlus(7),
  allowedLayers: ['artery', 'vein', 'nerve', 'functional', 'lesion'],
  questions: [],
  status: 'draft',
  createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
  createdBy: null
})

export default function TeacherWorkbench() {
  const { series, state, dispatch } = useStore()
  const [tab, setTab] = useState('list')
  const [editing, setEditing] = useState(null)

  const structureMap = useMemo(() => new Map(series.structures.map((s) => [s.id, s])), [series])

  const startNew = () => {
    const d = emptyDraft()
    d.createdBy = state.user.id
    setEditing(d)
    setTab('editor')
  }
  const openTask = (t) => { setEditing(JSON.parse(JSON.stringify(t))); setTab('editor') }

  const saveDraft = () => {
    if (!editing.title.trim()) { alert('请填写任务名称'); return }
    dispatch({ type: 'TASK_SAVE', task: { ...editing, status: editing.status === 'draft' ? 'draft' : editing.status } })
    setTab('list')
    setEditing(null)
  }

  const publish = () => {
    if (!editing.title.trim()) { alert('请填写任务名称'); return }
    if (editing.questions.length === 0) { alert('至少添加一道考题'); return }
    const toPublish = { ...editing, status: 'published', publishedAt: new Date().toLocaleString('zh-CN', { hour12: false }) }
    dispatch({ type: 'TASK_SAVE', task: toPublish })
    if (editing.status === 'draft') {
      dispatch({ type: 'TASK_TRANSITION', taskId: toPublish.id, from: 'draft', to: 'published', taskTitle: toPublish.title, note: '发布并指派学员组' })
    }
    setTab('list')
    setEditing(null)
  }

  const transition = (t, to, note) => {
    dispatch({ type: 'TASK_TRANSITION', taskId: t.id, from: t.status, to, taskTitle: t.title, note })
    if (to === 'archived') dispatch({ type: 'ARCHIVE_TASK', taskId: t.id, taskTitle: t.title })
  }

  const removeTask = (t) => {
    if (confirm(`确认删除草稿「${t.title}」？`)) {
      dispatch({ type: 'TASK_DELETE', taskId: t.id, taskTitle: t.title })
    }
  }

  if (tab === 'editor' && editing) {
    return (
      <TaskEditor
        key={editing.id}
        draft={editing}
        setDraft={setEditing}
        structureMap={structureMap}
        series={series}
        onBack={() => { setTab('list'); setEditing(null) }}
        onSave={saveDraft}
        onPublish={publish}
      />
    )
  }

  return (
    <div>
      <div className="section-title" style={{ justifyContent: 'space-between' }}>
        <span>命题工作台 · 任务组卷</span>
        <button className="tool-btn primary" onClick={startNew}>＋ 新建考核任务</button>
      </div>

      {state.tasks.length === 0 && (
        <div className="empty-state">
          <div className="icon">📝</div>
          <div>还没有考核任务，点击右上角新建，用套索在断层上圈出要考的结构</div>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>任务名称</th><th>学员组</th><th>题量/分值</th><th>截止时间</th>
              <th>状态</th><th>已交卷</th><th>操作
            </th></tr>
          </thead>
          <tbody>
            {state.tasks.map((t) => {
              const subs = state.submissions.filter((s) => s.taskId === t.id)
              const group = GROUPS.find((g) => g.id === t.group)
              return (
                <tr key={t.id}>
                  <td className="wrap"><b>{t.title}</b>
                    <div className="q-meta" style={{ marginTop: 4 }}>
                      <span>创建：{userName(t.createdBy)} · {t.createdAt}</span>
                    </div>
                  </td>
                  <td>{group?.name || t.group}（{group?.members.length || 0} 人）</td>
                  <td>{t.questions.length} 题 / {t.questions.reduce((s, q) => s + q.maxScore, 0)} 分</td>
                  <td>{t.deadline.replace('T', ' ')}</td>
                  <td><TaskStatusPill status={t.status} /></td>
                  <td>{subs.length} 份</td>
                  <td>
                    <div className="q-actions">
                      {(t.status === 'draft') && (
                        <>
                          <button className="tool-btn" onClick={() => openTask(t)}>编辑</button>
                          <button className="tool-btn danger" onClick={() => removeTask(t)}>删除</button>
                        </>
                      )}
                      {t.status === 'published' && (
                        <button className="tool-btn" onClick={() => transition(t, 'ongoing', '教师手动开始')}>开始考核</button>
                      )}
                      {t.status === 'ongoing' && (
                        <button className="tool-btn" onClick={() => transition(t, 'review', '停止作答进入复核')}>进入待复核</button>
                      )}
                      {t.status === 'review' && (
                        <button className="tool-btn" onClick={() => transition(t, 'archived', '复核完成归档')}>归档</button>
                      )}
                      {t.status === 'archived' && <span className="tag green">已完成归档</span>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="section-title">任务状态流转说明</div>
      <div className="panel">
        <div className="q-meta" style={{ fontSize: 12.5, lineHeight: 2 }}>
          {Object.entries(TASK_STATUS).map(([k, v], i) => (
            <span key={k} className="status-pill" style={{ color: v.color, borderColor: `${v.color}55`, marginRight: 8 }}>
              {v.label}
            </span>
          )).reduce((acc, el, i) => i === 0 ? [el] : [...acc, <span key={`a${i}`} style={{ color: 'var(--muted)' }}> → </span>, el], [])}
          <div style={{ marginTop: 8, color: 'var(--muted)' }}>
            每次流转均记录操作人与时间（见任务详情审计与导入台审计时间线）；学员首次提交时「已发布」自动进入「进行中」。
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------- 任务编辑器（套索命题） ----------------
function TaskEditor({ draft, setDraft, structureMap, series, onBack, onSave, onPublish }) {
  const [qSlice, setQSlice] = useState(series.slices[Math.floor(series.sliceCount / 2)].index)
  const [drawing, setDrawing] = useState(false)
  const [currentLasso, setCurrentLasso] = useState(null)
  const [editQ, setEditQ] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [maxScore, setMaxScore] = useState(10)
  const [tolerance, setTolerance] = useState(18)
  const [requiredLayer, setRequiredLayer] = useState('artery')

  const slice = series.slices[qSlice]
  const visible = useMemo(() => {
    const v = { artery: false, vein: false, nerve: false, functional: false, lesion: false }
    draft.allowedLayers.forEach((l) => { v[l] = true })
    return v
  }, [draft.allowedLayers])

  const committed = useMemo(() => {
    const polys = []
    draft.questions.filter((q) => q.slice === qSlice).forEach((q) => {
      polys.push({ points: q.answer, color: 0x35d07f, alpha: 0.14 })
    })
    if (currentLasso) polys.push({ points: currentLasso, color: 0xffd24d, alpha: 0.2 })
    return polys
  }, [draft.questions, qSlice, currentLasso])

  const handleLasso = (pts) => {
    setCurrentLasso(pts)
    setDrawing(true)
  }

  const confirmQuestion = () => {
    if (!currentLasso) return
    const q = {
      id: editQ?.id || uid('q'),
      prompt: prompt.trim() || `请圈出第 ${qSlice + 1} 层的${layerMeta(requiredLayer).name}结构`,
      slice: qSlice,
      layer: requiredLayer,
      answer: currentLasso,
      tolerance: Number(tolerance),
      maxScore: Number(maxScore)
    }
    setDraft((d) => {
      const qs = editQ ? d.questions.map((x) => (x.id === editQ.id ? q : x)) : [...d.questions, q]
      return { ...d, questions: qs }
    })
    setCurrentLasso(null)
    setDrawing(false)
    setEditQ(null)
    setPrompt('')
  }

  const editQuestion = (q) => {
    setEditQ(q)
    setQSlice(q.slice)
    setCurrentLasso(q.answer)
    setPrompt(q.prompt)
    setMaxScore(q.maxScore)
    setTolerance(q.tolerance)
    setRequiredLayer(q.layer)
    setDrawing(true)
  }

  const removeQuestion = (id) => {
    setDraft((d) => ({ ...d, questions: d.questions.filter((q) => q.id !== id) }))
    if (editQ?.id === id) { setEditQ(null); setCurrentLasso(null); setDrawing(false) }
  }

  const toggleAllowed = (layer) => {
    setDraft((d) => {
      const has = d.allowedLayers.includes(layer)
      const allowedLayers = has ? d.allowedLayers.filter((l) => l !== layer) : [...d.allowedLayers, layer]
      return { ...d, allowedLayers }
    })
  }

  return (
    <div>
      <div className="section-title" style={{ justifyContent: 'space-between' }}>
        <span>{draft.status === 'draft' ? '编辑草稿任务' : `查看任务（${TASK_STATUS[draft.status].label}）`}</span>
        <div className="q-actions">
          <button className="tool-btn" onClick={onBack}>← 返回列表</button>
          {draft.status === 'draft' && (
            <>
              <button className="tool-btn" onClick={onSave}>保存草稿</button>
              <button className="tool-btn green" onClick={onPublish}>校验并发布</button>
            </>
          )}
        </div>
      </div>

      <div className="layout-2">
        <div className="stack">
          <div className="panel">
            <div className="panel-title">任务设置</div>
            <div className="form-grid">
              <div className="form-field full">
                <label>任务名称</label>
                <input value={draft.title} disabled={draft.status !== 'draft'}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="例：颅脑轴位断层血管与颅神经识别考核（一）" />
              </div>
              <div className="form-field full">
                <label>任务说明</label>
                <textarea value={draft.description} disabled={draft.status !== 'draft'}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="考核范围、注意事项…" />
              </div>
              <div className="form-field">
                <label>指派学员组</label>
                <select value={draft.group} disabled={draft.status !== 'draft'}
                  onChange={(e) => setDraft({ ...draft, group: e.target.value })}>
                  {GROUPS.map((g) => <option key={g.id} value={g.id}>{g.name}（{g.members.length} 人）</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>截止时间</label>
                <input type="datetime-local" value={draft.deadline} disabled={draft.status !== 'draft'}
                  onChange={(e) => setDraft({ ...draft, deadline: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">答题时保留图层（其余锁定隐藏）</div>
            {LAYERS.map((l) => (
              <label key={l.id} className="layer-row" style={{ cursor: draft.status === 'draft' ? 'pointer' : 'not-allowed' }}>
                <input type="checkbox" disabled={draft.status !== 'draft'}
                  checked={draft.allowedLayers.includes(l.id)} onChange={() => toggleAllowed(l.id)} />
                <span className="layer-dot" style={{ background: '#' + l.color.toString(16).padStart(6, '0') }} />
                <span className="layer-name">{l.name}</span>
              </label>
            ))}
          </div>

          <div className="panel">
            <div className="panel-title">
              考题列表（{draft.questions.length}）
              共 {draft.questions.reduce((s, q) => s + q.maxScore, 0)} 分
            </div>
            {draft.questions.length === 0 && <div className="empty-tip">在右侧画布用套索圈出结构后确认入卷</div>}
            {draft.questions.map((q, i) => (
              <div key={q.id} className="q-card">
                <div className="q-head">
                  <div className="q-title">第 {i + 1} 题 · 第 {q.slice + 1} 层</div>
                  <div className="q-meta">
                    <span className="tag" style={{ color: '#' + layerMeta(q.layer).color.toString(16).padStart(6, '0') }}>
                      {layerMeta(q.layer).name}
                    </span>
                    <span>{q.maxScore} 分</span>
                    <span>容差 ±{q.tolerance}</span>
                  </div>
                </div>
                <div className="q-meta" style={{ marginBottom: 8 }}>{q.prompt}</div>
                {draft.status === 'draft' && (
                  <div className="q-actions">
                    <button className="tool-btn" onClick={() => editQuestion(q)}>重新圈画/编辑</button>
                    <button className="tool-btn danger" onClick={() => removeQuestion(q.id)}>删除</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="stack">
          <div className="canvas-toolbar">
            <button className="tool-btn" onClick={() => setQSlice((i) => Math.max(0, i - 1))} disabled={draft.status !== 'draft'}>‹ 上层</button>
            <input className="slice-slider" type="range" min={0} max={series.sliceCount - 1} value={qSlice}
              disabled={draft.status !== 'draft'}
              onChange={(e) => { setQSlice(Number(e.target.value)); setCurrentLasso(null); setDrawing(false) }} />
            <button className="tool-btn" onClick={() => setQSlice((i) => Math.min(series.sliceCount - 1, i + 1))} disabled={draft.status !== 'draft'}>下层 ›</button>
            <div className="slice-meta">第 <b>{qSlice + 1}</b> / {series.sliceCount} 层</div>
          </div>

          <SliceCanvas
            slice={slice}
            structureMap={structureMap}
            visibleLayers={visible}
            mode={draft.status === 'draft' ? 'lasso' : 'browse'}
            selectedId={null}
            onLassoComplete={handleLasso}
            committedPolygons={committed}
            height={520}
          />

          {draft.status === 'draft' && (
            <div className="panel">
              <div className="panel-title">套索命题参数{editQ ? '（编辑原题）' : '（新题）'}</div>
              <div className="form-grid">
                <div className="form-field full">
                  <label>题干</label>
                  <input value={prompt} onChange={(e) => setPrompt(e.target.value)}
                    placeholder="例：圈出该层面的左侧大脑中动脉主干" />
                </div>
                <div className="form-field">
                  <label>目标所属图层</label>
                  <select value={requiredLayer} onChange={(e) => setRequiredLayer(e.target.value)}>
                    {LAYERS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>分值</label>
                  <input type="number" min={1} max={100} value={maxScore}
                    onChange={(e) => setMaxScore(e.target.value)} />
                </div>
                <div className="form-field full">
                  <label>允许偏差半径（世界单位，越大越宽松）</label>
                  <input type="range" min={6} max={48} step={2} value={tolerance}
                    onChange={(e) => setTolerance(Number(e.target.value))} />
                  <div className="q-meta"><span>±{tolerance} 单位</span>
                    <span className={tolerance <= 14 ? 'tag red' : tolerance <= 28 ? 'tag yellow' : 'tag green'}>
                      {tolerance <= 14 ? '严格' : tolerance <= 28 ? '标准' : '宽松'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="q-actions" style={{ marginTop: 12 }}>
                <button className="tool-btn primary" disabled={!currentLasso} onClick={confirmQuestion}>
                  {editQ ? '保存修改入卷' : '确认圈画并加入试卷'}
                </button>
                <button className="tool-btn danger" disabled={!currentLasso}
                  onClick={() => { setCurrentLasso(null); setDrawing(false); setEditQ(null) }}>
                  清除当前圈画
                </button>
                {!currentLasso && <span className="tag yellow">在画布上按住鼠标套索圈出目标结构</span>}
                {currentLasso && <span className="tag green">圈画完成（{currentLasso.length} 个轨迹点），确认后入卷</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
