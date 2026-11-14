import type {
  PipelineSystem,
  PointLayer,
  PointType,
  RuleCode,
  Severity
} from '../types';
export type { PointLayer } from '../types';
export { POINT_LAYERS } from '../types';

/** 规范阈值（mm）。依据综合医院建筑设计规范、医用气体工程技术规范等常用控制值整理 */
export const RULE_THRESHOLDS = {
  belt: {
    nominal: 1350, // 病区设备带标称安装高度
    tolerance: 50, // 允许偏差 ±50mm
    majorDelta: 100 // 偏差 >100mm 判严重
  },
  bedSpacing: {
    min: 1000, // 病床净间距下限
    severeBelow: 800
  },
  ewSpacing: {
    min: 300, // 强电与弱电终端间距下限
    severeBelow: 150
  }
} as const;

export const RULE_META: Record<
  RuleCode,
  { name: string; basis: string; defaultSeverity: Severity }
> = {
  BELT_HEIGHT: {
    name: '设备带安装高度不符',
    basis: '《综合医院建筑设计规范》GB 51039 及院方基建标准：病区设备带中心安装高度 1.35m，允许偏差 ±50mm',
    defaultSeverity: 'major'
  },
  BED_SPACING: {
    name: '床位间距不足',
    basis: '《综合医院建筑设计规范》GB 51039：病床床间净距不应小于 1.00m',
    defaultSeverity: 'major'
  },
  EW_SPACING: {
    name: '强弱电终端间距过近',
    basis: '《医疗建筑电气设计规范》JGJ 312：强电插座与弱电信息终端间距不宜小于 300mm',
    defaultSeverity: 'major'
  },
  PIPE_BEAM: {
    name: '管线穿梁',
    basis: '《建筑机电工程抗震设计规范》GB 50981 及结构专业条件：机电管线不得穿结构梁敷设，须绕行或预留套管',
    defaultSeverity: 'severe'
  },
  MISSING_TERMINAL: {
    name: '床旁配套终端缺失',
    basis: '院方病区配置标准：每张病床应配置呼叫终端与医用气体终端（氧气+吸引）',
    defaultSeverity: 'minor'
  }
};

export const SEVERITY_META: Record<
  Severity,
  { label: string; color: string; bg: string }
> = {
  severe: { label: '严重', color: '#d83931', bg: '#fdeceb' },
  major: { label: '一般', color: '#e08a00', bg: '#fdf3e0' },
  minor: { label: '提示', color: '#2f6fdd', bg: '#eaf1fd' }
};

export const LAYER_META: Record<
  PointLayer,
  { label: string; color: string }
> = {
  bed: { label: '病床', color: '#7a8794' },
  belt: { label: '设备带', color: '#8d65c5' },
  call: { label: '呼叫', color: '#16a34a' },
  gas: { label: '医气', color: '#0891b2' },
  electric: { label: '强弱电', color: '#d97706' }
};

/** 点类型 → 所属要素图层 */
export const POINT_TYPE_LAYER: Record<PointType, PointLayer> = {
  bed: 'bed',
  belt: 'belt',
  call: 'call',
  gas: 'gas',
  strong: 'electric',
  weak: 'electric'
};

export const POINT_TYPE_META: Record<PointType, { label: string; color: string }> = {
  bed: { label: '病床', color: '#7a8794' },
  belt: { label: '设备带', color: '#8d65c5' },
  call: { label: '呼叫终端', color: '#16a34a' },
  gas: { label: '医气终端', color: '#0891b2' },
  strong: { label: '强电插座', color: '#ea580c' },
  weak: { label: '弱电终端', color: '#ca8a04' }
};

export const PIPELINE_META: Record<PipelineSystem, { label: string; color: string; layer: PointLayer }> = {
  gas: { label: '医气管线', color: '#0891b2', layer: 'gas' },
  call: { label: '呼叫管线', color: '#16a34a', layer: 'call' },
  strong: { label: '强电桥架', color: '#ea580c', layer: 'electric' },
  weak: { label: '弱电线槽', color: '#ca8a04', layer: 'electric' }
};
