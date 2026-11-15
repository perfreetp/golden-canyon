import type {
  Accessory,
  AccessoryRef,
  Assembly,
  CheckTask,
  FigureModel,
  LogEntry,
  Pose,
  ReleaseReport,
  TaskStatus,
} from '../types'
import { runCheck } from '../engine/evaluate'
import { neutralPose } from '../engine/rig'

interface SeedSpec {
  code: string
  title: string
  summary: string
  pose: Record<string, number[]>
  assembly: Assembly
  status: TaskStatus
  daysAgo: number
  submittedBy: string
  round?: number
  qcNote?: string
  thumbTone?: string
}

const SPECS: SeedSpec[] = [
  {
    code: 'CR-2401',
    title: '拔剑式 · 右臂大幅上举',
    summary:
      '右肩前摆 58°、外展 22°，肘部 104°。重点确认左肩甲与胸甲、持剑手与剑柄护手的间隙；建议品控复核肘部与胸部扭转余量。',
    pose: { j_shoulder_R: [58, 22], j_elbow_R: [104], j_chest: [0, -12], j_waist: [6, 0, -10], j_wrist_R: [12, 0] },
    assembly: { hand: 'acc_hand_sword', weapon: 'acc_sword_long', base: 'acc_base_round' },
    status: 'pending',
    daysAgo: 1,
    submittedBy: '陈志远',
    thumbTone: '#7d6647',
  },
  {
    code: 'CR-2398',
    title: '弓步突刺 · 左腿前跨',
    summary:
      '左髋 72°、左膝 94°，右腿后蹬。裙甲与大腿在大幅前抬时接触，已把前裙甲内缩 1.5mm；请复核膝部 94° 时大腿与小腿的接触量。',
    pose: { j_hip_L: [72], j_knee_L: [94], j_hip_R: [-12], j_knee_R: [46], j_waist: [16, -4, 8], j_shoulder_R: [42, 12], j_elbow_R: [64] },
    assembly: { hand: 'acc_hand_open', base: 'acc_base_rock' },
    status: 'rejected',
    daysAgo: 3,
    submittedBy: '李梦',
    qcNote:
      '膝部 94° 时左大腿与左小腿接触 0.41mm，已超 0.3mm 判据；同时左髋 72° 下前裙甲压入左大腿 10.28mm、骨盆与左大腿接触 0.78mm。请把左膝上限收到 92°、前裙甲沿法向内缩 2mm，髋部上限收到 68° 后重新提交。',
    thumbTone: '#6a5a42',
  },
  {
    code: 'CR-2395',
    title: '立姿 · 持刀待机',
    summary: '标准站姿，右手持太刀、底座 ø90。全部关节余量 ≥ 20°，无穿插，接口复核通过。',
    pose: { j_shoulder_R: [18, 6], j_elbow_R: [26], j_wrist_R: [0, 0], j_waist: [0, 0, 4], j_knee_L: [6], j_knee_R: [4] },
    assembly: { hand: 'acc_hand_sword', weapon: 'acc_sword_tachi', base: 'acc_base_round' },
    status: 'released',
    daysAgo: 6,
    submittedBy: '李梦',
    qcNote: '角度余量与干涉记录均满足放行条件，锁定 v3.2 版本。',
    thumbTone: '#6f7b86',
  },
]

function ref(a: Accessory): AccessoryRef {
  return { id: a.id, name: a.name, code: a.code, rev: a.rev, revision: a.revision }
}

const iso = (daysAgo: number, hour = 10) => {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, 20 + Math.floor(Math.random() * 30), 0, 0)
  return d.toISOString()
}

