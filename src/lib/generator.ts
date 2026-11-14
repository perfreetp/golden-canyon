import type {
  Batch,
  Beam,
  Drawing,
  PlanPoint,
  Pipeline,
  PipelineSystem,
  PointType,
  Reviewer,
  Room
} from '../types';
import { hashStr, mulberry32 } from './geometry';

const W = 44000;
const H = 13200;
const ROOM_W = 4000;
const BEAM_W = 200;
const COLS = 10;
const BEDS_PER_ROOM = 3;

const SYSTEMS: PipelineSystem[] = ['gas', 'call', 'strong', 'weak'];
const SPINE_Y: Record<PipelineSystem, number> = {
  gas: 6050,
  call: 6300,
  strong: 6750,
  weak: 7000
};

export const REVIEWERS: Reviewer[] = [
  { id: 'RV01', name: '王建国', role: '机电主管技师' },
  { id: 'RV02', name: '李晓敏', role: '基建办复核员' },
  { id: 'RV03', name: '陈睿', role: '医气专业工程师' }
];

interface DrawSpec {
  id: string;
  batchId: string;
  building: string;
  floor: string;
  unit: string;
  seq: number;
  defectSeed: number;
}

export function generateDrawing(spec: DrawSpec): Drawing {
  const rng = mulberry32(hashStr(spec.id) + spec.defectSeed);
  const rooms: Room[] = [];
  const beams: Beam[] = [];
  const pipelines: Pipeline[] = [];
  const points: PlanPoint[] = [];

  // ---- 房间分区：上下两排，中间为医护走廊 ----
  for (let i = 0; i < COLS; i++) {
    const rx = 800 + i * (ROOM_W + BEAM_W);
    const topKind = i === 0 ? 'nurse' : i === COLS - 1 ? 'utility' : 'ward';
    const botKind = i === COLS - 1 ? 'utility' : 'ward';
    rooms.push({
      id: `${spec.id}-R${i + 1}`,
      x: rx,
      y: 700,
      w: ROOM_W,
      h: 4800,
      label: topKind === 'ward' ? `${i + 1}号病室` : topKind === 'nurse' ? '护士站' : '治疗室',
      kind: topKind
    });
    rooms.push({
      id: `${spec.id}-R${COLS + i + 1}`,
      x: rx,
      y: 7700,
      w: ROOM_W,
      h: 4800,
      label: botKind === 'ward' ? `${COLS + i + 1}号病室` : '污洗间',
      kind: botKind
    });
  }

  // ---- 结构梁：病房区分隔墙位置，上下两段，走廊处留空（管线走走廊综合支架）----
  for (let i = 1; i < COLS; i++) {
    const bx = 800 + i * ROOM_W + (i - 1) * BEAM_W;
    beams.push({ id: `${spec.id}-B${i}上`, x: bx, y: 600, w: BEAM_W, h: 4800 });
    beams.push({ id: `${spec.id}-B${i}下`, x: bx, y: 7800, w: BEAM_W, h: 4800 });
  }

  const wardRooms = rooms.filter((r) => r.kind === 'ward');

  // ---- 管线：四系统主干（走廊）+ 每病房支管 ----
  for (const sys of SYSTEMS) {
    pipelines.push({
      id: `${spec.id}-P-${sys}-main`,
      system: sys,
      path: [
        [600, SPINE_Y[sys]],
        [W - 600, SPINE_Y[sys]]
      ],
      status: 'ok'
    });
  }

  const branchOf = new Map<string, string>(); // roomId|system → pipelineId
  for (const room of wardRooms) {
    const midX = room.x + ROOM_W / 2;
    const topSide = room.y < H / 2;
    const headY = topSide ? 1000 : 12200;
    for (const sys of SYSTEMS) {
      const pid = `${spec.id}-P-${sys}-${room.id}`;
      branchOf.set(`${room.id}|${sys}`, pid);
      pipelines.push({
        id: pid,
        system: sys,
        path: [
          [midX, SPINE_Y[sys]],
          [midX, topSide ? headY + 300 : headY - 300]
        ],
        status: 'ok'
      });
    }
  }

  // ---- 缺陷注入：预先选定问题房间/梁 ----
  const squeezeRoom = wardRooms[Math.floor(rng() * wardRooms.length)];
  const ewRooms = new Set<Room>();
  while (ewRooms.size < 2) {
    ewRooms.add(wardRooms[Math.floor(rng() * wardRooms.length)]);
  }
  const crossBeam = rng() < 0.65 ? beams[Math.floor(rng() * beams.length)] : null;
  const crossRoom = crossBeam
    ? wardRooms.find(
        (r) => Math.abs(r.x + ROOM_W / 2 - (crossBeam.x + BEAM_W / 2)) < 8000
      ) ?? wardRooms[0]
    : null;
  const missingBedRoom = rng() < 0.7 ? wardRooms[Math.floor(rng() * wardRooms.length)] : null;
  const missingWhat = rng() < 0.5 ? 'call' : 'gas';

  if (crossBeam && crossRoom) {
    // 弱电支管未走综合支架，绕行路径穿越结构梁
    const pid = branchOf.get(`${crossRoom.id}|weak`)!;
    const pipe = pipelines.find((p) => p.id === pid)!;
    const topSide = crossRoom.y < H / 2;
    const midX = crossRoom.x + ROOM_W / 2;
    pipe.path = [
      [midX, SPINE_Y.weak],
      [crossBeam.x + BEAM_W / 2, SPINE_Y.weak],
      [crossBeam.x + BEAM_W / 2, topSide ? 1300 : 11900],
      [midX, topSide ? 1300 : 11900]
    ];
    pipe.status = 'warn';
  }

  // ---- 点位：每床 6 要素（病床/设备带/呼叫/医气/强电/弱电）----
  const push = (p: Omit<PlanPoint, 'id'> & { roomId: string }) => {
    points.push({
      id: `${spec.id}-PT${String(points.length + 1).padStart(4, '0')}`,
      ...p
    });
  };

  for (const room of wardRooms) {
    const topSide = room.y < H / 2;
    const headY = topSide ? 1000 : 12200;
    // 标称床位中心线间距 1200mm
    let xs = [room.x + 700, room.x + 1900, room.x + 3100];
    if (room === squeezeRoom) {
      // 床位间距不足：相邻床中心线压到 760~940mm
      const d = 760 + Math.round(rng() * 180);
      xs = [room.x + 700, room.x + 700 + d, room.x + 700 + d * 2];
    }
    for (let b = 0; b < BEDS_PER_ROOM; b++) {
      const x = xs[b];
      const bedLabel = `${room.label}-${b + 1}床`;
      const bedY = topSide ? headY + 300 : headY - 300;
      push({ type: 'bed', x, y: bedY, label: bedLabel, roomId: room.id });

      // 设备带（含安装高度，约 14% 偏差超标）
      let height = 1350;
      if (rng() < 0.14) {
        const pick = rng();
        height = pick < 0.4 ? 1480 : pick < 0.75 ? 1530 : 1190;
      }
      push({
        type: 'belt',
        x,
        y: headY,
        heightMm: height,
        label: `${bedLabel}设备带`,
        roomId: room.id
      });

      const skipCall = room === missingBedRoom && b === BEDS_PER_ROOM - 1 && missingWhat === 'call';
      const skipGas = room === missingBedRoom && b === BEDS_PER_ROOM - 1 && missingWhat === 'gas';

      if (!skipCall) {
        push({
          type: 'call',
          x,
          y: headY + 260,
          label: `${bedLabel}呼叫`,
          roomId: room.id,
          pipelineId: branchOf.get(`${room.id}|call`)
        });
      }
      if (!skipGas) {
        push({
          type: 'gas',
          x: x + 220,
          y: headY + 80,
          label: `${bedLabel}医气`,
          roomId: room.id,
          pipelineId: branchOf.get(`${room.id}|gas`)
        });
      }

      // 强电/弱电：标称间距 660mm，问题房间压到 120~260mm
      const weakDx = ewRooms.has(room) ? 360 + Math.round(rng() * 140) : 660;
      push({
        type: 'strong',
        x: x - 240,
        y: headY + 120,
        label: `${bedLabel}强电`,
        roomId: room.id,
        pipelineId: branchOf.get(`${room.id}|strong`)
      });
      push({
        type: 'weak',
        x: x - 240 + weakDx,
        y: headY + 120,
        label: `${bedLabel}弱电`,
        roomId: room.id,
        pipelineId: branchOf.get(`${room.id}|weak`)
      });
    }
  }

  return {
    id: spec.id,
    batchId: spec.batchId,
    building: spec.building,
    floor: spec.floor,
    nursingUnit: spec.unit,
    name: `${spec.building}${spec.floor}${spec.unit}设备与管线平面图`,
    uploadedAt: '',
    width: W,
    height: H,
    rooms,
    beams,
    pipelines,
    points,
    status: 'pending'
  };
}

