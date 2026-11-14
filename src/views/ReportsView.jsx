import { useMemo, useState } from 'react'
import TaskStatusPill from '../components/TaskStatusPill.jsx'
import { useStore, GROUPS, userName } from '../lib/store.jsx'
import { layerMeta } from '../lib/data.js'

function downloadCsv(filename, rows) {
  const escape = (v) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = '﻿' + rows.map((r) => r.map(escape).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsView() {
  const { state } = useStore()
  const [taskId, setTaskId] = useState(state.tasks[0]?.id || '')
  const task = state.tasks.find((t) => t.id === taskId)
  const subs = state.submissions.filter((s) => s.taskId === taskId)

  // 按结构（题目）统计错误率
  const structureStats = useMemo(() => {
    if (!task) return []
    return task.questions.map((q, i) => {
      let scoreSum = 0, missCount = 0, answered = 0
      for (const s of subs) {
        const a = s.answers[q.id]
        if (!a) { missCount++; continue }
        answered++
        const score = a.finalScore ?? a.auto?.autoScore ?? 0
        scoreSum += score
        if (score / q.maxScore < 0.6) missCount++
      }
      const n = subs.length || 1
      return {
        no: i + 1,
        q,
        avgScore: answered ? (scoreSum / answered).toFixed(1) : '—',
        errorRate: missCount / n,
        missCount,
        total: subs.length
      }
    }).sort((a, b) => b.errorRate - a.errorRate)
  }, [task, subs])

  const exportGrades = () => {
    const rows = [['学员姓名', '学员组', '任务名称', '自动评分', '最终成绩', '复核状态', '提交时间']]
    for (const s of subs) {
      rows.push([
        userName(s.studentId),
        GROUPS.find((g) => g.members.includes(s.studentId))?.id || '',
        task.title,
        s.totalAuto,
        s.totalFinal ?? s.totalAuto,
        s.status === 'reviewed' ? '已复核' : '待复核',
        s.submittedAt
      ])
    }
    downloadCsv(`成绩单_${task.title}_${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  const exportWrongList = () => {
    const rows = [['题号', '层号', '所属图层', '题干', '分值', '平均分', '错误人数', '错误率', '未答人数']]
    for (const st of structureStats) {
      const noAnswer = subs.filter((s) => !s.answers[st.q.id]?.auto).length
      rows.push([
        st.no, `第 ${st.q.slice + 1} 层`, layerMeta(st.q.layer).name, st.q.prompt,
        st.q.maxScore, st.avgScore, st.missCount,
        (st.errorRate * 100).toFixed(1) + '%', noAnswer
      ])
    }
    downloadCsv(`错题清单_${task.title}_${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  const totalMax = task?.questions.reduce((s, q) => s + q.maxScore, 0) || 0
  const avgScore = subs.length
    ? (subs.reduce((s, x) => s + (x.totalFinal ?? x.totalAuto), 0) / subs.length).toFixed(1)
    : '—'

  return (
    <div>
      <div className="section-title">成绩分析与教学归档</div>

      <div className="canvas-toolbar">
        <label className="q-meta">选择任务：
          <select value={taskId} onChange={(e) => setTaskId(e.target.value)}>
            {state.tasks.length === 0 && <option value="">暂无任务</option>}
            {state.tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </label>
        {task && <TaskStatusPill status={task.status} />}
        {subs.length > 0 && (
          <div className="q-actions" style={{ marginLeft: 'auto' }}>
            <button className="tool-btn primary" onClick={exportGrades}>⬇ 导出成绩表格（CSV）</button>
            <button className="tool-btn" onClick={exportWrongList}>⬇ 导出错题清单（CSV）</button>
          </div>
        )}
      </div>

      {!task && <div className="empty-state"><div className="icon">📊</div><div>暂无任务数据，请先由教师组卷发布</div></div>}

      {task && (
        <>
          <div className="stat-grid">
            <div className="stat-card accent"><div className="num">{subs.length}</div><div className="lbl">已交卷人数</div></div>
            <div className="stat-card green"><div className="num">{avgScore}</div><div className="lbl">平均成绩（满分 {totalMax}）</div></div>
            <div className="stat-card yellow">
              <div className="num">{subs.filter((s) => (s.totalFinal ?? s.totalAuto) / totalMax < 0.6).length}</div>
              <div className="lbl">不及格人数（&lt;60%）</div>
            </div>
            <div className="stat-card purple">
              <div className="num">{subs.filter((s) => s.status === 'reviewed').length}/{subs.length}</div>
              <div className="lbl">完成复核</div>
            </div>
          </div>

          <div className="section-title">成绩单</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>学员</th><th>学员组</th><th>自动评分</th><th>最终成绩</th><th>得分率</th><th>复核状态</th><th>提交时间</th></tr>
              </thead>
              <tbody>
                {subs.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)' }}>暂无答卷</td></tr>}
                {subs.map((s) => {
                  const score = s.totalFinal ?? s.totalAuto
                  const rate = totalMax ? score / totalMax : 0
                  return (
                    <tr key={s.id}>
                      <td><b>{userName(s.studentId)}</b></td>
                      <td>{GROUPS.find((g) => g.members.includes(s.studentId))?.id} 组</td>
                      <td>{s.totalAuto}</td>
                      <td><b style={{ color: rate >= 0.6 ? 'var(--green)' : 'var(--red)' }}>{score}</b></td>
                      <td style={{ minWidth: 130 }}>
                        {(rate * 100).toFixed(1)}%
                        <div className={`bar ${rate < 0.6 ? 'red' : ''}`}><i style={{ width: `${rate * 100}%` }} /></div>
                      </td>
                      <td>{s.status === 'reviewed'
                        ? <span className="tag green">已复核</span>
                        : <span className="tag yellow">待复核</span>}</td>
                      <td>{s.submittedAt}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="section-title">错题汇总 · 按结构错误率排名</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>排名</th><th>结构/题干</th><th>图层</th><th>层号</th><th>平均分</th><th>错误人数</th><th>错误率</th></tr>
              </thead>
              <tbody>
                {structureStats.map((st, i) => (
                  <tr key={st.q.id}>
                    <td><b>#{i + 1}</b></td>
                    <td className="wrap">{st.q.prompt}</td>
                    <td>
                      <span className="tag" style={{ color: '#' + layerMeta(st.q.layer).color.toString(16).padStart(6, '0') }}>
                        {layerMeta(st.q.layer).name}
                      </span>
                    </td>
                    <td>第 {st.q.slice + 1} 层</td>
                    <td>{st.avgScore} / {st.q.maxScore}</td>
                    <td>{st.missCount} / {st.total || 0}</td>
                    <td style={{ minWidth: 150 }}>
                      <b style={{ color: st.errorRate >= 0.5 ? 'var(--red)' : st.errorRate >= 0.25 ? 'var(--yellow)' : 'var(--green)' }}>
                        {(st.errorRate * 100).toFixed(1)}%
                      </b>
                      <div className={`bar ${st.errorRate >= 0.5 ? 'red' : ''}`}>
                        <i style={{ width: `${st.errorRate * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
                {subs.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)' }}>交卷后生成统计</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="section-title">任务流转记录（操作人与时间留痕）</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>时间</th><th>操作人</th><th>流转/动作</th><th>备注</th></tr></thead>
              <tbody>
                {(task.audit || []).length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)' }}>无流转记录</td></tr>}
                {(task.audit || []).map((a, i) => (
                  <tr key={i}>
                    <td>{a.at}</td>
                    <td>{userName(a.by)}</td>
                    <td><TaskStatusPill status={a.to} /></td>
                    <td className="wrap">{a.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel" style={{ marginTop: 14 }}>
            <div className="q-meta" style={{ color: 'var(--muted)' }}>
              导出的成绩表格与错题清单为 UTF-8 CSV，可直接用 Excel/WPS 打开，供教学秘书归档至教学管理系统。
            </div>
          </div>
        </>
      )}
    </div>
  )
}
