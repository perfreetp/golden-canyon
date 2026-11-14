// 领域模型与全局类型定义

export type Point = { x: number; y: number };

/** 图示语义类型 */
export type ShapeKind = 'lesion' | 'eloquent' | 'vessel' | 'approach' | 'annotation';

/** 布尔运算类型 */
export type BooleanOp = 'union' | 'subtract';

/** 图层（面状区域：病变 / 功能区）的节点 */
export interface RegionNode extends Point {
  id: string;
  /** 圆滑过渡（catmull-rom 转三次贝塞尔），0 = 直线段 */
  smooth: number;
}

/** 面状区域，支持闭合路径与节点级编辑 */
export interface RegionShape {
  id: string;
  kind: 'region';
  semantic: Extract<ShapeKind, 'lesion' | 'eloquent'>;
  layerId: string;
  label?: string;
  /** 解剖标注（关联脑区模板 id），审核要求必须存在 */
  anatomyTag?: string;
  points: RegionNode[];
  fill: string;
  stroke: string;
  /** 由布尔运算生成时记录来源，便于追溯 */
  booleanSource?: { op: BooleanOp; a: string; b: string };
  createdAt: number;
  updatedAt: number;
}

/** 线状路径（血管走行 / 手术入路），带圆弧控制点 */
export interface PathShape {
  id: string;
  kind: 'path';
  semantic: Extract<ShapeKind, 'vessel' | 'approach'>;
  layerId: string;
  label?: string;
  anatomyTag?: string;
  points: RegionNode[];
  stroke: string;
  width: number;
  /** 虚线（手术入路默认虚线） */
  dashed: boolean;
  createdAt: number;
  updatedAt: number;
}

/** 文字标注 */
export interface NoteShape {
  id: string;
  kind: 'note';
  semantic: 'annotation';
  layerId: string;
  at: Point;
  text: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export type Shape = RegionShape | PathShape | NoteShape;
export type AnyShapeId = string;

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0-1
}

/** 图示文档（一份画布的完整数据） */
export interface DiagramDoc {
  id: string;
  title: string;
  patientName: string;
  patientNo: string;
  author: string;
  templateId: string;
  layers: Layer[];
  shapes: Shape[];
  /** 画布上是否显示标准脑区模板网格 */
  showTemplate: boolean;
  createdAt: number;
  updatedAt: number;
  status: DocStatus;
  /** 审核信息 */
  review?: ReviewRecord;
  /** 分享令牌（发布后生成） */
  shareToken?: string;
  publishedAt?: number;
}

export type DocStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface ReviewChecklistItem {
  key: string;
  label: string;
  passed: boolean | null; // null = 待核对
  autoHint?: 'ok' | 'warn';
}

export interface ReviewRecord {
  reviewer: string;
  checklist: ReviewChecklistItem[];
  comment: string;
  /** 退回时逐条写明的修改项 */
  changeRequests: string[];
  result: 'approved' | 'rejected';
  at: number;
}

/** 标准脑区模板（2D 画布参考网格 + 3D 脑区共用） */
export interface BrainRegion {
  id: string;
  name: string;
  /** 画布上的参考轮廓（模板网格的一部分） */
  outline: Point[];
  /** 3D 头模上的锚点（球坐标：方位角/仰角/半径系数） */
  anchor: { theta: number; phi: number; r: number };
  /** 通俗说明（患者端展示） */
  plainText: string;
  /** 风险提示 */
  risk: string;
  color: string;
}

export interface BrainTemplate {
  id: string;
  name: string;
  version: string;
  /** 画布逻辑尺寸 */
  width: number;
  height: number;
  /** 吸附网格间距 */
  gridSize: number;
  /** 头颅侧位轮廓，作为画布底图 */
  headOutline: Point[];
  regions: BrainRegion[];
  updatedAt: number;
}

/** 术语库条目 */
export interface TermEntry {
  id: string;
  term: string;
  alias: string;
  plain: string; // 患者向通俗解释
  risk: string;
}

/** 图示配色规范 */
export interface ColorSpec {
  id: string;
  semantic: ShapeKind;
  semanticLabel: string;
  fill: string;
  stroke: string;
  required: boolean;
}

export interface ViewSession {
  id: string;
  token: string;
  docId: string;
  startedAt: number;
  endedAt?: number;
  durationSec: number;
  regionsOpened: string[];
}

export interface AppState {
  docs: DiagramDoc[];
  templates: BrainTemplate[];
  terms: TermEntry[];
  colors: ColorSpec[];
  sessions: ViewSession[];
  currentDoctor: string;
  currentReviewer: string;
}
