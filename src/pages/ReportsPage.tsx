import { useMemo, useState } from 'react'
import { fmtTime, useStore } from '../store'
import type { ReleaseReport } from '../types'
import { Chip, Empty, Modal, Panel } from '../components/ui'
import Viewport from '../components/Viewport'
import { PENETRATION_LIMIT } from '../engine/evaluate'

export default function ReportsPage() {
  const reports = useStore((s) => s.reports)
  const model = useStore((s) => s.model)
  const accessories = useStore((s) => s.accessories)
  const showReportId = useStore((s) => s.showReportId)
  const openReport = useStore((s) => s.openReport)
  const closeReport = useStore((s) => s.closeReport)
  const go = useStore((s) => s.go)

  const [onlyValid, setOnlyValid] = useState(false)
  const shown = onlyValid ? reports.filter((r) => !r.invalidatedAt) : reports
  const active = reports.find((r) => r.id === showReportId) ?? null
  const valid = reports.filter((r) => !r.invalidatedAt).length

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>放行报告</h2>
          <p>
            品控审核通过后生成的正式放行文件，包含角度余量、干涉记录、配件接口复核与版本锁定信息。
            配件改版会使对应报告自动失效并标注原因。
          </p>
        </div>
        <div className="right">
          <label className="row tiny muted" style={{ gap: 6 }}>
            <input
              type="checkbox"
              checked={onlyValid}
              onChange={(e) => setOnlyValid(e.target.checked)}
              style={{ width: 'auto', accentColor: 'var(--accent)' }}
            />
            仅看有效
          </label>
          <Chip tone={valid === reports.length ? 'ok' : 'warn'} dot>
            {valid} / {reports.length} 有效
          </Chip>
        </div>
      </div>

      <div className="grid cols-3">
        <div className="stat ok">
          <div className="label">有效放行报告</div>
          <div className="value">{valid}</div>
          <div className="foot">可用于量产投产</div>
        </div>
        <div className="stat warn">
          <div className="label">已失效</div>
          <div className="value">{reports.length - valid}</div>
          <div className="foot">配件改版导致，需重新校核</div>
        </div>
        <div className="stat">
          <div className="label">当前锁定版本</div>
          <div className="value" style={{ fontSize: 21 }}>
            {reports.find((r) => !r.invalidatedAt)?.modelVersion ?? model.version}
          </div>
          <div className="foot">{model.code} · {model.scale}</div>
        </div>
      </div>

      <Panel title="报告清单" hint={`${shown.length} 份`} flush>
        {shown.length === 0 && <Empty>暂无放行报告</Empty>}
        {shown.map((r) => (
          <div
            key={r.id}
            className="row"
            style={{ padding: '12px 14px', borderBottom: '1px solid #1a212c', cursor: 'pointer', gap: 14 }}
            onClick={() => openReport(r.id)}
          >
            <div
              style={{
                width: 44,
                height: 56,
                borderRadius: 4,
                background: '#0c1016',
                border: '1px solid var(--line)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                color: r.invalidatedAt ? 'var(--fg-3)' : 'var(--accent)',
                fontSize: 17,
              }}
            >
              ▣
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="row" style={{ gap: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 550 }}>{r.title}</span>
                {r.invalidatedAt ? <Chip tone="warn">已失效</Chip> : <Chip tone="ok" dot>有效</Chip>}
              </div>
              <div className="tiny muted mono" style={{ marginTop: 2 }}>
                {r.code} · {r.modelCode} {r.modelVersion} · {r.fingerprint.slice(0, 30)}…
              </div>
              {r.invalidatedAt && (
                <div className="tiny" style={{ color: 'var(--warn)', marginTop: 2 }}>
                  {r.invalidatedReason} · {fmtTime(r.invalidatedAt)}
                </div>
              )}
            </div>
            <div className="tiny muted" style={{ textAlign: 'right', flexShrink: 0 }}>
              <div>{r.releasedBy} 签发放行</div>
              <div className="mono">{fmtTime(r.releasedAt)}</div>
            </div>
            <div className="row tiny" style={{ gap: 6, flexShrink: 0 }}>
              <span className="muted">余量</span>
              <span className="mono" style={{ color: 'var(--ok)' }}>
                {Math.min(...r.margins.map((m) => m.margin)).toFixed(0)}°
              </span>
              <span className="muted">干涉</span>
              <span className="mono" style={{ color: r.interferences.length ? 'var(--warn)' : 'var(--ok)' }}>
                {r.interferences.length}
              </span>
              <button className="small" onClick={(e) => { e.stopPropagation(); openReport(r.id) }}>
                查看报告
              </button>
            </div>
          </div>
        ))}
      </Panel>

      <div className="banner info" style={{ marginTop: 12 }}>
        <span>ℹ</span>
        <div>
          放行报告一经生成不可编辑。若需变更设计，请从配件库发起改版或在测试台重新提交校核单，
          旧报告将保留并标注失效原因与时间。{accessories.length} 项配件纳入本报告的接口基准。
        </div>
      </div>

      {active && <ReportModal report={active} onClose={closeReport} onGoTasks={() => { closeReport(); go('tasks') }} />}
    </div>
  )
}

