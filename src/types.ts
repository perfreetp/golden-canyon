export type Role = 'therapist' | 'reviewer' | 'supervisor' | 'patient';

export type DeviceStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export type Mount = 'floor' | 'wall';

export type Difficulty = '入门' | '进阶' | '挑战';

export type BodyPart =
  | '视觉追踪'
  | '上肢'
  | '手功能'
  | '下肢'
  | '平衡'
  | '核心'
  | '认知'
  | '全身协调';

export type DeviceKind =
  | 'tracking-screen'
  | 'balance-board'
  | 'grip-station'
  | 'cognitive-table'
  | 'camera'
  | 'speaker';

export interface LibraryItem {
  id: DeviceKind;
  name: string;
  shortName: string;
  mount: Mount;
  interactive: boolean;
  width: number;
  depth: number;
  height: number;
  weightKg: number;
  powerW: number;
  screenInches?: number;
  screenW?: number;
  screenH?: number;
  blurb: string;
  bodyParts: BodyPart[];
  color: string;
  accent: string;
  installHeight: number;
}

export interface DeviceAttrs {
  bodyParts: BodyPart[];
  ageMin: number;
  ageMax: number;
  durationMin: number;
  difficulty: Difficulty;
  dailyCap: number;
}

export interface DeviceContent {
  gameId: string | null;
  threshold: number;
  note: string;
}

export interface DeviceInstance {
  id: string;
  libId: DeviceKind;
  name: string;
  x: number;
  z: number;
  rot: number;
  w: number;
  d: number;
  attrs: DeviceAttrs;
  content: DeviceContent;
  status: DeviceStatus;
  submittedBy?: string;
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  updatedAt: string;
}

export interface LoadZone {
  id: string;
  name: string;
  x: number;
  z: number;
  w: number;
  d: number;
  capacity: number;
}

export interface PowerPoint {
  id: string;
  x: number;
  z: number;
  label: string;
}

export interface HallConfig {
  id: string;
  name: string;
  width: number;
  depth: number;
  ceiling: number;
  defaultLoad: number;
  zones: LoadZone[];
  powerPoints: PowerPoint[];
  door: { wall: 'west'; center: number; width: number };
}

export interface GameDef {
  id: string;
  name: string;
  tagline: string;
  description: string;
  metric: string;
  kinds: DeviceKind[];
  threshold: number;
  minutes: number;
  color: string;
  icon: string;
  instruction: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  sex: '男' | '女';
  goal: string;
  color: string;
}

export interface TrainingRecord {
  id: string;
  patientId: string;
  deviceId: string;
  deviceName: string;
  gameId: string;
  date: string;
  startedAt: string;
  durationSec: number;
  plannedSec: number;
  score: number;
  threshold: number;
  passed: boolean;
  completed: boolean;
  difficulty: Difficulty;
  demo?: boolean;
}

export interface ReviewEvent {
  id: string;
  deviceId: string;
  deviceName: string;
  action: 'submit' | 'approve' | 'reject' | 'revise';
  by: string;
  role: Role;
  at: string;
  note?: string;
  snapshot?: { gameId: string | null; threshold: number; durationMin: number };
}

export interface QueueEntry {
  id: string;
  patientId: string;
  deviceId: string;
  joinedAt: string;
  estimatedMin: number;
}

export interface Toast {
  id: string;
  message: string;
  kind: 'success' | 'error' | 'info';
}

export interface RoleProfile {
  id: Role;
  label: string;
  person: string;
  title: string;
  color: string;
  desc: string;
}

export type PageKey =
  | 'layout'
  | 'content'
  | 'review'
  | 'records'
  | 'bom'
  | 'ops'
  | 'patient';

export type Rect = { x: number; z: number; w: number; d: number; rot: number };

export interface Point {
  x: number;
  z: number;
}
