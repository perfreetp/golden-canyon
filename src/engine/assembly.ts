import type {
  Accessory,
  Assembly,
  FigureModel,
  InterfaceRecord,
  InterfaceRow,
  MountSpec,
  SocketSpec,
  Vec3,
} from '../types'
import type { JointTransform } from './rig'
import type { Quat } from './math'
import { quatFromEulerDeg, quatMul, quatRotate, vadd } from './math'

export interface PlacedAccessory {
  acc: Accessory
  slot: 'wrist_L' | 'wrist_R' | 'root'
  /** joint the accessory rides on, for relative-motion filtering */
  jointId: string
  /** world frame the accessory's local proxies are expressed in */
  pos: Vec3
  quat: Quat
  socketRef: string
  socketLabel: string
  interface: InterfaceRecord
}

/** socket key -> joint that carries it */
export const SOCKET_JOINT: Record<string, string> = {
  wrist_L: 'j_wrist_L',
  wrist_R: 'j_wrist_R',
  root: 'j_root',
}

export interface AssemblyResolution {
  placed: PlacedAccessory[]
  interfaces: InterfaceRecord[]
  notices: string[]
}

export function socketLabel(
  ref: string,
  accessories: Accessory[],
): string {
  if (ref === 'wrist_L') return '左腕球窝'
  if (ref === 'wrist_R') return '右腕球窝'
  if (ref === 'root') return '骨盆底圆榫孔'
  if (ref.startsWith('prop:')) {
    const a = accessories.find((x) => x.id === ref.slice(5))
    return a ? `${a.name}·握把` : '握把接口'
  }
  return ref
}

export function frameOf(
  parentPos: Vec3,
  parentQuat: Quat,
  mount: MountSpec,
): { pos: Vec3; quat: Quat } {
  const mq = quatFromEulerDeg(mount.rotDeg)
  return { pos: vadd(parentPos, quatRotate(parentQuat, mount.pos)), quat: quatMul(parentQuat, mq) }
}

function buildInterface(
  acc: Accessory,
  socket: SocketSpec | undefined,
  target: string,
  socketRef: string,
  accessories: Accessory[],
): InterfaceRecord {
  const rows: InterfaceRow[] = []
  if (!socket) {
    rows.push({
      label: '接口存在性',
      actual: '未找到可插入的接口',
      required: socketLabel(socketRef, accessories),
      ok: false,
    })
  } else {
    rows.push({ label: '接口形式', actual: socket.type, required: acc.requires.type, ok: socket.type === acc.requires.type })
    const dDiff = Math.abs(socket.diameter - acc.requires.diameter)
    rows.push({
      label: '配合直径',
      actual: `ø${socket.diameter.toFixed(2)} ±${socket.tolerance.toFixed(2)}`,
      required: `ø${acc.requires.diameter.toFixed(2)}`,
      ok: dDiff <= socket.tolerance + 1e-6,
    })
    rows.push({
      label: '嵌合深度',
      actual: `${socket.depth.toFixed(1)} mm`,
      required: `≥ ${acc.requires.depth.toFixed(1)} mm`,
      ok: socket.depth + 1e-6 >= acc.requires.depth,
    })
    if (socket.note) rows.push({ label: '备注', actual: socket.note, required: '—', ok: true })
  }
  return {
    accessoryId: acc.id,
    name: acc.name,
    code: acc.code,
    revision: acc.revision,
    target,
    ok: rows.every((r) => r.ok),
    rows,
  }
}

/**
 * Work out where every equipped accessory sits and whether its interface matches.
 * A weapon plugs into the socket the equipped hand provides; with no hand it falls
 * back to the wrist socket (which will fail the interface check, as it should).
 */
export function resolveAssembly(
  model: FigureModel,
  accessories: Accessory[],
  assembly: Assembly,
  transforms: Map<string, JointTransform>,
): AssemblyResolution {
  const byId = new Map(accessories.map((a) => [a.id, a]))
  const placed: PlacedAccessory[] = []
  const notices: string[] = []

  const hand = assembly.hand ? byId.get(assembly.hand) : undefined
  const wristR = transforms.get(SOCKET_JOINT.wrist_R)
  const wristL = transforms.get(SOCKET_JOINT.wrist_L)


  if (hand) {
    if (hand.category !== '手型') {
      notices.push(`${hand.name} 不是手型，不能装配到腕部`)
    } else {
      const sides: ('wrist_L' | 'wrist_R')[] =
        hand.attachment === 'both_wrists' ? ['wrist_L', 'wrist_R'] : ['wrist_R']
      for (const side of sides) {
        const t = side === 'wrist_L' ? wristL : wristR
        if (!t) continue
        const ref = side
        const label = `${socketLabel(ref, accessories)}（${side === 'wrist_L' ? '左' : '右'}）`
        const frame = frameOf(t.pos, t.quat, hand.mount)
        placed.push({
          acc: hand,
          slot: side,
          jointId: SOCKET_JOINT[side],
          pos: frame.pos,
          quat: frame.quat,
          socketRef: ref,
          socketLabel: label,
          interface: buildInterface(hand, model.sockets[ref], label, ref, accessories),
        })
      }
    }
  }

  if (assembly.weapon) {
    const w = byId.get(assembly.weapon)
    if (!w) {
      notices.push('所选武器不在配件库中')
    } else if (hand && hand.provides && hand.grip && wristR) {
      const gripFrame = frameOf(wristR.pos, wristR.quat, hand.grip)
      const frame = frameOf(gripFrame.pos, gripFrame.quat, w.mount)
      const ref = `prop:${hand.id}`
      const label = `${hand.name}·握把（${hand.provides.type} ø${hand.provides.diameter}）`
      placed.push({
        acc: w,
        slot: 'wrist_R',
        jointId: SOCKET_JOINT.wrist_R,
        pos: frame.pos,
        quat: frame.quat,
        socketRef: ref,
        socketLabel: label,
        interface: buildInterface(w, hand.provides, label, ref, accessories),
      })
    } else if (wristR) {
      const frame = frameOf(wristR.pos, wristR.quat, w.mount)
      const label = `${socketLabel('wrist_R', accessories)}（无握把，直插腕部）`
      placed.push({
        acc: w,
        slot: 'wrist_R',
        jointId: SOCKET_JOINT.wrist_R,
        pos: frame.pos,
        quat: frame.quat,
        socketRef: 'wrist_R',
        socketLabel: label,
        interface: buildInterface(w, model.sockets.wrist_R, label, 'wrist_R', accessories),
      })
      notices.push(`${w.name} 无对应握把接口，暂按腕部直插处理`)
    }
  }

  if (assembly.base) {
    const b = byId.get(assembly.base)
    if (!b) notices.push('所选底座不在配件库中')
    else {
      // The pedestal is a world-space fixture: the figure stands on it, so its
      // frame is absolute rather than following the pelvis.
      const label = socketLabel('root', accessories)
      placed.push({
        acc: b,
        slot: 'root',
        jointId: '__world__',
        pos: b.mount.pos,
        quat: quatFromEulerDeg(b.mount.rotDeg),
        socketRef: 'root',
        socketLabel: label,
        interface: buildInterface(b, model.sockets.root, label, 'root', accessories),
      })
    }
  }

  return { placed, interfaces: placed.map((p) => p.interface), notices }
}