function ReportModal({
  report,
  onClose,
  onGoTasks,
}: {
  report: ReleaseReport
  onClose: () => void
  onGoTasks: () => void
}) {
  const model = useStore((s) => s.model)
  const accessories = useStore((s) => s.accessories)
  const tasks = useStore((s) => s.tasks)
  const toast = useStore((s) => s.toast)
  const task = tasks.find((t) => t.code === report.taskCode)

  const minMargin = Math.min(...report.margins.map((m) => m.margin))
  const severe = report.interferences.filter((i) => i.severity === 'severe')
  const groups = useMemo(() => {
    const idx = new Map<string, string[]>()
    for (const m of report.margins) {
      const arr = idx.get(m.jointName) ?? []
      arr.push(`${m.dofLabel} ${m.current.toFixed(0)}° (${m.min}–${m.max}°)`)
      idx.set(m.jointName, arr)
    }
    return [...idx.entries()]
  }, [report])

  const copyFingerprint = async () => {
    try {
      await navigator.clipboard.writeText(report.fingerprint)
      toast({ tone: 'ok', title: '校验码已复制' })
    } catch {
      toast({ tone: 'warn', title: '无法访问剪贴板', detail: '请手动选中复制' })
    }
  }

  return (
    <div className="modal-wrap" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal wide" style={{ width: 1080, maxHeight: '92vh', background: '#11151c' }}>
        <div className="modal-head">
          <div>
            <div className="row" style={{ gap: 8 }}>
              <span className="mono tiny muted">{report.code}</span>
              {report.invalidatedAt ? <Chip tone="warn">已失效</Chip> : <Chip tone="ok" dot>有效放行</Chip>}
            </div>
            <h3 style={{ marginTop: 4 }}>{report.title}</h3>
          </div>
          <div className="spacer" />
          <button className="ghost small" onClick={() => window.print()} title="浏览器打印">
            ⎙ 打印
          </button>
          <button className="ghost small" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ background: '#0d1015', padding: 20 }}>
          <div className="report-sheet">
            <div className="hdr">
              <div>
                <div style={{ fontSize: 9.5, letterSpacing: '.2em', color: '#8a8272', textTransform: 'uppercase' }}>
                  Figure Joint QA · Release Certificate
                </div>
                <h1>人偶关节与配件放行报告</h1>
                <div style={{ color: '#6b6455', fontSize: 11.5 }}>
                  {report.code} · 依据 {report.modelCode} {report.modelVersion} 校核单 {report.taskCode}
                </div>
              </div>
              <div className={`seal ${report.invalidatedAt ? 'invalid' : ''}`}>
                {report.invalidatedAt ? (
                  <>
                    已失效
                    <br />
                    INVALID
                  </>
                ) : (
                  <>
                    品质放行
                    <br />
                    RELEASED
                  </>
                )}
              </div>
            </div>

            <div className="meta-grid">
              <div>
                <span>模型</span>
                <b>{report.modelName}</b>
              </div>
              <div>
                <span>编号 / 版本</span>
                <b>
                  {report.modelCode} · {report.modelVersion}
                </b>
              </div>
              <div>
                <span>校核姿势</span>
                <b>{report.poseName}</b>
              </div>
              <div>
                <span>放行时间</span>
                <b>{fmtTime(report.releasedAt)}</b>
              </div>
            </div>

            {report.invalidatedAt && (
              <div
                style={{
                  marginTop: 14,
                  border: '1px solid #b9a06a',
                  background: '#f3ecd9',
                  color: '#6d5522',
                  padding: '8px 12px',
                  fontSize: 11.5,
                  borderRadius: 3,
                }}
              >
                <b>本报告已失效</b> — {report.invalidatedReason}，失效时间 {fmtTime(report.invalidatedAt)}。
                需按改版后的配件重新校核并另行签发。
              </div>
            )}

            <h2>一、关节活动角度余量</h2>
            <table>
              <thead>
                <tr>
                  <th>关节</th>
                  <th>轴</th>
                  <th style={{ textAlign: 'right' }}>当前</th>
                  <th style={{ textAlign: 'right' }}>允许范围</th>
                  <th style={{ textAlign: 'right' }}>余量</th>
                  <th>判定</th>
                </tr>
              </thead>
              <tbody>
                {groups.map(([joint, items]) => (
                  <tr key={joint}>
                    <td>{joint}</td>
                    <td colSpan={5} style={{ padding: 0 }}>
                      <table>
                        <tbody>
                          {items.map((it, i) => {
                            const m = report.margins.find((x) => x.jointName === joint && it.startsWith(x.dofLabel))!
                            return (
                              <tr key={i}>
                                <td style={{ width: 70 }}>{m.dofLabel}</td>
                                <td style={{ textAlign: 'right', width: 60 }}>{m.current.toFixed(1)}°</td>
                                <td style={{ textAlign: 'right', width: 90 }}>
                                  {m.min}° – {m.max}°
                                </td>
                                <td style={{ textAlign: 'right', width: 56, color: m.margin < 8 ? '#a4362f' : undefined }}>
                                  {m.margin.toFixed(1)}°
                                </td>
                                <td style={{ width: 60, color: m.status === 'ok' ? '#3d7d5f' : '#a4362f' }}>
                                  {m.status === 'ok' ? '充裕' : m.status === 'warn' ? '偏低' : '超限'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h2>二、干涉检查记录</h2>
            {report.interferences.length === 0 ? (
              <div style={{ fontSize: 11.5, color: '#3d7d5f' }}>
                全部相邻分件穿透深度 ≤ {PENETRATION_LIMIT} mm，未发现超限干涉。
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>部件 A</th>
                    <th>部件 B</th>
                    <th style={{ textAlign: 'right' }}>穿透深度</th>
                    <th>判定</th>
                  </tr>
                </thead>
                <tbody>
                  {report.interferences.map((r) => (
                    <tr key={r.id}>
                      <td>{r.partA}</td>
                      <td>{r.partB}</td>
                      <td style={{ textAlign: 'right' }}>{r.depth.toFixed(2)} mm</td>
                      <td style={{ color: r.severity === 'severe' ? '#a4362f' : '#8a6b20' }}>
                        {r.severity === 'severe' ? '超阈值' : '阈值内'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <h2>三、配件接口复核</h2>
            {report.interfaces.length === 0 ? (
              <div style={{ fontSize: 11.5, color: '#6b6455' }}>本次放行未装配替换配件。</div>
            ) : (
              report.interfaces.map((f, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11.5, marginBottom: 3 }}>
                    <b>
                      {f.name} {f.revision}
                    </b>{' '}
                    <span style={{ color: '#6b6455' }}>→ {f.target}</span>
                    <span style={{ float: 'right', color: f.ok ? '#3d7d5f' : '#a4362f' }}>
                      {f.ok ? '接口匹配' : '接口不匹配'}
                    </span>
                  </div>
                  <table>
                    <tbody>
                      {f.rows.map((r, k) => (
                        <tr key={k}>
                          <td style={{ width: 80, color: '#6b6455' }}>{r.label}</td>
                          <td>{r.actual}</td>
                          <td style={{ color: '#6b6455' }}>{r.required}</td>
                          <td style={{ width: 40, textAlign: 'right', color: r.ok ? '#3d7d5f' : '#a4362f' }}>
                            {r.ok ? '通过' : '不符'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}

            <h2>四、装配与版本</h2>
            <table>
              <tbody>
                {report.accessories.map((a, i) => (
                  <tr key={i}>
                    <td style={{ width: 100, color: '#6b6455' }}>装配配件 {i + 1}</td>
                    <td>
                      {a.name} <span style={{ color: '#6b6455' }}>{a.code} · {a.revision}</span>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ color: '#6b6455' }}>最小间隙</td>
                  <td>{report.minClearance.toFixed(2)} mm</td>
                </tr>
                <tr>
                  <td style={{ color: '#6b6455' }}>配件基准</td>
                  <td>{accessories.length} 项（以签发时配件库版本为准）</td>
                </tr>
                <tr>
                  <td style={{ color: '#6b6455' }}>校验码</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 10.5 }}>{report.fingerprint}</td>
                </tr>
              </tbody>
            </table>

            {report.note && (
              <>
                <h2>五、品控意见</h2>
                <div style={{ fontSize: 11.5, whiteSpace: 'pre-wrap' }}>{report.note}</div>
              </>
            )}

            <div className="sign">
              <div>
                提交人：
                {task?.submittedBy ?? '—'}
                <span style={{ color: '#8a8272' }}>
                  （{task?.submittedByRole === 'engineer' ? '结构' : task?.submittedByRole === 'prototyper' ? '原型' : '品控'}）
                </span>
                <div style={{ color: '#8a8272', fontSize: 10 }}>
                  提交日期 {task ? fmtTime(task.submittedAt) : '—'}
                </div>
              </div>
              <div>
                姿势与装配确认：
                {task?.accessories.length ? '配件库同期版本' : '无配件'}
                <div style={{ color: '#8a8272', fontSize: 10 }}>每次校核冻结当时的姿势与装配</div>
              </div>
              <div>
                品控主管：{report.releasedBy}
                <div style={{ color: '#8a8272', fontSize: 10 }}>签发日期 {fmtTime(report.releasedAt)}</div>
              </div>
            </div>
          </div>

          <div className="row" style={{ marginTop: 14, gap: 8 }}>
            <button className="ghost small" onClick={copyFingerprint}>
              ⧉ 复制校验码
            </button>
            <div className="spacer" />
            <span className="tiny muted">
              {report.invalidatedAt
                ? '报告已失效，不可用于投产放行'
                : `最小余量 ${minMargin.toFixed(1)}° · ${severe.length} 处超限干涉`}
            </span>
            <button className="small" onClick={onGoTasks}>
              查看源校核单
            </button>
          </div>

          {task && (
            <div style={{ marginTop: 14 }}>
              <Panel title="放行时的姿势" hint={`${task.poseName} · ${model.code} ${report.modelVersion}`} flush>
                <div style={{ height: 300 }}>
                  <Viewport
                    model={model}
                    accessories={accessories}
                    pose={task.pose}
                    assembly={task.assembly}
                    selectedJoint={null}
                    onSelectJoint={() => {}}
                    showLabels={false}
                    showCollision={false}
                    compact
                  />
                </div>
              </Panel>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
