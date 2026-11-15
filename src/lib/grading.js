/**
 * 自动判分引擎
 * 四项：命名规则、分区归属、左右对称、间距合规
 * 全部为纯函数，便于复核时重算与导出报表。
 */
import {
  solveMontage, DEFAULT_REGIONS, parseName, classifyRegion,
  ELECTRODE_INFO, CAMERA_PRESETS,
} from './montage.js';
import { dist } from './headgeo.js';

export const CATEGORIES = [
  {
    id: 'naming', label: '命名规则', max: 25, short: '命名',
    desc: '格式合法；奇数编号在左、偶数在右；中线用 z 结尾，不带数字',
  },
  {
    id: 'region', label: '分区归属', max: 25, short: '分区',
    desc: '落点所属解剖分区与电极名前缀一致，且不偏离标准标记位过远',
  },
  {
    id: 'symmetry', label: '左右对称', max: 25, short: '对称',
    desc: '同名左右电极关于正中矢状面镜像偏差 ≤ 1.5 cm；中线电极居中',
  },
  {
    id: 'spacing', label: '间距合规', max: 25, short: '间距',
    desc: '任意两电极中心间距 ≥ 1.5 cm',
  },
];

export const THRESHOLDS = {
  minSpacing: 1.5,
  symmetryTolerance: 1.5,
  midlineTolerance: 0.9,
  landmarkTolerance: 2.2,
  regionTolerance: 2.8,
  snapRadius: 2.4,
};

const clampScore = (v) => Math.max(0, v);

/** 唯一左右配对：Fp1/Fp2、F3/F4、T5/T6 …… */
export function symmetryPairs(leads) {
  const set = new Set(leads);
  const pairs = [];
  const seen = new Set();
  for (const name of leads) {
    const p = parseName(name);
    if (!p.ok || p.isZ) continue;
    const other = `${p.prefix}${p.num % 2 === 0 ? p.num - 1 : p.num + 1}`;
    if (!set.has(other) || seen.has(other)) continue;
    seen.add(name);
    pairs.push(p.num % 2 === 1 ? [name, other] : [other, name]);
  }
  return pairs;
}

function regionOfLead(name, regionDict) {
  for (const r of regionDict) if (r.members.includes(name)) return r;
  const info = ELECTRODE_INFO[name];
  return regionDict.find((r) => r.id === info?.region) || regionDict[0];
}

/** 判定单个落点是否吸附到标准标记位 */
export function nearestLandmark(pos, landmarks) {
  let best = null;
  for (const [name, n] of Object.entries(landmarks)) {
    const d = dist(pos, n.pos);
    if (!best || d < best.distance) best = { name, distance: d, node: n };
  }
  return best;
}

/**
 * 主判分
 * @param {object} item 题目（含 requiredLeads / weights）
 * @param {Array} placements [{id, name, pos}]
 * @param {Array} regionDict 分区词典
 * @param {object} overrides 人工复核权重/阈值（可选）
 */
