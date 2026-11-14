// 种子数据：标准脑区模板、术语库、配色规范、示例图示与患者查看记录
import type {
  AppState,
  BrainRegion,
  BrainTemplate,
  ColorSpec,
  DiagramDoc,
  Layer,
  Point,
  RegionShape,
  PathShape,
  NoteShape,
  TermEntry,
  ViewSession,
} from '../types';
import { uid } from '../core/geometry';

const W = 1000;
const H = 760;

/** 生成带鼻突的头颅侧位轮廓（面朝左） */
function headOutline(): Point[] {
  const cx = 505;
  const cy = 380;
  const rx = 290;
  const ry = 325;
  const pts: Point[] = [];
  for (let deg = -55; deg <= 300; deg += 18) {
    const rad = (deg * Math.PI) / 180;
    let x = cx + rx * Math.cos(rad);
    let y = cy + ry * Math.sin(rad);
    // 左侧造出鼻突
    if (Math.cos(rad) < -0.55 && Math.sin(rad) > -0.35 && Math.sin(rad) < 0.45) {
      x -= 46;
    }
    pts.push({ x: Math.round(x), y: Math.round(y) });
  }
  return pts;
}

function region(
  id: string,
  name: string,
  outline: Point[],
  theta: number,
  phi: number,
  plainText: string,
  risk: string,
  color: string,
): BrainRegion {
  return { id, name, outline, anchor: { theta, phi, r: 1.02 }, plainText, risk, color };
}

// 画布上各脑区的示意多边形（侧位，鼻朝左）
const R = (arr: [number, number][]): Point[] => arr.map(([x, y]) => ({ x, y }));

const regions: BrainRegion[] = [
  region(
    'rg-frontal',
    '额叶',
    R([
      [300, 200], [430, 170], [520, 230], [500, 360], [380, 420],
      [280, 380], [250, 290],
    ]),
    2.5, 0.35,
    '额叶位于大脑前部，负责思考、计划、性格与自主运动的发起，是“总指挥”。',
    '损伤后可能出现性格改变、判断力下降、对侧肢体无力或言语表达困难。',
    '#7dd3fc',
  ),
  region(
    'rg-motor',
    '中央前回（运动区）',
    R([[505, 205], [545, 215], [545, 425], [505, 415]]),
    1.85, 0.15,
    '中央前回是支配全身随意运动的“运动开关带”，按部位排列控制对侧手脚。',
    '刺激或损伤可引起对侧肢体抽搐、无力甚至偏瘫，手术中通常需要实时监测。',
    '#fca5a5',
  ),
  region(
    'rg-sensory',
    '中央后回（感觉区）',
    R([[550, 212], [588, 222], [588, 420], [550, 418]]),
    1.6, 0.12,
    '中央后回负责接收对侧身体的触觉、痛觉、温度和位置觉。',
    '损伤后对侧身体可能出现麻木、感觉减退或异常疼痛。',
    '#fdba74',
  ),
  region(
    'rg-parietal',
    '顶叶',
    R([
      [595, 215], [720, 205], [800, 280], [780, 380], [660, 420], [595, 410],
    ]),
    1.25, 0.55,
    '顶叶整合各种感觉信息，负责空间定位、计算和身体协调性。',
    '优势侧损伤可能影响阅读、计算；非优势侧损伤可出现忽略一侧身体的情况。',
    '#c4b5fd',
  ),
  region(
    'rg-temporal',
    '颞叶',
    R([
      [285, 430], [420, 430], [540, 455], [560, 560], [440, 615],
      [310, 590], [255, 510],
    ]),
    2.6, -0.55,
    '颞叶位于大脑两侧下方，主管听觉、记忆，并与情绪和语言理解密切相关。',
    '手术可能影响记忆，优势侧受累可出现语言理解障碍，部分患者有癫痫风险。',
    '#86efac',
  ),
  region(
    'rg-occipital',
    '枕叶',
    R([[735, 285], [825, 320], [830, 455], [760, 510], [700, 420], [710, 330]]),
    0.45, 0.2,
    '枕叶位于大脑最后方，是视觉信号处理中心，相当于“图像处理器”。',
    '损伤可能造成视野缺损，比如看东西缺了一块或偏盲。',
    '#f9a8d4',
  ),
  region(
    'rg-cerebellum',
    '小脑',
    R([
      [600, 540], [720, 520], [800, 555], [780, 640], [660, 665], [580, 620],
    ]),
    0.9, -0.95,
    '小脑位于后颅窝，负责维持平衡、协调动作和精细运动，像“稳定器”。',
    '术后可能出现走路不稳、动作不协调、眼球震颤等，多数经康复可改善。',
    '#a7f3d0',
  ),
  region(
    'rg-brainstem',
    '脑干',
    R([[500, 560], [560, 565], [575, 660], [515, 675], [485, 620]]),
    1.7, -1.2,
    '脑干连接大脑与脊髓，掌管呼吸、心跳、清醒程度等生命中枢。',
    '该区域手术风险高，可能影响意识、呼吸循环及多组颅神经功能。',
    '#fcd34d',
  ),
  region(
    'rg-broca',
    'Broca 语言区',
    R([[330, 330], [420, 320], [430, 385], [340, 395]]),
    2.75, -0.05,
    'Broca 区位于优势半球额叶，负责语言的表达与组织。',
    '损伤后心里明白却说不流利，称为运动性失语，多需语言康复训练。',
    '#f0abfc',
  ),
  region(
    'rg-wernicke',
    'Wernicke 语言区',
    R([[350, 470], [470, 465], [480, 530], [360, 540]]),
    2.5, -0.75,
    'Wernicke 区位于优势半球颞叶，负责理解听到和读到的语言。',
    '损伤后能流利说话但内容混乱、听不懂别人的话，称为感觉性失语。',
    '#67e8f9',
  ),
];

