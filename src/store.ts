import { create } from 'zustand'
import type {
  Accessory,
  AccessoryRef,
  Assembly,
  CheckTask,
  FigureModel,
  LogEntry,
  LogKind,
  Pose,
  ReleaseReport,
  Role,
  Snapshot,
  TaskStatus,
  ToastMsg,
  UserProfile,
} from './types'
import { buildSampleModel } from './data/sampleModel'
import { buildAccessories } from './data/accessories'
import { clampPose, neutralPose } from './engine/rig'
import { seedTasks } from './data/seed'
import { runCheck, type CheckResult } from './engine/evaluate'

export type PageKey = 'home' | 'model' | 'bench' | 'accessories' | 'tasks' | 'reports'

const PAGE_KEYS: PageKey[] = ['home', 'model', 'bench', 'accessories', 'tasks', 'reports']

/** deep link support: #/bench opens the pose bench directly */
function initialPage(): PageKey {
  if (typeof window === 'undefined') return 'home'
  const h = window.location.hash.replace(/^#\/?/, '')
  return (PAGE_KEYS as string[]).includes(h) ? (h as PageKey) : 'home'
}

export const USERS: Record<Role, UserProfile> = {
  engineer: { role: 'engineer', name: '陈志远', title: '结构工程师', initials: 'CY' },
  prototyper: { role: 'prototyper', name: '李梦', title: '原型师', initials: 'LM' },
  qc: { role: 'qc', name: '周岚', title: '品控主管', initials: 'ZL' },
}

const ACCOUNT_OF: Record<Role, string> = {
  engineer: '陈工 · 结构',
  prototyper: '李工 · 原型',
  qc: '周工 · 品控',
}

export function accountName(role: Role): string {
  return ACCOUNT_OF[role]
}

/**
 * Who may do what. The three roles share one tool but own different steps:
 *  - 结构工程师 owns the joint configuration (the physical limits)
 *  - 原型师 owns poses, accessory trials and submits the check card
 *  - 品控主管 owns review / release, and can read everything
 */
export const CAN = {
  calibrate: (r: Role) => r === 'engineer',
  importModel: (r: Role) => r === 'engineer',
  savePose: (r: Role) => r === 'prototyper' || r === 'engineer',
  equip: (r: Role) => r === 'prototyper' || r === 'engineer',
  reviseAccessory: (r: Role) => r === 'prototyper',
  addAccessory: (r: Role) => r === 'prototyper',
  submit: (r: Role) => r === 'prototyper' || r === 'engineer',
  review: (r: Role) => r === 'qc',
} as const

export function denyHint(what: string, needs: Role): string {
  return `${what}需要「${USERS[needs].title}」身份`
}

let logSeq = 1
let toastSeq = 1
let idSeq = 1
const nextId = (prefix: string) => `${prefix}-${String(idSeq++).padStart(4, '0')}`

function nowIso(): string {
  return new Date().toISOString()
}

/** ISO -> 2026-11-16 14:03 */
export function fmtTime(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function fmtDay(iso: string): string {
  return fmtTime(iso).slice(0, 10)
}

/** hours between two ISO strings, for "recently changed" hints */
export function hoursAgo(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3600000
}

export interface CalibrationDraft {
  /** joint id -> new dof ranges */
  edits: Record<string, { min: number; max: number }[]>
}

interface State {
  role: Role
  page: PageKey
  model: FigureModel
  accessories: Accessory[]
  pose: Pose
  assembly: Assembly
  selectedJoint: string | null
  selectedSnapshot: string | null
  snapshots: Snapshot[]
  tasks: CheckTask[]
  reports: ReleaseReport[]
  logs: LogEntry[]
  toasts: ToastMsg[]
  lastCheck: CheckResult | null
  lastBuildNotices: string[]
  activeTaskId: string | null
  showLog: boolean
  showReportId: string | null
  pendingInvalidations: CheckTask[]

  setRole: (r: Role) => void
  go: (p: PageKey) => void
  toast: (t: Omit<ToastMsg, 'id'>) => void
  dismissToast: (id: number) => void
  log: (kind: LogKind, action: string, target: string, detail?: string) => void

  selectJoint: (id: string) => void
  nudgePose: (jointId: string, dofIndex: number, deltaDeg: number) => void
  setPoseValue: (jointId: string, dofIndex: number, value: number) => void
  resetPose: () => void
  applySnapshot: (id: string) => void
  saveSnapshot: (name: string, note: string, thumb?: string) => void
  deleteSnapshot: (id: string) => void

  calibrateJoint: (
    jointId: string,
    kind: 'ball' | 'hinge',
    dofs: { label: string; axis: [number, number, number]; min: number; max: number }[],
  ) => void
  toggleCalibrated: (jointId: string, calibrated: boolean) => void
  importModel: (patch: Partial<FigureModel>) => void

  equip: (slot: 'hand' | 'weapon' | 'base', id: string | undefined) => void
  reviseAccessory: (id: string, patch: Partial<Accessory>) => void
  addAccessory: (a: Accessory) => void

  submitTask: (opts: { snapshotId?: string; title: string; summary: string }) => boolean
  approveTask: (taskId: string, note: string) => void
  rejectTask: (taskId: string, note: string) => void
  recheckTask: (taskId: string) => void
  openTask: (id: string) => void
  closeTask: () => void
  openReport: (id: string) => void
  closeReport: () => void
  toggleLog: (open?: boolean) => void
}

const SEED_MODEL = buildSampleModel()
const SEED_ACCESSORIES = buildAccessories()
const SEED = seedTasks(SEED_MODEL, SEED_ACCESSORIES)

function buildInitialSnapshots(): Snapshot[] {
  return [
    {
      id: 'SNAP-0001',
      name: '立姿待机',
      note: '右臂自然下垂，手腕回正；作为其他姿势的基准。',
      modelId: SEED_MODEL.id,
      pose: (() => {
        const p = neutralPose(SEED_MODEL)
        p.j_waist = [0, 0, 4]
        p.j_shoulder_R = [18, 6]
        p.j_elbow_R = [26]
        return p
      })(),
      assembly: { hand: 'acc_hand_sword', weapon: 'acc_sword_tachi', base: 'acc_base_round' },
      createdAt: '2026-11-10T10:22:00+08:00',
      createdBy: '李梦',
    },
    {
      id: 'SNAP-0002',
      name: '拔剑蓄势',
      note: '右肩外展 22°、肘 104°，握剑手上抬。已确认剑刃不拂到后发。',
      modelId: SEED_MODEL.id,
      pose: (() => {
        const p = neutralPose(SEED_MODEL)
        p.j_shoulder_R = [58, 22]
        p.j_elbow_R = [104]
        p.j_chest = [0, -12]
        p.j_waist = [6, 0, -10]
        p.j_wrist_R = [12, 0]
        return p
      })(),
      assembly: { hand: 'acc_hand_sword', weapon: 'acc_sword_long', base: 'acc_base_round' },
      createdAt: '2026-11-12T15:40:00+08:00',
      createdBy: '李梦',
    },
  ]
}

export function accessoryRef(a: Accessory): AccessoryRef {
  return { id: a.id, name: a.name, code: a.code, rev: a.rev, revision: a.revision }
}

export const useStore = create<State>((set, get) => ({
  role: 'engineer',
  page: initialPage(),
  model: SEED_MODEL,
  accessories: SEED_ACCESSORIES,
  pose: neutralPose(SEED_MODEL),
  assembly: {},
  selectedJoint: 'j_elbow_L',
  selectedSnapshot: null,
  snapshots: buildInitialSnapshots(),
  tasks: SEED.tasks,
  reports: SEED.reports,
  logs: [
    ...SEED.logs,
    {
      id: 'L-0000',
      at: '2026-11-09T09:12:00+08:00',
      actor: '陈工 · 结构',
      role: 'engineer' as Role,
      kind: 'import' as const,
      action: '导入分件模型',
      target: '艾莉丝 · 武装形态 1/7',
      detail: 'alice_armored_v3.2.fbx · 22 件 · 240mm',
    },
  ].sort((a, b) => (a.at < b.at ? 1 : -1)) as LogEntry[],
  toasts: [],
  lastCheck: null,
  lastBuildNotices: [],
  activeTaskId: null,
  showLog: false,
  showReportId: null,
  pendingInvalidations: [],

  setRole: (r) =>
    set((s) => {
      const role = r
      const log: LogEntry = {
        id: nextId('L'),
        at: nowIso(),
        actor: USERS[r].name,
        role: r,
        kind: 'system',
        action: '切换操作身份',
        target: USERS[r].title,
      }
      return { role, logs: [log, ...s.logs] }
    }),

  go: (p) =>
    set(() => {
      if (typeof window !== 'undefined' && window.location.hash !== `#/${p}`) {
        window.history.replaceState(null, '', `#/${p}`)
      }
      return { page: p }
    }),

  toast: (t) => set((s) => ({ toasts: [...s.toasts, { ...t, id: toastSeq++ }] })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  log: (kind, action, target, detail) =>
    set((s) => ({
      logs: [
        {
          id: nextId('L'),
          at: nowIso(),
          actor: USERS[s.role].name,
          role: s.role,
          kind,
          action,
          target,
          detail,
        },
        ...s.logs,
      ],
    })),

  selectJoint: (id) => set({ selectedJoint: id }),

  nudgePose: (jointId, dofIndex, deltaDeg) =>
    set((s) => {
      const joint = s.model.joints.find((j) => j.id === jointId)
      if (!joint) return {}
      const dof = joint.dofs[dofIndex]
      if (!dof) return {}
      const next: Pose = { ...s.pose }
      const arr = [...(next[jointId] ?? [])]
      const cur = arr[dofIndex] ?? 0
      const clamped = Math.min(dof.max, Math.max(dof.min, cur + deltaDeg))
      arr[dofIndex] = Math.round(clamped * 10) / 10
      next[jointId] = arr
      return { pose: next }
    }),

  setPoseValue: (jointId, dofIndex, value) =>
    set((s) => {
      const next: Pose = { ...s.pose }
      const arr = [...(next[jointId] ?? [])]
      arr[dofIndex] = Math.round(value * 10) / 10
      next[jointId] = arr
      return { pose: next }
    }),

  resetPose: () =>
    set((s) => {
      const pose = neutralPose(s.model)
      return { pose, lastCheck: null }
    }),

  applySnapshot: (id) =>
    set((s) => {
      const snap = s.snapshots.find((x) => x.id === id)
      if (!snap) return {}
      return {
        pose: clampPose(s.model, snap.pose),
        assembly: { ...snap.assembly },
        selectedSnapshot: id,
      }
    }),

  saveSnapshot: (name, note, thumb) =>
    set((s) => {
      const snap: Snapshot = {
        id: nextId('SNAP'),
        name: name.trim() || `姿势 ${s.snapshots.length + 1}`,
        note,
        modelId: s.model.id,
        pose: JSON.parse(JSON.stringify(s.pose)),
        assembly: { ...s.assembly },
        thumb,
        createdAt: nowIso(),
        createdBy: USERS[s.role].name,
      }
      const log: LogEntry = {
        id: nextId('L'),
        at: snap.createdAt,
        actor: USERS[s.role].name,
        role: s.role,
        kind: 'pose',
        action: '保存姿势快照',
        target: snap.name,
        detail: `${s.model.code} ${s.model.version}`,
      }
      return { snapshots: [snap, ...s.snapshots], logs: [log, ...s.logs], selectedSnapshot: snap.id }
    }),

  deleteSnapshot: (id) =>
    set((s) => ({
      snapshots: s.snapshots.filter((x) => x.id !== id),
      selectedSnapshot: s.selectedSnapshot === id ? null : s.selectedSnapshot,
    })),

  calibrateJoint: (jointId, kind, dofs) =>
    set((s) => {
      const joints = s.model.joints.map((j) =>
        j.id === jointId ? { ...j, kind, dofs, calibrated: true } : j,
      )
      const pose = { ...s.pose }
      pose[jointId] = dofs.map((d, i) => {
        const cur = pose[jointId]?.[i] ?? 0
        return Math.min(d.max, Math.max(d.min, cur))
      })
      const name = joints.find((j) => j.id === jointId)?.name ?? jointId
      const log: LogEntry = {
        id: nextId('L'),
        at: nowIso(),
        actor: USERS[s.role].name,
        role: s.role,
        kind: 'calib',
        action: '标定关节',
        target: name,
        detail: `${kind === 'hinge' ? '铰链' : '球关节'} · ${dofs
          .map((d) => `${d.label} ${d.min}°~${d.max}°`)
          .join(' / ')}`,
      }
      const configured = joints.every((j) => j.calibrated)
      return {
        model: { ...s.model, joints, status: configured ? 'configured' : 'draft' },
        pose,
        logs: [log, ...s.logs],
      }
    }),

  toggleCalibrated: (jointId, calibrated) =>
    set((s) => {
      const joints = s.model.joints.map((j) => (j.id === jointId ? { ...j, calibrated } : j))
      const name = joints.find((j) => j.id === jointId)?.name ?? jointId
      const log: LogEntry = {
        id: nextId('L'),
        at: nowIso(),
        actor: USERS[s.role].name,
        role: s.role,
        kind: 'calib',
        action: calibrated ? '标记关节已标定' : '撤销关节标定',
        target: name,
      }
      return {
        model: { ...s.model, joints, status: joints.every((j) => j.calibrated) ? 'configured' : 'draft' },
        logs: [log, ...s.logs],
      }
    }),

  importModel: (patch) =>
    set((s) => {
      const log: LogEntry = {
        id: nextId('L'),
        at: nowIso(),
        actor: USERS[s.role].name,
        role: s.role,
        kind: 'import',
        action: '导入分件模型',
        target: patch.name ?? s.model.name,
        detail: `${patch.source ?? s.model.source} · ${patch.parts?.length ?? '—'} 件`,
      }
      const model = { ...s.model, ...patch, importedAt: nowIso(), importedBy: accountName(s.role) }
      return { model, pose: neutralPose(model), logs: [log, ...s.logs] }
    }),

  equip: (slot, id) =>
    set((s) => {
      const assembly = { ...s.assembly, [slot]: id }
      const acc = s.accessories.find((a) => a.id === id)
      const label =
        slot === 'hand' ? '手型' : slot === 'weapon' ? '武器' : '底座'
      const log: LogEntry = {
        id: nextId('L'),
        at: nowIso(),
        actor: USERS[s.role].name,
        role: s.role,
        kind: 'accessory',
        action: acc ? `装配${label}` : `卸下${label}`,
        target: acc ? `${acc.name} ${acc.revision}` : '—',
        detail: `${s.model.code} ${s.model.version}`,
      }
      return { assembly, logs: [log, ...s.logs] }
    }),

  reviseAccessory: (id, patch) =>
    set((s) => {
      const accessories = s.accessories.map((a) => {
        if (a.id !== id) return a
        const rev = patch.rev ?? a.rev + 1
        return {
          ...a,
          ...patch,
          rev,
          revision: `R${rev}`,
          updatedAt: nowIso(),
          updatedBy: accountName(s.role),
        }
      })
      const acc = accessories.find((a) => a.id === id)!
      const logs: LogEntry[] = [
        {
          id: nextId('L'),
          at: nowIso(),
          actor: USERS[s.role].name,
          role: s.role,
          kind: 'accessory',
          action: '配件改版',
          target: `${acc.name} → ${acc.revision}`,
          detail: patch.note ?? acc.note,
        },
      ]

      // ---- invalidation cascade ----
      // Any card or report that referenced the old revision is void from now on:
      // the freeze it was judged on no longer describes the part on the bench.
      const taskList = s.tasks.map((t) => {
        const ref = t.accessories.find((x) => x.id === id)
        if (!ref) return t
        const newRef: AccessoryRef = { ...accessoryRef(acc) }
        logs.push({
          id: nextId('L'),
          at: nowIso(),
          actor: USERS[s.role].name,
          role: s.role,
          kind: 'invalidate',
          action: '配件改版致校核结果失效',
          target: `${t.code} ${t.title}`,
          detail: `${acc.name} ${ref.revision} → ${acc.revision}，需重新校核`,
        })
        return {
          ...t,
          accessories: t.accessories.map((x) => (x.id === id ? newRef : x)),
          invalidated: {
            at: nowIso(),
            reason: `配件改版 ${ref.revision} → ${acc.revision}`,
            accessoryName: acc.name,
          },
          events: [
            ...t.events,
            {
              at: nowIso(),
              actor: USERS[s.role].name,
              role: s.role,
              action: '配件改版，校核结果作废',
              note: `${acc.name} ${ref.revision} → ${acc.revision}`,
            },
          ],
        }
      })

      const reports = s.reports.map((r) => {
        const ref = r.accessories.find((x) => x.id === id)
        if (!ref || r.invalidatedAt) return r
        logs.push({
          id: nextId('L'),
          at: nowIso(),
          actor: USERS[s.role].name,
          role: s.role,
          kind: 'invalidate',
          action: '配件改版致放行报告失效',
          target: `${r.code} ${r.modelCode}`,
          detail: `${acc.name} ${ref.revision} → ${acc.revision}`,
        })
        return {
          ...r,
          invalidatedAt: nowIso(),
          invalidatedReason: `${acc.name} 改版 ${ref.revision} → ${acc.revision}`,
        }
      })

      return { accessories, logs: [...logs.reverse(), ...s.logs], tasks: taskList, reports }
    }),

  addAccessory: (a) =>
    set((s) => {
      const log: LogEntry = {
        id: nextId('L'),
        at: nowIso(),
        actor: USERS[s.role].name,
        role: s.role,
        kind: 'accessory',
        action: '新增配件',
        target: `${a.name} ${a.revision}`,
        detail: a.category,
      }
      return { accessories: [a, ...s.accessories], logs: [log, ...s.logs] }
    }),

  submitTask: ({ snapshotId, title, summary }) => {
    const s = get()
    const { result, build } = runCheck(s.model, s.accessories, s.pose, s.assembly)
    if (!result.pass) {
      set((st) => ({
        lastCheck: result,
        lastBuildNotices: build.notices,
        toasts: [
          ...st.toasts,
          {
            id: toastSeq++,
            tone: 'error',
            title: '无法提交校核单',
            detail: result.blockers.join('；'),
          },
        ],
      }))
      return false
    }
    const snap = snapshotId ? s.snapshots.find((x) => x.id === snapshotId) : undefined
    const accRefs = [
      ...new Set(
        [
          s.assembly.hand,
          s.assembly.weapon,
          s.assembly.base,
        ].filter(Boolean) as string[],
      ),
    ]
      .map((id) => s.accessories.find((a) => a.id === id))
      .filter((a): a is Accessory => !!a)
      .map(accessoryRef)

    const code = `CR-${String(2400 + s.tasks.length + 1).slice(-4)}`
    const task: CheckTask = {
      id: nextId('T'),
      code,
      title,
      modelId: s.model.id,
      modelCode: s.model.code,
      modelName: s.model.name,
      modelVersion: s.model.version,
      snapshotId,
      poseName: snap?.name ?? '当前姿势',
      pose: JSON.parse(JSON.stringify(s.pose)),
      calibration: s.model.joints.map((j) => ({
        jointId: j.id,
        jointName: j.name,
        code: j.code,
        kind: j.kind,
        dofs: j.dofs.map((d) => ({ ...d })),
      })),
      assembly: { ...s.assembly },
      accessories: accRefs,
      margins: result.margins,
      interferences: result.interferences,
      interfaces: result.interfaces,
      minClearance: result.minClearance,
      status: 'pending',
      submittedBy: USERS[s.role].name,
      submittedByRole: s.role,
      submittedAt: nowIso(),
      round: 1,
      events: [
        {
          at: nowIso(),
          actor: USERS[s.role].name,
          role: s.role,
          action: '提交校核单',
          note: summary,
        },
      ],
      summary,
      thumb: snap?.thumb,
    }
    const log: LogEntry = {
      id: nextId('L'),
      at: nowIso(),
      actor: USERS[s.role].name,
      role: s.role,
      kind: 'submit',
      action: '提交校核单',
      target: `${code} ${title}`,
      detail: `${s.model.code} ${s.model.version} · ${accRefs.length} 件配件`,
    }
    set((st) => ({
      tasks: [task, ...st.tasks],
      logs: [log, ...st.logs],
      lastCheck: result,
      lastBuildNotices: build.notices,
      toasts: [
        ...st.toasts,
        {
          id: toastSeq++,
          tone: 'ok',
          title: '校核单已提交',
          detail: `${code} 已进入品控待审队列`,
        },
      ],
    }))
    return true
  },

  approveTask: (taskId, note) => {
    const s = get()
    const task = s.tasks.find((t) => t.id === taskId)
    if (!task) return
    const version = `${s.model.version}-lock`
    const reportId = nextId('RPT')
    const reportCode = `RL-${String(1300 + s.reports.length + 1).slice(-4)}`
    const lockedAt = nowIso()
    const fingerprint = `SHA-${task.code}-${task.modelVersion}-${task.accessories
      .map((a) => `${a.code}${a.revision}`)
      .join('_')}`.toUpperCase()

    const report: ReleaseReport = {
      id: reportId,
      code: reportCode,
      taskId: task.id,
      taskCode: task.code,
      modelId: task.modelId,
      modelCode: task.modelCode,
      modelName: task.modelName,
      modelVersion: task.modelVersion,
      title: task.title,
      releasedAt: lockedAt,
      releasedBy: USERS[s.role].name,
      poseName: task.poseName,
      thumb: task.thumb,
      accessories: task.accessories,
      margins: task.margins,
      interferences: task.interferences,
      interfaces: task.interfaces,
      minClearance: task.minClearance,
      fingerprint,
      note,
    }

    const tasks = s.tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            status: 'released' as TaskStatus,
            locked: { version, at: lockedAt, by: USERS[s.role].name, reportId },
            events: [
              ...t.events,
              {
                at: lockedAt,
                actor: USERS[s.role].name,
                role: s.role,
                action: '审核通过并锁定版本',
                note: `${version} · ${reportCode}`,
              },
            ],
          }
        : t,
    )
    const logs: LogEntry[] = [
      {
        id: nextId('L'),
        at: lockedAt,
        actor: USERS[s.role].name,
        role: s.role,
        kind: 'review',
        action: '审核通过',
        target: `${task.code} ${task.title}`,
        detail: note || '—',
      },
      {
        id: nextId('L'),
        at: lockedAt,
        actor: USERS[s.role].name,
        role: s.role,
        kind: 'release',
        action: '锁定版本并生成放行报告',
        target: reportCode,
        detail: `${version} · 校验码 ${fingerprint.slice(0, 22)}…`,
      },
    ]
    set((st) => ({
      tasks,
      reports: [report, ...st.reports],
      logs: [...logs, ...st.logs],
      toasts: [
        ...st.toasts,
        { id: toastSeq++, tone: 'ok', title: '已放行并锁定版本', detail: `${reportCode} · ${version}` },
      ],
    }))
  },

  rejectTask: (taskId, note) => {
    const s = get()
    const task = s.tasks.find((t) => t.id === taskId)
    if (!task) return
    const at = nowIso()
    const tasks = s.tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            status: 'rejected' as TaskStatus,
            round: t.round,
            events: [...t.events, { at, actor: USERS[s.role].name, role: s.role, action: '退回', note }],
          }
        : t,
    )
    const log: LogEntry = {
      id: nextId('L'),
      at,
      actor: USERS[s.role].name,
      role: s.role,
      kind: 'review',
      action: '退回校核单',
      target: `${task.code} ${task.title}`,
      detail: note,
    }
    set((st) => ({
      tasks,
      logs: [log, ...st.logs],
      toasts: [...st.toasts, { id: toastSeq++, tone: 'warn', title: '已退回', detail: task.code }],
    }))
  },

  recheckTask: (taskId) => {
    const s = get()
    const task = s.tasks.find((t) => t.id === taskId)
    if (!task) return
    // reload the pose & assembly that this check card was built on
    const assembly: Assembly = { ...task.assembly }
    const pose = clampPose(s.model, task.pose)
    const { result } = runCheck(s.model, s.accessories, pose, assembly)
    const at = nowIso()
    const code = `CR-${String(2400 + s.tasks.length + 1).slice(-4)}`
    const accRefs = (['hand', 'weapon', 'base'] as const)
      .map((k) => assembly[k])
      .filter((x): x is string => !!x)
      .map((id) => s.accessories.find((a) => a.id === id))
      .filter((a): a is Accessory => !!a)
      .map(accessoryRef)
    const nextTask: CheckTask = {
      ...task,
      id: nextId('T'),
      code,
      status: 'pending',
      round: task.round + 1,
      submittedAt: at,
      submittedBy: USERS[s.role].name,
      submittedByRole: s.role,
      pose,
      assembly,
      accessories: accRefs,
      margins: result.margins,
      interferences: result.interferences,
      interfaces: result.interfaces,
      minClearance: result.minClearance,
      invalidated: undefined,
      events: [
        ...task.events,
        {
          at,
          actor: USERS[s.role].name,
          role: s.role,
          action: `重新校核（第 ${task.round + 1} 轮）`,
          note: result.pass ? '全部检查项通过' : result.blockers.join('；'),
        },
      ],
    }
    const log: LogEntry = {
      id: nextId('L'),
      at,
      actor: USERS[s.role].name,
      role: s.role,
      kind: 'submit',
      action: '重新提交校核',
      target: `${code} ${task.title}`,
      detail: result.pass ? '全部检查项通过' : result.blockers.join('；'),
    }
    set((st) => ({
      tasks: [nextTask, ...st.tasks],
      logs: [log, ...st.logs],
      pose,
      assembly,
      lastCheck: result,
      toasts: [
        ...st.toasts,
        {
          id: toastSeq++,
          tone: result.pass ? 'ok' : 'warn',
          title: `已重新校核（第 ${task.round + 1} 轮）`,
          detail: result.pass ? `${code} 已提交` : result.blockers.join('；'),
        },
      ],
    }))
  },

  openTask: (id) => set({ activeTaskId: id }),
  closeTask: () => set({ activeTaskId: null }),
  openReport: (id) => set({ showReportId: id }),
  closeReport: () => set({ showReportId: null }),
  toggleLog: (open) => set((s) => ({ showLog: open ?? !s.showLog })),
}))

export function useUser(role: Role) {
  return USERS[role]
}

export { buildInitialSnapshots }
