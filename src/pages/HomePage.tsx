import { useMemo } from 'react'
import { CAN, denyHint, fmtTime, useStore } from '../store'
import type { TaskStatus } from '../types'
import { Chip, Panel, Stat } from '../components/ui'

const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: '待校核',
  rejected: '已退回',
  released: '已放行',
}

export default function HomePage() {
  const tasks = useStore((s) => s.tasks)
  const reports = useStore((s) => s.reports)
  const model = useStore((s) => s.model)
  const accessories = useStore((s) => s.accessories)
  const logs = useStore((s) => s.logs)
  const openTask = useStore((s) => s.openTask)
  const openReport = useStore((s) => s.openReport)
  const go = useStore((s) => s.go)
  const role = useStore((s) => s.role)
  const toast = useStore((s) => s.toast)
  const reviseAccessory = useStore((s) => s.reviseAccessory)
  const canRevise = CAN.reviseAccessory(role)

  const counts = useMemo(() => {
    const c = { pending: 0, rejected: 0, released: 0 }
    for (const t of tasks) c[t.status]++
    return c
  }, [tasks])

  const releaseRate = tasks.length ? (counts.released / tasks.length) * 100 : 0
  const invalidReports = reports.filter((r) => r.invalidatedAt)
  const invalidTasks = tasks.filter((t) => t.invalidated && t.status !== 'released')

  const weekBars = useMemo(() => {
    const days: { label: string; pending: number; released: number; rejected: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const same = tasks.filter((t) => t.submittedAt.slice(0, 10) === key)
      days.push({
        label: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()],
        pending: same.filter((t) => t.status === 'pending').length,
        released: same.filter((t) => t.status === 'released').length,
        rejected: same.filter((t) => t.status === 'rejected').length,
      })
    }
    return days
  }, [tasks])

  const maxBar = Math.max(1, ...weekBars.map((d) => d.pending + d.released + d.rejected))

  const calibrationDone = model.joints.filter((j) => j.calibrated).length
  const pendingQueue = tasks.filter((t) => t.status === 'pending')

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>校核总览</h2>
          <p>
            {model.code} {model.name} · {model.version} 的关节可动性与配件干涉校核整体状态。
            数据随校核单流转实时更新。
          </p>
        </div>
        <div className="right">
          <button onClick={() => go('bench')}>＋ 新姿势测试</button>
          <button className="primary" onClick={() => go('tasks')}>进入校核队列 →</button>
        </div>
      </div>

      <div className="grid cols-4">
        <Stat
          label={<><span style={{ color: 'var(--warn)' }}>◷</span> 待校核</>}
          value={counts.pending}
          foot={`${pendingQueue.filter((t) => t.round > 1).length} 单为复检轮次`}
          tone="warn"
        />
        <Stat
          label={<><span style={{ color: 'var(--bad)' }}>↩</span> 已退回</>}
          value={counts.rejected}
          foot="需结构/原型侧修改后重新提交"
          tone="bad"
        />
        <Stat
          label={<><span style={{ color: 'var(--ok)' }}>✓</span> 已放行</>}
          value={counts.released}
          foot={`${reports.filter((r) => !r.invalidatedAt).length} 份报告有效`}
          tone="ok"
        />
        <Stat
          label="放行率"
          value={`${releaseRate.toFixed(0)}%`}
          pct={releaseRate}
          foot={`${counts.released} / ${tasks.length} 单已放行`}
          tone={releaseRate >= 60 ? 'ok' : releaseRate >= 30 ? 'warn' : 'bad'}
        />
      </div>

      <div
        className="grid"
        style={{ gridTemplateColumns: 'minmax(0,1fr) 380px', marginTop: 14, alignItems: 'start' }}
      >
        <Panel
          title="待办队列"
          hint="品控需逐项确认角度余量与干涉记录"
          right={<button className="small ghost" onClick={() => go('tasks')}>全部任务 →</button>}
          flush
        >
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 74 }}>编号</th>
                <th>标题</th>
                <th className="num" style={{ width: 64 }}>干涉</th>
                <th className="num" style={{ width: 82 }}>最小余量</th>
                <th style={{ width: 76 }}>提交人</th>
                <th style={{ width: 92 }}>状态</th>
              </tr>
            </thead>
            <tbody>
              {pendingQueue.slice(0, 5).map((t) => {
                const minMargin = Math.min(...t.margins.map((m) => m.margin))
                return (
                  <tr key={t.id} className="selectable" onClick={() => openTask(t.id)}>
                    <td className="mono tiny">{t.code}</td>
                    <td>{t.title}</td>
                    <td className="num mono">{t.interferences.length}</td>
                    <td className="num mono" style={{ color: minMargin < 8 ? 'var(--warn)' : undefined }}>
                      {minMargin.toFixed(0)}°
                    </td>
                    <td className="tiny">{t.submittedBy}</td>
                    <td>
                      <Chip tone="warn" dot>待校核</Chip>
                    </td>
                  </tr>
                )
              })}
              {!pendingQueue.length && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty" style={{ padding: 24 }}>暂无待校核单</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Panel>

        <div className="col" style={{ gap: 14 }}>
          <Panel title="本周流转" hint="按提交日统计">
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 104 }}>
              {weekBars.map((d, i) => {
                const tot = d.pending + d.released + d.rejected
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <div style={{ display: 'flex', flexDirection: 'column-reverse', width: '100%', gap: 2, height: 76, justifyContent: 'flex-start' }}>
                      {tot === 0 ? (
                        <div style={{ height: 2, background: '#1e2632', borderRadius: 1 }} />
                      ) : (
                        <>
                          {d.pending > 0 && <div style={{ height: (d.pending / maxBar) * 74, background: 'var(--warn)', borderRadius: 2, minHeight: 3 }} />}
                          {d.released > 0 && <div style={{ height: (d.released / maxBar) * 74, background: 'var(--ok)', borderRadius: 2, minHeight: 3 }} />}
                          {d.rejected > 0 && <div style={{ height: (d.rejected / maxBar) * 74, background: 'var(--bad)', borderRadius: 2, minHeight: 3 }} />}
                        </>
                      )}
                    </div>
                    <span className="tiny muted">{d.label}</span>
                  </div>
                )
              })}
            </div>
            <div className="row tiny muted" style={{ gap: 12, marginTop: 10, justifyContent: 'center' }}>
              <span><i style={{ display: 'inline-block', width: 7, height: 7, background: 'var(--warn)', borderRadius: 2, marginRight: 4 }} />待校核</span>
              <span><i style={{ display: 'inline-block', width: 7, height: 7, background: 'var(--ok)', borderRadius: 2, marginRight: 4 }} />已放行</span>
              <span><i style={{ display: 'inline-block', width: 7, height: 7, background: 'var(--bad)', borderRadius: 2, marginRight: 4 }} />已退回</span>
            </div>
          </Panel>

          <Panel title="模型与配置" hint={model.source}>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 12 }}>
              <span className="muted">关节标定</span>
              <span className="mono">
                {calibrationDone}/{model.joints.length}
              </span>
            </div>
            <div className="meter" style={{ marginTop: 5, marginBottom: 10 }}>
              <i style={{ width: `${(calibrationDone / model.joints.length) * 100}%`, background: calibrationDone === model.joints.length ? 'var(--ok)' : 'var(--accent)' }} />
            </div>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 12 }}>
              <span className="muted">分件 / 配件</span>
              <span className="mono">
                {model.parts.length} / {accessories.length}
              </span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 12, marginTop: 8 }}>
              <span className="muted">失效结果</span>
              <Chip tone={invalidTasks.length + invalidReports.length ? 'warn' : 'ok'}>
                {invalidTasks.length} 单 / {invalidReports.length} 报告
              </Chip>
            </div>
            <button className="small" style={{ width: '100%', marginTop: 12 }} onClick={() => go('model')}>
              查看关节配置 →
            </button>
          </Panel>
        </div>
      </div>

      <div
        className="grid"
        style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', marginTop: 14, alignItems: 'start' }}
      >
        <Panel title="最新放行报告" right={<button className="ghost small" onClick={() => go('reports')}>全部 →</button>} flush>
          {reports.slice(0, 4).map((r) => (
            <div
              key={r.id}
              className="row"
              style={{ padding: '10px 14px', borderBottom: '1px solid #1a212c', cursor: 'pointer' }}
              onClick={() => (r.invalidatedAt ? openReport(r.id) : openReport(r.id))}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12 }}>
                  <span className="mono tiny muted">{r.code}</span> {r.title}
                </div>
                <div className="tiny muted">
                  {r.modelCode} {r.modelVersion} · {r.releasedBy} · {fmtTime(r.releasedAt)}
                </div>
              </div>
              {r.invalidatedAt ? <Chip tone="warn">已失效</Chip> : <Chip tone="ok" dot>放行</Chip>}
            </div>
          ))}
          {!reports.length && <div className="empty">暂无放行报告</div>}
        </Panel>

        <Panel title="最近操作" hint={`${logs.length} 条记录`} flush>
          <div style={{ maxHeight: 268, overflow: 'auto' }}>
            {logs.slice(0, 8).map((l) => (
              <div className="logline" key={l.id}>
                <div className="ico" style={{ color: l.kind === 'invalidate' ? 'var(--warn)' : l.kind === 'release' ? 'var(--ok)' : 'var(--fg-3)' }}>
                  {l.kind === 'invalidate' ? '⚠' : l.kind === 'release' ? '▣' : l.kind === 'review' ? '✓' : '·'}
                </div>
                <div>
                  <div className="t">
                    {l.action} <span className="dim">{l.target}</span>
                  </div>
                  <div className="m">{fmtTime(l.at)} · {l.actor}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr)', marginTop: 14 }}>
        <Panel title="配件风险提示" hint="试制件与过盈配合件，改版会使引用结果失效">
          <div className="row wrap" style={{ gap: 10 }}>
            {accessories
              .filter((a) => a.tags.includes('试制') || a.tags.includes('需修模'))
              .map((a) => (
                <div key={a.id} className="row" style={{ gap: 8, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 7, background: '#121821' }}>
                  <Chip tone="warn">{a.code}</Chip>
                  <span style={{ fontSize: 12 }}>{a.name}</span>
                  <span className="tiny muted mono">
                    ø{a.requires.diameter.toFixed(1)}
                    {a.requires.diameter !== (a.category === '底座' ? 6.0 : 3.0) ? ' ⚠' : ''}
                  </span>
                  <button
                    className="ghost small"
                    disabled={!canRevise}
                    title={!canRevise ? denyHint('配件改版', 'prototyper') : undefined}
                    onClick={() => {
                      reviseAccessory(a.id, { note: `${a.note}（已按校核建议调整）` })
                      toast({ tone: 'warn', title: `${a.name} 已登记改版`, detail: '相关校核结果已失效' })
                    }}
                  >
                    登记改版
                  </button>
                </div>
              ))}
            {!accessories.some((a) => a.tags.includes('试制') || a.tags.includes('需修模')) && (
              <span className="tiny muted">当前无待处理配件。</span>
            )}
          </div>
        </Panel>
      </div>
    </div>
  )
}
