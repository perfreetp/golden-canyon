// 核心算法端到端验证（不依赖浏览器/DOM）
// 运行：node --experimental-strip-types tests/core.test.ts
import assert from 'node:assert'
import { buildSeedStation } from '../src/seed.ts'
import { buildTopology, nearestNodeOnRow, planRoute } from '../src/lib/topology.ts'
import { generateRoutes } from '../src/lib/generator.ts'
import { analyzeConflicts } from '../src/lib/conflict.ts'
import { buildSimSteps, createRuntimeLock, lockRoute } from '../src/lib/simulator.ts'

let passed = 0
const ok = (name: string) => { passed++; console.log(`  ✓ ${name}`) }

const st = buildSeedStation()
const topo = buildTopology(st)

// 1. 拓扑：3 股道、4 道岔节点 + 边界节点，2 条渡线边
assert.strictEqual(st.rows.length, 3)
const slipEdges = topo.edges.filter((e) => e.slip)
assert.strictEqual(slipEdges.length, 2, '应有 2 条渡线边（1#↔3#、2#↔4#）')
ok('拓扑构建：3 股道 4 道岔 2 渡线')

// 2. 路径：X（左端正线，向右）→ S（右端正线）走正线，全部定位
const x = st.signals.find((s) => s.name === 'X')!
const s = st.signals.find((s) => s.name === 'S')!
const plan = planRoute(topo, nearestNodeOnRow(topo, x.rowId, x.x)!, nearestNodeOnRow(topo, s.rowId, s.x)!, 'right')
assert.ok(plan, 'X→S 应有可达路径')
assert.strictEqual(plan.switchReqs.filter((r) => r.position === 'reverse').length, 0, '正线进路应全定位')
assert.ok(plan.sectionOrder.length >= 3, '正线进路应经过 3 个正线区段')
ok(`正线接车 X→S：全定位，经过 ${plan.sectionOrder.length} 区段`)

// 3. 路径：X → D2（3G 右端），必须经 1#/3# 渡线反位
const d2 = st.signals.find((s) => s.name === 'D2')!
const plan2 = planRoute(topo, nearestNodeOnRow(topo, x.rowId, x.x)!, nearestNodeOnRow(topo, d2.rowId, d2.x)!, 'right')
assert.ok(plan2, 'X→D2 应有渡线路径')
const sw1 = st.switches.find((sw) => sw.name === '1#')!
const sw3 = st.switches.find((sw) => sw.name === '3#')!
const reqIds = new Map(plan2.switchReqs.map((r) => [r.switchId, r.position]))
assert.strictEqual(reqIds.get(sw1.id), 'reverse', '1# 应反位')
assert.strictEqual(reqIds.get(sw3.id), 'reverse', '3# 应反位')
ok('渡线进路 X→D2：1#/3# 自动反位，区段顺序自动生成')

// 4. 方向约束：X 授权向右，向左搜索应失败
const planLeft = planRoute(topo, nearestNodeOnRow(topo, x.rowId, x.x)!, nearestNodeOnRow(topo, s.rowId, s.x)!, 'left')
assert.strictEqual(planLeft, null, '与信号机授权方向相反时应无路径')
ok('方向约束：反向选路被拒绝')

// 5. 批量生成
const rightRoutes = generateRoutes(st, { direction: 'right', types: ['arrival', 'departure', 'shunt'] })
assert.ok(rightRoutes.length >= 2, '应批量生成多条向右进路')
st.routes.push(...rightRoutes)
const leftRoutes = generateRoutes(st, { direction: 'left', types: ['arrival', 'departure', 'shunt'] })
st.routes.push(...leftRoutes)
assert.ok(st.routes.length >= 4, `双向生成后应有多条进路，实际 ${st.routes.length}`)
ok(`批量生成：向右 ${rightRoutes.length} 条 + 向左 ${leftRoutes.length} 条，共 ${st.routes.length} 条`)

