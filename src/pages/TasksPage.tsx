import { useMemo, useState } from 'react'
import { CAN, fmtTime, useStore } from '../store'
import type { CheckTask, TaskStatus } from '../types'
import { Chip, Empty, Modal, Panel } from '../components/ui'
import Viewport from '../components/Viewport'
import { PENETRATION_LIMIT, runCheck } from '../engine/evaluate'

const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: '待校核',
  rejected: '已退回',
  released: '已放行',
}
const STATUS_TONE: Record<TaskStatus, 'warn' | 'bad' | 'ok'> = {
  pending: 'warn',
  rejected: 'bad',
  released: 'ok',
}

export default function TasksPage() {
  const tasks = useStore((s) => s.tasks)
  const accessories = useStore((s) => s.accessories)
  const model = useStore((s) => s.model)
  const role = useStore((s) => s.role)
  const activeTaskId = useStore((s) => s.activeTaskId)
  const openTask = useStore((s) => s.openTask)
  const closeTask = useStore((s) => s.closeTask)
  const go = useStore((s) => s.go)
  const toast = useStore((s) => s.toast)

  const [filter, setFilter] = useState<'all' | TaskStatus>('all')

  const shown = tasks.filter((t) => filter === 'all' || t.status === filter)
  const active = tasks.find((t) => t.id === activeTaskId) ?? null
  const pending = tasks.filter((t) => t.status === 'pending')

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>校核任务</h2>
          <p>
            品控逐项查看角度余量与干涉记录：退回须填写具体修改意见，通过后锁定模型版本并生成放行报告。
            所有状态变动记录操作人与时间。
          </p>
        </div>
        <div className="right">
          <div className="seg">
            {(['all', 'pending', 'rejected', 'released'] as const).map((f) => (
              <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
                {f === 'all' ? `全部 ${tasks.length}` : `${STATUS_LABEL[f]} ${tasks.filter((t) => t.status === f).length}`}
              </button>
            ))}
          </div>
          <button onClick={() => go('bench')}>＋ 新建校核</button>
        </div>
      </div>

      {role !== 'qc' && pending.length > 0 && (
        <div className="banner info" style={{ marginBottom: 14 }}>
          <span>ℹ</span>
          <div>
            当前身份为{role === 'engineer' ? '结构工程师' : '原型师'}，可查看全部校核单；
            审核与放行操作需切换到「品控主管」身份。
          </div>
        </div>
      )}

      <Panel title="校核队列" hint={`按提交时间倒序 · ${shown.length} 单`} flush>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 74 }}>编号</th>
              <th>标题 / 姿势</th>
              <th>模型版本</th>
              <th>配件方案</th>
              <th className="num">角度余量</th>
              <th className="num">干涉</th>
              <th className="num">穿透</th>
              <th>状态</th>
              <th>提交</th>
              <th style={{ width: 84 }} />
            </tr>
          </thead>
          <tbody>
            {shown.map((t) => {
              const minMargin = Math.min(...t.margins.map((m) => m.margin))
              const severe = t.interferences.filter((i) => i.severity === 'severe').length
              const ifaceBad = t.interfaces.filter((i) => !i.ok).length
              return (
                <tr key={t.id} className="selectable" onClick={() => openTask(t.id)}>
                  <td className="mono tiny">{t.code}</td>
                  <td>
                    <div style={{ fontWeight: 550 }}>{t.title}</div>
                    <div className="tiny muted">{t.poseName} · 第 {t.round} 轮</div>
                  </td>
                  <td className="tiny">
                    <span className="mono">{t.modelVersion}</span>
                    {t.invalidated && (
                      <div style={{ color: 'var(--warn)', marginTop: 2 }}>结果已失效</div>
                    )}
                  </td>
                  <td className="tiny">
                    {t.accessories.length
                      ? t.accessories.map((a) => `${a.name}`).join(' / ')
                      : <span className="muted">无</span>}
                    {ifaceBad > 0 && (
                      <div style={{ color: 'var(--bad)' }}>{ifaceBad} 项接口不符</div>
                    )}
                  </td>
                  <td className="num">
                    <span
                      className="mono"
                      style={{ color: minMargin < 8 ? 'var(--warn)' : undefined }}
                    >
                      {minMargin.toFixed(0)}°
                    </span>
                  </td>
                  <td className="num mono">{t.interferences.length}</td>
                  <td className="num mono">
                    <span style={{ color: severe ? 'var(--bad)' : t.interferences.length ? 'var(--warn)' : undefined }}>
                      {t.interferences.length
                        ? Math.max(...t.interferences.map((i) => i.depth)).toFixed(2)
                        : '0.00'}
                    </span>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                      <Chip tone={STATUS_TONE[t.status]} dot>
                        {STATUS_LABEL[t.status]}
                      </Chip>
                      {t.invalidated && <Chip tone="warn">失效</Chip>}
                    </div>
                  </td>
                  <td className="tiny">
                    <div>{t.submittedBy}</div>
                    <div className="muted mono">{fmtTime(t.submittedAt).slice(5)}</div>
                  </td>
                  <td>
                    <button
                      className="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        openTask(t.id)
                      }}
                    >
                      {t.status === 'pending' && role === 'qc' ? '审核' : '查看'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!shown.length && <Empty>该状态下暂无校核单</Empty>}
      </Panel>

      {active && (
        <ReviewModal
          task={active}
          accessories={accessories}
          model={model}
          role={role}
          onClose={closeTask}
          onToast={toast}
        />
      )}
    </div>
  )
}

