// 复核工程师：版本列表、逐图斑意见、整体退回
import { useMemo, useState } from 'react'
import { Modal, fmtArea, fmtNum } from './ui.jsx'
import { LAND_TYPES, MEASURE_TYPES, computeMeasure } from '../lib/measures.js'
import { areaSlopeStats } from '../lib/dem.js'
import { polygonArea } from '../lib/geometry.js'

const STATUS = {
  pending: { label: '待复核', cls: 'pending' },
  returned: { label: '已退回', cls: 'err' },
  approved: { label: '已通过', cls: 'ok' },
  draft: { label: '编制中', cls: '' },
}

const dt = (s) => (s ? new Date(s).toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—')
const dtFull = (s) => (s ? new Date(s).toLocaleString('zh-CN', { hour12: false }) : '—')

export default function Reviewer({ project, dem, measures, patches, api, notify, currentRole, ctx }) {
  const versions = useMemo(() => [...(project.versions || [])].sort((a, b) => b.no - a.no), [project.versions])
  const [selId, setSelId] = useState(versions[0]?.id || null)
  const selected = versions.find((v) => v.id === selId) || versions[0] || null
  const [drafts, setDrafts] = useState({})
  const [overall, setOverall] = useState('')
  const [modal, setModal] = useState(null)

  const isPending = selected?.status === 'pending' || project.status === 'pending'
  const readOnly = selected && selected.status !== 'pending'

  // 复核以版本快照为准，避免技术员提交后继续修改影响已提交内容
  const patchList = useMemo(() => {
    if (!selected) return patches
    const snap = selected.snapshot?.patches
    return snap && snap.length ? snap : patches
  }, [selected, patches])

  const currentMeasures = useMemo(() => {
    if (!selected) return []
    const snap = selected.snapshot?.measures
    const list = snap && snap.length ? snap : measures
    return list.map((m) => (m.calc ? m : { ...m, calc: computeMeasure(m, ctx) }))
  }, [selected, measures, ctx])

  const setDraft = (patchId, text) => setDrafts((d) => ({ ...d, [patchId]: text }))
  const filled = Object.values(drafts).filter((t) => t.trim()).length

  const addComment = (patchId) => {
    const text = (drafts[patchId] || '').trim()
    if (!text) return
    if (!selected || selected.status !== 'pending') {
      notify?.('只有待复核版本可以填写意见', 'warn')
      return
    }
    api.addComment(selected.id, { patchId, text, author: '李慧' })
    setDraft(patchId, '')
    notify?.('意见已记录到当前版本', 'ok')
  }

  const doReturn = () => {
    if (!selected || selected.status !== 'pending') return
    if (!overall.trim()) {
      notify?.('请填写整体退回意见（说明退回原因）', 'error')
      return
    }
    api.returnVersion(selected.id, overall.trim())
    setOverall('')
    setDrafts({})
    setModal(null)
    notify?.(`方案第 ${selected.no} 版已整体退回，意见已保存在该版本上`, 'ok')
  }

  const doApprove = () => {
    if (!selected) return
    if (!overall.trim()) {
      notify?.('请填写复核结论', 'error')
      return
    }
    api.approveVersion(selected.id, overall.trim())
    setOverall('')
    setModal(null)
    notify?.(`方案第 ${selected.no} 版复核通过`, 'ok')
  }

  return (
    <div className="app-body">
      <aside className="sidebar" style={{ width: 300, flex: '0 0 300px' }}>
        <div className="sidebar-head">
          <h2>方案版本</h2>
          <p>意见与提交 / 退回时间随版本存档</p>
        </div>
        <div className="sidebar-scroll">
          {versions.map((v) => {
            const st = STATUS[v.status] || STATUS.draft
            return (
              <div key={v.id} className={`version-item ${selected?.id === v.id ? 'sel' : ''}`} onClick={() => { setSelId(v.id); setDrafts({}); setOverall('') }}>
                <div className="row1">
                  <span className="no">第 {v.no} 版</span>
                  <span className={`chip ${st.cls}`}>{st.label}</span>
                  {v.status === 'pending' && <span className="chip warn" style={{ marginLeft: 'auto' }}>待处理</span>}
                </div>
                <div className="when">
                  提交 {dt(v.submittedAt)} · {v.submittedBy || '技术员'}
                  <br />
                  {v.reviewedAt ? `退回/审核 ${dt(v.reviewedAt)} · ${v.reviewedBy || '复核工程师'}` : '尚未审核'}
                  <br />
                  <span style={{ color: 'var(--ink-2)' }}>{v.comments?.length || 0} 条图斑意见</span>
                </div>
              </div>
            )
          })}
        </div>
        <div className="actions-row" style={{ flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.5 }}>
            当前方案状态：<b style={{ color: 'var(--ink)' }}>{STATUS[project.status]?.label || '编制中'}</b>
          </div>
        </div>
      </aside>

      <div className="pane" style={{ flex: 1 }}>
        {!selected && <div className="empty"><span className="ico">◷</span>暂无提交的版本</div>}
        {selected && (
          <div className="pane-scroll" style={{ padding: '16px 20px' }}>
            <div className="detail-head">
              <h2>第 {selected.no} 版方案</h2>
              <span className={`chip ${STATUS[selected.status]?.cls}`}>{STATUS[selected.status]?.label}</span>
              <span style={{ flex: 1 }} />
              {isPending && currentRole === 'reviewer' && (
                <>
                  <button className="btn danger" onClick={() => setModal('return')}>整体退回</button>
                  <button className="btn primary" onClick={() => setModal('approve')}>复核通过</button>
                </>
              )}
              {!isPending && selected.status !== 'pending' && (
                <span className="chip info">已归档，不可修改</span>
              )}
            </div>
            {selected.status === 'pending' && currentRole !== 'reviewer' && (
              <p className="tiny-note" style={{ marginTop: 0 }}>切换为「复核工程师」角色可填写意见与退回。</p>
            )}

            <div className="timeline">
              <div className="tl-item">
                <span className="tl-dot" style={{ background: '#3f7a4c' }} />
                <div>
                  <div className="t">提交时间</div>
                  <div className="v">{dtFull(selected.submittedAt)}</div>
                </div>
              </div>
              <div className="tl-item">
                <span className="tl-dot" style={{ background: selected.status === 'returned' ? '#b83a2b' : selected.status === 'approved' ? '#3f7a4c' : '#b8791f' }} />
                <div>
                  <div className="t">{selected.status === 'pending' ? '待复核' : selected.status === 'returned' ? '退回时间' : '通过时间'}</div>
                  <div className="v">{selected.reviewedAt ? dtFull(selected.reviewedAt) : '—'}</div>
                </div>
              </div>
              <div className="tl-item">
                <div>
                  <div className="t">图斑 / 措施</div>
                  <div className="v">{patchList.length} 个 / {currentMeasures.length} 项</div>
                </div>
              </div>
            </div>

            {selected.overall && (
              <div className={`msg ${selected.status === 'returned' ? 'error' : 'ok'}`} style={{ marginBottom: 14 }}>
                <div className="grow">
                  <div className="title">{selected.status === 'returned' ? '整体退回意见' : '复核结论'}</div>
                  {selected.overall}
                  <div style={{ marginTop: 4, fontSize: 10.5, opacity: 0.75 }}>
                    {selected.reviewedBy} · {dtFull(selected.reviewedAt)}
                  </div>
                </div>
              </div>
            )}

            <div className="block">
              <div className="block-head">
                <h3>逐图斑审阅</h3>
                <span className="grow" />
                <span className="hint">每个图斑填写意见后逐条记录；整体退回时汇总为该版本意见</span>
              </div>
              <div style={{ padding: '4px 16px 14px' }}>
                {patchList.map((p) => {
                  const mList = currentMeasures.filter((m) => m.patchId === p.id)
                  const st = dem ? areaSlopeStats(dem, p.points) : null
                  const versionComments = (selected.comments || []).filter((c) => c.patchId === p.id)
                  return (
                    <div className="patch-comment-row" key={p.id}>
                      <div className="meta">
                        <div className="nm">
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: LAND_TYPES[p.landType]?.color, marginRight: 5 }} />
                          {p.name}
                        </div>
                        <div className="lt">{LAND_TYPES[p.landType]?.name} · {fmtArea(p.area ?? polygonArea(p.points))}</div>
                        {st && <div className="ms">平均坡度 {st.meanSlope.toFixed(1)}° · &gt;25° 占 {(st.shares[3] * 100).toFixed(0)}%</div>}
                        <div className="ms" style={{ marginTop: 5 }}>
                          {mList.length
                            ? mList.map((m) => (
                                <div key={m.id} style={{ fontSize: 10.5, color: 'var(--ink-2)' }}>
                                  · {MEASURE_TYPES[m.type]?.name}
                                  {fmtNum(m.calc?.earthwork, 0)} m³
                                </div>
                              ))
                            : <span style={{ color: 'var(--warn)' }}>· 未布设措施</span>}
                        </div>
                      </div>
                      <div className="mid">
                        {versionComments.map((c) => (
                          <div className="comment-card" key={c.id}>
                            <div className="head">
                              <span className="patch">意见</span>
                              <span className="who">{c.author} · {dtFull(c.createdAt)}</span>
                              {selected.status === 'pending' && (
                                <button className="link-btn" style={{ marginLeft: 8 }} onClick={() => api.removeComment(selected.id, c.id)}>删除</button>
                              )}
                            </div>
                            <div className="body">{c.text}</div>
                          </div>
                        ))}
                        {selected.status === 'pending' && (
                          <div className="comment-new">
                            <textarea
                              rows={2}
                              style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 3, padding: '6px 8px', resize: 'vertical' }}
                              placeholder="填写该图斑复核意见，如：梯田田面宽偏大，建议调整至 5 m 并重算土方"
                              value={drafts[p.id] || ''}
                              onChange={(e) => setDraft(p.id, e.target.value)}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                              <span style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>意见将挂在第 {selected.no} 版上</span>
                              <button className="btn sm" onClick={() => addComment(p.id)}>记录意见</button>
                            </div>
                          </div>
                        )}
                        {selected.status !== 'pending' && versionComments.length === 0 && (
                          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>该图斑无意见</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {selected.status === 'pending' && (
              <div className="block">
                <div className="block-head"><h3>整体复核意见</h3></div>
                <div style={{ padding: 14 }}>
                  <textarea
                    rows={3}
                    style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 4, padding: '8px 10px', resize: 'vertical' }}
                    placeholder="填写整体退回或通过意见"
                    value={overall}
                    onChange={(e) => setOverall(e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                    <button className="btn danger" onClick={() => setModal('return')}>整体退回</button>
                    <button className="btn primary" onClick={() => setModal('approve')}>复核通过</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal
        open={modal === 'return'}
        title="整体退回方案"
        onClose={() => setModal(null)}
        footer={
          <>
            <button className="btn" onClick={() => setModal(null)}>取消</button>
            <button className="btn danger" onClick={doReturn}>确认退回</button>
          </>
        }
      >
        <div className="msg warn">
          <div className="grow">
            退回后方案状态变为「已退回」，技术员需修改后重新提交，系统将生成新版本；本次意见、提交与退回时间均记录在第 {selected?.no} 版上。
          </div>
        </div>
        <div className="kv"><span className="k">本版已记录图斑意见</span><span className="v">{selected?.comments.length || 0} 条</span></div>
        <div className="kv"><span className="k">已填写但未记录的意见</span><span className="v">{filled} 条</span></div>
        {filled > 0 && (
          <p className="tiny-note">提示：直接在文本框中填写但未点击「记录意见」的内容不会保存，请先逐条记录。</p>
        )}
        {selected?.comments.length === 0 && (
          <div className="msg warn" style={{ marginTop: 10, marginBottom: 0 }}>
            <div className="grow">本版尚未记录图斑意见，退回后技术员只能看到整体退回意见。建议先在逐图斑审阅中记录具体意见。</div>
          </div>
        )}
      </Modal>

      <Modal
        open={modal === 'approve'}
        title="复核通过"
        onClose={() => setModal(null)}
        footer={
          <>
            <button className="btn" onClick={() => setModal(null)}>取消</button>
            <button className="btn primary" onClick={doApprove}>确认通过</button>
          </>
        }
      >
        <div className="msg ok"><div className="grow">通过后该版本归档，计入站长端复核通过率。</div></div>
        {!overall.trim() && <div className="msg warn"><div className="grow">请先在页面下方填写整体复核结论。</div></div>}
      </Modal>
    </div>
  )
}
