import { useEffect, useMemo, useRef, useState } from 'react'
import { CAN, denyHint, fmtTime, useStore } from '../store'
import type { DofDef, JointDef, JointKind, Vec3 } from '../types'
import { Chip, Empty, Modal, Panel } from '../components/ui'
import Viewport, { type ViewportApi } from '../components/Viewport'
import { neutralPose } from '../engine/rig'
import { dofMargin } from '../engine/evaluate'

import { axisLabel, axisHint } from '../lib/axis'

const AXIS_OPTIONS: { label: string; v: Vec3 }[] = [
  { label: '+X', v: [1, 0, 0] },
  { label: '−X', v: [-1, 0, 0] },
  { label: '+Y', v: [0, 1, 0] },
  { label: '−Y', v: [0, -1, 0] },
  { label: '+Z', v: [0, 0, 1] },
  { label: '−Z', v: [0, 0, -1] },
]

export default function ModelPage() {
  const model = useStore((s) => s.model)
  const pose = useStore((s) => s.pose)
  const assembly = useStore((s) => s.assembly)
  const accessories = useStore((s) => s.accessories)
  const selectedJoint = useStore((s) => s.selectedJoint)
  const setPoseValue = useStore((s) => s.setPoseValue)
  const calibrateJoint = useStore((s) => s.calibrateJoint)
  const toggleCalibrated = useStore((s) => s.toggleCalibrated)
  const importModel = useStore((s) => s.importModel)
  const toast = useStore((s) => s.toast)
  const role = useStore((s) => s.role)
  const canCalibrate = CAN.calibrate(role)

  const [editOpen, setEditOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const joint = model.joints.find((j) => j.id === selectedJoint) ?? model.joints[0]
  const selectJoint = useStore((s) => s.selectJoint)

  const calibratedCount = model.joints.filter((j) => j.calibrated).length
  const allCalibrated = calibratedCount === model.joints.length

  const partCount = model.parts.length
  const stats = useMemo(() => {
    const balls = model.joints.filter((j) => j.kind === 'ball').length
    return { balls, hinges: model.joints.length - balls }
  }, [model.joints])

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>模型关节配置</h2>
          <p>
            导入人偶分件模型后逐件标定关节：判定球关节或铰链，指定旋转轴向与活动角度上下限。
            标定结果是姿势测试台限位与角度余量校核的依据。
          </p>
        </div>
        <div className="right">
          <button
            onClick={() => setImportOpen(true)}
            disabled={!CAN.importModel(role)}
            title={!CAN.importModel(role) ? denyHint('导入模型', 'engineer') : undefined}
          >
            ⤓ 重新导入分件模型
          </button>
          <Chip tone={allCalibrated ? 'ok' : 'warn'} dot>
            {calibratedCount}/{model.joints.length} 关节已标定
          </Chip>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.05fr 1.55fr' }}>
        <Panel
          title="模型清单"
          hint={`${model.source}`}
          right={<Chip tone={model.status === 'configured' ? 'ok' : 'warn'}>{model.status === 'configured' ? '已配置' : '待配置'}</Chip>}
        >
          <dl className="kv" style={{ gridTemplateColumns: '78px 1fr' }}>
            <dt>模型编号</dt>
            <dd className="mono">{model.code}</dd>
            <dt>名称</dt>
            <dd>{model.name}</dd>
            <dt>比例 / 全高</dt>
            <dd className="mono">
              {model.scale} · {model.heightMm} mm
            </dd>
            <dt>版本</dt>
            <dd className="mono">{model.version}</dd>
            <dt>分件数量</dt>
            <dd className="mono">{partCount} 件</dd>
            <dt>关节构成</dt>
            <dd className="mono">
              {stats.balls} 球关节 / {stats.hinges} 铰链
            </dd>
            <dt>导入</dt>
            <dd className="tiny dim">
              {fmtTime(model.importedAt)} · {model.importedBy}
            </dd>
          </dl>
          <div className="banner info" style={{ marginTop: 12 }}>
            <span>ℹ</span>
            <div>{model.note}</div>
          </div>
        </Panel>

        <Panel title="分件与关节拓扑" hint="以胶囊体代理分件几何，用于穿插检测">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {model.parts.map((p) => {
              const j = model.joints.find((x) => x.id === p.jointId)
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 9px',
                    borderRadius: 6,
                    border: '1px solid var(--line)',
                    background: '#121821',
                    fontSize: 11.5,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: p.color,
                      border: '1px solid rgba(255,255,255,.18)',
                    }}
                  />
                  {p.name}
                  <span className="mono tiny" style={{ color: 'var(--fg-3)' }}>
                    {j?.code}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="section-note" style={{ margin: '12px -14px 0', paddingLeft: 14 }}>
            同关节装配的分件不做穿插判定；{model.ignorePairs.length} 组贴合接缝已登记豁免。
          </div>
        </Panel>
      </div>

      {!canCalibrate && (
        <div className="banner info" style={{ marginTop: 14 }}>
          <span>ℹ</span>
          <div>{denyHint('关节标定与模型导入', 'engineer')}；当前身份仅可查看配置与拖动滑块预览。</div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: '300px minmax(0,1fr) 366px', marginTop: 14 }}>
        <Panel title="关节列表" hint={`${model.joints.length} 个`} flush>
          <div style={{ maxHeight: 470, overflow: 'auto' }}>
            {model.joints.map((j) => (
              <div
                key={j.id}
                className={`joint-row ${j.id === joint?.id ? 'sel' : ''}`}
                onClick={() => selectJoint(j.id)}
                style={{ margin: '2px 6px' }}
              >
                <span className="code">{j.code}</span>
                <span className="nm">{j.name}</span>
                {!j.calibrated && (
                  <span className="tiny" style={{ color: 'var(--warn)' }}>
                    未标定
                  </span>
                )}
                <span className="kd">{j.kind === 'hinge' ? 'HINGE' : 'BALL'}</span>
              </div>
            ))}
          </div>
        </Panel>

        <div className="panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 470 }}>
            <Viewport
              model={model}
              accessories={accessories}
              pose={pose}
              assembly={assembly}
              selectedJoint={joint?.id ?? null}
              onSelectJoint={selectJoint}
              showLabels={false}
              showCollision={false}
              compact
            />
          </div>
        </div>

        <Panel
          title={joint ? `${joint.code} ${joint.name}` : '选择关节'}
          right={
            joint && (
              <button
                className="small"
                onClick={() => setEditOpen(true)}
                disabled={!canCalibrate}
                title={!canCalibrate ? denyHint('关节标定', 'engineer') : undefined}
              >
                标定…
              </button>
            )
          }
          flush
        >
          {joint ? (
            <div>
              <div className="section-note">
                {joint.kind === 'hinge' ? '铰链关节 · 单轴' : '球关节 · 多轴'} ·
                父级 {joint.parent ? model.joints.find((j) => j.id === joint.parent)?.name ?? joint.parent : '根节点'}
                <div style={{ marginTop: 6 }}>
                  <Chip tone={joint.calibrated ? 'ok' : 'warn'} dot>
                    {joint.calibrated ? '已标定' : '未标定'}
                  </Chip>
                </div>
              </div>
              {joint.dofs.map((d, i) => {
                const cur = pose[joint.id]?.[i] ?? 0
                return (
                  <div className="dof" key={i}>
                    <div className="top">
                      <span className="nm">{d.label}</span>
                      <span className="axis-pill" title={axisHint(d.axis)}>
                        <i>{axisLabel(d.axis)}</i>
                      </span>
                      <span className="val">{Math.round(cur)}°</span>
                    </div>
                    <input
                      type="range"
                      min={d.min}
                      max={d.max}
                      step={1}
                      value={cur}
                      disabled={!canCalibrate}
                      onChange={(e) => setPoseValue(joint.id, i, Number(e.target.value))}
                    />
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <span className="rng">下限 {d.min}°</span>
                      <span className="rng">余量 {Math.round(dofMargin(d, cur))}°</span>
                      <span className="rng">上限 {d.max}°</span>
                    </div>
                  </div>
                )
              })}
              <div style={{ padding: 12 }}>
                <button
                  className="small"
                  disabled={!canCalibrate}
                  title={!canCalibrate ? denyHint('关节标定', 'engineer') : undefined}
                  onClick={() => {
                    toggleCalibrated(joint.id, !joint.calibrated)
                    toast({
                      tone: joint.calibrated ? 'warn' : 'ok',
                      title: joint.calibrated ? '已撤销标定' : '已标记为已标定',
                      detail: joint.name,
                    })
                  }}
                >
                  {joint.calibrated ? '撤销标定' : '标记已标定'}
                </button>
              </div>
              <div className="section-note" style={{ borderTop: '1px solid #1a212c' }}>
                标定项变更后，使用此模型的校核单不会自动失效，但重新校核时按新限值判定。
              </div>
            </div>
          ) : (
            <Empty>选择左侧关节查看参数</Empty>
          )}
        </Panel>
      </div>

      {editOpen && joint && (
        <CalibrationModal
          joint={joint}
          onClose={() => setEditOpen(false)}
          onSave={(kind, dofs) => {
            calibrateJoint(joint.id, kind, dofs)
            setEditOpen(false)
            toast({ tone: 'ok', title: '关节标定已保存', detail: `${joint.name} · ${kind === 'hinge' ? '铰链' : '球关节'}` })
          }}
        />
      )}
      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onImport={(file, name) => {
            importModel({ source: file, name })
            setImportOpen(false)
            toast({ tone: 'ok', title: '模型已重新导入', detail: `${file} · 待重新标定关节` })
          }}
        />
      )}
    </div>
  )
}

