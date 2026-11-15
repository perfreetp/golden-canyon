import { useMemo, useRef, useState } from 'react'
import { CAN, denyHint, fmtTime, useStore } from '../store'
import { ArcGauge, Chip, Empty, Modal, Panel } from '../components/ui'
import Viewport, { type ViewportApi } from '../components/Viewport'
import { dofMargin, runCheck, PENETRATION_LIMIT } from '../engine/evaluate'
import { axisHint, axisLabel } from '../lib/axis'
import { neutralPose } from '../engine/rig'

const PRESETS: { name: string; desc: string; pose: Record<string, number[]> }[] = [
  {
    name: '拔剑准备',
    desc: '右臂上举、肘部深屈，检验肩甲与胸甲',
    pose: { j_shoulder_R: [78, 26], j_elbow_R: [108], j_chest: [0, -10], j_waist: [4, 0, -8] },
  },
  {
    name: '弓步突刺',
    desc: '左腿前跨、右膝下沉，检验裙甲与大腿',
    pose: { j_hip_L: [72], j_knee_L: [86], j_hip_R: [-14], j_knee_R: [42], j_waist: [14, -6, 10] },
  },
  {
    name: '举刀过顶',
    desc: '双肩外展、肘部屈曲到底，检验长兵刃干涉',
    pose: { j_shoulder_R: [104, 44], j_elbow_R: [96], j_shoulder_L: [58, 62], j_elbow_L: [82] },
  },
  {
    name: '抱膝坐姿',
    desc: '髋膝同时接近限位，考验裙甲与膝部',
    pose: { j_hip_L: [96], j_knee_L: [94], j_knee_R: [92], j_waist: [22, 0, 0], j_neck: [24, 0, -12] },
  },
]

