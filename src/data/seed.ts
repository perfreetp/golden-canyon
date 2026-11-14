/**
 * 演示种子数据：两个院区、楼层、房间、改造前建档照片、两张工艺图
 * （含完整洗消设备布局 + 一处洁污交叉），以及一张 2 万图元性能验证图。
 */
import { nanoid } from 'nanoid'
import type {
  Campus,
  Drawing,
  DrawingVersion,
  Floor,
  PhotoRecord,
  Room,
} from '@/types'
import {
  buildDocNo,
  buildRoomArchiveNo,
  makeDevice,
  makeDrawing,
  makeFlowEntity,
  makeLabelEntity,
  makePolylineEntity,
  makeRectEntity,
  makeRoom,
} from '@/data/factory'
import { placeholderPhotoDataUrl } from '@/data/image'

export interface SeedResult {
  campuses: Campus[]
  floors: Floor[]
  rooms: Room[]
  drawings: Drawing[]
  versions: DrawingVersion[]
  photos: { record: PhotoRecord; blob: Blob }[]
}

const today = () => new Date().toISOString().slice(0, 10)
const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10)

/** 标准内镜洗消间布局（房间 12m × 7m），坐标单位 mm */
function buildReprocessRoomDrawing(
  room: Room,
  docNo: string,
  stage: Drawing['stage'],
  year: number,
  withCrossing: boolean,
): Drawing {
  const d = makeDrawing({
    roomId: room.id,
    floorId: room.floorId,
    campusId: room.campusId,
    docNo,
    title: withCrossing ? '洗消间工艺布局（现状测绘，含洁污交叉）' : '洗消间工艺布局（整改方案，洁污分流）',
    stage,
    renovationYear: year,
  })
  const W = room.bounds.w
  const H = room.bounds.h

  // 房间轮廓
  d.entities.push(
    makePolylineEntity(
      'room-outline',
      [
        { x: 0, y: 0 },
        { x: W, y: 0 },
        { x: W, y: H },
        { x: 0, y: H },
      ],
      true,
    ),
  )
  // 内墙分隔（污物区 2.4m）
  d.entities.push(
    makePolylineEntity('wall', [
      { x: W - 2400, y: 0 },
      { x: W - 2400, y: H - 900 },
    ]),
  )
  // 门
  d.entities.push(
    makePolylineEntity('door', [
      { x: W - 2400, y: H - 900 },
      { x: W - 2400, y: H },
    ]),
  )
  d.entities.push(makeLabelEntity(room.roomNo, { x: 300, y: H - 450 }, 260))
  d.entities.push(makeLabelEntity('污物区', { x: W - 1350, y: H - 450 }, 240))
  d.entities.push(makeLabelEntity('清洗消毒区', { x: 4200, y: H - 450 }, 240))

  // 污物区
  d.entities.push(
    makeRectEntity({
      kind: 'dirt-zone',
      cx: W - 1250,
      cy: 3300,
      w: 1900,
      h: 3800,
      device: makeDevice({
        name: '污物接收通道',
        assetNo: 'GD-WQ-01',
        lastMaintenanceDate: daysAgo(40),
        maintenanceCycleDays: 90,
      }),
    }),
  )

  // 沿北墙一字排布清洗工作站（槽体 1.2m 宽）
  const tankY = H - 1100
  const tankW = 1200
  const tankH = 800
  const startX = 900
  const gap = 200
  const sinkCount = 3
  for (let i = 0; i < sinkCount; i++) {
    const cx = startX + tankW / 2 + i * (tankW + gap)
    d.entities.push(
      makeRectEntity({
        kind: 'wash-sink',
        cx,
        cy: tankY,
        w: tankW,
        h: tankH,
        device: makeDevice({
          name: `清洗槽 ${i + 1}`,
          assetNo: `GD-QX-0${i + 1}`,
          model: 'QW-1200 医用浸泡清洗槽',
          manufacturer: '洁美医疗',
          lastMaintenanceDate: daysAgo(12 + i * 8),
          maintenanceCycleDays: 180,
        }),
      }),
    )
  }
  const disinfectKinds: [Drawing['entities'][number]['kind'], string, string][] = [
    ['disinfect-tank', '消毒槽 1（酶洗/浸泡）', 'GD-XD-01'],
    ['disinfect-tank', '漂洗槽', 'GD-XD-02'],
    ['disinfect-tank', '终末漂洗槽', 'GD-XD-03'],
  ]
  disinfectKinds.forEach(([kind, name, asset], i) => {
    const cx = startX + tankW / 2 + (sinkCount + i) * (tankW + gap)
    d.entities.push(
      makeRectEntity({
        kind,
        cx,
        cy: tankY,
        w: tankW,
        h: tankH,
        device: makeDevice({
          name,
          assetNo: asset,
          model: 'XD-1200 全自动内镜消毒槽',
          manufacturer: '洁美医疗',
          lastMaintenanceDate: daysAgo(70 + i * 5),
          maintenanceCycleDays: 120,
        }),
      }),
    )
  })

  // 干燥台
  d.entities.push(
    makeRectEntity({
      kind: 'dry-bench',
      cx: 8600,
      cy: tankY,
      w: 1600,
      h: 800,
      device: makeDevice({
        name: '干燥台',
        assetNo: 'GD-GZ-01',
        model: 'GZ-1600 医用干燥工作台',
        lastMaintenanceDate: daysAgo(25),
        maintenanceCycleDays: 180,
      }),
    }),
  )

  // 储镜柜（沿南墙两组）
  for (let i = 0; i < 2; i++) {
    d.entities.push(
      makeRectEntity({
        kind: 'scope-cabinet',
        cx: 1800 + i * 2200,
        cy: 900,
        w: 1800,
        h: 600,
        device: makeDevice({
          name: `储镜柜 ${i + 1}`,
          assetNo: `GD-CG-0${i + 1}`,
          model: 'CG-20 紫外线储镜柜（20 镜位）',
          manufacturer: '康容科技',
          lastMaintenanceDate: daysAgo(100 + i * 6),
          maintenanceCycleDays: 90,
        }),
      }),
    )
  }

  // 清洁流线：清洗槽 → 消毒槽 → 干燥台 → 储镜柜
  const cleanPoints = withCrossing
    ? [
        { x: 900, y: tankY - 700 },
        { x: 5200, y: tankY - 700 },
        { x: 5200, y: 3000 }, // 向下穿越污物流线
        { x: 8600, y: 3000 },
        { x: 8600, y: tankY - 700 },
        { x: 2900, y: 1700 },
      ]
    : [
        { x: 900, y: tankY - 700 },
        { x: 5200, y: tankY - 700 },
        { x: 8600, y: tankY - 700 },
        { x: 8600, y: 2200 },
        { x: 2900, y: 1700 },
      ]
  d.entities.push(makeFlowEntity({ flowType: 'clean', points: cleanPoints }))

  // 污物流线：污物门 → 污物区 → 清洗槽
  const dirtPoints = withCrossing
    ? [
        { x: W - 1200, y: H - 200 },
        { x: W - 1200, y: 3300 },
        { x: 5200, y: 3300 }, // 与清洁流线在 (5200, 3000~3300) 附近交叉
        { x: 1500, y: 3300 },
        { x: 1500, y: tankY - 500 },
      ]
    : [
        { x: W - 1200, y: H - 200 },
        { x: W - 1200, y: 3300 },
        { x: W - 2600, y: 3300 },
        { x: W - 2600, y: tankY - 500 },
        { x: 5100, y: tankY - 500 },
      ]
  d.entities.push(makeFlowEntity({ flowType: 'dirt', points: dirtPoints }))

  return d
}

