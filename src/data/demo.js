// 演示项目：青山沟 / 柳树沟小流域，含已布设措施与历史版本
import { LAND_TYPES, MEASURE_TYPES } from '../lib/measures.js'

export const DEMO_WATERSHEDS = [
  {
    id: 'ws1',
    name: '青山沟小流域',
    code: 'QSH-01',
    color: '#4f7cac',
    outlet: [592, 1170],
    points: [
      [206, 42], [470, 26], [700, 34], [905, 48], [972, 260], [968, 470], [936, 690],
      [872, 900], [742, 1094], [592, 1170], [474, 1150], [316, 1016], [196, 806],
      [150, 560], [158, 300],
    ],
  },
  {
    id: 'ws2',
    name: '柳树沟小流域',
    code: 'LSH-02',
    color: '#6f8f54',
    outlet: [1254, 1178],
    points: [
      [1004, 52], [1180, 30], [1362, 42], [1478, 232], [1508, 520], [1482, 812],
      [1376, 1032], [1254, 1178], [1096, 1160], [966, 986], [930, 700], [950, 430],
      [966, 220],
    ],
  },
]

export const DEMO_PATCHES = [
  { id: 'p1', watershedId: 'ws1', name: '西坡坡耕地', landType: 'slopeFarm', points: [[214, 522], [392, 500], [430, 606], [402, 742], [246, 764], [190, 662]] },
  { id: 'p2', watershedId: 'ws1', name: '上游荒草地', landType: 'wasteGrass', points: [[784, 196], [918, 182], [956, 250], [930, 326], [806, 342], [760, 268]] },
  { id: 'p3', watershedId: 'ws1', name: '沟道出口', landType: 'outlet', points: [[492, 1000], [640, 994], [690, 1090], [650, 1172], [500, 1166], [462, 1090]] },
  { id: 'p4', watershedId: 'ws1', name: '中部有林地', landType: 'forest', points: [[620, 150], [760, 136], [796, 214], [760, 296], [626, 300], [586, 222]] },
  { id: 'p5', watershedId: 'ws1', name: '陡坡耕地', landType: 'slopeFarm', points: [[168, 120], [300, 108], [352, 180], [336, 268], [250, 300], [178, 240]] },
  { id: 'p6', watershedId: 'ws1', name: '东侧坡耕地', landType: 'slopeFarm', points: [[700, 508], [902, 486], [946, 600], [884, 700], [742, 690], [700, 590]] },
  { id: 'p7', watershedId: 'ws2', name: '中坡荒草地', landType: 'wasteGrass', points: [[1054, 396], [1230, 382], [1306, 494], [1268, 596], [1080, 612], [1022, 508]] },
  { id: 'p8', watershedId: 'ws2', name: '下坡坡耕地', landType: 'slopeFarm', points: [[1028, 802], [1210, 788], [1276, 900], [1232, 1004], [1054, 1014], [998, 906]] },
  { id: 'p9', watershedId: 'ws2', name: '沟道出口', landType: 'outlet', points: [[1146, 1034], [1298, 1024], [1348, 1104], [1310, 1180], [1156, 1180], [1122, 1104]] },
  { id: 'p10', watershedId: 'ws2', name: '东侧灌木林地', landType: 'shrub', points: [[1332, 596], [1452, 586], [1486, 706], [1418, 800], [1322, 786], [1298, 692]] },
  { id: 'p11', watershedId: 'ws2', name: '缓坡台地', landType: 'wasteGrass', points: [[1226, 404], [1330, 396], [1360, 478], [1310, 540], [1216, 528], [1186, 462]] },
]

const P = (id, type, patchId, watershedId, params, shape, extra = {}) => ({
  id,
  type,
  patchId,
  watershedId,
  params: { ...MEASURE_TYPES[type].defaults, ...params },
  shape,
  ...extra,
})

// 当前草稿方案的措施
export const DEMO_MEASURES = [
  P('m1', 'terrace', 'p1', 'ws1', { ridgeH: 0.6, benchW: 6, shrubSpacing: 1.5 }, { kind: 'rect', center: [300, 620], angle: -0.16, L: 190, W: 130 }),
  P('m2', 'fishpit', 'p2', 'ws1', { pitDia: 0.8, pitDepth: 0.4, rowSpacing: 3, plantSpacing: 2, treesPerPit: 1 }, { kind: 'rect', center: [872, 252], angle: 0.12, L: 132, W: 100 }),
  P('m3', 'grass', 'p2', 'ws1', { seedRate: 0.008 }, { kind: 'rect', center: [818, 318], angle: 0.05, L: 80, W: 42 }),
  P('m4', 'forest', 'p4', 'ws1', { rowSpacing: 3, plantSpacing: 2 }, { kind: 'rect', center: [690, 216], angle: 0.1, L: 168, W: 130 }),
  P('m5', 'terrace', 'p5', 'ws1', { ridgeH: 0.6, benchW: 5, shrubSpacing: 1.5 }, { kind: 'rect', center: [262, 206], angle: 0.14, L: 150, W: 110 }),
  P('m6', 'terrace', 'p6', 'ws1', { ridgeH: 0.6, benchW: 6, shrubSpacing: 1.5 }, { kind: 'rect', center: [826, 596], angle: -0.26, L: 190, W: 150 }),
  P('m7', 'ditch', 'p6', 'ws1', { bottomW: 0.4, depth: 0.5 }, { kind: 'line', points: [[724, 706], [812, 716], [890, 708]] }),
  P('m8', 'checkdam', 'p3', 'ws1', { damH: 2.5, gullyW: 7 }, { kind: 'point', center: [630, 946], angle: 1.79 }, { channelId: 'c1', s: 980 }),
  P('m9', 'checkdam', 'p3', 'ws1', { damH: 2.5, gullyW: 7 }, { kind: 'point', center: [612, 1024], angle: 1.79 }, { channelId: 'c1', s: 1060 }),
  P('m10', 'terrace', 'p8', 'ws2', { ridgeH: 0.6, benchW: 6, shrubSpacing: 1.5 }, { kind: 'rect', center: [1136, 900], angle: 0.06, L: 208, W: 148 }),
  P('m11', 'fishpit', 'p7', 'ws2', { pitDia: 0.8, pitDepth: 0.4, rowSpacing: 3.5, plantSpacing: 2 }, { kind: 'rect', center: [1164, 496], angle: -0.1, L: 208, W: 152 }),
  P('m12', 'forest', 'p10', 'ws2', { rowSpacing: 3, plantSpacing: 2 }, { kind: 'rect', center: [1394, 692], angle: 0.28, L: 150, W: 130 }),
  P('m13', 'checkdam', 'p9', 'ws2', { damH: 2.2, gullyW: 6 }, { kind: 'point', center: [1257, 1025], angle: 0.05 }, { channelId: 'c2', s: 1050 }),
  P('m14', 'fishpit', 'p11', 'ws2', { pitDia: 0.8, pitDepth: 0.4, rowSpacing: 3, plantSpacing: 2 }, { kind: 'rect', center: [1316, 470], angle: 0.18, L: 92, W: 66 }),
]

export const DEMO_LAND_NAME = (t) => LAND_TYPES[t]?.name || t