const template: BrainTemplate = {
  id: 'tpl-standard-lateral',
  name: '标准大脑半球侧位模板',
  version: 'v2.1',
  width: W,
  height: H,
  gridSize: 40,
  headOutline: headOutline(),
  regions,
  updatedAt: Date.parse('2026-10-20T09:00:00'),
};

const terms: TermEntry[] = [
  { id: uid('term'), term: '胶质瘤', alias: 'Glioma', plain: '起源于脑内胶质细胞的肿瘤，按恶性程度分 I–IV 级，级别越高生长越快。', risk: '可能侵犯周围功能脑组织，切除范围与神经功能保护需要平衡。' },
  { id: uid('term'), term: '脑膜瘤', alias: 'Meningioma', plain: '长在脑膜上的肿瘤，多数为良性，边界较清楚。', risk: '若紧邻大血管或静脉窦，手术出血风险增加。' },
  { id: uid('term'), term: '功能区', alias: 'Eloquent Area', plain: '掌管运动、语言、视觉等关键功能的脑区，损伤会出现相应功能障碍。', risk: '术中需神经导航与电生理监测，必要时唤醒麻醉。' },
  { id: uid('term'), term: '手术入路', alias: 'Surgical Approach', plain: '医生设计的到达病变的安全通道，尽量避开功能区和重要血管。', risk: '入路选择受病变位置、血管走行和骨质条件限制。' },
  { id: uid('term'), term: '血管畸形', alias: 'Vascular Malformation', plain: '脑内异常的血管团，管壁薄弱，容易破裂出血。', risk: '术中分离时可能发生难以控制的出血。' },
  { id: uid('term'), term: '中线移位', alias: 'Midline Shift', plain: '占位把脑组织推向对侧，提示颅内压力明显升高。', risk: '严重时可形成脑疝，属于需要紧急处理的信号。' },
  { id: uid('term'), term: '瘤周水肿', alias: 'Peritumoral Edema', plain: '肿瘤周围脑组织肿胀，范围往往比肿瘤本身更大。', risk: '水肿区未必都是肿瘤，术后需配合药物逐步消退。' },
];

