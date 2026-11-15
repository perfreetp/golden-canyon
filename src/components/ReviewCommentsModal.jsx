// 技术员查看复核意见（挂在具体版本上）
import { Modal } from './ui.jsx'
import { LAND_TYPES } from '../lib/measures.js'

const dt = (s) => (s ? new Date(s).toLocaleString('zh-CN', { hour12: false }) : '—')

export default function ReviewCommentsModal({ open, onClose, versions, patches, onLocatePatch }) {
  const latest = versions?.[versions.length - 1]
  const history = [...(versions || [])].reverse()
  return (
    <Modal open={open} title="复核意见" onClose={onClose} width={640} footer={<button className="btn" onClick={onClose}>关闭</button>}>
      {!history.length && <div className="tiny-note">尚无复核记录。</div>}
      {latest && (
        <div className={`msg ${latest.status === 'returned' ? 'error' : latest.status === 'approved' ? 'ok' : 'warn'}`} style={{ marginBottom: 12 }}>
          <div className="grow">
            当前版本：第 {latest.no} 版 · {latest.status === 'returned' ? '已退回' : latest.status === 'approved' ? '已通过' : '待复核'}
            <br />
            提交 {dt(latest.submittedAt)} · 审核 {dt(latest.reviewedAt)}
          </div>
        </div>
      )}
      <div style={{ maxHeight: '56vh', overflowY: 'auto' }}>
        {history.map((v) => (
          <div key={v.id} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <b style={{ fontSize: 12 }}>第 {v.no} 版</b>
              <span className={`chip ${v.status === 'approved' ? 'ok' : v.status === 'returned' ? 'err' : 'pending'}`}>
                {v.status === 'approved' ? '已通过' : v.status === 'returned' ? '已退回' : '待复核'}
              </span>
              <span style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>
                提交 {dt(v.submittedAt)} · 审核 {dt(v.reviewedAt)}
              </span>
            </div>
            {v.overall && (
              <div className="msg warn" style={{ marginBottom: 6 }}>
                <div className="grow"><b>整体意见：</b>{v.overall}</div>
              </div>
            )}
            {(v.comments || []).length === 0 && <div className="tiny-note">该版本无图斑意见。</div>}
            {(v.comments || []).map((c) => {
              const p = patches.find((x) => x.id === c.patchId)
              return (
                <div className="comment-card" key={c.id}>
                  <div className="head">
                    <span className="patch">
                      {p ? (
                        <>
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: LAND_TYPES[p.landType]?.color, marginRight: 5 }} />
                          {p.name}
                        </>
                      ) : (
                        '已删除图斑'
                      )}
                    </span>
                    <span className="who">{c.author} · {dt(c.createdAt)}</span>
                  </div>
                  <div className="body">{c.text}</div>
                  {p && (
                    <div style={{ marginTop: 5 }}>
                      <button className="link-btn" onClick={() => { onLocatePatch(p.id); onClose() }}>定位到该图斑</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </Modal>
  )
}