function ReviewModal({
  task,
  accessories,
  model,
  role,
  onClose,
  onToast,
}: {
  task: CheckTask
  accessories: ReturnType<typeof useStore.getState>['accessories']
  model: ReturnType<typeof useStore.getState>['model']
  role: ReturnType<typeof useStore.getState>['role']
  onClose: () => void
  onToast: ReturnType<typeof useStore.getState>['toast']
}) {
  const approve = useStore((s) => s.approveTask)
  const reject = useStore((s) => s.rejectTask)
  const recheck = useStore((s) => s.recheckTask)
  const [note, setNote] = useState('')
  const [tab, setTab] = useState<'margins' | 'clash' | 'iface' | 'history'>('margins')

  const severe = task.interferences.filter((i) => i.severity === 'severe')
  const lowMargin = task.margins.filter((m) => m.status !== 'ok')
  const ifaceBad = task.interfaces.filter((i) => !i.ok)
  const minMargin = Math.min(...task.margins.map((m) => m.margin))
  const isQc = CAN.review(role)
  const canReview = isQc && task.status === 'pending' && !task.invalidated

  const poseNow = useMemo(() => {
    // the card froze angles against the calibration table captured with it
    const p: Record<string, number[]> = {}
    for (const [k, v] of Object.entries(task.pose)) p[k] = v
    return p
  }, [task])

  // re-score the frozen card against today's model + accessories to spot drift
  const drift = useMemo(() => {
    const now = runCheck(model, accessories, task.pose, task.assembly)
    const shownSevere = task.interferences.filter((i) => i.severity === 'severe').length
    const driftKey = (r: typeof now.result) =>
      `${r.severe.length}|${r.interfaceFails.length}|${r.margins.filter((m) => m.status === 'over').length}`
    return {
      result: now.result,
      changed: driftKey(now.result) !== `${shownSevere}|${task.interfaces.filter((i) => !i.ok).length}|${task.margins.filter((m) => m.status === 'over').length}`,
    }
  }, [model, accessories, task])
  const driftChanged = drift.changed

  const lastReject = [...task.events].reverse().find((e) => e.action === '退回')

  return (
    <div className="modal-wrap" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal wide" style={{ width: 1080, maxHeight: '92vh' }}>
        <div className="modal-head">
          <div>
            <div className="row" style={{ gap: 8 }}>
              <span className="mono tiny muted">{task.code}</span>
              <Chip tone={STATUS_TONE[task.status]} dot>
                {STATUS_LABEL[task.status]}
              </Chip>
              {task.locked && <Chip tone="ok">已锁定 {task.locked.version}</Chip>}
              {task.invalidated && <Chip tone="warn">结果已失效</Chip>}
            </div>
            <h3 style={{ marginTop: 4 }}>{task.title}</h3>
          </div>
          <div className="spacer" />
          <button className="ghost small" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ padding: 0 }}>
          <div className="grid" style={{ gridTemplateColumns: '360px minmax(0,1fr)', gap: 0 }}>
            <div style={{ borderRight: '1px solid var(--line)' }}>
              <div style={{ height: 300, position: 'relative' }}>
                <Viewport
                  model={model}
                  accessories={accessories}
                  pose={poseNow}
                  assembly={task.assembly}
                  selectedJoint={null}
                  onSelectJoint={() => {}}
                  showLabels={false}
                  showCollision
                  compact
                />
              </div>
              <div style={{ padding: 14 }}>
                <dl className="kv" style={{ gridTemplateColumns: '72px 1fr', fontSize: 11.5 }}>
                  <dt>模型</dt>
                  <dd className="mono">{task.modelCode} {task.modelVersion}</dd>
                  <dt>姿势</dt>
                  <dd>{task.poseName}</dd>
                  <dt>配件</dt>
                  <dd className="tiny">
                    {task.accessories.map((a) => `${a.name} ${a.revision}`).join(' / ') || '无'}
                  </dd>
                  <dt>提交</dt>
                  <dd className="tiny">
                    {task.submittedBy} · {fmtTime(task.submittedAt)}
                  </dd>
                  <dt>轮次</dt>
                  <dd>第 {task.round} 轮</dd>
                  <dt>最小间隙</dt>
                  <dd className="mono" style={{ color: task.minClearance < 0 ? 'var(--bad)' : 'var(--ok)' }}>
                    {task.minClearance.toFixed(2)} mm
                  </dd>
                </dl>
                <div className="banner" style={{ marginTop: 10, fontSize: 11.5 }}>
                  <span>✎</span>
                  <div>{task.summary}</div>
                </div>
                {lastReject && (
                  <div className="banner bad" style={{ marginTop: 8, fontSize: 11.5 }}>
                    <span>↩</span>
                    <div>
                      <b>退回意见 · {lastReject.actor}</b>
                      <div style={{ marginTop: 3, whiteSpace: 'pre-wrap' }}>{lastReject.note}</div>
                      <div className="tiny" style={{ marginTop: 3, opacity: 0.75 }}>
                        {fmtTime(lastReject.at)}
                      </div>
                    </div>
                  </div>
                )}
                {task.invalidated && (
                  <div className="banner bad" style={{ marginTop: 8, fontSize: 11.5 }}>
                    <span>⚠</span>
                    <div>
                      <b>校核结果已失效</b>
                      <div style={{ marginTop: 2 }}>{task.invalidated.reason}</div>
                      <div className="tiny" style={{ marginTop: 2, opacity: 0.8 }}>
                        {fmtTime(task.invalidated.at)} · 下面的余量与干涉数据来自失效前的配件版本，
                        仅供追溯，不再作为放行依据
                      </div>
                    </div>
                  </div>
                )}
                {driftChanged && !task.invalidated && (
                  <div className="banner warn" style={{ marginTop: 8, fontSize: 11.5 }}>
                    <span>⚠</span>
                    <div>按当前模型与配件重算结果与提交时不一致，建议退回重新校核。</div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div className="row" style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', gap: 6 }}>
                {(
                  [
                    ['margins', `角度余量 ${lowMargin.length ? `(${lowMargin.length} 项偏低)` : ''}`],
                    ['clash', `干涉记录 ${task.interferences.length}`],
                    ['iface', `配件接口 ${ifaceBad.length ? `(${ifaceBad.length} 不符)` : ''}`],
                    ['history', `流转记录 ${task.events.length}`],
                  ] as const
                ).map(([k, label]) => (
                  <button key={k} className={`small ${tab === k ? 'primary' : 'ghost'}`} onClick={() => setTab(k)}>
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ overflow: 'auto', maxHeight: 480 }}>
                {tab === 'margins' && (
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>关节</th>
                        <th>轴</th>
                        <th className="num">当前</th>
                        <th className="num">下限</th>
                        <th className="num">上限</th>
                        <th className="num">余量</th>
                        <th>判定</th>
                      </tr>
                    </thead>
                    <tbody>
                      {task.margins.map((m, i) => (
                        <tr key={i}>
                          <td>
                            <span className="mono tiny muted">{m.code}</span> {m.jointName}
                          </td>
                          <td className="tiny">{m.dofLabel}</td>
                          <td className="num mono">{m.current.toFixed(1)}°</td>
                          <td className="num mono muted">{m.min}°</td>
                          <td className="num mono muted">{m.max}°</td>
                          <td className="num mono" style={{ color: m.margin < 8 ? (m.margin < 0 ? 'var(--bad)' : 'var(--warn)') : undefined }}>
                            {m.margin.toFixed(1)}°
                          </td>
                          <td>
                            <Chip tone={m.status === 'ok' ? 'ok' : m.status === 'warn' ? 'warn' : 'bad'}>
                              {m.status === 'ok' ? '充裕' : m.status === 'warn' ? '偏低' : '超限'}
                            </Chip>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {tab === 'clash' && (
                  <div>
                    <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)', fontSize: 11.5 }} className="dim">
                      判据：任意两个相邻分件穿透深度 &gt; {PENETRATION_LIMIT} mm 即判不合格。
                    </div>
                    {task.interferences.length === 0 && <Empty>无穿插记录</Empty>}
                    {task.interferences.map((r) => (
                      <div key={r.id} style={{ padding: '10px 12px', borderBottom: '1px solid #1a212c' }}>
                        <div className="row">
                          <span style={{ fontWeight: 550 }}>
                            {r.partA} <span className="muted">⇄</span> {r.partB}
                          </span>
                          <div className="spacer" />
                          <Chip tone={r.severity === 'severe' ? 'bad' : 'warn'}>
                            {r.severity === 'severe' ? '超阈值' : '阈值内'}
                          </Chip>
                          <span className="mono" style={{ color: r.severity === 'severe' ? 'var(--bad)' : 'var(--warn)' }}>
                            {r.depth.toFixed(2)} mm
                          </span>
                        </div>
                        <div className="tiny muted" style={{ marginTop: 2 }}>
                          {r.groupA} × {r.groupB} · {r.source === 'accessory' ? '配件相关' : '本体分件'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {tab === 'iface' && (
                  <div>
                    {task.interfaces.length === 0 && <Empty>本单未装配配件</Empty>}
                    {task.interfaces.map((f, i) => (
                      <div key={i} style={{ padding: '10px 12px', borderBottom: '1px solid #1a212c' }}>
                        <div className="row">
                          <span style={{ fontWeight: 550 }}>
                            {f.name} <span className="mono tiny muted">{f.revision}</span>
                          </span>
                          <div className="spacer" />
                          <Chip tone={f.ok ? 'ok' : 'bad'}>{f.ok ? '匹配' : '不匹配'}</Chip>
                        </div>
                        <div className="tiny muted" style={{ marginBottom: 4 }}>插入目标：{f.target}</div>
                        <table className="tbl" style={{ fontSize: 11 }}>
                          <tbody>
                            {f.rows.map((r, k) => (
                              <tr key={k}>
                                <td style={{ width: 70 }} className="muted">{r.label}</td>
                                <td className="mono tiny">{r.actual}</td>
                                <td className="mono tiny muted">{r.required}</td>
                                <td style={{ width: 40 }} className="num">
                                  {r.ok ? <span style={{ color: 'var(--ok)' }}>✓</span> : <span style={{ color: 'var(--bad)' }}>✕</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}

                {tab === 'history' && (
                  <div>
                    {task.events.map((e, i) => (
                      <div key={i} className="logline">
                        <div className="ico" style={{ color: 'var(--fg-3)' }}>·</div>
                        <div>
                          <div className="t">
                            {e.action} <span className="dim">{e.actor}</span>
                          </div>
                          <div className="m">{fmtTime(e.at)}</div>
                          {e.note && (
                            <div className="tiny dim" style={{ marginTop: 3, whiteSpace: 'pre-wrap' }}>
                              {e.note}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {canReview && (
          <div style={{ padding: '0 18px 14px' }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>审核意见 {note.trim().length < 6 && <span className="muted">（退回必填，通过可留空）</span>}</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="例如：膝部 94° 时大腿与小腿接触 0.41mm，请把膝部上限收到 92°，或加厚小腿内衬 0.5mm 后重新提交。"
                style={{ minHeight: 62 }}
              />
            </div>
            {(severe.length > 0 || ifaceBad.length > 0) && (
              <div className="banner bad" style={{ marginTop: 8, fontSize: 11.5 }}>
                <span>⛔</span>
                <div>
                  本单存在阻塞项：
                  {severe.length > 0 && <span>{severe.length} 处穿透超阈值；</span>}
                  {ifaceBad.length > 0 && <span>{ifaceBad.length} 项接口不匹配。</span>}
                  建议退回。
                </div>
              </div>
            )}
            {minMargin < 8 && (
              <div className="banner warn" style={{ marginTop: 8, fontSize: 11.5 }}>
                <span>⚠</span>
                <div>最小角度余量 {minMargin.toFixed(1)}°，低于 8° 建议值，请确认模具公差后放行。</div>
              </div>
            )}
          </div>
        )}
        <div className="modal-foot" style={{ alignItems: 'flex-end', gap: 10 }}>
          {task.locked && (
            <div className="tiny muted" style={{ marginRight: 'auto' }}>
              已锁定 {task.locked.version} · {fmtTime(task.locked.at)} · {task.locked.by}
            </div>
          )}
          {task.status === 'released' && (
            <div className="tiny" style={{ marginRight: 'auto', color: 'var(--ok)' }}>
              ✓ 本单已放行，结果已归档至放行报告
            </div>
          )}
          {!isQc && (
            <div className="tiny muted" style={{ marginRight: 'auto' }}>
              审核操作需切换为品控主管身份
            </div>
          )}
          {(task.status === 'rejected' || task.invalidated) && CAN.submit(role) && (
            <button
              onClick={() => {
                recheck(task.id)
                onClose()
              }}
            >
              ↻ 按当前方案重新校核
            </button>
          )}
          <button className="ghost" onClick={onClose}>关闭</button>
          {canReview && (
            <>
              <button
                className="danger"
                onClick={() => {
                  if (note.trim().length < 6) {
                    onToast({ tone: 'warn', title: '请填写具体修改意见', detail: '退回意见需说明修改项与建议值' })
                    return
                  }
                  reject(task.id, note.trim())
                  onClose()
                }}
              >
                退回
              </button>
              <button
                className="primary"
                disabled={severe.length > 0 || ifaceBad.length > 0 || !!task.invalidated}
                title={
                  task.invalidated
                    ? '校核结果已失效，需重新校核后才能放行'
                    : severe.length > 0 || ifaceBad.length > 0
                      ? '存在阻塞项，只能退回'
                      : '审核通过并锁定版本、生成放行报告'
                }
                onClick={() => {
                  approve(task.id, note.trim())
                  onClose()
                }}
              >
                通过并锁定版本
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
