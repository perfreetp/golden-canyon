// 业务全流程集成测试（Node 环境，localStorage 内存桩）
const mem = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k)
};

const store = await import('../src/store.ts');

const assert = (cond: boolean, msg: string) => {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('PASS:', msg);
};

// 1. 种子数据
assert(store.state.db.batches.length === 3, '内置 3 个演示批次');
const checking = store.state.db.batches.find((b) => b.status === 'checking')!;
assert(!!checking, '存在检查中批次');
const issues = store.issuesOf(checking.id);
assert(issues.length > 0, `检查中批次已生成问题（${issues.length} 项）`);
assert(issues.some((i) => i.severity === 'severe'), '存在严重级问题');
assert(issues.some((i) => i.status === 'open'), '存在待复核问题');

// 2. 门禁：未处理完不能放行
assert(store.canRelease(checking.id) === false, '有待复核问题时禁止放行');

// 3. 逐条复核（确认/驳回均需写依据，store 层直接给依据）
let reviewed = 0;
for (const iss of store.issuesOf(checking.id)) {
  if (iss.status !== 'open') continue;
  store.reviewIssue(iss.id, reviewed % 3 === 0 ? 'rejected' : 'confirmed', '现场量测复核：依据规范条款判定，留档备查。');
  reviewed++;
}
assert(reviewed > 0, `逐条复核 ${reviewed} 条`);
assert(store.issuesOf(checking.id).every((i) => i.status !== 'open'), '全部问题已闭环');
assert(store.canRelease(checking.id) === true, '闭环后放行门禁打开');

// 4. 放行 + 留档
store.releaseBatch(checking.id, '李晓敏');
const released = store.state.db.batches.find((b) => b.id === checking.id)!;
assert(released.status === 'released' && !!released.releasedAt, '批次已放行并记录放行时间');
const releaseLog = store.state.db.releaseLogs.find((l) => l.batchId === checking.id && l.action === 'released');
assert(!!releaseLog && releaseLog.operator === '李晓敏', '放行留档含操作人与时间');

// 5. 新批次：检查 → 整批退回 → 整改清单 → 重传进入新一轮
const id = store.createBatch({
  name: '测试楼层骨科病区图纸',
  designInstitute: '测试设计院',
  building: '住院楼C座',
  floor: '6F',
  unit: '护理单元一'
});
const nb = store.state.db.batches.find((b) => b.id === id)!;
assert(nb.status === 'uploading', '新批次初始为收图中');
store.checkBatch(id);
assert(nb.status === 'checking', '执行检查后进入检查复核中');
const before = store.issuesOf(id).length;
assert(before > 0, `新批次检查出 ${before} 个问题`);
const rectList = store.rectificationList(id);
assert(rectList.length === before, '整改清单包含全部未驳回问题');
const returned = store.returnBatch(id, '严重问题集中，整批退回整改', '王建国');
assert(nb.status === 'returned' && returned.length === before, '整批退回并生成整改清单');
store.reuploadBatch(id);
assert(nb.status === 'uploading' && nb.round === 2, '设计院重传后进入第 2 轮');
store.checkBatch(id);
const round2 = store.issuesOf(id);
assert(round2.every((i) => i.round === 2) && round2.length > 0, '第 2 轮问题带新轮次标记');
const runs = store.checkRunsOf(id);
assert(runs.length === 2, '两轮检查均留档');

// 6. 归档检索维度
const archiveLogs = store.state.db.releaseLogs;
assert(
  archiveLogs.some((l) => l.building === '住院楼A座'),
  '可按楼栋检索留档'
);
assert(
  store.state.db.issues.some((i) => i.reviewer === 'RV02'),
  '可按复核员检索复核记录'
);
const byFloor = store.state.db.checkRuns.filter((r) => {
  const b = store.state.db.batches.find((x) => x.id === r.batchId);
  return b?.floors.includes('9F');
});
assert(byFloor.length > 0, '可按楼层检索检查留档');

// 7. 持久化
assert(mem.has('ortho-ward-qc-db-v2'), '数据已写入 localStorage 持久化');

console.log('\n全部集成测试通过 ✔');