export interface SeedBatchSpec {
  batch: Batch;
  units: string[];
}

export function seedBatches(): SeedBatchSpec[] {
  return [
    {
      batch: {
        id: 'B2026-018',
        name: '住院楼A座八层骨科病区施工图（第一批）',
        designInstitute: '华南医用建筑设计院',
        building: '住院楼A座',
        floors: ['8F'],
        createdAt: '2026-09-02T09:20:00',
        status: 'released',
        round: 1,
        releasedAt: '2026-09-12T16:40:00'
      },
      units: ['护理单元一', '护理单元二']
    },
    {
      batch: {
        id: 'B2026-021',
        name: '住院楼A座九层骨科病区施工图（第二批）',
        designInstitute: '华南医用建筑设计院',
        building: '住院楼A座',
        floors: ['9F'],
        createdAt: '2026-10-21T10:05:00',
        status: 'checking',
        round: 1
      },
      units: ['护理单元一', '护理单元二', '护理单元三']
    },
    {
      batch: {
        id: 'B2026-024',
        name: '住院楼B座五层骨科病区施工图（首批）',
        designInstitute: '粤城建工设计院',
        building: '住院楼B座',
        floors: ['5F'],
        createdAt: '2026-11-13T14:30:00',
        status: 'uploading',
        round: 1
      },
      units: ['护理单元一']
    }
  ];
}

export function buildSeedDrawings(): { batches: Batch[]; drawings: Drawing[] } {
  const specs = seedBatches();
  const batches = specs.map((s) => s.batch);
  const drawings: Drawing[] = [];
  for (const s of specs) {
    s.units.forEach((unit, i) => {
      const id = `${s.batch.id}-D${i + 1}`;
      const d = generateDrawing({
        id,
        batchId: s.batch.id,
        building: s.batch.building,
        floor: s.batch.floors[0],
        unit,
        seq: i + 1,
        defectSeed: i * 17 + 3
      });
      const base = new Date(s.batch.createdAt).getTime();
      d.uploadedAt = new Date(base + (i + 1) * 3600_000).toISOString();
      drawings.push(d);
    });
  }
  return { batches, drawings };
}

export function pointTypesOf(layer: string): PointType[] {
  if (layer === 'bed') return ['bed'];
  if (layer === 'belt') return ['belt'];
  if (layer === 'call') return ['call'];
  if (layer === 'gas') return ['gas'];
  return ['strong', 'weak'];
}