export function gradeSubmission(item, placements, regionDict = DEFAULT_REGIONS, opts = {}) {
  const { nodes: landmarks } = solveMontage();
  const t = { ...THRESHOLDS, ...(opts.thresholds || {}) };
  const weights = { ...Object.fromEntries(CATEGORIES.map((c) => [c.id, c.max])), ...(item.weights || {}) };
  const required = item.requiredLeads || [];
  const byName = new Map();
  for (const p of placements) {
    if (!p.name) continue;
    if (!byName.has(p.name)) byName.set(p.name, []);
    byName.get(p.name).push(p);
  }

  const findings = [];
  const add = (category, points, code, message, extra = {}) =>
    findings.push({ category, points, code, message, ...extra });

  // ---------- 1. 命名规则 ----------
  let namingDeduct = 0;
  for (const p of placements) {
    const parsed = parseName(p.name);
    if (!p.name || !parsed.ok) {
      const d = 5;
      namingDeduct += d;
      add('naming', d, 'name-format', `电极「${p.name || '未命名'}」命名格式不合规：${parsed.reason || '名称为空'}`, { electrodeId: p.id });
      continue;
    }
    const hemisphere = p.pos[0] > t.midlineTolerance ? 'L' : p.pos[0] < -t.midlineTolerance ? 'R' : 'Z';
    if (parsed.side !== hemisphere) {
      const d = 4;
      namingDeduct += d;
      const sideCn = { L: '左', R: '右', Z: '中线' };
      add('naming', d, 'name-side',
        `「${p.name}」按命名规则应在${sideCn[parsed.side] === '中线' ? '中线' : sideCn[parsed.side] + '侧'}，实际贴于${sideCn[hemisphere]}侧`,
        { electrodeId: p.id, lead: p.name });
    }
    if ((byName.get(p.name) || []).length > 1) {
      const d = 3;
      namingDeduct += d;
      add('naming', d, 'name-duplicate', `电极名「${p.name}」重复，同一导联组合内不可重名`, { electrodeId: p.id, lead: p.name });
    }
    if (!required.includes(p.name)) {
      const d = 2;
      namingDeduct += d;
      add('naming', d, 'name-unexpected', `「${p.name}」不在本导联组合要求的电极清单内`, { electrodeId: p.id, lead: p.name });
    }
  }
  const namingScore = clampScore(Math.min(weights.naming, weights.naming - namingDeduct));

  // ---------- 2. 分区归属 ----------
  let regionDeduct = 0;
  const perLead = {};
  for (const lead of required) {
    const placed = byName.get(lead) || [];
    if (!placed.length) {
      regionDeduct += 4;
      perLead[lead] = { status: 'missing', lead };
      add('region', 4, 'lead-missing', `漏放「${lead}」（${ELECTRODE_INFO[lead]?.cn || ''}）`, { lead });
      continue;
    }
    const pos = placed[0].pos;
    const expected = regionOfLead(lead, regionDict);
    const actual = classifyRegion([pos[0], pos[1], pos[2]], regionDict, landmarks);
    const dev = dist(pos, landmarks[lead]?.pos || pos);
    let status = 'ok';
    if (dev > t.regionTolerance) {
      regionDeduct += 5;
      status = 'misplaced';
      add('region', 5, 'lead-offset',
        `「${lead}」偏离标准标记位 ${dev.toFixed(1)} cm（允许 ${t.regionTolerance} cm）`,
        { lead, electrodeId: placed[0].id });
    } else if (actual.region.id !== expected.id) {
      regionDeduct += 3;
      status = 'region';
      add('region', 3, 'region-mismatch',
        `「${lead}」应属${expected.name}，实际落在${actual.region.name}（最近标记位 ${actual.nearest.name}）`,
        { lead, electrodeId: placed[0].id });
    }
    perLead[lead] = {
      status, lead, deviation: +dev.toFixed(2),
      expectedRegion: expected.id, actualRegion: actual.region.id,
      nearest: actual.nearest.name,
    };
  }
  const regionScore = clampScore(Math.min(weights.region, weights.region - regionDeduct));

  // ---------- 3. 左右对称 ----------
  let symDeduct = 0;
  const pairDetails = [];
  const reqPairs = symmetryPairs(required);
  for (const [l, r] of reqPairs) {
    const pl = byName.get(l)?.[0];
    const pr = byName.get(r)?.[0];
    if (!pl || !pr) {
      // 配对缺失：该侧无法核验，按缺项扣分（避免空提交白拿对称分）
      const missingOne = !pl && !pr;
      const d = missingOne ? 5 : 3;
      symDeduct += d;
      const which = missingOne ? `${l}/${r} 两侧均未放置` : `「${!pl ? l : r}」未放置`;
      add('symmetry', d, 'sym-unverifiable', `${which}，无法完成左右对称核验`, { leadPair: [l, r] });
      pairDetails.push({ left: l, right: r, deviation: null, unverifiable: true });
      continue;
    }
    const mirror = [-pr.pos[0], pr.pos[1], pr.pos[2]];
    const dev = dist(pl.pos, mirror);
    pairDetails.push({ left: l, right: r, deviation: +dev.toFixed(2) });
    if (dev > t.symmetryTolerance) {
      const d = Math.min(8, 2 + Math.round((dev - t.symmetryTolerance) * 2));
      symDeduct += d;
      add('symmetry', d, 'sym-deviation',
        `${l}/${r} 镜像偏差 ${dev.toFixed(1)} cm（允许 ${t.symmetryTolerance} cm）`, { leadPair: [l, r] });
    }
  }
  for (const lead of required) {
    const parsed = parseName(lead);
    if (!parsed.ok || !parsed.isZ) continue;
    const p = byName.get(lead)?.[0];
    if (!p) continue;
    if (Math.abs(p.pos[0]) > t.midlineTolerance) {
      const d = 5;
      symDeduct += d;
      add('symmetry', d, 'midline-offset', `中线电极「${lead}」偏离正中线 ${Math.abs(p.pos[0]).toFixed(1)} cm`, { lead });
    }
  }
  const symmetryScore = clampScore(Math.min(weights.symmetry, weights.symmetry - symDeduct));

  // ---------- 4. 间距合规 ----------
  let spacingDeduct = 0;
  const violations = [];
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const a = placements[i];
      const b = placements[j];
      const d = dist(a.pos, b.pos);
      if (d < t.minSpacing) {
        violations.push({ a: a.name || a.id, b: b.name || b.id, distance: +d.toFixed(2), ids: [a.id, b.id] });
        spacingDeduct += 6;
        add('spacing', 6, 'too-close',
          `「${a.name || '未命名'}」与「${b.name || '未命名'}」间距 ${d.toFixed(1)} cm < ${t.minSpacing} cm`,
          { electrodeIds: [a.id, b.id] });
      }
    }
  }
  // 布点不完整时，间距合规按完成度折算（避免只放 1 枚电极即拿满分）
  const completeness = required.length ? Math.min(1, placements.length / required.length) : 1;
  let spacingScore = clampScore(Math.min(weights.spacing, weights.spacing - spacingDeduct));
  if (completeness < 1) {
    const lost = Math.round(spacingScore * (1 - completeness));
    if (lost > 0) {
      add('spacing', lost, 'spacing-incomplete',
        `布点仅完成 ${placements.length}/${required.length}，间距合规无法全量核验`);
      spacingScore = clampScore(spacingScore - lost);
    }
  }

  const scores = {
    naming: namingScore,
    region: regionScore,
    symmetry: symmetryScore,
    spacing: spacingScore,
  };
  const total = Math.round(
    (namingScore + regionScore + symmetryScore + spacingScore) *
    (100 / (weights.naming + weights.region + weights.symmetry + weights.spacing)),
  );

  return {
    scores, total, findings, perLead, pairDetails, violations,
    gradedAt: Date.now(),
    thresholds: t,
    weights,
  };
}

