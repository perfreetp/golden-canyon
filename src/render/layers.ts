/**
 * 图层定义：默认颜色（RGBA 0..1）、中文名、LOD 行为。
 */
import type { LayerKey } from '@/types'

export interface LayerDef {
  key: LayerKey
  name: string
  /** 默认描边色 RGBA（0..1） */
  stroke: [number, number, number, number]
  /** 默认填充色 RGBA */
  fill: [number, number, number, number]
  /** 低倍（LOD0）下是否保留：房间轮廓与主干流线保留 */
  lod0Visible: boolean
  /** 排序值，越小越先绘制 */
  order: number
}

export const LAYER_DEFS: Record<LayerKey, LayerDef> = {
  room: {
    key: 'room',
    name: '房间轮廓',
    stroke: [0.22, 0.24, 0.28, 1],
    fill: [0.96, 0.96, 0.94, 0.0],
    lod0Visible: true,
    order: 0,
  },
  wall: {
    key: 'wall',
    name: '墙体/门窗',
    stroke: [0.15, 0.16, 0.18, 1],
    fill: [0.85, 0.85, 0.85, 1],
    lod0Visible: true,
    order: 1,
  },
  sink: {
    key: 'sink',
    name: '清洗槽',
    stroke: [0.1, 0.36, 0.62, 1],
    fill: [0.62, 0.8, 0.95, 0.55],
    lod0Visible: false,
    order: 10,
  },
  disinfect: {
    key: 'disinfect',
    name: '消毒槽',
    stroke: [0.55, 0.27, 0.68, 1],
    fill: [0.83, 0.68, 0.92, 0.55],
    lod0Visible: false,
    order: 11,
  },
  dry: {
    key: 'dry',
    name: '干燥台',
    stroke: [0.18, 0.55, 0.34, 1],
    fill: [0.7, 0.9, 0.76, 0.55],
    lod0Visible: false,
    order: 12,
  },
  cabinet: {
    key: 'cabinet',
    name: '储镜柜',
    stroke: [0.72, 0.5, 0.12, 1],
    fill: [0.97, 0.86, 0.6, 0.55],
    lod0Visible: false,
    order: 13,
  },
  dirt: {
    key: 'dirt',
    name: '污物通道',
    stroke: [0.55, 0.16, 0.14, 1],
    fill: [0.93, 0.62, 0.58, 0.35],
    lod0Visible: false,
    order: 20,
  },
  'flow-clean': {
    key: 'flow-clean',
    name: '清洁流线',
    stroke: [0.1, 0.55, 0.25, 1],
    fill: [0.1, 0.55, 0.25, 0.12],
    lod0Visible: true,
    order: 30,
  },
  'flow-dirt': {
    key: 'flow-dirt',
    name: '污物流线',
    stroke: [0.75, 0.18, 0.14, 1],
    fill: [0.75, 0.18, 0.14, 0.12],
    lod0Visible: true,
    order: 31,
  },
  // 兼容旧键（类型里保留），实际不使用
  'dirt-clean': {
    key: 'dirt-clean',
    name: '污物流线(旧)',
    stroke: [0.75, 0.18, 0.14, 1],
    fill: [0.75, 0.18, 0.14, 0.12],
    lod0Visible: false,
    order: 32,
  },
  annotation: {
    key: 'annotation',
    name: '标注',
    stroke: [0.2, 0.2, 0.2, 1],
    fill: [1, 1, 1, 0.9],
    lod0Visible: false,
    order: 40,
  },
}

export const LAYER_ORDER = Object.values(LAYER_DEFS)
  .sort((a, b) => a.order - b.order)
  .map((d) => d.key)

/** 交叉点高亮红 */
export const CROSSING_COLOR: [number, number, number, number] = [1, 0, 0, 1]
/** 选中高亮色 */
export const SELECT_COLOR: [number, number, number, number] = [1, 0.72, 0, 1]
/** 悬停色 */
export const HOVER_COLOR: [number, number, number, number] = [0.2, 0.6, 1, 1]
