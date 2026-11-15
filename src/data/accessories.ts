import type { Accessory, Vec3 } from '../types'

// Local frame convention for hands: origin at the wrist ball, hand hangs along -Y.
// The weapon slot of a hand ("provides" / "grip") sits inside the fist, pointing +Y.

const M = 'mdl-0001'
const WRIST_REQ = { type: '球窝' as const, diameter: 3.0, depth: 3.0, tolerance: 0.05 }
const ROOT_REQ = { type: '圆榫' as const, diameter: 6.0, depth: 5.0, tolerance: 0.1 }

const blade = (len: number, r: number, color: string) => ({
  name: '刃体', a: [0, 6, 0] as Vec3, b: [0, len, 0] as Vec3, radius: r, color, collide: true,
})

export function buildAccessories(): Accessory[] {
  return [
    {
      id: 'acc_hand_open', code: 'H-01', name: '自然张开手', category: '手型', rev: 2, revision: 'R2',
      status: '量产', socketKey: 'wrist', attachment: 'both_wrists',
      requires: WRIST_REQ,
      mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0] },
      matedParts: ['p_farm_L', 'p_farm_R'],
      proxies: [{ name: '手型', a: [0, -1, 0], b: [2, -12, 1], radius: 5.2, color: '#e2cbb2', collide: true }],
      compatibleModels: [M], updatedAt: '2026-10-28T14:20:00+08:00', updatedBy: '李工 · 原型',
      note: '标准五指张开，掌心微凹。', tags: ['通用', '量产'],
    },
    {
      id: 'acc_hand_fist', code: 'H-02', name: '握拳手', category: '手型', rev: 3, revision: 'R3',
      status: '量产', socketKey: 'wrist', attachment: 'both_wrists',
      requires: WRIST_REQ,
      provides: { type: '螺纹', diameter: 3.0, depth: 4.0, tolerance: 0.1 },
      mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0] },
      grip: { pos: [0, -6.5, 1.5], rotDeg: [180, 0, 0] },
      matedParts: ['p_farm_L', 'p_farm_R'],
      proxies: [{ name: '拳型', a: [0, -1.5, 0], b: [1, -10, 2], radius: 6.2, color: '#e2cbb2', collide: true }],
      compatibleModels: [M], updatedAt: '2026-11-11T10:05:00+08:00', updatedBy: '李工 · 原型',
      note: '内置 M3 螺纹握把，可接轻量武器。', tags: ['武器握持'],
    },
    {
      id: 'acc_hand_sword', code: 'H-03', name: '持剑手', category: '手型', rev: 1, revision: 'R1',
      status: '量产', socketKey: 'wrist', attachment: 'wrist_R',
      requires: WRIST_REQ,
      provides: { type: '螺纹', diameter: 4.0, depth: 5.0, tolerance: 0.1 },
      mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0] },
      grip: { pos: [0, -6.5, 2.5], rotDeg: [168, 0, 0] },
      matedParts: ['p_farm_R'],
      proxies: [{ name: '持剑手', a: [0, -1.5, 0], b: [1, -9, 3], radius: 6.0, color: '#e2cbb2', collide: true }],
      compatibleModels: [M], updatedAt: '2026-11-02T16:40:00+08:00', updatedBy: '李工 · 原型',
      note: '仅右手，M4 螺纹，握把轴前倾 18°。', tags: ['武器握持', '右手'],
    },
    {
      id: 'acc_hand_claw', code: 'H-04', name: '张爪手', category: '手型', rev: 1, revision: 'R1',
      status: '试制', socketKey: 'wrist', attachment: 'both_wrists',
      requires: { type: '球窝', diameter: 3.0, depth: 2.4, tolerance: 0.05 },
      mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0] },
      matedParts: ['p_farm_L', 'p_farm_R'],
      proxies: [{ name: '爪型', a: [0, -1, 0], b: [3, -13, 4], radius: 5.6, color: '#e2cbb2', collide: true }],
      compatibleModels: [M], updatedAt: '2026-11-14T09:30:00+08:00', updatedBy: '李工 · 原型',
      note: '试制件，球窝深度仅 2.4mm，需确认脱出力。', tags: ['试制'],
    },
    {
      id: 'acc_sword_long', code: 'W-01', name: '长剑 · 苍', category: '武器', rev: 2, revision: 'R2',
      status: '量产', socketKey: 'grip', attachment: 'wrist_R',
      requires: { type: '螺纹', diameter: 4.0, depth: 5.0, tolerance: 0.1 },
      mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0] },
      matedParts: [],
      proxies: [
        { name: '握柄', a: [0, -16, 0], b: [0, 0, 0], radius: 3.4, color: '#6b5744', collide: false },
        { name: '护手', a: [-12, 2, 0], b: [12, 2, 0], radius: 2.6, color: '#b8843c', collide: true },
        blade(96, 3.6, '#cdd7e2'),
      ],
      compatibleModels: [M], updatedAt: '2026-10-19T11:00:00+08:00', updatedBy: '李工 · 原型',
      note: '全长 112mm，需 M4 螺纹手型。', tags: ['右手', '双刃'],
    },
    {
      id: 'acc_sword_tachi', code: 'W-02', name: '太刀 · 霜', category: '武器', rev: 1, revision: 'R1',
      status: '量产', socketKey: 'grip', attachment: 'wrist_R',
      requires: { type: '螺纹', diameter: 4.0, depth: 5.0, tolerance: 0.1 },
      mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0] },
      matedParts: [],
      proxies: [
        { name: '握柄', a: [0, -20, 0], b: [0, 0, 0], radius: 3.4, color: '#3d4756', collide: false },
        { name: '护手', a: [-10, 2, 0], b: [10, 2, 0], radius: 2.4, color: '#8e97a5', collide: true },
        blade(128, 3.2, '#dbe4ee'),
      ],
      compatibleModels: [M], updatedAt: '2026-11-06T15:12:00+08:00', updatedBy: '李工 · 原型',
      note: '全长 148mm，重心偏刃，注意腕部受力。', tags: ['右手', '长物'],
    },
    {
      id: 'acc_hammer', code: 'W-03', name: '战锤 · 碎石', category: '武器', rev: 1, revision: 'R1',
      status: '量产', socketKey: 'grip', attachment: 'wrist_R',
      requires: { type: '螺纹', diameter: 3.0, depth: 4.0, tolerance: 0.1 },
      mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0] },
      matedParts: [],
      proxies: [
        { name: '锤柄', a: [0, -8, 0], b: [0, 26, 0], radius: 3.0, color: '#6b5744', collide: true },
        { name: '锤头', a: [-13, 30, 0], b: [13, 30, 0], radius: 7.2, color: '#8e97a5', collide: true },
      ],
      compatibleModels: [M], updatedAt: '2026-10-08T08:45:00+08:00', updatedBy: '李工 · 原型',
      note: '需 M3 握把，锤头外径 28mm。', tags: ['右手', '重物'],
    },
    {
      id: 'acc_spear', code: 'W-04', name: '长枪 · 逐日', category: '武器', rev: 1, revision: 'R1',
      status: '试制', socketKey: 'grip', attachment: 'wrist_R',
      requires: { type: '卡榫', diameter: 5.0, depth: 6.0, tolerance: 0.1 },
      mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0] },
      matedParts: [],
      proxies: [
        { name: '枪杆', a: [0, -55, 0], b: [0, 118, 0], radius: 2.8, color: '#7d6a55', collide: true },
        { name: '枪头', a: [0, 118, 0], b: [0, 148, 0], radius: 4.5, color: '#cdd7e2', collide: true },
      ],
      compatibleModels: [M], updatedAt: '2026-11-13T17:20:00+08:00', updatedBy: '李工 · 原型',
      note: '试制卡榫结构，现有手型未提供对应接口。', tags: ['试制', '长物'],
    },
    {
      id: 'acc_base_round', code: 'B-01', name: '圆形底座 ø90', category: '底座', rev: 2, revision: 'R2',
      status: '量产', socketKey: 'root', attachment: 'root',
      requires: ROOT_REQ,
      mount: { pos: [0, -6, 0], rotDeg: [0, 0, 0] },
      matedParts: [],
      proxies: [{ name: '底盘', a: [-45, 0, 0], b: [45, 0, 0], radius: 6.0, color: '#5d6b80', collide: true }],
      compatibleModels: [M], updatedAt: '2026-10-21T13:30:00+08:00', updatedBy: '李工 · 原型',
      note: '标准 ø90 圆盘，插榫高 5mm。', tags: ['标准'],
      baseRadius: 45, baseHeight: 6,
    },
    {
      id: 'acc_base_rock', code: 'B-02', name: '岩台地台', category: '底座', rev: 1, revision: 'R1',
      status: '量产', socketKey: 'root', attachment: 'root',
      requires: { type: '圆榫', diameter: 6.0, depth: 4.0, tolerance: 0.1 },
      mount: { pos: [0, -7, 0], rotDeg: [0, 0, 0] },
      matedParts: [],
      proxies: [
        { name: '岩台', a: [-36, 0, 0], b: [36, 0, 0], radius: 8.0, color: '#6e6a61', collide: true },
        { name: '岩体', a: [28, 6, 12], b: [33, 18, 14], radius: 4.6, color: '#837d72', collide: true },
      ],
      compatibleModels: [M], updatedAt: '2026-11-04T09:00:00+08:00', updatedBy: '李工 · 原型',
      note: '表面起伏，前凸岩块最高点距脚背仅 1mm。', tags: ['场景'],
      baseRadius: 38, baseHeight: 8,
    },
    {
      id: 'acc_base_clear', code: 'B-03', name: '透明支架', category: '底座', rev: 1, revision: 'R1',
      status: '量产', socketKey: 'root', attachment: 'root',
      requires: { type: '圆榫', diameter: 6.2, depth: 5.0, tolerance: 0.05 },
      mount: { pos: [0, -6, 0], rotDeg: [0, 0, 0] },
      matedParts: [],
      proxies: [{ name: '支架底盘', a: [-38, 0, 0], b: [38, 0, 0], radius: 5.0, color: '#8fa3bd', collide: true }],
      compatibleModels: [M], updatedAt: '2026-10-30T18:10:00+08:00', updatedBy: '李工 · 原型',
      note: '榫径 6.2mm，与 6.0 插孔过盈。', tags: ['需修模'],
      baseRadius: 38, baseHeight: 6,
    },
  ]
}
