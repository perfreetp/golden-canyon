// 全局数据模型

export type Side = 'L' | 'R';

/** 拆件图层（头/躯干/上臂/前臂/手/大腿/小腿/脚，左右各一） */
export interface PartLayer {
  id: string;
  name: string;
  side?: Side;
  imageDataUrl?: string;
  boneId: string;       // 绑定的骨骼
  weight: number;       // 蒙皮权重 0~1
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  color: string;        // 未上传图片时的矢量占位色
}

/** 骨架关节（rest 静止位置，可在绑定模式拖动） */
export interface JointDef {
  id: string;
  name: string;
  parent: string | null;
  x: number;
  y: number;
  custom?: boolean;
}

export interface BoneDef {
  id: string;
  name: string;
  parent: string; // 关节 id
  child: string;
}

export type EaseType = 'linear' | 'easeInOut' | 'bezier';

/** 相邻两个关键帧之间的插值方式 */
export interface SegmentEase {
  type: EaseType;
  cp1: [number, number]; // 贝塞尔手柄 1（归一化坐标）
  cp2: [number, number]; // 贝塞尔手柄 2
}

export interface Keyframe {
  id: string;
  time: number; // 秒
  rootX: number;
  rootY: number;
  angles: Record<string, number>; // jointId -> 世界角（弧度）
}

export interface BreathConfig {
  inhale: number; // 吸气秒数
  hold: number;   // 屏息秒数
  exhale: number; // 呼气秒数
}

export interface Animation {
  id: string;
  name: string;
  duration: number;
  keyframes: Keyframe[];
  eases: Record<string, SegmentEase>; // 起始关键帧 id -> 到下一帧的插值
  breath: BreathConfig;
}

export interface Project {
  id: string;
  name: string;
  updatedAt: string;
  joints: JointDef[];
  parts: PartLayer[];
  animations: Animation[];
  activeAnimationId: string;
}

/** 导出后进入课程库的动作 */
export interface ActionRecord {
  id: string;
  name: string;
  projectId: string;
  createdAt: string;
  duration: number;
  fps: number;
  spriteSheet?: string;
  atlas?: { frameWidth: number; frameHeight: number; cols: number; count: number; fps: number };
  snapshot: { joints: JointDef[]; parts: PartLayer[]; animation: Animation };
}

export interface Chapter {
  id: string;
  name: string;
  actionIds: string[];
  durationMin: number;
}

export type CourseStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface ReviewNote {
  id: string;
  reviewer: string;
  approved: boolean;
  comment: string;
  at: string;
}

export interface Course {
  id: string;
  title: string;
  coach: string;
  chapters: Chapter[];
  audience: string;
  weeklySessions: number;
  totalMinutes: number;
  status: CourseStatus;
  notes: ReviewNote[];
  createdAt: string;
}

export interface DiscomfortMark {
  part: string;
  note: string;
  at: string;
}

export interface Student {
  id: string;
  name: string;
  courseId: string | null;
  weekPlan: string[][]; // 每周 7 天，每天章节 id 列表
  feedback: DiscomfortMark[];
}

export interface LearnEvent {
  id: string;
  courseId: string;
  coach: string;
  month: string; // yyyy-MM
  completed: boolean;
  exitPoint: number; // 中途退出的秒点；完课为 0
  repeated: boolean; // 是否复练
  at: string;
}

export type Role = 'animator' | 'planner' | 'reviewer' | 'student' | 'ops';
