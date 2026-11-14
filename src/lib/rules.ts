import type {
  Drawing,
  Issue,
  PlanPoint,
  RuleCode,
  Severity
} from '../types';
import { RULE_META, RULE_THRESHOLDS } from './spec';
import { dist, polylineIntersectsRect, pointSegDist } from './geometry';

let issueSeq = 0;
function makeIssue(
  drawing: Drawing,
  rule: RuleCode,
  severity: Severity,
  title: string,
  detail: string,
  x: number,
  y: number,
  pointIds: string[],
  extra: Partial<Issue> = {}
): Issue {
  issueSeq += 1;
  return {
    id: `${drawing.id}-I${String(issueSeq).padStart(4, '0')}`,
    batchId: drawing.batchId,
    drawingId: drawing.id,
    rule,
    severity,
    title,
    detail,
    basis: RULE_META[rule].basis,
    x,
    y,
    pointIds,
    status: 'open',
    round: 1,
    ...extra
  };
}

/**
 * 对一张平面图执行全部规范检查。
 * 规则：设备带高度 / 床位间距 / 强弱电间距 / 管线穿梁 / 床旁终端缺失
 */
export function runChecks(drawing: Drawing, round: number): Issue[] {
  issueSeq = 0;
  const issues: Issue[] = [];
  const byType = (t: PlanPoint['type']) => drawing.points.filter((p) => p.type === t);

  // 1. 设备带安装高度
  for (const belt of byType('belt')) {
    const h = belt.heightMm ?? RULE_THRESHOLDS.belt.nominal;
    const delta = h - RULE_THRESHOLDS.belt.nominal;
    const abs = Math.abs(delta);
    if (abs > RULE_THRESHOLDS.belt.tolerance) {
      const severity: Severity =
        abs > RULE_THRESHOLDS.belt.majorDelta ? 'severe' : 'major';
      issues.push(
        makeIssue(
          drawing,
          'BELT_HEIGHT',
          severity,
          `${RULE_META.BELT_HEIGHT.name}（${belt.label}）`,
          `设备带中心安装高度 ${h}mm，与标称 ${RULE_THRESHOLDS.belt.nominal}mm 偏差 ${delta > 0 ? '+' : ''}${delta}mm，超出 ±${RULE_THRESHOLDS.belt.tolerance}mm 允许偏差`,
          belt.x,
          belt.y,
          [belt.id]
        )
      );
    }
  }

  // 2. 床位间距（同一病房内两两比对，取相邻床位）
  const beds = byType('bed');
  const bedsByRoom = new Map<string, PlanPoint[]>();
  for (const b of beds) {
    const arr = bedsByRoom.get(b.roomId) ?? [];
    arr.push(b);
    bedsByRoom.set(b.roomId, arr);
  }
  for (const [roomId, roomBeds] of bedsByRoom) {
    for (let i = 0; i < roomBeds.length; i++) {
      for (let j = i + 1; j < roomBeds.length; j++) {
        const a = roomBeds[i];
        const b = roomBeds[j];
        const d = dist(a.x, a.y, b.x, b.y);
        if (d < RULE_THRESHOLDS.bedSpacing.min) {
          const severity: Severity =
            d < RULE_THRESHOLDS.bedSpacing.severeBelow ? 'severe' : 'major';
          issues.push(
            makeIssue(
              drawing,
              'BED_SPACING',
              severity,
              `${RULE_META.BED_SPACING.name}（${roomLabel(drawing, roomId)} ${a.label}/${b.label}）`,
              `两床中心线间距 ${Math.round(d)}mm，小于规范限值 ${RULE_THRESHOLDS.bedSpacing.min}mm`,
              (a.x + b.x) / 2,
              (a.y + b.y) / 2,
              [a.id, b.id]
            )
          );
        }
      }
    }
  }

  // 3. 强电-弱电终端间距（同病房内配对检查最近距离）
  const strong = byType('strong');
  const weak = byType('weak');
  for (const s of strong) {
    let nearest: { p: PlanPoint; d: number } | null = null;
    for (const w of weak) {
      if (w.roomId !== s.roomId) continue;
      const d = dist(s.x, s.y, w.x, w.y);
      if (!nearest || d < nearest.d) nearest = { p: w, d };
    }
    if (nearest && nearest.d < RULE_THRESHOLDS.ewSpacing.min) {
      const severity: Severity =
        nearest.d < RULE_THRESHOLDS.ewSpacing.severeBelow ? 'severe' : 'major';
      issues.push(
        makeIssue(
          drawing,
          'EW_SPACING',
          severity,
          `${RULE_META.EW_SPACING.name}（${s.label}）`,
          `强电插座与最近弱电终端间距 ${Math.round(nearest.d)}mm，小于 ${RULE_THRESHOLDS.ewSpacing.min}mm 控制值`,
          (s.x + nearest.p.x) / 2,
          (s.y + nearest.p.y) / 2,
          [s.id, nearest.p.id]
        )
      );
    }
  }

  // 4. 管线穿梁
  for (const pipe of drawing.pipelines) {
    for (const beam of drawing.beams) {
      if (polylineIntersectsRect(pipe.path, beam.x, beam.y, beam.w, beam.h)) {
        const cx = beam.x + beam.w / 2;
        const cy = beam.y + beam.h / 2;
        issues.push(
          makeIssue(
            drawing,
            'PIPE_BEAM',
            'severe',
            `${RULE_META.PIPE_BEAM.name}（${beam.id}）`,
            `${pipe.system === 'gas' ? '医气' : pipe.system === 'call' ? '呼叫' : pipe.system === 'strong' ? '强电桥架' : '弱电线槽'}与结构梁 ${beam.id} 平面投影相交，须绕行或由结构专业预留套管`,
            cx,
            cy,
            [],
            { pipelineId: pipe.id, beamId: beam.id }
          )
        );
      }
    }
  }

  // 5. 床旁配套终端缺失：每张病床 600mm 服务半径内应有呼叫 + 医气终端
  for (const bed of beds) {
    const calls = byType('call');
    const gases = byType('gas');
    const hasCall = calls.some((c) => dist(c.x, c.y, bed.x, bed.y) <= 600);
    const hasGas = gases.some((g) => dist(g.x, g.y, bed.x, bed.y) <= 600);
    if (!hasCall || !hasGas) {
      const miss = [!hasCall && '呼叫终端', !hasGas && '医气终端']
        .filter(Boolean)
        .join('、');
      issues.push(
        makeIssue(
          drawing,
          'MISSING_TERMINAL',
          'minor',
          `${RULE_META.MISSING_TERMINAL.name}（${bed.label}）`,
          `病床 ${bed.label} 床旁 600mm 服务半径内缺少：${miss}`,
          bed.x,
          bed.y + 120,
          [bed.id]
        )
      );
    }
  }

  for (const iss of issues) iss.round = round;
  return issues;
}