/** Build a consistent demo backlog by actually running the checker. */
export function seedTasks(
  model: FigureModel,
  accessories: Accessory[],
): { tasks: CheckTask[]; reports: ReleaseReport[]; logs: LogEntry[] } {
  const base = neutralPose(model)
  const tasks: CheckTask[] = []
  const reports: ReleaseReport[] = []
  const logs: LogEntry[] = []

  for (const spec of SPECS) {
    const pose: Pose = { ...base }
    for (const [k, v] of Object.entries(spec.pose)) {
      const j = model.joints.find((x) => x.id === k)
      if (!j) continue
      pose[k] = j.dofs.map((d, i) => Math.min(d.max, Math.max(d.min, v[i] ?? 0)))
    }
    const { result } = runCheck(model, accessories, pose, spec.assembly)
    const accRefs = (['hand', 'weapon', 'base'] as const)
      .map((k) => spec.assembly[k])
      .filter((x): x is string => !!x)
      .map((id) => accessories.find((a) => a.id === id))
      .filter((a): a is Accessory => !!a)
      .map(ref)

    const submittedAt = iso(spec.daysAgo)
    const code = spec.code
    const events: CheckTask['events'] = [
      {
        at: submittedAt,
        actor: spec.submittedBy,
        role: spec.submittedBy === '李梦' ? 'prototyper' : 'engineer',
        action: '提交校核单',
        note: spec.summary,
      },
    ]

    let locked: CheckTask['locked']
    if (spec.status === 'rejected') {
      const at = iso(spec.daysAgo - 1, 15)
      events.push({ at, actor: '周岚', role: 'qc', action: '退回', note: spec.qcNote })
    }
    if (spec.status === 'released') {
      const at = iso(spec.daysAgo - 1, 16)
      const version = `${model.version}-lock`
      const reportId = `RPT-${code}`
      events.push({
        at,
        actor: '周岚',
        role: 'qc',
        action: '审核通过并锁定版本',
        note: `${version} · RL-${code.slice(-4)}`,
      })
      locked = { version, at, by: '周岚', reportId }
      reports.push({
        id: reportId,
        code: `RL-${code.slice(-4)}`,
        taskId: `T-${code}`,
        taskCode: code,
        modelId: model.id,
        modelCode: model.code,
        modelName: model.name,
        modelVersion: model.version,
        title: spec.title,
        releasedAt: at,
        releasedBy: '周岚',
        poseName: '立姿待机',
        accessories: accRefs,
        margins: result.margins,
        interferences: result.interferences,
        interfaces: result.interfaces,
        minClearance: result.minClearance,
        fingerprint: `SHA-${code}-${model.version}-${accRefs
          .map((a) => `${a.code}${a.revision}`)
          .join('_')}`.toUpperCase(),
        note: spec.qcNote ?? '',
      })
      logs.push(
        {
          id: `L-${code}-2`,
          at,
          actor: '周岚',
          role: 'qc',
          kind: 'release',
          action: '锁定版本并生成放行报告',
          target: `RL-${code.slice(-4)}`,
          detail: `${version} · ${model.code}`,
        },
        {
          id: `L-${code}-1`,
          at,
          actor: '周岚',
          role: 'qc',
          kind: 'review',
          action: '审核通过',
          target: `${code} ${spec.title}`,
          detail: spec.qcNote ?? '',
        },
      )
    }
    if (spec.status === 'rejected') {
      logs.push({
        id: `L-${code}-1`,
        at: iso(spec.daysAgo - 1, 15),
        actor: '周岚',
        role: 'qc',
        kind: 'review',
        action: '退回校核单',
        target: `${code} ${spec.title}`,
        detail: spec.qcNote ?? '',
      })
    }
    logs.push({
      id: `L-${code}-0`,
      at: submittedAt,
      actor: spec.submittedBy,
      role: spec.submittedBy === '李梦' ? 'prototyper' : 'engineer',
      kind: 'submit',
      action: '提交校核单',
      target: `${code} ${spec.title}`,
      detail: `${model.code} ${model.version} · ${accRefs.length} 件配件`,
    })

    tasks.push({
      id: `T-${code}`,
      code,
      title: spec.title,
      modelId: model.id,
      modelCode: model.code,
      modelName: model.name,
      modelVersion: model.version,
      poseName: spec.title.split(' · ')[0],
      pose,
      calibration: model.joints.map((j) => ({
        jointId: j.id,
        jointName: j.name,
        code: j.code,
        kind: j.kind,
        dofs: j.dofs.map((d) => ({ ...d })),
      })),
      assembly: spec.assembly,
      accessories: accRefs,
      margins: result.margins,
      interferences: result.interferences,
      interfaces: result.interfaces,
      minClearance: result.minClearance,
      status: spec.status,
      submittedBy: spec.submittedBy,
      submittedByRole: spec.submittedBy === '李梦' ? 'prototyper' : 'engineer',
      submittedAt,
      round: spec.round ?? 1,
      events,
      summary: spec.summary,
      locked,
    })
  }

  tasks.sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1))
  return { tasks, reports, logs }
}
