// 演示站场：3 条股道（正线 I、到发线 3G/4G）、2 组渡线道岔、8 区段、8 架信号机
import type { Station } from './types'
import { uid } from './lib/util'

export function buildSeedStation(): Station {
  const st: Station = {
    id: uid('st'),
    name: '示例站（甲站）',
    width: 1180,
    height: 560,
    rows: [],
    switches: [],
    sections: [],
    signals: [],
    routes: [],
    status: 'draft',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  const rMain = { id: uid('row'), name: 'I 道（正线）', y: 260, x1: 40, x2: 1140, main: true }
  const rUp = { id: uid('row'), name: '3G 到发线', y: 150, x1: 40, x2: 1140, main: false }
  const rDn = { id: uid('row'), name: '4G 到发线', y: 370, x1: 40, x2: 1140, main: false }
  st.rows = [rUp, rMain, rDn]

  const mkSw = (rowId: string, x: number, n: number) => ({ id: uid('sw'), name: `${n}#`, rowId, x })
  // 1#/3# 渡线（I↔3G，x≈320）；2#/4# 渡线（I↔4G，x≈760）
  st.switches = [
    mkSw(rMain.id, 320, 1),
    mkSw(rMain.id, 760, 2),
    mkSw(rUp.id, 320, 3),
    mkSw(rDn.id, 760, 4)
  ]

  const mkSec = (rowId: string, x1: number, x2: number, name: string) => ({
    id: uid('sec'), name, rowId, x1, x2
  })
  st.sections = [
    mkSec(rMain.id, 60, 300, '1DG'),
    mkSec(rMain.id, 340, 740, '2DG'),
    mkSec(rMain.id, 780, 1120, '3DG'),
    mkSec(rUp.id, 120, 300, '4DG'),
    mkSec(rUp.id, 340, 1080, '5DG'),
    mkSec(rDn.id, 120, 740, '6DG'),
    mkSec(rDn.id, 780, 1080, '7DG'),
    mkSec(rUp.id, 1090, 1140, '8DG')
  ]

  const mkSig = (
    rowId: string, x: number, kind: Station['signals'][number]['kind'],
    direction: Station['signals'][number]['direction'], name: string
  ) => ({ id: uid('sig'), name, kind, rowId, x, direction })

  st.signals = [
    mkSig(rMain.id, 60, 'entry', 'right', 'X'), // 下行进站（向右接车）
    mkSig(rMain.id, 1120, 'entry', 'left', 'SN'), // 上行进站（向左接车）
    mkSig(rMain.id, 1100, 'exit', 'right', 'S'), // 下行出站
    mkSig(rMain.id, 80, 'exit', 'left', 'XN'), // 上行出站
    mkSig(rUp.id, 120, 'shunt', 'right', 'D1'),
    mkSig(rUp.id, 1060, 'shunt', 'left', 'D2'),
    mkSig(rDn.id, 120, 'shunt', 'right', 'D3'),
    mkSig(rDn.id, 1060, 'shunt', 'left', 'D4')
  ]

  return st
}
