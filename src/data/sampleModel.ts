import type { FigureModel, Vec3 } from '../types'
import { vlerp, vsub } from '../engine/math'

/** capsule between two points on the [joint -> child] axis, as fractions of the segment */
function limb(joint: Vec3, child: Vec3, t0: number, t1: number): [Vec3, Vec3] {
  const d = vsub(child, joint)
  return [vlerp([0, 0, 0], d, t0), vlerp([0, 0, 0], d, t1)]
}

const P = {
  pelvis: [0, 118, 0] as Vec3,
  waist: [0, 140, 0] as Vec3,
  chest: [0, 158, 0] as Vec3,
  neck: [0, 200, 0] as Vec3,
  head: [0, 210, 0] as Vec3,
  shoulderL: [24, 193, 0] as Vec3,
  shoulderR: [-24, 193, 0] as Vec3,
  elbowL: [62, 157, 0] as Vec3,
  elbowR: [-62, 157, 0] as Vec3,
  wristL: [88, 121, 0] as Vec3,
  wristR: [-88, 121, 0] as Vec3,
  hipL: [16, 112, 0] as Vec3,
  hipR: [-16, 112, 0] as Vec3,
  kneeL: [17, 62, 0] as Vec3,
  kneeR: [-17, 62, 0] as Vec3,
  ankleL: [17, 9, 0] as Vec3,
  ankleR: [-17, 9, 0] as Vec3,
}

const SKIN = '#d9c2a8'
const HAIR = '#574840'
const ARMOR = '#8e97a5'
const CLOTH = '#3f4a5a'
const TRIM = '#b8843c'