/** 2 万图元性能验证图：网格化排布设备图元 */
function buildStressDrawing(room: Room, docNo: string): Drawing {
  const d = makeDrawing({
    roomId: room.id,
    floorId: room.floorId,
    campusId: room.campusId,
    docNo,
    title: '图元承载性能验证图（20000 图元）',
    stage: 'scheme',
    renovationYear: 2026,
  })
  const kinds = ['wash-sink', 'disinfect-tank', 'dry-bench', 'scope-cabinet'] as const
  const cols = 100
  const rows = 50
  const cellW = 600
  const cellH = 500
  let n = 0
  // 每个网格单元堆叠 4 种设备（错位 60mm 避免完全重合），共 100 × 50 × 4 = 20000 图元
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      for (let k = 0; k < kinds.length; k++) {
        const kind = kinds[k]
        d.entities.push(
          makeRectEntity({
            kind,
            cx: 400 + c * cellW + k * 15,
            cy: 400 + r * cellH + k * 15,
            w: 420,
            h: 320,
            device: makeDevice({
              name: `性能测试设备 ${n + 1}`,
              assetNo: `ST-${String(n + 1).padStart(5, '0')}`,
              lastMaintenanceDate: today(),
            }),
          }),
        )
        n++
      }
    }
  }
  // 外围房间轮廓与两条流线
  const w = cols * cellW + 800
  const h = rows * cellH + 800
  d.entities.unshift(
    makePolylineEntity(
      'room-outline',
      [
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: w, y: h },
        { x: 0, y: h },
      ],
      true,
    ),
  )
  d.entities.push(
    makeFlowEntity({
      flowType: 'clean',
      points: [
        { x: 200, y: 200 },
        { x: w / 2, y: 200 },
        { x: w / 2, y: h - 200 },
        { x: w - 200, y: h - 200 },
      ],
    }),
  )
  d.entities.push(
    makeFlowEntity({
      flowType: 'dirt',
      points: [
        { x: w - 200, y: 200 },
        { x: w - 200, y: h / 2 },
        { x: 200, y: h / 2 },
      ],
    }),
  )
  return d
}

