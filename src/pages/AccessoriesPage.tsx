import { useMemo, useState } from 'react'
import { CAN, denyHint, fmtDay, fmtTime, useStore } from '../store'
import type { Accessory, AccessoryKind, SocketType } from '../types'
import { Chip, Empty, Modal, Panel } from '../components/ui'
import { runCheck } from '../engine/evaluate'

const KIND_ICON: Record<AccessoryKind, string> = { 手型: '✋', 武器: '⚔', 底座: '⬢' }
const SOCKET_TYPES: SocketType[] = ['球窝', '圆榫', '卡榫', '螺纹']

export default function AccessoriesPage() {
  const accessories = useStore((s) => s.accessories)
  const assembly = useStore((s) => s.assembly)
  const equip = useStore((s) => s.equip)
  const model = useStore((s) => s.model)
  const pose = useStore((s) => s.pose)
  const reviseAccessory = useStore((s) => s.reviseAccessory)
  const tasks = useStore((s) => s.tasks)
  const go = useStore((s) => s.go)
  const toast = useStore((s) => s.toast)

  const [filter, setFilter] = useState<'全部' | AccessoryKind>('全部')
  const [detail, setDetail] = useState<string | null>(null)
  const [reviseId, setReviseId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const role = useStore((s) => s.role)
  const canEquip = CAN.equip(role)
  const canRevise = CAN.reviseAccessory(role)
  const canAdd = CAN.addAccessory(role)

  const shown = accessories.filter((a) => filter === '全部' || a.category === filter)

  // what would happen if each hand/weapon were equipped with the current pose
  const trial = useMemo(() => {
    const map = new Map<
      string,
      { pass: boolean; clashes: number; ifaceOk: boolean; ifaceTotal: number; note?: string }
    >()
    for (const a of accessories) {
      let asm = { ...assembly }
      let note: string | undefined
      if (a.category === '手型') {
        asm = { ...asm, hand: a.id }
      } else if (a.category === '武器') {
        asm = { ...asm, weapon: a.id }
        const hand = accessories.find((x) => x.id === asm.hand)
        if (!hand) note = '先装手型'
        else if (!hand.provides) note = `${hand.name}无握把`
      } else {
        asm = { ...asm, base: a.id }
      }
      const r = runCheck(model, accessories, pose, asm)
      // only the accessory under test counts for the verdict
      const mine = r.result.interfaces.filter(
        (i) => i.accessoryId === a.id || i.accessoryId.includes(a.id),
      )
      map.set(a.id, {
        pass: r.result.pass,
        clashes: r.result.severe.filter(
          (c) => c.partA.includes(a.name) || c.partB.includes(a.name),
        ).length,
        ifaceOk: mine.length ? mine.every((i) => i.ok) : !note,
        ifaceTotal: mine.length,
        note,
      })
    }
    return map
  }, [accessories, assembly, model, pose])

  const linkedTasks = (id: string) =>
    tasks.filter((t) => t.accessories.some((a) => a.id === id))

  const equipAccessory = (a: Accessory) => {
    const slot = a.category === '手型' ? 'hand' : a.category === '武器' ? 'weapon' : 'base'
    if (assembly[slot] === a.id) {
      equip(slot, undefined)
      toast({ tone: 'info', title: `已卸下 ${a.name}` })
      return
    }
    equip(slot, a.id)
    const t = trial.get(a.id)
    if (t && t.note) {
      toast({ tone: 'info', title: `已装配 ${a.name}`, detail: t.note + '，接口无法复核' })
    } else if (t && !t.ifaceOk) {
      toast({ tone: 'warn', title: `已装配 ${a.name}`, detail: '接口复核未通过，请在测试台确认' })
    } else if (t && t.clashes > 0) {
      toast({ tone: 'warn', title: `已装配 ${a.name}`, detail: `${t.clashes} 处超限穿透` })
    } else {
      toast({ tone: 'ok', title: `已装配 ${a.name}`, detail: '接口复核通过' })
    }
  }

  const equippedCount = [assembly.hand, assembly.weapon, assembly.base].filter(Boolean).length
  const detailAcc = detail ? accessories.find((a) => a.id === detail) : null
  const reviseAcc = reviseId ? accessories.find((a) => a.id === reviseId) : null

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>配件库</h2>
          <p>
            手型、武器、底座替换件统一管理。装配后系统按插孔规格自动复核接口匹配度；
            试装结果可从当前姿势实时推算。配件改版后，引用它的校核单与放行报告自动失效。
          </p>
        </div>
        <div className="right">
          <button
            onClick={() => setAddOpen(true)}
            disabled={!canAdd}
            title={!canAdd ? denyHint('新增配件', 'prototyper') : undefined}
          >
            + 新增配件
          </button>
          <Chip tone="accent" dot>{equippedCount}/3 已装配</Chip>
        </div>
      </div>

      <Panel
        title="配件清单"
        hint={`${accessories.length} 项 · 试装评测基于当前姿势 ${model.version}`}
        flush
        right={
          <div className="seg">
            {(['全部', '手型', '武器', '底座'] as const).map((k) => (
              <button key={k} className={filter === k ? 'active' : ''} onClick={() => setFilter(k)}>
                {k}
              </button>
            ))}
          </div>
        }
      >
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 40 }} />
              <th>配件</th>
              <th>类别</th>
              <th>版本</th>
              <th>需求接口</th>
              <th className="num">提供接口</th>
              <th>当前姿势试装</th>
              <th>引用校核单</th>
              <th style={{ width: 200 }} />
            </tr>
          </thead>
          <tbody>
            {shown.map((a) => {
              const equipped =
                assembly.hand === a.id || assembly.weapon === a.id || assembly.base === a.id
              const t = trial.get(a.id)
              const refs = linkedTasks(a.id)
              const issues = t ? !t.ifaceOk || t.clashes > 0 : false
              return (
                <tr key={a.id} className={`selectable ${equipped ? 'sel' : ''}`} onClick={() => setDetail(a.id)}>
                  <td>
                    <span className="sw" style={{ fontSize: 13 }}>{KIND_ICON[a.category]}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 550 }}>{a.name}</div>
                    <div className="mono tiny muted">{a.code}</div>
                  </td>
                  <td>
                    <Chip>{a.category}</Chip>
                  </td>
                  <td>
                    <div className="mono">{a.revision}</div>
                    <div className="tiny muted">{fmtDay(a.updatedAt)}</div>
                  </td>
                  <td className="mono tiny">
                    {a.requires.type} ø{a.requires.diameter.toFixed(1)}
                    <div className="muted">深 {a.requires.depth.toFixed(1)}</div>
                  </td>
                  <td className="num tiny mono">
                    {a.provides ? (
                      <>
                        {a.provides.type} ø{a.provides.diameter.toFixed(1)}
                        <div className="muted">深 {a.provides.depth.toFixed(1)}</div>
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    {t ? (
                      t.note ? (
                        <Chip tone="warn">{t.note}</Chip>
                      ) : (
                        <Chip tone={issues ? 'bad' : 'ok'} dot>
                          {!t.ifaceOk ? '接口不符' : t.clashes > 0 ? `${t.clashes} 处穿透` : '通过'}
                        </Chip>
                      )
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    {refs.length ? (
                      <span className="tiny dim">{refs.length} 单</span>
                    ) : (
                      <span className="tiny muted">无</span>
                    )}
                  </td>
                  <td>
                    <div className="row" style={{ justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className={`small ${equipped ? '' : 'primary'}`}
                        disabled={!canEquip}
                        title={!canEquip ? denyHint('装配试用', 'prototyper') : undefined}
                        onClick={() => equipAccessory(a)}
                      >
                        {equipped ? '卸下' : '装配试用'}
                      </button>
                      <button
                        className="ghost small"
                        disabled={!canRevise}
                        title={!canRevise ? denyHint('配件改版', 'prototyper') : undefined}
                        onClick={() => setReviseId(a.id)}
                      >
                        改版
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!shown.length && <Empty>该类别暂无配件</Empty>}
      </Panel>

      {equippedCount > 0 && (
        <div className="banner info" style={{ marginTop: 12 }}>
          <span>⌘</span>
          <div className="row wrap" style={{ gap: 10, flex: 1 }}>
            <span>当前装配方案：</span>
            {assembly.hand && <Chip tone="accent">{accessories.find((a) => a.id === assembly.hand)?.name}</Chip>}
            {assembly.weapon && <Chip tone="accent">{accessories.find((a) => a.id === assembly.weapon)?.name}</Chip>}
            {assembly.base && <Chip tone="accent">{accessories.find((a) => a.id === assembly.base)?.name}</Chip>}
            <div className="spacer" />
            <button className="small" onClick={() => go('bench')}>
              去测试台复核 →
            </button>
          </div>
        </div>
      )}

      {detailAcc && (
        <AccessoryDrawer
          acc={detailAcc}
          onClose={() => setDetail(null)}
          trial={trial.get(detailAcc.id)}
          refs={linkedTasks(detailAcc.id)}
          onEquip={() => equipAccessory(detailAcc)}
          equipped={
            assembly.hand === detailAcc.id ||
            assembly.weapon === detailAcc.id ||
            assembly.base === detailAcc.id
          }
        />
      )}

      {reviseAcc && (
        <ReviseModal
          acc={reviseAcc}
          affected={linkedTasks(reviseAcc.id).filter((t) => t.status !== 'released' || true)}
          onClose={() => setReviseId(null)}
          onSave={(patch) => {
            const refs = linkedTasks(reviseAcc.id)
            const affectedReports = useStore
              .getState()
              .reports.filter(
                (r) => !r.invalidatedAt && r.accessories.some((a) => a.id === reviseAcc.id),
              )
            reviseAccessory(reviseAcc.id, patch)
            setReviseId(null)
            const bits: string[] = []
            if (refs.length) bits.push(`${refs.length} 张校核单`)
            if (affectedReports.length) bits.push(`${affectedReports.length} 份放行报告`)
            toast({
              tone: 'warn',
              title: `${reviseAcc.name} 已改版`,
              detail: bits.length
                ? `${bits.join('、')}结果已失效，需重新校核`
                : '暂无引用，未触发失效',
            })
          }}
        />
      )}

      {addOpen && <AddAccessoryModal onClose={() => setAddOpen(false)} />}
    </div>
  )
}

function AccessoryDrawer({
  acc,
  onClose,
  trial,
  refs,
  onEquip,
  equipped,
}: {
  acc: Accessory
  onClose: () => void
  trial?: { pass: boolean; clashes: number; ifaceOk: boolean; ifaceTotal: number; note?: string }
  refs: ReturnType<typeof useStore.getState>['tasks']
  onEquip: () => void
  equipped: boolean
}) {
  const role = useStore((s) => s.role)
  const canEquip = CAN.equip(role)
  return (
    <>
      <div className="scrim" onPointerDown={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <h3>
            {KIND_ICON[acc.category]} {acc.name}
          </h3>
          <Chip>{acc.revision}</Chip>
          <div className="spacer" />
          <button className="ghost small" onClick={onClose}>✕</button>
        </div>
        <div className="drawer-body">
          <div style={{ padding: 16 }}>
            <dl className="kv" style={{ gridTemplateColumns: '86px 1fr' }}>
              <dt>配件编号</dt>
              <dd className="mono">{acc.code}</dd>
              <dt>类别</dt>
              <dd>{acc.category}</dd>
              <dt>状态</dt>
              <dd>
                <Chip tone={acc.status === '量产' ? 'ok' : acc.status === '试制' ? 'warn' : 'default'}>
                  {acc.status}
                </Chip>
              </dd>
              <dt>安装位置</dt>
              <dd>{acc.attachment === 'both_wrists' ? '双腕' : acc.attachment === 'wrist_R' ? '右腕' : '骨盆 / 底座'}</dd>
              <dt>需求接口</dt>
              <dd className="mono tiny">
                {acc.requires.type} ø{acc.requires.diameter.toFixed(2)} ±{acc.requires.tolerance.toFixed(2)} · 深 ≥{acc.requires.depth.toFixed(1)}mm
              </dd>
              {acc.provides && (
                <>
                  <dt>提供接口</dt>
                  <dd className="mono tiny">
                    {acc.provides.type} ø{acc.provides.diameter.toFixed(2)} · 深 {acc.provides.depth.toFixed(1)}mm
                  </dd>
                </>
              )}
              <dt>兼容模型</dt>
              <dd className="tiny">{acc.compatibleModels.join(', ')}</dd>
              <dt>最近改动</dt>
              <dd className="tiny dim">
                {fmtTime(acc.updatedAt)} · {acc.updatedBy}
              </dd>
            </dl>
            <div className="banner" style={{ marginTop: 12 }}>
              <span>✎</span>
              <div>{acc.note}</div>
            </div>
            <div className="row wrap" style={{ marginTop: 10, gap: 6 }}>
              {acc.tags.map((t) => (
                <Chip key={t}>{t}</Chip>
              ))}
            </div>

            <h4 style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--fg-3)', margin: '20px 0 8px' }}>
              几何代理体
            </h4>
            <table className="tbl" style={{ fontSize: 11 }}>
              <tbody>
                {acc.proxies.map((p, i) => (
                  <tr key={i}>
                    <td>{p.name}</td>
                    <td className="mono tiny num">r {p.radius.toFixed(1)}</td>
                    <td className="num">
                      {p.collide ? <Chip tone="ok">参与校核</Chip> : <Chip>仅显示</Chip>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h4 style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--fg-3)', margin: '20px 0 8px' }}>
              当前姿势试装
            </h4>
            {trial ? (
              <div className={`banner ${!trial.ifaceOk || trial.clashes ? 'bad' : 'ok'}`}>
                <span>{!trial.ifaceOk || trial.clashes ? '✕' : '✓'}</span>
                <div>
                  {!trial.ifaceOk && <div>接口复核不通过，装配方案不可提交。</div>}
                  {trial.clashes > 0 && <div>{trial.clashes} 处穿透超过 0.3mm。</div>}
                  {trial.ifaceOk && trial.clashes === 0 && <div>接口匹配，无超限穿插，可提交校核。</div>}
                </div>
              </div>
            ) : (
              <div className="tiny muted">—</div>
            )}

            <h4 style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--fg-3)', margin: '20px 0 8px' }}>
              引用此配件的校核单 ({refs.length})
            </h4>
            {refs.length === 0 && <div className="tiny muted">暂无引用。</div>}
            {refs.map((t) => (
              <div key={t.id} className="row" style={{ fontSize: 11.5, padding: '5px 0', borderBottom: '1px solid #1a212c' }}>
                <span className="mono tiny" style={{ width: 56 }}>{t.code}</span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.title}
                </span>
                <Chip tone={t.status === 'released' ? 'ok' : t.status === 'rejected' ? 'bad' : 'warn'}>
                  {t.status === 'released' ? '已放行' : t.status === 'rejected' ? '已退回' : '待校核'}
                </Chip>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: 12, borderTop: '1px solid var(--line)' }}>
          <button
            className="primary"
            style={{ width: '100%' }}
            disabled={!canEquip}
            title={!canEquip ? denyHint('装配试用', 'prototyper') : undefined}
            onClick={onEquip}
          >
            {equipped ? '从当前方案卸下' : '装配到当前方案'}
          </button>
        </div>
      </aside>
    </>
  )
}

function ReviseModal({
  acc,
  affected,
  onClose,
  onSave,
}: {
  acc: Accessory
  affected: { id: string; code: string; title: string; status: string }[]
  onClose: () => void
  onSave: (patch: Partial<Accessory>) => void
}) {
  const [note, setNote] = useState('')
  const [diameter, setDiameter] = useState(acc.requires.diameter)
  const [depth, setDepth] = useState(acc.requires.depth)
  const [type, setType] = useState<SocketType>(acc.requires.type)
  const pending = affected.filter((t) => t.status !== 'released')
  const released = affected.filter((t) => t.status === 'released')
  const changed =
    Math.abs(diameter - acc.requires.diameter) > 1e-6 ||
    Math.abs(depth - acc.requires.depth) > 1e-6 ||
    type !== acc.requires.type

  return (
    <Modal
      title={`配件改版 · ${acc.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="ghost" onClick={onClose}>取消</button>
          <button
            className="danger"
            onClick={() =>
              onSave({
                requires: { ...acc.requires, type, diameter, depth },
                note: note.trim() || acc.note,
              })
            }
          >
            发布 {acc.revision} → R{acc.rev + 1}
          </button>
        </>
      }
    >
      <div className="banner warn" style={{ marginBottom: 14 }}>
        <span>⚠</span>
        <div>
          改版会生成新版本号并使引用此配件的校核单结果与放行报告自动失效，
          相关工程师需按新版本重新校核。
        </div>
      </div>

      <div className="row" style={{ gap: 10 }}>
        <div className="field" style={{ flex: 1 }}>
          <label>接口形式</label>
          <select value={type} onChange={(e) => setType(e.target.value as SocketType)}>
            {SOCKET_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>配合直径 (mm)</label>
          <input className="mono" type="number" step="0.1" value={diameter} onChange={(e) => setDiameter(Number(e.target.value))} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>嵌合深度 (mm)</label>
          <input className="mono" type="number" step="0.1" value={depth} onChange={(e) => setDepth(Number(e.target.value))} />
        </div>
      </div>

      <div className="field">
        <label>改版说明</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如：球窝加深至 3.2mm，修正脱出力不足" />
      </div>

      <div style={{ fontSize: 11.5 }}>
        <div className="muted" style={{ marginBottom: 6 }}>
          将失效的校核单 {pending.length} 张 / 放行报告 {released.length} 份
        </div>
        {affected.map((t) => (
          <div key={t.id} className="row" style={{ padding: '4px 0', borderTop: '1px solid #1a212c' }}>
            <span className="mono tiny" style={{ width: 56 }}>{t.code}</span>
            <span style={{ flex: 1 }}>{t.title}</span>
            <Chip tone={t.status === 'released' ? 'ok' : t.status === 'rejected' ? 'bad' : 'warn'}>
              {t.status === 'released' ? '已放行' : t.status === 'rejected' ? '已退回' : '待校核'}
            </Chip>
          </div>
        ))}
        {!affected.length && <div className="tiny muted">没有校核单引用此配件。</div>}
      </div>

      {!changed && (
        <div className="banner info" style={{ marginTop: 12 }}>
          <span>ℹ</span>
          <div>接口参数未变化，仅更新说明文字。改版仍会使引用结果失效，请确认。</div>
        </div>
      )}
    </Modal>
  )
}

function AddAccessoryModal({ onClose }: { onClose: () => void }) {
  const addAccessory = useStore((s) => s.addAccessory)
  const toast = useStore((s) => s.toast)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<AccessoryKind>('手型')
  const [type, setType] = useState<SocketType>('球窝')
  const [diameter, setDiameter] = useState(3)
  const [depth, setDepth] = useState(3)

  const ok = name.trim().length > 0
  return (
    <Modal
      title="新增配件"
      onClose={onClose}
      footer={
        <>
          <button className="ghost" onClick={onClose}>取消</button>
          <button
            className="primary"
            disabled={!ok}
            onClick={() => {
              const seq = String(100 + Math.floor(Math.random() * 800))
              addAccessory({
                id: `acc_new_${Date.now()}`,
                code: `N-${seq}`,
                name: name.trim(),
                category,
                rev: 1,
                revision: 'R1',
                status: '试制',
                socketKey: category === '底座' ? 'root' : category === '武器' ? 'grip' : 'wrist',
                attachment: category === '底座' ? 'root' : category === '手型' ? 'both_wrists' : 'wrist_R',
                requires: { type, diameter, depth, tolerance: 0.05 },
                mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0] },
                matedParts: category === '手型' ? ['p_farm_L', 'p_farm_R'] : [],
                proxies: [
                  {
                    name: name.trim(),
                    a: [0, -1, 0],
                    b: [0, -12, 0],
                    radius: 5,
                    color: '#d8c6ad',
                    collide: true,
                  },
                ],
                compatibleModels: ['mdl-0001'],
                updatedAt: new Date().toISOString(),
                updatedBy: '李梦',
                note: '新增试制配件',
                tags: ['试制'],
              })
              toast({ tone: 'ok', title: '配件已入库', detail: `${name.trim()} R1` })
              onClose()
            }}
          >
            入库
          </button>
        </>
      }
    >
      <div className="field">
        <label>配件名称</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：张开手 · 掌心向上" autoFocus />
      </div>
      <div className="field">
        <label>类别</label>
        <div className="seg">
          {(['手型', '武器', '底座'] as const).map((k) => (
            <button key={k} className={category === k ? 'active' : ''} onClick={() => setCategory(k)}>
              {k}
            </button>
          ))}
        </div>
      </div>
      <div className="row" style={{ gap: 10 }}>
        <div className="field" style={{ flex: 1 }}>
          <label>需求接口形式</label>
          <select value={type} onChange={(e) => setType(e.target.value as SocketType)}>
            {SOCKET_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>配合直径 (mm)</label>
          <input className="mono" type="number" step="0.1" value={diameter} onChange={(e) => setDiameter(Number(e.target.value))} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>嵌合深度 (mm)</label>
          <input className="mono" type="number" step="0.1" value={depth} onChange={(e) => setDepth(Number(e.target.value))} />
        </div>
      </div>
      <div className="banner info">
        <span>ℹ</span>
        <div>新配件以试制状态入库，几何代理体按默认手掌尺寸生成，可在详情中调整。</div>
      </div>
    </Modal>
  )
}