function CalibrationModal({
  joint,
  onClose,
  onSave,
}: {
  joint: JointDef
  onClose: () => void
  onSave: (kind: JointKind, dofs: DofDef[]) => void
}) {
  const [kind, setKind] = useState<JointKind>(joint.kind)
  const [dofs, setDofs] = useState<DofDef[]>(() =>
    joint.dofs.map((d) => ({ ...d, axis: [...d.axis] as Vec3 })),
  )

  useEffect(() => {
    if (kind === 'hinge' && dofs.length > 1) setDofs([dofs[0]])
    if (kind === 'ball' && dofs.length === 1) {
      setDofs([
        dofs[0],
        { label: '第二轴', axis: [0, 0, 1], min: -45, max: 45 },
      ])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])

  const setDof = (i: number, patch: Partial<DofDef>) =>
    setDofs((ds) => ds.map((d, idx) => (idx === i ? { ...d, ...patch } : d)))

  const invalid = dofs.some((d) => d.max <= d.min)

  return (
    <Modal
      title={`标定 · ${joint.code} ${joint.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="ghost" onClick={onClose}>
            取消
          </button>
          <button
            className="primary"
            disabled={invalid}
            onClick={() => onSave(kind, dofs)}
          >
            保存标定
          </button>
        </>
      }
    >
      <div className="field">
        <label>关节类型</label>
        <div className="seg">
          <button className={kind === 'hinge' ? 'active' : ''} onClick={() => setKind('hinge')}>
            铰链（单轴）
          </button>
          <button className={kind === 'ball' ? 'active' : ''} onClick={() => setKind('ball')}>
            球关节（多轴）
          </button>
        </div>
        <div className="help">
          铰链仅允许绕单一轴向旋转，例如肘部 120°、膝部 95°；球关节可分解为 2–3 个旋转轴。
        </div>
      </div>

      {dofs.map((d, i) => (
        <div key={i} style={{ borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 12 }}>
          <div className="row" style={{ marginBottom: 8 }}>
            <b style={{ fontSize: 12, color: 'var(--fg-2)' }}>轴 {i + 1}</b>
            <div className="spacer" />
            {kind === 'ball' && dofs.length > 1 && (
              <button className="ghost small" onClick={() => setDofs(dofs.filter((_, x) => x !== i))}>
                删除
              </button>
            )}
          </div>
          <div className="field">
            <label>名称</label>
            <input type="text" value={d.label} onChange={(e) => setDof(i, { label: e.target.value })} />
          </div>
          <div className="field">
            <label>旋转轴向</label>
            <div className="row wrap">
              {AXIS_OPTIONS.map((o) => (
                <button
                  key={o.label}
                  className={`small ${d.axis.every((x, k) => x === o.v[k]) ? 'primary' : ''}`}
                  onClick={() => setDof(i, { axis: [...o.v] as Vec3 })}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <div className="help">
              {axisHint(d.axis)} · 当前 {axisLabel(d.axis)}
            </div>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label>角度下限 (°)</label>
              <input
                className="mono"
                type="number"
                value={d.min}
                onChange={(e) => setDof(i, { min: Number(e.target.value) })}
              />
            </div>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label>角度上限 (°)</label>
              <input
                className="mono"
                type="number"
                value={d.max}
                onChange={(e) => setDof(i, { max: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>
      ))}

      {kind === 'ball' && dofs.length < 3 && (
        <button
          className="small"
          style={{ marginTop: 12 }}
          onClick={() => setDofs([...dofs, { label: `轴${dofs.length + 1}`, axis: [0, 1, 0], min: -45, max: 45 }])}
        >
          + 增加旋转轴
        </button>
      )}
      {invalid && (
        <div className="banner bad" style={{ marginTop: 12 }}>
          上限必须大于下限
        </div>
      )}
    </Modal>
  )
}

function ImportModal({
  onClose,
  onImport,
}: {
  onClose: () => void
  onImport: (file: string, name: string) => void
}) {
  const [file, setFile] = useState('alice_armored_v3.3.fbx')
  const [name, setName] = useState('艾莉丝 · 武装形态 1/7')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <Modal
      title="重新导入分件模型"
      onClose={onClose}
      footer={
        <>
          <button className="ghost" onClick={onClose}>
            取消
          </button>
          <button className="primary" onClick={() => onImport(file, name)}>
            导入并重建关节表
          </button>
        </>
      }
    >
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files?.[0]
          if (f) setFile(f.name)
        }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `1.5px dashed ${dragging ? 'var(--accent)' : 'var(--line-2)'}`,
          borderRadius: 8,
          padding: '28px 16px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? '#1d1a12' : '#10151d',
        }}
      >
        <div style={{ fontSize: 20, opacity: 0.6 }}>⤓</div>
        <div style={{ marginTop: 6, fontSize: 12.5 }}>拖入 FBX / OBJ / STEP 分件模型，或点击选择</div>
        <div className="tiny muted" style={{ marginTop: 4 }}>
          支持带装配层级的网格；导入后需重新标定关节
        </div>
        <input
          ref={inputRef}
          type="file"
          hidden
          accept=".fbx,.obj,.step,.stp,.glb,.gltf"
          onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0].name)}
        />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label>模型文件名</label>
        <input type="text" className="mono" value={file} onChange={(e) => setFile(e.target.value)} />
      </div>
      <div className="field">
        <label>模型名称</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="banner warn">
        <span>⚠</span>
        <div>重新导入会重置关节标定表；已有校核单保留历史快照，不受影响。</div>
      </div>
    </Modal>
  )
}