export function buildSeed(): SeedResult {
  const now = Date.now()
  const campuses: Campus[] = [
    { id: 'campus-zy', code: 'ZY', name: '总院', address: '本市解放路 128 号', createdAt: now },
    { id: 'campus-df', code: 'DF', name: '东院区', address: '本市科创路 66 号', createdAt: now },
  ]
  const floors: Floor[] = [
    {
      id: 'floor-zy-3f',
      campusId: 'campus-zy',
      code: 'F3',
      name: '门诊综合楼三层',
      bounds: { x: 0, y: 0, w: 60000, h: 24000 },
      createdAt: now,
    },
    {
      id: 'floor-df-2f',
      campusId: 'campus-df',
      code: 'F2',
      name: '医技楼二层',
      bounds: { x: 0, y: 0, w: 48000, h: 20000 },
      createdAt: now,
    },
  ]

  const room1 = makeRoom({
    id: 'room-zy-nj08',
    floorId: 'floor-zy-3f',
    campusId: 'campus-zy',
    roomNo: '3F-NJ-08',
    name: '消化内镜中心洗消间',
    bounds: { x: 0, y: 0, w: 12000, h: 7000 },
    archiveNo: buildRoomArchiveNo('ZY', 'F3', '3F-NJ-08', 1),
  })
  const room2 = makeRoom({
    id: 'room-df-nj02',
    floorId: 'floor-df-2f',
    campusId: 'campus-df',
    roomNo: '2F-NJ-02',
    name: '内镜洗消间（东院）',
    bounds: { x: 0, y: 0, w: 9600, h: 6000 },
    archiveNo: buildRoomArchiveNo('DF', 'F2', '2F-NJ-02', 1),
  })
  const roomStress = makeRoom({
    id: 'room-zy-perf',
    floorId: 'floor-zy-3f',
    campusId: 'campus-zy',
    roomNo: '3F-NJ-PERF',
    name: '大平面性能验证用房',
    bounds: { x: 0, y: 0, w: 60800, h: 25800 },
    archiveNo: buildRoomArchiveNo('ZY', 'F3', '3F-NJ-PERF', 2),
  })
  const rooms: Room[] = [room1, room2, roomStress]

  const drawings: Drawing[] = []
  // 总院：改造前（含交叉）→ 方案（分流）
  const dBefore = buildReprocessRoomDrawing(
    room1,
    buildDocNo('ZY', 'F3', '3F-NJ-08', 2026, 1),
    'before',
    2026,
    true,
  )
  dBefore.version = 1
  const dScheme = buildReprocessRoomDrawing(
    room1,
    buildDocNo('ZY', 'F3', '3F-NJ-08', 2026, 2),
    'scheme',
    2026,
    false,
  )
  dScheme.version = 2
  drawings.push(dBefore, dScheme)

  // 东院
  const dDf = buildReprocessRoomDrawing(
    room2,
    buildDocNo('DF', 'F2', '2F-NJ-02', 2026, 1),
    'asbuilt',
    2025,
    false,
  )
  dDf.version = 1
  dDf.archived = true
  dDf.archivedAt = now - 30 * 86400_000
  drawings.push(dDf)

  // 2 万图元
  drawings.push(buildStressDrawing(roomStress, buildDocNo('ZY', 'F3', '3F-NJ-PERF', 2026, 9)))

  // 改造前建档照片（占位示意图）
  const photos: { record: PhotoRecord; blob: Blob }[] = []
  const photoSpecs: [Room, string, string, string][] = [
    [room1, '洗消间入口现场照', 'site-photo', '#d8d4c8'],
    [room1, '清洗槽区现状照', 'site-photo', '#cfd6d8'],
    [room1, '改造前建筑平面图（扫描件）', 'drawing-scan', '#e6e2d6'],
    [room2, '东院洗消间竣工照', 'site-photo', '#d2d8cf'],
  ]
  photoSpecs.forEach(([room, title, cat, tone], i) => {
    const { dataUrl, blob } = placeholderPhotoDataUrl(title, tone)
    const record: PhotoRecord = {
      id: nanoid(10),
      roomId: room.id,
      campusId: room.campusId,
      floorId: room.floorId,
      archiveNo: `${room.archiveNo}-P-${String(i + 1).padStart(2, '0')}`,
      title,
      category: cat as PhotoRecord['category'],
      takenAt: daysAgo(60 - i * 5),
      thumbDataUrl: dataUrl,
      blobKey: nanoid(16),
      mime: 'image/jpeg',
      size: blob.size,
      remark: cat === 'drawing-scan' ? '扫描件 300dpi，原件存基建科档案室' : undefined,
      createdAt: now,
    }
    photos.push({ record, blob })
  })

  // 为已有图档生成初始版本快照（版本中心开箱即可比对）
  const versions: DrawingVersion[] = []
  for (const d of drawings.filter((x) => x.version >= 1)) {
    const noteMap: Record<string, string> = {
      before: '改造前现场测绘建档，原始布局含洁污流线交叉',
      scheme: '整改方案：调整污物流线，实现洁污分流',
      asbuilt: '竣工归档版本',
      scheme_stress: '性能验证图初始版本',
    }
    versions.push({
      id: nanoid(12),
      drawingId: d.id,
      version: d.version,
      docNo: d.docNo,
      changeNote: d.title.includes('性能') ? noteMap.scheme_stress : noteMap[d.stage],
      author: '基建科',
      snapshot: structuredClone(d),
      createdAt: now - (d.archived ? 30 : 5) * 86400_000,
    })
  }
  // 方案图补一版 V1 快照，保证同图存在两个可比对版本
  const v1 = structuredClone(dBefore)
  v1.version = 1
  versions.push({
    id: nanoid(12),
    drawingId: dScheme.id,
    version: 1,
    docNo: dScheme.docNo,
    changeNote: '方案初稿（沿用现状布局）',
    author: '基建科',
    snapshot: v1,
    createdAt: now - 10 * 86400_000,
  })

  return { campuses, floors, rooms, drawings, versions, photos }
}
