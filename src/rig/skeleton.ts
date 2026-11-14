import type { JointDef, BoneDef, PartLayer } from '../types';

// 标准人形骨架：13 个关节。角度关键帧挂在每个关节上（世界角）
export const DEFAULT_JOINTS: JointDef[] = [
  { id: 'pelvis',      name: '骨盆',   parent: null,      x: 300, y: 300 },
  { id: 'spine',       name: '脊柱',   parent: 'pelvis',  x: 300, y: 235 },
  { id: 'neck',        name: '颈',     parent: 'spine',   x: 300, y: 165 },
  { id: 'head',        name: '头顶',   parent: 'neck',    x: 300, y: 105 },
  { id: 'shoulderL',   name: '左肩',   parent: 'spine',   x: 248, y: 195 },
  { id: 'elbowL',      name: '左肘',   parent: 'shoulderL', x: 228, y: 268 },
  { id: 'wristL',      name: '左腕',   parent: 'elbowL',  x: 212, y: 338 },
  { id: 'shoulderR',   name: '右肩',   parent: 'spine',   x: 352, y: 195 },
  { id: 'elbowR',      name: '右肘',   parent: 'shoulderR', x: 372, y: 268 },
  { id: 'wristR',      name: '右腕',   parent: 'elbowR',  x: 388, y: 338 },
  { id: 'hipL',        name: '左髋',   parent: 'pelvis',  x: 272, y: 305 },
  { id: 'kneeL',       name: '左膝',   parent: 'hipL',    x: 262, y: 400 },
  { id: 'ankleL',      name: '左踝',   parent: 'kneeL',   x: 256, y: 492 },
  { id: 'hipR',        name: '右髋',   parent: 'pelvis',  x: 328, y: 305 },
  { id: 'kneeR',       name: '右膝',   parent: 'hipR',    x: 338, y: 400 },
  { id: 'ankleR',      name: '右踝',   parent: 'kneeR',   x: 344, y: 492 },
];

export const BONES: BoneDef[] = [
  { id: 'b_spine',  name: '脊柱', parent: 'pelvis', child: 'spine' },
  { id: 'b_neck',   name: '颈',   parent: 'spine',  child: 'neck' },
  { id: 'b_head',   name: '头',   parent: 'neck',   child: 'head' },
  { id: 'b_upperArmL', name: '左上臂', parent: 'shoulderL', child: 'elbowL' },
  { id: 'b_forearmL',  name: '左前臂', parent: 'elbowL',    child: 'wristL' },
  { id: 'b_upperArmR', name: '右上臂', parent: 'shoulderR', child: 'elbowR' },
  { id: 'b_forearmR',  name: '右前臂', parent: 'elbowR',    child: 'wristR' },
  { id: 'b_thighL', name: '左大腿', parent: 'hipL',   child: 'kneeL' },
  { id: 'b_shinL',  name: '左小腿', parent: 'kneeL',  child: 'ankleL' },
  { id: 'b_thighR', name: '右大腿', parent: 'hipR',   child: 'kneeR' },
  { id: 'b_shinR',  name: '右小腿', parent: 'kneeR',  child: 'ankleR' },
];

// 13 个拆件图层：头/躯干/左右 上臂·前臂·手/左右 大腿·小腿·脚
export const DEFAULT_PARTS: PartLayer[] = [
  { id: 'p_head',    name: '头',   boneId: 'b_head',   weight: 1, offsetX: 0, offsetY: 0, width: 72,  height: 80,  color: '#f2c9a0' },
  { id: 'p_torso',   name: '躯干', boneId: 'b_spine',  weight: 1, offsetX: 0, offsetY: 0, width: 118, height: 150, color: '#c8553d' },
  { id: 'p_upperArmL', name: '左上臂', side: 'L', boneId: 'b_upperArmL', weight: 1, offsetX: 0, offsetY: 0, width: 40, height: 86, color: '#e8a87c' },
  { id: 'p_forearmL',  name: '左前臂', side: 'L', boneId: 'b_forearmL',  weight: 1, offsetX: 0, offsetY: 0, width: 34, height: 80, color: '#e8a87c' },
  { id: 'p_handL',     name: '左手',   side: 'L', boneId: 'b_forearmL',  weight: 1, offsetX: 0, offsetY: 0, width: 26, height: 34, color: '#f2c9a0' },
  { id: 'p_upperArmR', name: '右上臂', side: 'R', boneId: 'b_upperArmR', weight: 1, offsetX: 0, offsetY: 0, width: 40, height: 86, color: '#e8a87c' },
  { id: 'p_forearmR',  name: '右前臂', side: 'R', boneId: 'b_forearmR',  weight: 1, offsetX: 0, offsetY: 0, width: 34, height: 80, color: '#e8a87c' },
  { id: 'p_handR',     name: '右手',   side: 'R', boneId: 'b_forearmR',  weight: 1, offsetX: 0, offsetY: 0, width: 26, height: 34, color: '#f2c9a0' },
  { id: 'p_thighL', name: '左大腿', side: 'L', boneId: 'b_thighL', weight: 1, offsetX: 0, offsetY: 0, width: 48, height: 102, color: '#4a6670' },
  { id: 'p_shinL',  name: '左小腿', side: 'L', boneId: 'b_shinL',  weight: 1, offsetX: 0, offsetY: 0, width: 40, height: 98,  color: '#5d7a86' },
  { id: 'p_footL',  name: '左脚',   side: 'L', boneId: 'b_shinL',  weight: 1, offsetX: 0, offsetY: 0, width: 56, height: 26, color: '#38484f' },
  { id: 'p_thighR', name: '右大腿', side: 'R', boneId: 'b_thighR', weight: 1, offsetX: 0, offsetY: 0, width: 48, height: 102, color: '#4a6670' },
  { id: 'p_shinR',  name: '右小腿', side: 'R', boneId: 'b_shinR',  weight: 1, offsetX: 0, offsetY: 0, width: 40, height: 98,  color: '#5d7a86' },
  { id: 'p_footR',  name: '右脚',   side: 'R', boneId: 'b_shinR',  weight: 1, offsetX: 0, offsetY: 0, width: 56, height: 26, color: '#38484f' },
];