const colors: ColorSpec[] = [
  { id: uid('cs'), semantic: 'lesion', semanticLabel: '病变范围', fill: '#e5484d', stroke: '#b42329', required: true },
  { id: uid('cs'), semantic: 'eloquent', semanticLabel: '功能区', fill: '#f5a623', stroke: '#c2740a', required: true },
  { id: uid('cs'), semantic: 'vessel', semanticLabel: '血管走行', fill: '#3b82f6', stroke: '#1d4ed8', required: true },
  { id: uid('cs'), semantic: 'approach', semanticLabel: '手术入路', fill: '#8b5cf6', stroke: '#6d28d9', required: true },
  { id: uid('cs'), semantic: 'annotation', semanticLabel: '文字标注', fill: '#475569', stroke: '#334155', required: false },
];

function layer(id: string, name: string): Layer {
  return { id, name, visible: true, locked: false, opacity: 1 };
}

const baseLayers = (): Layer[] => [
  layer('ly-template', '模板网格'),
  layer('ly-lesion', '病变范围'),
  layer('ly-eloquent', '功能区'),
  layer('ly-vessel', '血管走行'),
  layer('ly-approach', '手术入路'),
  layer('ly-note', '标注'),
];

const now = Date.now();

// ---------- 示例图示 1：已通过审核并发布 ----------
const doc1: DiagramDoc = {
  id: 'doc-001',
  title: '左额叶胶质瘤切除术 · 术前图示',
  patientName: '张××',
  patientNo: 'P20261103',
  author: '王主治',
  templateId: template.id,
  layers: baseLayers(),
  status: 'approved',
  showTemplate: true,
  createdAt: now - 86400_000 * 9,
  updatedAt: now - 86400_000 * 7,
  publishedAt: now - 86400_000 * 7,
  shareToken: 'shr-a1b2c3d4',
  shapes: [
    {
      id: 'sh-lesion-1', kind: 'region', semantic: 'lesion', layerId: 'ly-lesion',
      label: '左额叶占位', anatomyTag: 'rg-frontal',
      points: [
        { id: uid('n'), x: 330, y: 250, smooth: 0.6 }, { id: uid('n'), x: 400, y: 235, smooth: 0.6 },
        { id: uid('n'), x: 455, y: 285, smooth: 0.6 }, { id: uid('n'), x: 430, y: 350, smooth: 0.6 },
        { id: uid('n'), x: 350, y: 355, smooth: 0.6 }, { id: uid('n'), x: 315, y: 305, smooth: 0.6 },
      ],
      fill: '#e5484d', stroke: '#b42329',
      createdAt: now - 86400_000 * 9, updatedAt: now - 86400_000 * 8,
    } satisfies RegionShape,
    {
      id: 'sh-eloquent-1', kind: 'region', semantic: 'eloquent', layerId: 'ly-eloquent',
      label: 'Broca 语言区', anatomyTag: 'rg-broca',
      points: [
        { id: uid('n'), x: 330, y: 330, smooth: 0.3 }, { id: uid('n'), x: 420, y: 320, smooth: 0.3 },
        { id: uid('n'), x: 430, y: 385, smooth: 0.3 }, { id: uid('n'), x: 340, y: 395, smooth: 0.3 },
      ],
      fill: '#f5a623', stroke: '#c2740a',
      createdAt: now - 86400_000 * 9, updatedAt: now - 86400_000 * 8,
    } satisfies RegionShape,
    {
      id: 'sh-vessel-1', kind: 'path', semantic: 'vessel', layerId: 'ly-vessel',
      label: '大脑中动脉分支', anatomyTag: 'rg-temporal',
      points: [
        { id: uid('n'), x: 250, y: 470, smooth: 0.7 }, { id: uid('n'), x: 330, y: 440, smooth: 0.7 },
        { id: uid('n'), x: 410, y: 425, smooth: 0.7 }, { id: uid('n'), x: 480, y: 400, smooth: 0.7 },
      ],
      stroke: '#1d4ed8', width: 4, dashed: false,
      createdAt: now - 86400_000 * 9, updatedAt: now - 86400_000 * 8,
    } satisfies PathShape,
    {
      id: 'sh-approach-1', kind: 'path', semantic: 'approach', layerId: 'ly-approach',
      label: '额部冠状入路', anatomyTag: 'rg-frontal',
      points: [
        { id: uid('n'), x: 230, y: 150, smooth: 0.4 }, { id: uid('n'), x: 300, y: 200, smooth: 0.4 },
        { id: uid('n'), x: 360, y: 255, smooth: 0.4 },
      ],
      stroke: '#6d28d9', width: 3, dashed: true,
      createdAt: now - 86400_000 * 9, updatedAt: now - 86400_000 * 8,
    } satisfies PathShape,
    {
      id: 'sh-note-1', kind: 'note', semantic: 'annotation', layerId: 'ly-note',
      at: { x: 200, y: 230 }, text: '注意保护语言区与 MCA 分支', color: '#475569',
      createdAt: now - 86400_000 * 8, updatedAt: now - 86400_000 * 8,
    } satisfies NoteShape,
  ],
  review: {
    reviewer: '李审核',
    checklist: [
      { key: 'anatomy', label: '解剖标注完整', passed: true, autoHint: 'ok' },
      { key: 'color', label: '配色符合规范', passed: true, autoHint: 'ok' },
      { key: 'risk', label: '风险提示齐全', passed: true },
      { key: 'label', label: '文字标注清晰', passed: true },
    ],
    comment: '图示规范，同意发布。',
    changeRequests: [],
    result: 'approved',
    at: now - 86400_000 * 7,
  },
};