export function buildSampleModel(): FigureModel {
  const uarmL = limb(P.shoulderL, P.elbowL, 0.16, 0.78)
  const uarmR = limb(P.shoulderR, P.elbowR, 0.16, 0.78)
  const farmL = limb(P.elbowL, P.wristL, 0.22, 0.74)
  const farmR = limb(P.elbowR, P.wristR, 0.22, 0.74)
  const thighL = limb(P.hipL, P.kneeL, 0.12, 0.72)
  const thighR = limb(P.hipR, P.kneeR, 0.12, 0.72)
  const calfL = limb(P.kneeL, P.ankleL, 0.22, 0.9)
  const calfR = limb(P.kneeR, P.ankleR, 0.22, 0.9)

  return {
    id: 'mdl-0001',
    code: 'MDL-0001',
    name: '艾莉丝 · 武装形态 1/7',
    scale: '1/7',
    heightMm: 240,
    version: 'v3.2',
    source: 'alice_armored_v3.2.fbx',
    importedAt: '2026-11-09T09:12:00+08:00',
    importedBy: '陈工 · 结构',
    status: 'configured',
    note: '分件 22 件，已按注塑分模拆件；膝肘为单向铰链，肩髋为球关节。',
    sockets: {
      wrist_L: { type: '球窝', diameter: 3.0, depth: 3.0, tolerance: 0.05, note: 'PVC 手型通用球窝' },
      wrist_R: { type: '球窝', diameter: 3.0, depth: 3.0, tolerance: 0.05, note: 'PVC 手型通用球窝' },
      root: { type: '圆榫', diameter: 6.0, depth: 5.0, tolerance: 0.1, note: '底座插孔' },
    },
    ignorePairs: [
      { pair: ['p_pelvis', 'p_abdomen'], reason: '腰封接缝，出厂即贴合' },
      { pair: ['p_abdomen', 'p_chest'], reason: '胸腹分模面，预压 0.5mm' },
      { pair: ['p_neck', 'p_head'], reason: '颈部插芯埋入头部' },
      { pair: ['p_head', 'p_hair'], reason: '后发贴合头部' },
      { pair: ['p_calf_L', 'p_foot_L'], reason: '踝关节内藏配合' },
      { pair: ['p_calf_R', 'p_foot_R'], reason: '踝关节内藏配合' },
      { pair: ['p_hand_L', 'p_farm_L'], reason: '腕部球关节内藏配合' },
      { pair: ['p_hand_R', 'p_farm_R'], reason: '腕部球关节内藏配合' },
    ],
    joints: [
      {
        id: 'j_root', name: '骨盆', code: 'J00', parent: null, kind: 'ball',
        pivot: P.pelvis, calibrated: true, dofs: [
          { label: '前倾', axis: [1, 0, 0], min: -10, max: 10 },
          { label: '侧倾', axis: [0, 0, 1], min: -8, max: 8 },
        ],
      },
      {
        id: 'j_waist', name: '腰部', code: 'J01', parent: 'j_root', kind: 'ball',
        pivot: P.waist, calibrated: true, dofs: [
          { label: '前屈', axis: [1, 0, 0], min: -12, max: 22 },
          { label: '侧屈', axis: [0, 0, 1], min: -14, max: 14 },
          { label: '扭转', axis: [0, 1, 0], min: -25, max: 25 },
        ],
      },
      {
        id: 'j_chest', name: '胸部', code: 'J02', parent: 'j_waist', kind: 'ball',
        pivot: P.chest, calibrated: true, dofs: [
          { label: '前屈', axis: [1, 0, 0], min: -8, max: 12 },
          { label: '扭转', axis: [0, 1, 0], min: -18, max: 18 },
        ],
      },
      {
        id: 'j_neck', name: '颈部', code: 'J03', parent: 'j_chest', kind: 'ball',
        pivot: P.neck, calibrated: true, dofs: [
          { label: '前屈', axis: [1, 0, 0], min: -22, max: 28 },
          { label: '侧屈', axis: [0, 0, 1], min: -18, max: 18 },
          { label: '旋转', axis: [0, 1, 0], min: -35, max: 35 },
        ],
      },
      {
        id: 'j_head', name: '头', code: 'J04', parent: 'j_neck', kind: 'ball',
        pivot: P.head, calibrated: true, dofs: [
          { label: '点头', axis: [1, 0, 0], min: -16, max: 16 },
        ],
      },
      {
        id: 'j_shoulder_L', name: '左肩', code: 'J10', parent: 'j_chest', kind: 'ball',
        pivot: P.shoulderL, calibrated: true, dofs: [
          { label: '前摆', axis: [-1, 0, 0], min: -20, max: 110 },
          { label: '外展', axis: [0, 0, 1], min: 0, max: 75 },
        ],
      },
      {
        id: 'j_elbow_L', name: '左肘', code: 'J11', parent: 'j_shoulder_L', kind: 'hinge',
        pivot: P.elbowL, calibrated: true, dofs: [
          { label: '屈曲', axis: [-1, 0, 0], min: 0, max: 120 },
        ],
      },
      {
        id: 'j_wrist_L', name: '左腕', code: 'J12', parent: 'j_elbow_L', kind: 'ball',
        pivot: P.wristL, calibrated: true, dofs: [
          { label: '屈伸', axis: [1, 0, 0], min: -35, max: 35 },
          { label: '尺桡偏', axis: [0, 0, 1], min: -20, max: 20 },
        ],
      },
      {
        id: 'j_shoulder_R', name: '右肩', code: 'J20', parent: 'j_chest', kind: 'ball',
        pivot: P.shoulderR, calibrated: true, dofs: [
          { label: '前摆', axis: [-1, 0, 0], min: -20, max: 110 },
          { label: '外展', axis: [0, 0, -1], min: 0, max: 75 },
        ],
      },
      {
        id: 'j_elbow_R', name: '右肘', code: 'J21', parent: 'j_shoulder_R', kind: 'hinge',
        pivot: P.elbowR, calibrated: true, dofs: [
          { label: '屈曲', axis: [-1, 0, 0], min: 0, max: 120 },
        ],
      },
      {
        id: 'j_wrist_R', name: '右腕', code: 'J22', parent: 'j_elbow_R', kind: 'ball',
        pivot: P.wristR, calibrated: true, dofs: [
          { label: '屈伸', axis: [1, 0, 0], min: -35, max: 35 },
          { label: '尺桡偏', axis: [0, 0, 1], min: -20, max: 20 },
        ],
      },
      {
        id: 'j_hip_L', name: '左髋', code: 'J30', parent: 'j_root', kind: 'ball',
        pivot: P.hipL, calibrated: true, dofs: [
          { label: '前屈', axis: [-1, 0, 0], min: -15, max: 105 },
          { label: '外展', axis: [0, 0, 1], min: 0, max: 40 },
        ],
      },
      {
        id: 'j_knee_L', name: '左膝', code: 'J31', parent: 'j_hip_L', kind: 'hinge',
        pivot: P.kneeL, calibrated: true, dofs: [
          { label: '屈曲', axis: [1, 0, 0], min: 0, max: 95 },
        ],
      },
      {
        id: 'j_ankle_L', name: '左踝', code: 'J32', parent: 'j_knee_L', kind: 'hinge',
        pivot: P.ankleL, calibrated: true, dofs: [
          { label: '屈伸', axis: [1, 0, 0], min: -22, max: 32 },
        ],
      },
      {
        id: 'j_hip_R', name: '右髋', code: 'J40', parent: 'j_root', kind: 'ball',
        pivot: P.hipR, calibrated: true, dofs: [
          { label: '前屈', axis: [-1, 0, 0], min: -15, max: 105 },
          { label: '外展', axis: [0, 0, -1], min: 0, max: 40 },
        ],
      },
      {
        id: 'j_knee_R', name: '右膝', code: 'J41', parent: 'j_hip_R', kind: 'hinge',
        pivot: P.kneeR, calibrated: true, dofs: [
          { label: '屈曲', axis: [1, 0, 0], min: 0, max: 95 },
        ],
      },
      {
        id: 'j_ankle_R', name: '右踝', code: 'J42', parent: 'j_knee_R', kind: 'hinge',
        pivot: P.ankleR, calibrated: true, dofs: [
          { label: '屈伸', axis: [1, 0, 0], min: -22, max: 32 },
        ],
      },
    ],
    parts: [
      { id: 'p_head', name: '头部', jointId: 'j_head', a: [0, 4, 0], b: [0, 16, 0], radius: 13.5, color: SKIN, group: '头部' },
      { id: 'p_hair', name: '后发', jointId: 'j_head', a: [0, 15, -8], b: [0, 6, -20], radius: 10.5, color: HAIR, group: '头部' },
      { id: 'p_neck', name: '颈部', jointId: 'j_neck', a: [0, 1, 0], b: [0, 9, 0], radius: 5.5, color: SKIN, group: '头部' },
      { id: 'p_chest', name: '胸甲', jointId: 'j_chest', a: [0, -3, 0], b: [0, 20, 0], radius: 15.5, color: ARMOR, group: '躯干' },
      { id: 'p_abdomen', name: '腹部', jointId: 'j_waist', a: [0, 0, 0], b: [0, 16, 0], radius: 12, color: CLOTH, group: '躯干' },
      { id: 'p_pelvis', name: '骨盆', jointId: 'j_root', a: [-10, 10, 0], b: [10, 10, 0], radius: 11, color: CLOTH, group: '躯干' },
      { id: 'p_skirt_f', name: '前裙甲', jointId: 'j_root', a: [-13, -6, 17], b: [13, -6, 17], radius: 7, color: ARMOR, group: '躯干' },
      { id: 'p_skirt_b', name: '后裙甲', jointId: 'j_root', a: [-13, -6, -17], b: [13, -6, -17], radius: 7, color: ARMOR, group: '躯干' },

      { id: 'p_pauldron_L', name: '左肩甲', jointId: 'j_shoulder_L', a: [0, 4, 0], b: [2, 9, 0], radius: 9.5, color: ARMOR, group: '上肢' },
      { id: 'p_uarm_L', name: '左上臂', jointId: 'j_shoulder_L', a: uarmL[0], b: uarmL[1], radius: 8.5, color: SKIN, group: '上肢' },
      { id: 'p_farm_L', name: '左前臂', jointId: 'j_elbow_L', a: farmL[0], b: farmL[1], radius: 7.5, color: ARMOR, group: '上肢' },
      { id: 'p_hand_L', name: '左手', jointId: 'j_wrist_L', a: [0, -1, 0], b: [2, -12, 0], radius: 5.5, color: SKIN, group: '上肢' },

      { id: 'p_pauldron_R', name: '右肩甲', jointId: 'j_shoulder_R', a: [0, 4, 0], b: [-2, 9, 0], radius: 9.5, color: ARMOR, group: '上肢' },
      { id: 'p_uarm_R', name: '右上臂', jointId: 'j_shoulder_R', a: uarmR[0], b: uarmR[1], radius: 8.5, color: SKIN, group: '上肢' },
      { id: 'p_farm_R', name: '右前臂', jointId: 'j_elbow_R', a: farmR[0], b: farmR[1], radius: 7.5, color: TRIM, group: '上肢' },
      { id: 'p_hand_R', name: '右手', jointId: 'j_wrist_R', a: [0, -1, 0], b: [-2, -12, 0], radius: 5.5, color: SKIN, group: '上肢' },

      { id: 'p_thigh_L', name: '左大腿', jointId: 'j_hip_L', a: thighL[0], b: thighL[1], radius: 9.5, color: SKIN, group: '下肢' },
      { id: 'p_calf_L', name: '左小腿', jointId: 'j_knee_L', a: calfL[0], b: calfL[1], radius: 8.5, color: CLOTH, group: '下肢' },
      { id: 'p_foot_L', name: '左脚', jointId: 'j_ankle_L', a: [0, 0, 4], b: [0, -2, 20], radius: 6.5, color: CLOTH, group: '下肢' },

      { id: 'p_thigh_R', name: '右大腿', jointId: 'j_hip_R', a: thighR[0], b: thighR[1], radius: 9.5, color: SKIN, group: '下肢' },
      { id: 'p_calf_R', name: '右小腿', jointId: 'j_knee_R', a: calfR[0], b: calfR[1], radius: 8.5, color: CLOTH, group: '下肢' },
      { id: 'p_foot_R', name: '右脚', jointId: 'j_ankle_R', a: [0, 0, 4], b: [0, -2, 20], radius: 6.5, color: CLOTH, group: '下肢' },
    ],
  }
}