function roomLabel(drawing: Drawing, roomId: string): string {
  return drawing.rooms.find((r) => r.id === roomId)?.label ?? roomId;
}

/** 找到点位实际挂靠的管线（点在管线 150mm 容差带内） */
export function findHostPipeline(drawing: Drawing, point: PlanPoint) {
  if (!point.pipelineId) {
    let best: { id: string; d: number } | null = null;
    for (const pipe of drawing.pipelines) {
      for (let i = 1; i < pipe.path.length; i++) {
        const [ax, ay] = pipe.path[i - 1];
        const [bx, by] = pipe.path[i];
        const d = pointSegDist(point.x, point.y, ax, ay, bx, by);
        if (!best || d < best.d) best = { id: pipe.id, d };
      }
    }
    if (best && best.d <= 150) return drawing.pipelines.find((p) => p.id === best!.id);
    return undefined;
  }
  return drawing.pipelines.find((p) => p.id === point.pipelineId);
}

export function summarize(issues: Issue[]): {
  total: number;
  severityCounts: Record<Severity, number>;
  ruleCounts: Record<RuleCode, number>;
} {
  const severityCounts: Record<Severity, number> = { severe: 0, major: 0, minor: 0 };
  const ruleCounts = Object.fromEntries(
    Object.keys(RULE_META).map((k) => [k, 0])
  ) as Record<RuleCode, number>;
  for (const iss of issues) {
    severityCounts[iss.severity] += 1;
    ruleCounts[iss.rule] += 1;
  }
  return { total: issues.length, severityCounts, ruleCounts };
}