// ---------- 示例图示 2：被退回 ----------
const doc2: DiagramDoc = {
  id: 'doc-002',
  title: '右颞叶占位探查 · 术前图示',
  patientName: '陈××',
  patientNo: 'P20261108',
  author: '赵副主任',
  templateId: template.id,
  layers: baseLayers(),
  status: 'rejected',
  showTemplate: true,
  createdAt: now - 86400_000 * 5,
  updatedAt: now - 86400_000 * 3,
  shapes: [
    {
      id: 'sh-lesion-2', kind: 'region', semantic: 'lesion', layerId: 'ly-lesion',
      label: '颞叶病变',
      // 故意缺少 anatomyTag，审核将判定缺解剖标注
      points: [
        { id: uid('n'), x: 350, y: 470, smooth: 0.5 }, { id: uid('n'), x: 450, y: 460, smooth: 0.5 },
        { id: uid('n'), x: 480, y: 540, smooth: 0.5 }, { id: uid('n'), x: 380, y: 560, smooth: 0.5 },
      ],
      // 故意使用非规范颜色
      fill: '#22c55e', stroke: '#15803d',
      createdAt: now - 86400_000 * 5, updatedAt: now - 86400_000 * 4,
    } satisfies RegionShape,
  ],
  review: {
    reviewer: '李审核',
    checklist: [
      { key: 'anatomy', label: '解剖标注完整', passed: false, autoHint: 'warn' },
      { key: 'color', label: '配色符合规范', passed: false, autoHint: 'warn' },
      { key: 'risk', label: '风险提示齐全', passed: null },
      { key: 'label', label: '文字标注清晰', passed: null },
    ],
    comment: '请按以下修改项调整后重新提交。',
    changeRequests: [
      '“颞叶病变”缺少解剖标注，请关联到标准模板脑区（颞叶 / Wernicke 区）。',
      '病变区域使用绿色，不符合配色规范，请改为规范红色 #e5484d / #b42329。',
      '补充邻近血管走行与手术入路示意。',
    ],
    result: 'rejected',
    at: now - 86400_000 * 3,
  },
};