/** 生成错题回放帧：按操作轨迹还原 */
export function buildReplay(events) {
  const frames = [];
  let state = [];
  for (const ev of events) {
    if (ev.type === 'place' || ev.type === 'move') {
      const next = state.filter((e) => e.id !== ev.electrodeId);
      next.push({ id: ev.electrodeId, name: ev.name, pos: ev.pos });
      state = next;
      frames.push({ ...ev, snapshot: state.map((e) => ({ ...e })) });
    } else if (ev.type === 'rename') {
      state = state.map((e) => (e.id === ev.electrodeId ? { ...e, name: ev.name } : e));
      frames.push({ ...ev, snapshot: state.map((e) => ({ ...e })) });
    } else if (ev.type === 'remove') {
      state = state.filter((e) => e.id !== ev.electrodeId);
      frames.push({ ...ev, snapshot: state.map((e) => ({ ...e })) });
    }
  }
  return frames;
}

/** 聚合错误率最高的前 N 个导联点（按题目分组） */
export function topErrorLeads(submissions, regionDict = DEFAULT_REGIONS, n = 5) {
  const stats = new Map();
  for (const s of submissions) {
    if (!s.grade || !s.item) continue;
    const required = s.item.requiredLeads || [];
    for (const lead of required) {
      const st = s.grade.perLead?.[lead];
      const rec = stats.get(lead) || { lead, total: 0, errors: 0, byType: { missing: 0, misplaced: 0, region: 0 }, courses: new Set() };
      rec.total += 1;
      if (st && st.status !== 'ok') {
        rec.errors += 1;
        if (rec.byType[st.status] !== undefined) rec.byType[st.status] += 1;
      }
      rec.courses.add(s.courseId);
      stats.set(lead, rec);
    }
  }
  return [...stats.values()]
    .map((r) => ({
      ...r,
      rate: r.total ? r.errors / r.total : 0,
      regionName: regionOfLead(r.lead, regionDict)?.name || '',
      courses: [...r.courses],
    }))
    .filter((r) => r.errors > 0)
    .sort((a, b) => b.rate - a.rate || b.errors - a.errors || a.lead.localeCompare(b.lead))
    .slice(0, n);
}

/** 课程平均分 / 及格率 */
export function courseStats(submissions, passLine = 60) {
  const scored = submissions.filter((s) => s.finalScore != null);
  if (!scored.length) return { avg: 0, passRate: 0, count: 0, max: 0, min: 0 };
  const vals = scored.map((s) => s.finalScore);
  return {
    count: vals.length,
    avg: +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1),
    passRate: +(vals.filter((v) => v >= passLine).length / vals.length * 100).toFixed(0),
    max: Math.max(...vals), min: Math.min(...vals),
  };
}

export { CAMERA_PRESETS };
