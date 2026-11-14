// ===== 领域模型类型定义（坐标单位均为毫米 mm，原点在图纸左上角）=====

export type PointType = 'bed' | 'belt' | 'call' | 'gas' | 'strong' | 'weak';

/** 点要素所属图层（要素层） */
export const POINT_LAYERS = ['bed', 'belt', 'call', 'gas', 'electric'] as const;
export type PointLayer = (typeof POINT_LAYERS)[number];

export type PipelineSystem = 'gas' | 'call' | 'strong' | 'weak';

export type PipelineStatus = 'ok' | 'warn';

export interface Pipeline {
  id: string;
  system: PipelineSystem;
  /** 折线节点 */
  path: [number, number][];
  status: PipelineStatus;
}

export interface Beam {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Room {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  kind: 'ward' | 'nurse' | 'utility' | 'corridor';
}

export interface PlanPoint {
  id: string;
  type: PointType;
  x: number;
  y: number;
  /** 设备带安装高度（mm），仅设备带点位存在 */
  heightMm?: number;
  /** 关联管线 id（设备带/病床无管线归属） */
  pipelineId?: string;
  /** 病床编号等展示标签 */
  label: string;
  /** 所在病房 id */
  roomId: string;
}

export type DrawingStatus = 'pending' | 'checking' | 'reviewed';

export interface Drawing {
  id: string;
  batchId: string;
  building: string;
  floor: string;
  nursingUnit: string;
  name: string;
  uploadedAt: string;
  /** 画布尺寸（mm） */
  width: number;
  height: number;
  rooms: Room[];
  beams: Beam[];
  pipelines: Pipeline[];
  points: PlanPoint[];
  status: DrawingStatus;
  /** 最近一次规范检查时间 */
  checkedAt?: string;
}

export type Severity = 'severe' | 'major' | 'minor';
export type RuleCode =
  | 'BELT_HEIGHT'
  | 'BED_SPACING'
  | 'EW_SPACING'
  | 'PIPE_BEAM'
  | 'MISSING_TERMINAL';

export type IssueStatus = 'open' | 'confirmed' | 'rejected' | 'fixed';

export interface Issue {
  id: string;
  batchId: string;
  drawingId: string;
  rule: RuleCode;
  severity: Severity;
  title: string;
  detail: string;
  basis: string;
  /** 锚点（用于在平面图定位高亮） */
  x: number;
  y: number;
  pointIds: string[];
  pipelineId?: string;
  beamId?: string;
  status: IssueStatus;
  /** 复核结论依据（复核员填写） */
  reviewNote?: string;
  reviewer?: string;
  reviewedAt?: string;
  /** 复核轮次：图纸被驳回重传后重新检查会递增 */
  round: number;
}

export type BatchStatus =
  | 'uploading'   // 建档收图中
  | 'checking'    // 规范检查/复核中
  | 'released'    // 已放行
  | 'returned';   // 整批退回

export interface Batch {
  id: string;
  name: string;
  designInstitute: string;
  building: string;
  floors: string[];
  createdAt: string;
  status: BatchStatus;
  /** 当前复核轮次 */
  round: number;
  releasedAt?: string;
  returnedAt?: string;
  returnNote?: string;
}

export interface Reviewer {
  id: string;
  name: string;
  role: string;
}

export interface DBShape {
  batches: Batch[];
  drawings: Drawing[];
  issues: Issue[];
  reviewers: Reviewer[];
  /** 每次（重）检查的留档快照 */
  checkRuns: CheckRun[];
  releaseLogs: ReleaseLog[];
  seq: number;
}

export interface CheckRun {
  id: string;
  batchId: string;
  round: number;
  at: string;
  ruleCounts: Record<RuleCode, number>;
  severityCounts: Record<Severity, number>;
  total: number;
}

export interface ReleaseLog {
  id: string;
  batchId: string;
  batchName: string;
  building: string;
  floors: string[];
  round: number;
  action: 'released' | 'returned';
  at: string;
  operator: string;
  note?: string;
  issueSummary: Record<Severity, number>;
}