export default function BenchPage() {
  const model = useStore((s) => s.model)
  const pose = useStore((s) => s.pose)
  const assembly = useStore((s) => s.assembly)
  const accessories = useStore((s) => s.accessories)
  const selectedJoint = useStore((s) => s.selectedJoint)
  const selectJoint = useStore((s) => s.selectJoint)
  const setPoseValue = useStore((s) => s.setPoseValue)
  const nudgePose = useStore((s) => s.nudgePose)
  const resetPose = useStore((s) => s.resetPose)
  const snapshots = useStore((s) => s.snapshots)
  const saveSnapshot = useStore((s) => s.saveSnapshot)
  const applySnapshot = useStore((s) => s.applySnapshot)
  const deleteSnapshot = useStore((s) => s.deleteSnapshot)
  const equip = useStore((s) => s.equip)
  const toast = useStore((s) => s.toast)
  const go = useStore((s) => s.go)
  const role = useStore((s) => s.role)
  const canSubmit = CAN.submit(role)
  const canSave = CAN.savePose(role)
  const canEquip = CAN.equip(role)

  const [saveOpen, setSaveOpen] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [showCollision, setShowCollision] = useState(true)
  const [snapName, setSnapName] = useState('')
  const [snapNote, setSnapNote] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskSummary, setTaskSummary] = useState('')
  const [useSnapshot, setUseSnapshot] = useState(true)
  const apiRef = useRef<ViewportApi | null>(null)
  const thumbRef = useRef<string>('')

  const joint = model.joints.find((j) => j.id === selectedJoint) ?? null

  const check = useMemo(
    () => runCheck(model, accessories, pose, assembly),
    [model, accessories, pose, assembly],
  )
  const res = check.result
  const severe = res.severe

  const hand = accessories.find((a) => a.id === assembly.hand)
  const weapon = accessories.find((a) => a.id === assembly.weapon)
  const base = accessories.find((a) => a.id === assembly.base)

  const deviate = useMemo(() => {
    const none = neutralPose(model)
    let count = 0
    for (const j of model.joints) {
      const cur = pose[j.id] ?? []
      const n = none[j.id] ?? []
      if (cur.some((v, i) => Math.abs(v - (n[i] ?? 0)) > 0.5)) count++
    }
    return count
  }, [model, pose])

  const submit = () => {
    const ok = useStore.getState().submitTask({
      snapshotId: useSnapshot ? useStore.getState().selectedSnapshot ?? undefined : undefined,
      title: taskTitle.trim() || `${model.code} ${model.version} 校核`,
      summary: taskSummary.trim(),
    })
    if (ok) {
      setSubmitOpen(false)
      setTaskTitle('')
      setTaskSummary('')
      go('tasks')
    }
  }

  return (
    <div className="bench">
      {/* ---------- left: joints ---------- */}
      <div className="side">
        <div className="side-head">
          关节
          <span style={{ marginLeft: 'auto', color: 'var(--fg-3)', letterSpacing: 0 }}>
            {deviate}/{model.joints.length} 已偏移
          </span>
        </div>
        <div className="side-scroll">
          {model.joints.map((j) => {
            const over = j.dofs.some((d, i) => {
              const v = pose[j.id]?.[i] ?? 0
              return v < d.min - 0.01 || v > d.max + 0.01
            })
            return (
              <div
                key={j.id}
                className={`joint-row ${j.id === selectedJoint ? 'sel' : ''} ${j.calibrated ? '' : 'uncal'}`}
                onClick={() => selectJoint(j.id)}
              >
                <span className="code">{j.code}</span>
                <span className="nm">{j.name}</span>
                {!j.calibrated && <span style={{ color: 'var(--warn)', fontSize: 10 }}>未标定</span>}
                {over && <span style={{ color: 'var(--bad)', fontSize: 10 }}>超限</span>}
                <span className="kd">{j.kind === 'hinge' ? 'H' : 'B'}</span>
              </div>
            )
          })}
        </div>
        <div style={{ borderTop: '1px solid var(--line)', padding: 10, flexShrink: 0 }}>
          <button style={{ width: '100%' }} onClick={resetPose}>
            ↺ 复位全部关节
          </button>
        </div>
      </div>

      {/* ---------- center: viewport ---------- */}
      <div className="center">
        <div className="bench-strip">
          <span className="tiny muted" style={{ letterSpacing: '.08em' }}>姿势预设</span>
          {PRESETS.map((p) => (
            <button
              key={p.name}
              className="preset"
              title={p.desc}
              onClick={() => {
                const merged = { ...neutralPose(model) }
                for (const [k, v] of Object.entries(p.pose)) {
                  const jd = model.joints.find((x) => x.id === k)
                  if (!jd) continue
                  merged[k] = jd.dofs.map((d, i) => Math.min(d.max, Math.max(d.min, v[i] ?? 0)))
                }
                useStore.setState({ pose: merged })
                toast({ tone: 'info', title: `已套用预设「${p.name}」`, detail: p.desc })
              }}
            >
              {p.name}
            </button>
          ))}
          <div style={{ flex: 1, minWidth: 8 }} />
          <label className="row tiny muted" style={{ gap: 5 }}>
            <input
              type="checkbox"
              checked={showCollision}
              onChange={(e) => setShowCollision(e.target.checked)}
              style={{ width: 'auto', accentColor: 'var(--accent)' }}
            />
            穿插高亮
          </label>
          <label className="row tiny muted" style={{ gap: 5 }}>
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              style={{ width: 'auto', accentColor: 'var(--accent)' }}
            />
            干涉标注
          </label>
        </div>

        <Viewport
          model={model}
          accessories={accessories}
          pose={pose}
          assembly={assembly}
          selectedJoint={selectedJoint}
          onSelectJoint={selectJoint}
          onDragJoint={(id, dof, delta) => nudgePose(id, dof, delta)}
          showLabels={showLabels}
          showCollision={showCollision}
          onReady={(api) => (apiRef.current = api)}
        />

        <div className="statusbar">
          <span className={`chip ${severe.length ? 'bad' : res.interferences.length ? 'warn' : 'ok'}`}>
            <i className="dot" />
            {severe.length
              ? `${severe.length} 处超限穿透`
              : res.interferences.length
                ? `${res.interferences.length} 处轻微接触`
                : '无穿插'}
          </span>
          <span className="tiny muted">
            最小间隙 <b className="mono" style={{ color: res.minClearance < 0 ? 'var(--bad)' : 'var(--ok)' }}>{res.minClearance.toFixed(2)} mm</b>
          </span>
          <span className="tiny muted">判定阈值 {PENETRATION_LIMIT} mm</span>
          <span className="tiny muted" style={{ marginLeft: 'auto' }}>
            {res.interfaces.filter((i) => i.ok).length}/{res.interfaces.length} 接口匹配
          </span>
        </div>
      </div>

      {/* ---------- right: inspector ---------- */}
      <div className="side right">
        <div className="side-head">
          实时校核
          <div className="spacer" />
          <button
            className="primary small"
            disabled={!res.pass || !canSubmit}
            title={
              !canSubmit
                ? denyHint('提交校核单', 'prototyper')
                : !res.pass
                  ? '存在阻塞项，无法提交'
                  : undefined
            }
            onClick={() => setSubmitOpen(true)}
          >
            提交校核单
          </button>
        </div>
        <div className="side-scroll">
          {/* selected joint */}
          {joint && (
            <div style={{ borderBottom: '1px solid var(--line)' }}>
              <div style={{ padding: '10px 12px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <b style={{ fontSize: 12.5 }}>{joint.name}</b>
                <span className="mono tiny muted">{joint.code}</span>
                <span className="spacer" />
                <Chip tone={joint.kind === 'hinge' ? 'info' : 'accent'}>
                  {joint.kind === 'hinge' ? '铰链' : '球关节'}
                </Chip>
              </div>
              {joint.dofs.map((d, i) => {
                const cur = pose[joint.id]?.[i] ?? 0
                const margin = dofMargin(d, cur)
                return (
                  <div className="dof" key={i}>
                    <div className="top">
                      <span className="nm">{d.label}</span>
                      <span className="axis-pill" title={axisHint(d.axis)}>
                        <i>{axisLabel(d.axis)}</i>
                      </span>
                      <span className="val" style={{ color: margin < 0 ? 'var(--bad)' : margin < 8 ? 'var(--warn)' : 'var(--accent)' }}>
                        {Math.round(cur)}°
                      </span>
                    </div>
                    <input
                      type="range"
                      min={d.min}
                      max={d.max}
                      step={0.5}
                      value={cur}
                      onChange={(e) => setPoseValue(joint.id, i, Number(e.target.value))}
                    />
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <span className="rng">{d.min}°</span>
                      <span
                        className="rng"
                        style={{ color: margin < 8 ? (margin < 0 ? 'var(--bad)' : 'var(--warn)') : undefined }}
                      >
                        余量 {margin.toFixed(1)}°
                      </span>
                      <span className="rng">{d.max}°</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* interference */}
          <div style={{ padding: '10px 12px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <b style={{ fontSize: 12 }}>穿插检测</b>
            <span className="spacer" />
            <span className="tiny muted">{res.interferences.length} 组</span>
          </div>
          <div style={{ maxHeight: 190, overflow: 'auto' }}>
            {res.interferences.length === 0 && (
              <div className="tiny muted" style={{ padding: '4px 12px 12px' }}>
                当前姿势无部件穿插。
              </div>
            )}
            {res.interferences.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: '7px 12px',
                  borderTop: '1px solid #1a212c',
                  fontSize: 11.5,
                  display: 'flex',
                  gap: 8,
                  alignItems: 'flex-start',
                }}
              >
                <span
                  style={{
                    width: 5,
                    alignSelf: 'stretch',
                    borderRadius: 3,
                    background: r.severity === 'severe' ? 'var(--bad)' : 'var(--warn)',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div>
                    {r.partA} <span className="muted">⇄</span> {r.partB}
                  </div>
                  <div className="tiny muted mono">
                    穿透 {r.depth.toFixed(2)} mm
                    {r.severity === 'severe' ? ' · 超阈值' : ' · 阈值内'}
                    {r.source === 'accessory' ? ' · 配件' : ''}
                  </div>
                </div>
                {r.severity === 'severe' && <Chip tone="bad">超限</Chip>}
              </div>
            ))}
          </div>

          {/* interface */}
          <div style={{ padding: '10px 12px 6px', display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--line)' }}>
            <b style={{ fontSize: 12 }}>配件接口复核</b>
            <span className="spacer" />
            <span className="tiny muted">{check.build.notices.length ? '有提示' : '自动'}</span>
          </div>
          {res.interfaces.length === 0 && (
            <div className="tiny muted" style={{ padding: '4px 12px 12px' }}>
              未装配配件。
            </div>
          )}
          {res.interfaces.map((i, idx) => (
            <div key={idx} style={{ padding: '7px 12px', borderTop: '1px solid #1a212c', fontSize: 11.5 }}>
              <div className="row">
                <span style={{ flex: 1 }}>{i.name}</span>
                <Chip tone={i.ok ? 'ok' : 'bad'}>{i.ok ? '匹配' : '不匹配'}</Chip>
              </div>
              <div className="tiny muted mono" style={{ marginTop: 1 }}>
                {i.target} · {i.revision}
              </div>
              {!i.ok &&
                i.rows
                  .filter((r) => !r.ok)
                  .map((r, k) => (
                    <div key={k} className="tiny" style={{ color: 'var(--bad)', marginTop: 2 }}>
                      {r.label}：{r.actual} / 需 {r.required}
                    </div>
                  ))}
            </div>
          ))}
          {check.build.notices.map((n, i) => (
            <div key={i} className="tiny" style={{ padding: '4px 12px', color: 'var(--warn)' }}>
              ⚠ {n}
            </div>
          ))}

          {/* assembly quick swap */}
          <div style={{ padding: '10px 12px 6px', borderTop: '1px solid var(--line)' }}>
            <b style={{ fontSize: 12 }}>当前装配</b>
          </div>
          <div style={{ padding: '0 12px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { k: 'hand' as const, label: '手型', acc: hand },
              { k: 'weapon' as const, label: '武器', acc: weapon },
              { k: 'base' as const, label: '底座', acc: base },
            ].map(({ k, label, acc }) => (
              <div key={k} className="row" style={{ fontSize: 11.5 }}>
                <span className="muted" style={{ width: 34 }}>{label}</span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {acc ? acc.name : <span className="muted">未装配</span>}
                </span>
                {acc && (
                  <button
                    className="ghost small"
                    disabled={!canEquip}
                    onClick={() => equip(k, undefined)}
                  >
                    卸下
                  </button>
                )}
              </div>
            ))}
            <button className="small" style={{ marginTop: 2 }} onClick={() => go('accessories')}>
              ⌘ 打开配件库换装
            </button>
          </div>

          {/* blockers */}
          {!res.pass && (
            <div style={{ padding: '0 12px 12px' }}>
              <div className="banner bad" style={{ fontSize: 11.5 }}>
                <span>⛔</span>
                <div>
                  <b style={{ display: 'block', marginBottom: 3 }}>不可提交，存在以下问题</b>
                  {res.blockers.map((b, i) => (
                    <div key={i}>· {b}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {res.pass && (
            <div style={{ padding: '0 12px 12px' }}>
              <div className="banner ok" style={{ fontSize: 11.5 }}>
                <span>✓</span>
                <div>
                  阻塞项全部通过，可提交校核单。
                  {res.warnings.length > 0 && (
                    <div className="tiny" style={{ marginTop: 3, opacity: 0.85 }}>
                      提示：{res.warnings.join('；')}，由品控判断是否可接受。
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* snapshots */}
        <div style={{ borderTop: '1px solid var(--line)', flexShrink: 0, maxHeight: '38%', display: 'flex', flexDirection: 'column' }}>
          <div className="side-head">
            姿势快照
            <span style={{ marginLeft: 'auto', letterSpacing: 0, color: 'var(--fg-3)' }}>{snapshots.length}</span>
            <button
              className="small"
              disabled={!canSave}
              title={!canSave ? denyHint('保存姿势快照', 'prototyper') : undefined}
              onClick={() => {
                thumbRef.current = apiRef.current?.capture() ?? ''
                setSnapName(`姿势 ${snapshots.length + 1}`)
                setSnapNote('')
                setSaveOpen(true)
              }}
            >
              + 保存
            </button>
          </div>
          <div className="side-scroll">
            {snapshots.length === 0 && <Empty>还没有保存的姿势</Empty>}
            {snapshots.map((sn) => (
              <div key={sn.id} className="snap-card" onClick={() => applySnapshot(sn.id)}>
                <div
                  className="thumb"
                  style={sn.thumb ? { backgroundImage: `url(${sn.thumb})` } : undefined}
                />
                <div className="meta">
                  <b>{sn.name}</b>
                  <span>{fmtTime(sn.createdAt).slice(5)} · {sn.createdBy}</span>
                  {sn.note && (
                    <div className="tiny muted" style={{ marginTop: 2, whiteSpace: 'normal' }}>
                      {sn.note}
                    </div>
                  )}
                </div>
                <button
                  className="ghost small"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteSnapshot(sn.id)
                  }}
                  title="删除快照"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {saveOpen && (
        <Modal
          title="保存姿势快照"
          onClose={() => setSaveOpen(false)}
          footer={
            <>
              <button className="ghost" onClick={() => setSaveOpen(false)}>取消</button>
              <button
                className="primary"
                onClick={() => {
                  saveSnapshot(snapName, snapNote, thumbRef.current)
                  setSaveOpen(false)
                  toast({ tone: 'ok', title: '姿势快照已保存', detail: snapName })
                }}
              >
                保存
              </button>
            </>
          }
        >
          <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 108, flexShrink: 0 }}>
              <div className="mini-thumb" style={{ backgroundImage: thumbRef.current ? `url(${thumbRef.current})` : undefined }} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="field">
                <label>快照名称</label>
                <input type="text" value={snapName} onChange={(e) => setSnapName(e.target.value)} autoFocus />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>备注</label>
                <textarea
                  value={snapNote}
                  onChange={(e) => setSnapNote(e.target.value)}
                  placeholder="例如：右臂外展 60°，观察肩甲与胸甲配合"
                  style={{ minHeight: 64 }}
                />
              </div>
            </div>
          </div>
          <div className="section-note" style={{ margin: '12px -18px -16px', padding: '10px 18px' }}>
            快照同时记录当前姿态、装配方案与缩略图，可在校核单中直接引用。
          </div>
        </Modal>
      )}

      {submitOpen && (
        <Modal
          title="提交校核单"
          onClose={() => setSubmitOpen(false)}
          footer={
            <>
              <button className="ghost" onClick={() => setSubmitOpen(false)}>取消</button>
              <button className="primary" onClick={submit}>
                提交给品控
              </button>
            </>
          }
        >
          <div className="field">
            <label>校核标题</label>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder={`${model.code} ${model.version} 校核`}
            />
          </div>
          <div className="field">
            <label>说明 / 关注点</label>
            <textarea
              value={taskSummary}
              onChange={(e) => setTaskSummary(e.target.value)}
              placeholder="请品控重点确认：肘部 118° 时前臂与肩甲间隙、握拳手接口配合…"
              style={{ minHeight: 80 }}
            />
          </div>
          <label className="row" style={{ gap: 8, fontSize: 12, marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={useSnapshot}
              onChange={(e) => setUseSnapshot(e.target.checked)}
              style={{ width: 'auto', accentColor: 'var(--accent)' }}
            />
            关联当前姿势快照
          </label>

          <div className="grid cols-4" style={{ gap: 10 }}>
            <div className="stat" style={{ padding: '8px 10px' }}>
              <div className="label">最大穿透</div>
              <div className="value" style={{ fontSize: 19 }}>
                {res.interferences.length ? Math.max(...res.interferences.map((i) => i.depth)).toFixed(2) : '0.00'}
              </div>
              <div className="foot">mm</div>
            </div>
            <div className="stat" style={{ padding: '8px 10px' }}>
              <div className="label">最小间隙</div>
              <div className="value" style={{ fontSize: 19 }}>
                {res.minClearance.toFixed(1)}
              </div>
              <div className="foot">mm</div>
            </div>
            <div className="stat" style={{ padding: '8px 10px' }}>
              <div className="label">最小角度余量</div>
              <div className="value" style={{ fontSize: 19 }}>
                {Math.min(...res.margins.map((m) => m.margin)).toFixed(0)}°
              </div>
              <div className="foot">阈值 8°</div>
            </div>
            <div className="stat" style={{ padding: '8px 10px' }}>
              <div className="label">配件接口</div>
              <div className="value" style={{ fontSize: 19 }}>
                {res.interfaces.filter((i) => i.ok).length}/{res.interfaces.length}
              </div>
              <div className="foot">匹配项</div>
            </div>
          </div>

          <div className="banner info" style={{ marginTop: 12 }}>
            <span>ℹ</span>
            <div>提交后本单冻结当前姿势、装配与关节限值；配件改版会导致本单结果自动失效。</div>
          </div>
        </Modal>
      )}
    </div>
  )
}