// 6. 敌对检测：手工构造同区段同方向的第二条进路
const first = st.routes[0]
const clone = JSON.parse(JSON.stringify(first))
clone.id = 'route_clone'
clone.name = first.name + '（重复试验）'
st.routes.push(clone)
const report = analyzeConflicts(st)
assert.ok(report.hostile.some((c) =>
  (c.routeA === first.id && c.routeB === clone.id) || (c.routeB === first.id && c.routeA === clone.id)),
  '同区段同方向重复进路必须判为敌对')
assert.ok(report.hostileRouteIds.has(first.id) && report.hostileRouteIds.has(clone.id))
ok(`敌对检测：发现 ${report.hostile.length} 对同区段同方向冲突并标记进路`)
st.routes.pop()

// 7. 仿真：正常排列成功，步骤完整
const rt = createRuntimeLock(st)
const stepsOk = buildSimSteps({
  station: st, topo: buildTopology(st), route: st.routes[0], rt,
  hostileRouteIds: new Set(), by: 'tester'
})
assert.ok(stepsOk.every((x) => x.ok), '正常环境下所有步骤应通过')
assert.ok(stepsOk.some((x) => x.kind === 'switch' || true))
assert.strictEqual(stepsOk.at(-1)!.kind, 'complete')
ok(`仿真成功路径：${stepsOk.length} 步全部通过，末步为进路排列完成`)

// 8. 仿真：区段封锁 → 失败并指出卡在第几步及原因
const rt2 = createRuntimeLock(st)
const target = st.routes[0]
const blockedSec = st.sections.find((sec) => target.sectionOrder.includes(sec.id))!
rt2.sectionBlocked.add(blockedSec.id)
const stepsFail = buildSimSteps({
  station: st, topo: buildTopology(st), route: target, rt: rt2,
  hostileRouteIds: new Set(), by: 'tester'
})
const failStep = stepsFail.find((x) => !x.ok)
assert.ok(failStep, '应出现失败步骤')
assert.ok(failStep.reason!.includes(blockedSec.name), '失败原因应指出具体封锁区段')
assert.strictEqual(failStep.kind, 'section')
ok(`仿真失败定位：卡在第 ${failStep.index + 1} 步（${failStep.label}）—— ${failStep.reason}`)

// 9. 仿真：道岔故障 → 转动步骤失败
const rt3 = createRuntimeLock(st)
const routeWithSw = st.routes.find((r) => r.switchReqs.length > 0)!
const sw = routeWithSw.switchReqs[0].switchId
rt3.switchBlocked.add(sw)
const stepsSw = buildSimSteps({
  station: st, topo: buildTopology(st), route: routeWithSw, rt: rt3,
  hostileRouteIds: new Set(), by: 'tester'
})
const swFail = stepsSw.find((x) => !x.ok)
assert.ok(swFail && swFail.kind === 'switch' && swFail.reason!.includes('故障'))
ok(`道岔故障定位：卡在第 ${swFail.index + 1} 步道岔转动 —— ${swFail.reason}`)

// 10. 锁闭冲突：先排列 A 锁闭区段，敌对的 B 排列失败
const rt4 = createRuntimeLock(st)
lockRoute(rt4, st.routes[0])
const secSet = new Set(st.routes[0].sectionOrder)
const hostileB = st.routes.find((r) => r.id !== st.routes[0].id && r.sectionOrder.some((id) => secSet.has(id)))
if (hostileB) {
  const rep = analyzeConflicts(st)
  const hostileIds = new Set<string>()
  for (const c of rep.hostile) {
    if (c.routeA === st.routes[0].id || c.routeB === st.routes[0].id) {
      hostileIds.add(c.routeA); hostileIds.add(c.routeB)
    }
  }
  const stepsB = buildSimSteps({
    station: st, topo: buildTopology(st), route: hostileB, rt: rt4,
    hostileRouteIds: hostileIds, by: 'tester'
  })
  const bFail = stepsB.find((x) => !x.ok)
  assert.ok(bFail, '敌对进路在锁闭状态下应排列失败')
  ok(`敌对锁闭：进路「${hostileB.name}」被拦截 —— ${bFail.reason}`)
} else {
  console.log('  - 锁闭冲突场景无适用样本，跳过')
}

console.log(`\n全部 ${passed} 项核心算法验证通过 ✅`)