// ---------- 示例图示 3：待审核 ----------
const doc3: DiagramDoc = {
  id: 'doc-003',
  title: '小脑占位手术 · 术前图示',
  patientName: '刘××',
  patientNo: 'P20261112',
  author: '王主治',
  templateId: template.id,
  layers: baseLayers(),
  status: 'submitted',
  showTemplate: true,
  createdAt: now - 86400_000 * 2,
  updatedAt: now - 86400_000 * 1,
  shapes: [
    {
      id: 'sh-lesion-3', kind: 'region', semantic: 'lesion', layerId: 'ly-lesion',
      label: '小脑半球占位', anatomyTag: 'rg-cerebellum',
      points: [
        { id: uid('n'), x: 640, y: 555, smooth: 0.6 }, { id: uid('n'), x: 720, y: 545, smooth: 0.6 },
        { id: uid('n'), x: 750, y: 610, smooth: 0.6 }, { id: uid('n'), x: 670, y: 635, smooth: 0.6 },
      ],
      fill: '#e5484d', stroke: '#b42329',
      createdAt: now - 86400_000 * 2, updatedAt: now - 86400_000 * 1,
    } satisfies RegionShape,
    {
      id: 'sh-approach-3', kind: 'path', semantic: 'approach', layerId: 'ly-approach',
      label: '后正中入路', anatomyTag: 'rg-cerebellum',
      points: [
        { id: uid('n'), x: 700, y: 700, smooth: 0.3 }, { id: uid('n'), x: 690, y: 660, smooth: 0.3 },
        { id: uid('n'), x: 680, y: 620, smooth: 0.3 },
      ],
      stroke: '#6d28d9', width: 3, dashed: true,
      createdAt: now - 86400_000 * 2, updatedAt: now - 86400_000 * 1,
    } satisfies PathShape,
  ],
};

// ---------- 示例图示 4：草稿 ----------
const doc4: DiagramDoc = {
  id: 'doc-004',
  title: '额顶叶功能区病变（草稿）',
  patientName: '周××',
  patientNo: 'P20261115',
  author: '孙主任',
  templateId: template.id,
  layers: baseLayers(),
  status: 'draft',
  showTemplate: true,
  createdAt: now - 86400_000,
  updatedAt: now - 3600_000,
  shapes: [],
};

// ---------- 患者查看记录（用于统计页） ----------
const sessions: ViewSession[] = [
  { id: uid('vs'), token: 'shr-a1b2c3d4', docId: 'doc-001', startedAt: now - 86400_000 * 6, durationSec: 312, regionsOpened: ['rg-frontal', 'rg-broca'], endedAt: now - 86400_000 * 6 + 312_000 },
  { id: uid('vs'), token: 'shr-a1b2c3d4', docId: 'doc-001', startedAt: now - 86400_000 * 5, durationSec: 428, regionsOpened: ['rg-frontal', 'rg-motor', 'rg-temporal'], endedAt: now - 86400_000 * 5 + 428_000 },
  { id: uid('vs'), token: 'shr-a1b2c3d4', docId: 'doc-001', startedAt: now - 86400_000 * 4, durationSec: 265, regionsOpened: ['rg-broca'], endedAt: now - 86400_000 * 4 + 265_000 },
  { id: uid('vs'), token: 'shr-a1b2c3d4', docId: 'doc-001', startedAt: now - 86400_000 * 2, durationSec: 502, regionsOpened: ['rg-frontal', 'rg-broca', 'rg-temporal', 'rg-motor'], endedAt: now - 86400_000 * 2 + 502_000 },
  { id: uid('vs'), token: 'shr-old-0001', docId: 'doc-old', startedAt: now - 86400_000 * 3, durationSec: 188, regionsOpened: ['rg-occipital'], endedAt: now - 86400_000 * 3 + 188_000 },
];

export function buildSeedState(): AppState {
  return {
    docs: [doc1, doc2, doc3, doc4],
    templates: [template],
    terms,
    colors,
    sessions,
    currentDoctor: '王主治',
    currentReviewer: '李审核',
  };
}
