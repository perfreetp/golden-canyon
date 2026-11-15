// 业务领域类型定义

export type Role = 'engineer' | 'customer';

export interface Customer {
  id: string;
  name: string;
  account: string; // 客户跟单登录账号
}

export interface Style {
  id: string;
  code: string; // 款式编号
  name: string; // 款式名称
  customerId: string;
}

export type PartStatus =
  | 'pending_mold' // 待开模（已建单未试模）
  | 'trial_pending' // 待试模
  | 'repairing' // 修模中
  | 'mold_ready' // 模具合格（量产中）
  | 'scrapped'; // 模具报废

export type DefectType = '缩水' | '飞边' | '顶白' | '缺胶' | '气泡' | '变形' | '熔接痕' | '其他';

export interface DefectItem {
  partId: string; // 点选的具体分件
  type: DefectType;
  desc: string;
  photo: string; // 缺陷照片 dataURL（必填）
}

export interface TrialRecord {
  id: string;
  partId: string;
  round: number; // 第几次试模
  date: string;
  passed: boolean;
  defects: DefectItem[];
  repairPlan?: string; // 不通过时的修模方案
  operator: string;
}

export type PartShapeKind = 'box' | 'sphere' | 'cylinder' | 'torus' | 'capsule';

export interface Part {
  id: string;
  styleId: string;
  name: string; // 分件名称，如 头部前壳
  color: string; // 色号
  shape: PartShapeKind;
  pos: [number, number, number]; // 装配位置
  rot: [number, number, number]; // 装配角度(度)
  scale: [number, number, number];
  status: PartStatus;
  orderId?: string; // 关联开模单
  repairCount: number; // 累计修模次数
  moldId?: string;
}

export interface MoldOrder {
  id: string;
  no: string; // 开模单号
  partId: string;
  styleId: string;
  moldNo: string; // 模号
  cavities: number; // 穴数
  material: string; // 材质
  colorCode: string; // 色号
  lifeTotal: number; // 模具寿命（模次），默认 300000
  lifeUsed: number; // 已打模次
  createdAt: string;
  remark: string;
}

export type BatchStatus =
  | 'pending_schedule' // 待排产
  | 'injecting' // 注塑中
  | 'pending_inspect' // 待检验
  | 'released' // 放行
  | 'rework'; // 返工

export interface Batch {
  id: string;
  no: string; // 批次号
  orderId: string;
  partId: string;
  styleId: string;
  machineId?: string;
  qty: number; // 计划数量(件)
  goodQty: number; // 良品数
  defectQty: number; // 不良数
  status: BatchStatus;
  createdAt: string;
  scheduledAt?: string;
  dueDate: string; // 交期
  inspectionNote?: string;
}

export interface Machine {
  id: string;
  no: string; // 机台号
  name: string;
  tonnage: number; // 吨位
}

export interface ShotLog {
  id: string;
  date: string; // YYYY-MM-DD
  machineId: string;
  batchId: string;
  shots: number; // 本次打模数（模次）
  pieces: number; // 出件数
  defect: number; // 不良件数
  time: string;
}

export interface AppState {
  role: Role;
  currentCustomerId: string | null; // 客户跟单身份
  customers: Customer[];
  styles: Style[];
  parts: Part[];
  orders: MoldOrder[];
  trials: TrialRecord[];
  batches: Batch[];
  machines: Machine[];
  shotLogs: ShotLog[];
}
