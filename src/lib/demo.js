/**
 * 演示用历史提交记录：以标准解算结果为基准，用确定性随机源生成
 * 真实感的偏差、错名、漏放与过近电极，再走正式判分引擎。
 */
import { solveMontage, DEFAULT_REGIONS, ELECTRODE_INFO } from './montage.js';
import { gradeSubmission } from './grading.js';
import { COURSES, CLASSES } from './seed.js';

/** mulberry32 确定性随机 */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const gauss = (r) => {
  let u = 0, v = 0;
  while (!u) u = r();
  while (!v) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

const { nodes: LM } = solveMontage();

const WRONG_NAMES = {
  Fp1: ['Fp2', 'F1'], Fp2: ['Fp1', 'Fp2z'], F3: ['F4', 'F7'], F4: ['F3', 'F8'],
  C3: ['C4', 'T3'], C4: ['C3', 'T4'], P3: ['P4', 'T5'], P4: ['P3', 'T6'],
  O1: ['O2', 'Oz'], O2: ['O1', 'Oz1'], T3: ['T4', 'F7'], T4: ['T3', 'F8'],
  T5: ['T6', 'P3'], T6: ['T5', 'P4'], Fz: ['Fz1', 'Cz'], Cz: ['Cz1', 'Fz'],
  Pz: ['Pz2', 'Oz'], Oz: ['Oz1', 'Pz'], F7: ['F3', 'F8'], F8: ['F4', 'F7'],
  A1: ['A2', 'M1'], A2: ['A1', 'M2'],
};

/**
 * 生成一份提交
 * @param {number} seed
 * @param {object} item 题目
 * @param {object} course
 * @param {object} student
 * @param {number} skill 0..1 熟练度
 */
export function synthSubmission(seed, item, course, student, skill) {
  const r = rng(seed);
  const placements = [];
  let uid = 0;
  const jitter = (1.30 - skill) * 1.15;
  const skipChance = (1 - skill) * 0.10;
  const renameChance = (1 - skill) * 0.20;
  const leads = item.requiredLeads;
  for (const lead of leads) {
    if (r() < skipChance && lead !== 'Cz') continue; // 漏放（Cz 总是贴）
    const base = LM[lead];
    let name = lead;
    if (r() < renameChance && WRONG_NAMES[lead] && !leads.includes(WRONG_NAMES[lead][0])) {
      name = r() < 0.75 ? WRONG_NAMES[lead][0] : WRONG_NAMES[lead][1];
    }
    // 偏差：沿头皮切向 + 少量法向
    const off = [gauss(r) * jitter, gauss(r) * jitter * 0.55, gauss(r) * jitter];
    placements.push({
      id: `el-${seed}-${uid++}`,
      name,
      pos: [base.pos[0] + off[0], base.pos[1] + off[1], base.pos[2] + off[2]],
      snapped: true,
    });
  }
  // 偶尔制造间距违规：把两枚电极叠得很近
  if (r() < (1 - skill) * 0.55 && placements.length > 4) {
    const i = Math.floor(r() * (placements.length - 1));
    const a = placements[i];
    const b = placements[i + 1];
    b.pos = [a.pos[0] + 0.6 * (r() - 0.5), a.pos[1] + 0.2, a.pos[2] + 0.6 * (r() - 0.5)];
  }
  const events = placements.map((p, i) => ({
    type: 'place',
    electrodeId: p.id, name: p.name, pos: p.pos, t: i * 2400,
  }));
  // 中途一次微调：把某个电极挪到相邻位置
  if (placements.length > 4) {
    const k = 3;
    const src = placements[k];
    const nudged = [src.pos[0] + 0.9, src.pos[1] + 0.35, src.pos[2] - 0.6];
    events.splice(k + 1, 0, { type: 'move', electrodeId: src.id, name: src.name, pos: nudged, t: k * 2400 + 1200 });
    src.pos = nudged;
  }
  return {
    id: `sub-${seed}`,
    item,
    courseId: course.id,
    itemId: item.id,
    studentId: student.id,
    studentName: student.name,
    submittedAt: new Date(Date.UTC(2026, 9, 20 + (seed % 22), 9 + (seed % 8), (seed * 7) % 60)).toISOString(),
    durationSec: Math.round(260 + (1 - skill) * 640 + r() * 180),
    placements,
    events,
  };
}

/** 生成整套演示数据（首次启动） */
export function buildDemoData() {
  const submissions = [];
  let seed = 1000;
  for (const course of COURSES) {
    const cls = CLASSES.find((c) => c.id === course.classId);
    if (!cls) continue;
    for (const item of course.items) {
      for (const st of cls.students) {
        seed += 7;
        const base = 0.42 + ((seed * 37) % 100) / 170;
        if (course.status === '进行中' && Number(st.empNo.slice(-2)) > 9) continue;
        const skill = Math.min(0.98, base);
        const sub = synthSubmission(seed, item, course, st, skill);
        const grade = gradeSubmission(item, sub.placements, DEFAULT_REGIONS);
        sub.autoScore = grade.total;
        sub.grade = grade;

        // 复核状态：已结课全部复核；进行中约 1/3 待复核，其余已复核
        const r = rng(seed * 13);
        const pending = course.status === '进行中' && r() < 0.3;
        if (pending) {
          sub.status = 'pending';
        } else {
          sub.status = 'reviewed';
          // 复核大多维持，少数微调 ±2..5
          const adj = r() < 0.45 ? Math.round((r() - 0.35) * 9) : 0;
          const clamped = Math.max(0, Math.min(100, grade.total + adj));
          sub.manualScore = clamped;
          sub.finalScore = clamped;
          sub.reviewComment = REVIEW_COMMENTS[Math.floor(r() * REVIEW_COMMENTS.length)];
          sub.reviewedBy = course.instructor;
          sub.reviewedAt = new Date(Date.parse(sub.submittedAt) + 86400000 * (1 + Math.floor(r() * 4))).toISOString();
          sub.manualAdjust = grade.scores
            ? Object.fromEntries(Object.entries(grade.scores).map(([k, v]) => [k, Math.max(0, Math.min(25, v + (r() < 0.3 ? Math.round(r() * 4 - 2) : 0)))]))
            : null;
        }
        submissions.push(sub);
      }
    }
  }
  return submissions;
}

export const REVIEW_COMMENTS = [
  '布点整体规范，注意 T3/T4 略偏前，下次以外耳道上缘为参照向上引垂线。',
  '中线导联基本准确，Fz 可再向后 0.5 cm，避免落入额区。本次操作手法熟练。',
  '左右对称意识良好，但 F7/F8 与 F3/F4 间距偏近，实际操作时需留意电极帽打孔位置。',
  '命名规则掌握不牢，出现了左右编号互换。建议复习「奇左偶右」再补测。',
  '操作速度较快，个别电极未完全贴合头皮，临床上会影响阻抗。',
];
