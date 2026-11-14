import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CircleCheck,
  ClipboardCheck,
  Clock,
  Eye,
  FileText,
  Lock,
  Send,
  ShieldCheck,
  Target,
  ThumbsDown,
  X,
} from 'lucide-react';
import { GAMES, libItem } from '../data/library';
import { PATIENTS } from '../data/people';
import { fmt, issuesForDevice, rectFor, validateLayout, zoneFor } from '../lib/geometry';
import { useApp } from '../store';
import type { DeviceInstance, Role } from '../types';
import { ConfirmNote, EmptyState, InfoBanner, Modal, SectionTitle, StatusChip } from '../components/UI';

type Tab = 'pending' | 'rejected' | 'approved';

export function ReviewPage({ role }: { role: Role }) {
  const devices = useApp((s) => s.devices);
  const reviews = useApp((s) => s.reviews);
  const approve = useApp((s) => s.approve);
  const reject = useApp((s) => s.reject);
  const submitForReview = useApp((s) => s.submitForReview);
  const [tab, setTab] = useState<Tab>('pending');
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');

  const canReview = role === 'reviewer';
  const canSubmit = role === 'therapist';

  const counts = useMemo(
    () => ({
      pending: devices.filter((d) => d.status === 'pending').length,
      rejected: devices.filter((d) => d.status === 'rejected').length,
      approved: devices.filter((d) => d.status === 'approved').length,
    }),
    [devices],
  );

  const list = devices.filter((d) =>
    tab === 'pending' ? d.status === 'pending' : tab === 'rejected' ? d.status === 'rejected' : d.status === 'approved',
  );

  const open = devices.find((d) => d.id === openId) ?? null;

  const doApprove = (id: string, text: string) => {
    approve(id, text || '参数与内容符合发布标准，通过。');
    setOpenId(null);
    setNote('');
  };

  const doReject = (id: string) => {
    if (!note.trim()) {
      setNoteError('退回必须填写原因，提交人将据此修改');
      return;
    }
    reject(id, note.trim());
    setOpenId(null);
    setNote('');
    setNoteError('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="seg">
          {(
            [
              ['pending', `待审核 ${counts.pending}`],
              ['rejected', `已退回 ${counts.rejected}`],
              ['approved', `已发布 ${counts.approved}`],
            ] as [Tab, string][]
          ).map(([k, label]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {!canReview && (
          <span className="chip chip-neutral">
            <Eye size={10} /> {role === 'supervisor' ? '主管只读查看审核流水' : '仅审核人可操作'}
          </span>
        )}
        {canReview && counts.pending > 0 && (
          <span className="chip chip-amber">
            <Clock size={10} /> 建议 24 小时内完成审核
          </span>
        )}
      </div>

      {tab === 'pending' && !canReview && (
        <InfoBanner tone="info">
          当前身份无审核权限。切换到「审核人 · 周明远」即可对待审核展项执行通过或退回操作；退回必须填写原因。
        </InfoBanner>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 12 }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-head">
            <ClipboardCheck size={15} color="#0f766e" />
            <div style={{ flex: 1 }}>
              <div className="card-title">
                {tab === 'pending' ? '待审核队列' : tab === 'rejected' ? '已退回展项' : '已发布展项'}
              </div>
              <div className="card-sub">
                {tab === 'pending'
                  ? '按提交时间排序，最早提交优先处理'
                  : tab === 'rejected'
                    ? '退回原因同步给提交人，修改后可重新提交'
                    : '通过审核后即刻在患者大屏轮播'}
              </div>
            </div>
          </div>
          {list.length === 0 ? (
            <EmptyState
              title={tab === 'pending' ? '暂无待审核展项' : tab === 'rejected' ? '暂无退回记录' : '暂无已发布展项'}
              hint={tab === 'pending' ? '治疗师提交后会自动出现在这里' : undefined}
              icon={<ClipboardCheck size={26} color="#c7d6d2" />}
            />
          ) : (
            <div>
              {list.map((d) => {
                const lib = libItem(d.libId);
                const game = GAMES.find((g) => g.id === d.content.gameId);
                const related = reviews.filter((r) => r.deviceId === d.id);
                const last = related[0];
                return (
                  <div
                    key={d.id}
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: '13px 15px',
                      borderBottom: '1px solid #f1f6f4',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        alignSelf: 'stretch',
                        borderRadius: 99,
                        background: lib.color,
                        flex: '0 0 auto',
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                        <b style={{ fontSize: 12.8 }}>{d.name}</b>
                        <StatusChip status={d.status} />
                        {game ? (
                          <span className="chip chip-teal">{game.name}</span>
                        ) : (
                          <span className="chip chip-rose">未绑定游戏</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 5, flexWrap: 'wrap', fontSize: 10.8, color: '#7b8f8a' }}>
                        <span>{lib.name}</span>
                        <span className="mono">阈值 {d.content.threshold}%</span>
                        <span>{d.attrs.durationMin} 分钟/场</span>
                        <span>
                          {d.attrs.ageMin}–{d.attrs.ageMax} 岁
                        </span>
                        <span>{d.attrs.difficulty}</span>
                        <span>日限 {d.attrs.dailyCap} 场</span>
                      </div>
                      {d.reviewNote && d.status === 'rejected' && (
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 11,
                            color: '#991b1b',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: 7,
                            padding: '5px 8px',
                            lineHeight: 1.55,
                          }}
                        >
                          退回原因：{d.reviewNote}
                        </div>
                      )}
                      {last && d.status === 'pending' && (
                        <div style={{ marginTop: 5, fontSize: 10.5, color: '#9aa9a5' }}>
                          提交人 {last.by} · {fmtTime(last.at)}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flex: '0 0 auto' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setOpenId(d.id); setNote(''); setNoteError(''); }}>
                        <Eye size={12} /> 查看
                      </button>
                      {canReview && d.status === 'pending' && (
                        <>
                          <button className="btn btn-soft btn-sm" onClick={() => doApprove(d.id, '')}>
                            <Check size={12} /> 通过
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => {
                              setOpenId(d.id);
                              setNote('');
                              setNoteError('');
                            }}
                          >
                            <X size={12} /> 退回
                          </button>
                        </>
                      )}
                      {canSubmit && d.status === 'rejected' && (
                        <button className="btn btn-primary btn-sm" onClick={() => submitForReview(d.id)}>
                          <Send size={12} /> 重新提交
                        </button>
                      )}
                      {canSubmit && d.status === 'pending' && (
                        <span className="chip chip-neutral" style={{ alignSelf: 'center' }}>
                          审核中
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card" style={{ overflow: 'hidden', alignSelf: 'flex-start' }}>
          <div className="card-head">
            <FileText size={14} color="#7c3aed" />
            <div className="card-title">审核流水</div>
            <span className="chip chip-neutral" style={{ marginLeft: 'auto' }}>
              {reviews.length}
            </span>
          </div>
          <div style={{ maxHeight: 520, overflow: 'auto', padding: '4px 14px 12px' }}>
            {reviews.slice(0, 24).map((r) => (
              <div key={r.id} style={{ display: 'flex', gap: 9, padding: '8px 0', borderBottom: '1px solid #f4f8f7' }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 99,
                    display: 'grid',
                    placeItems: 'center',
                    flex: '0 0 auto',
                    background: r.action === 'approve' ? '#ecfdf5' : r.action === 'reject' ? '#fef2f2' : '#f0f9ff',
                    color: r.action === 'approve' ? '#047857' : r.action === 'reject' ? '#b91c1c' : '#0369a1',
                    marginTop: 1,
                  }}
                >
                  {r.action === 'approve' ? <Check size={11} /> : r.action === 'reject' ? <X size={11} /> : <Send size={10} />}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600 }}>
                    {r.action === 'approve' ? '审核通过' : r.action === 'reject' ? '退回修改' : '提交审核'} · {r.deviceName}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#869894', marginTop: 1 }}>
                    {r.by}（{r.role === 'reviewer' ? '审核人' : '治疗师'}） · {fmtTime(r.at)}
                  </div>
                  {r.note && (
                    <div style={{ fontSize: 10.5, color: '#5d716c', marginTop: 2, lineHeight: 1.5 }}>「{r.note}」</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {open && (
        <ReviewModal
          device={open}
          canReview={canReview}
          canSubmit={canSubmit}
          note={note}
          noteError={noteError}
          onNote={(v) => {
            setNote(v);
            if (v.trim()) setNoteError('');
          }}
          onApprove={() => doApprove(open.id, note.trim())}
          onReject={() => doReject(open.id)}
          onSubmit={() => {
            submitForReview(open.id);
            setOpenId(null);
          }}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

function ReviewModal({
  device,
  canReview,
  canSubmit,
  note,
  noteError,
  onNote,
  onApprove,
  onReject,
  onSubmit,
  onClose,
}: {
  device: DeviceInstance;
  canReview: boolean;
  canSubmit: boolean;
  note: string;
  noteError: string;
  onNote: (v: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const lib = libItem(device.libId);
  const game = GAMES.find((g) => g.id === device.content.gameId);
  const devices = useApp((s) => s.devices);
  const issues = issuesForDevice(validateLayout(devices), device.id);
  const zone = zoneFor(rectFor(device));

  return (
    <Modal
      wide
      onClose={onClose}
      title={
        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {device.name} <StatusChip status={device.status} />
        </span>
      }
      subtitle={`${lib.name} · ${lib.mount === 'wall' ? '墙面安装' : '落地安装'} · 提交人 ${device.submittedBy ?? '—'}`}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            关闭
          </button>
          {canReview && device.status === 'pending' && (
            <>
              <button className="btn btn-danger" onClick={onReject}>
                <ThumbsDown size={13} /> 退回修改
              </button>
              <button className="btn btn-primary" onClick={onApprove}>
                <ShieldCheck size={13} /> 通过并发布
              </button>
            </>
          )}
          {canSubmit && device.status === 'rejected' && (
            <button className="btn btn-primary" onClick={onSubmit}>
              <Send size={13} /> 修改后重新提交
            </button>
          )}
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SectionTitle>内容配置</SectionTitle>
          <div
            style={{
              padding: 13,
              borderRadius: 11,
              border: '1px solid #eef4f2',
              background: game ? `${game.color}0a` : '#fff',
            }}
          >
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: game?.color ?? '#cbd5e1',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Target size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.8, fontWeight: 700 }}>{game?.name ?? '未绑定小游戏'}</div>
                <div style={{ fontSize: 10.5, color: '#7b8f8a' }}>{game?.tagline ?? '请先绑定后再提交'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontSize: 19, fontWeight: 750, lineHeight: 1 }}>
                  {device.content.threshold}
                  <span style={{ fontSize: 10 }}>%</span>
                </div>
                <div style={{ fontSize: 9.5, color: '#9aa9a5' }}>{game?.metric ?? '阈值'}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 11, fontSize: 11 }}>
              <KV k="单次时长" v={`${device.attrs.durationMin} 分钟`} />
              <KV k="每日上限" v={`${device.attrs.dailyCap} 场`} />
              <KV k="适用年龄" v={`${device.attrs.ageMin}–${device.attrs.ageMax} 岁`} />
              <KV k="难度档位" v={device.attrs.difficulty} />
            </div>
            {device.content.note && (
              <div style={{ marginTop: 9, fontSize: 10.8, color: '#5d716c', background: '#fff', padding: '7px 9px', borderRadius: 7, border: '1px solid #eef4f2', lineHeight: 1.55 }}>
                备注：{device.content.note}
              </div>
            )}
          </div>

          <SectionTitle>训练部位覆盖</SectionTitle>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {device.attrs.bodyParts.map((p) => (
              <span key={p} className="chip chip-teal">
                {p}
              </span>
            ))}
          </div>

          <SectionTitle>适用患者校验</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {PATIENTS.map((p) => {
              const inRange = p.age >= device.attrs.ageMin && p.age <= device.attrs.ageMax;
              return (
                <span
                  key={p.id}
                  className={`chip ${inRange ? 'chip-approved' : 'chip-neutral'}`}
                  style={{ opacity: inRange ? 1 : 0.55 }}
                  title={`${p.name} ${p.age} 岁 · ${p.goal}`}
                >
                  {p.name} {p.age}岁
                </span>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SectionTitle>安全与布置检查</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <CheckRow
              ok={issues.length === 0}
              text={issues.length === 0 ? '平面图无重叠、无越界' : issues[0].message}
            />
            <CheckRow ok={!!zone} text={zone ? `落位于 ${zone.name}（上限 ${zone.capacity}kg）` : '未落位于任何承重分区'} />
            <CheckRow
              ok={lib.mount === 'floor' || Math.abs(Math.cos(device.rot)) > 0.99 || Math.abs(Math.sin(device.rot)) > 0.99}
              text={lib.mount === 'wall' ? `贴墙安装，挂高 ${fmt(lib.installHeight, 2)}m` : '落地安装，四角留有通行间距'}
            />
            <CheckRow ok={device.content.threshold >= 50} text={`达标阈值 ${device.content.threshold}% ${device.content.threshold < 50 ? '偏低' : '合理'}`} />
            <CheckRow
              ok={device.attrs.durationMin <= 20}
              text={`单次时长 ${device.attrs.durationMin} 分钟 ${device.attrs.durationMin > 20 ? '偏长，儿童注意力负荷高' : '符合儿童注意力时长'}`}
            />
          </div>

          <SectionTitle>安装点位</SectionTitle>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              fontSize: 11,
              background: '#f8fbfa',
              border: '1px solid #eef4f2',
              borderRadius: 9,
              padding: '9px 11px',
            }}
          >
            <KV k="X 坐标" v={`${fmt(device.x, 2)} m`} />
            <KV k="Z 坐标" v={`${fmt(device.z, 2)} m`} />
            <KV k="朝向" v={`${Math.round(((device.rot * 180) / Math.PI + 360) % 360)}°`} />
            <KV k="外形" v={`${fmt(device.w, 2)}×${fmt(device.d, 2)} m`} />
          </div>

          {device.reviewNote && device.status !== 'pending' && (
            <div
              style={{
                padding: '9px 11px',
                borderRadius: 9,
                background: device.status === 'rejected' ? '#fef2f2' : '#ecfdf5',
                border: `1px solid ${device.status === 'rejected' ? '#fecaca' : '#a7f3d0'}`,
                fontSize: 11,
                lineHeight: 1.6,
                color: device.status === 'rejected' ? '#991b1b' : '#065f46',
              }}
            >
              <b>{device.status === 'rejected' ? '退回原因' : '审核意见'}：</b>
              {device.reviewNote}
              <div style={{ fontSize: 10, opacity: 0.75, marginTop: 3 }}>
                {device.reviewedBy} · {device.reviewedAt ? fmtTime(device.reviewedAt) : ''}
              </div>
            </div>
          )}

          {canReview && device.status === 'pending' && (
            <ConfirmNote
              value={note}
              onChange={onNote}
              placeholder="填写审核意见；退回时必须写明原因，例如：阈值偏低 / 安装高度不适合 4–6 岁组"
              error={noteError}
            />
          )}

          {device.status === 'pending' && !canReview && (
            <InfoBanner tone="warn">
              <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                <Lock size={12} /> 仅有审核人（周明远）可执行通过或退回操作。
              </span>
            </InfoBanner>
          )}
        </div>
      </div>
    </Modal>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div style={{ fontSize: 9.8, color: '#9aa9a5' }}>{k}</div>
      <div style={{ fontSize: 12, fontWeight: 650, marginTop: 1 }}>{v}</div>
    </div>
  );
}

function CheckRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 7,
        alignItems: 'center',
        fontSize: 11.3,
        padding: '6px 9px',
        borderRadius: 8,
        background: ok ? '#f7fbfa' : '#fffbeb',
        border: `1px solid ${ok ? '#eef4f2' : '#fde68a'}`,
        color: ok ? '#0b2b27' : '#92400e',
      }}
    >
      {ok ? <CircleCheck size={13} color="#059669" /> : <AlertTriangle size={13} />}
      {text}
    </div>
  );
}

export function fmtTime(iso: string) {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}-${dd} ${hh}:${mi}`;
}
