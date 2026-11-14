// 几何引擎冒烟测试：node --experimental-strip-types tests/geometry.test.ts
import { polygonBoolean, pointInPolygon, snapPoint, smoothPathD, polygonArea, findGuides } from '../src/core/geometry.ts';
import type { Point, RegionNode } from '../src/types.ts';

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string): void {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.error(`  ✕ ${msg}`); }
}

// 两个部分重叠的正方形（边长 100，重叠 50）
const A: Point[] = [[0, 0], [100, 0], [100, 100], [0, 100]].map(([x, y]) => ({ x, y }));
const B: Point[] = [[50, 50], [150, 50], [150, 150], [50, 150]].map(([x, y]) => ({ x, y }));

console.log('布尔并集：');
const union = polygonBoolean(A, B, 'union');
assert(union.length >= 1, '并集至少返回一个轮廓');
const unionPts = union.flat();
assert(pointInPolygon({ x: 25, y: 25 }, unionPts), '并集包含 A 独有区域 (25,25)');
assert(pointInPolygon({ x: 125, y: 125 }, unionPts), '并集包含 B 独有区域 (125,125)');
assert(pointInPolygon({ x: 75, y: 75 }, unionPts), '并集包含重叠区域 (75,75)');
assert(!pointInPolygon({ x: 140, y: 10 }, unionPts), '并集不包含外部点 (140,10)');
const unionArea = union.reduce((sum, poly) => sum + Math.abs(polygonArea(poly)), 0);
assert(Math.abs(unionArea - 17500) < 300, `并集面积 ≈ 17500（实际 ${Math.round(unionArea)}）`);

console.log('布尔差集 A-B：');
const diff = polygonBoolean(A, B, 'subtract');
assert(diff.length === 1, '差集返回单轮廓（孔洞走走廊拼接）');
assert(pointInPolygon({ x: 25, y: 25 }, diff[0]), '差集保留 A 独有区域');
assert(!pointInPolygon({ x: 75, y: 75 }, diff[0]), '差集挖掉重叠区域 (75,75)');
assert(!pointInPolygon({ x: 125, y: 125 }, diff[0]), '差集不含 B 独有区域');

console.log('退化情形：');
const inner: Point[] = [[20, 20], [80, 20], [80, 80], [20, 80]].map(([x, y]) => ({ x, y }));
const hole = polygonBoolean(A, inner, 'subtract');
assert(hole.length === 1 && hole[0].length > A.length, '内含多边形求差生成走廊轮廓');
const separate = polygonBoolean(A, [{ x: 300, y: 300 }, { x: 400, y: 300 }, { x: 400, y: 400 }, { x: 300, y: 400 }], 'union');
assert(separate.length === 2, '完全分离的两多边形求并返回两个轮廓');

console.log('吸附：');
const snapped = snapPoint({ x: 38, y: 42 }, { gridSize: 40, threshold: 10, gridEnabled: true });
assert(snapped.point.x === 40 && snapped.point.y === 40, '网格吸附到最近格点');
assert(snapped.source === 'grid', '吸附来源标记为 grid');
const anchorSnap = snapPoint({ x: 99, y: 50 }, { gridSize: 40, threshold: 10, anchors: [{ x: 100, y: 50 }], gridEnabled: true });
assert(anchorSnap.point.x === 100 && anchorSnap.source === 'node', '端点吸附优先于网格');

console.log('参考线：');
const guides = findGuides({ x: 102, y: 300 }, [{ x: 100, y: 999 }], 8);
assert(guides.some((g) => g.type === 'v' && g.pos === 100), '垂直对齐生成纵向参考线');

console.log('圆滑路径：');
const nodes: RegionNode[] = [
  { id: 'a', x: 0, y: 0, smooth: 0.5 }, { id: 'b', x: 50, y: 100, smooth: 0.5 }, { id: 'c', x: 100, y: 0, smooth: 0.5 },
];
const d = smoothPathD(nodes, false);
assert(d.startsWith('M 0 0') && d.includes('C'), 'Catmull-Rom 输出三次贝塞尔命令');
const straight = smoothPathD(nodes.map((n) => ({ ...n, smooth: 0 })), false);
assert(!straight.includes('C') && straight.includes('L'), 'smooth=0 退化为直线段');

console.log('复杂场景：');
// L 形主体减去一个跨角的方块（非凸，验证多交点）
const L: Point[] = [[0, 0], [120, 0], [120, 40], [40, 40], [40, 120], [0, 120]].map(([x, y]) => ({ x, y }));
const bite: Point[] = [[20, 20], [60, 20], [60, 60], [20, 60]].map(([x, y]) => ({ x, y }));
const lDiff = polygonBoolean(L, bite, 'subtract');
assert(lDiff.length >= 1 && pointInPolygon({ x: 100, y: 20 }, lDiff[0]), '非凸 L 形求差保留远端区域');
assert(!pointInPolygon({ x: 40, y: 40 }, lDiff[0]), '非凸 L 形求差挖掉咬合区');

// 内含孔洞：大方块减小方块
const hole2 = polygonBoolean(A, inner, 'subtract');
assert(hole2[0].length >= 8, '内含孔洞走走廊生成带凹点轮廓（≥8 顶点）');

// 并集两个相离方块得到两块
const far: Point[] = [[300, 300], [400, 300], [400, 400], [300, 400]].map(([x, y]) => ({ x, y }));
assert(polygonBoolean(A, far, 'union').length === 2, '相离并集保留两块独立轮廓');
assert(polygonBoolean(A, far, 'subtract').length === 1, '相离求差主体不变');

// 十字相交（每条边两个交点，共 8 交点）
const horizontal: Point[] = [[-40, 40], [140, 40], [140, 60], [-40, 60]].map(([x, y]) => ({ x, y }));
const vertical: Point[] = [[40, -40], [60, -40], [60, 140], [40, 140]].map(([x, y]) => ({ x, y }));
const cross = polygonBoolean(horizontal, vertical, 'union');
assert(cross.length >= 1, '十字相交并集返回轮廓');
assert(pointInPolygon({ x: 50, y: 50 }, cross[0]), '十字并集包含中心');
assert(pointInPolygon({ x: 0, y: 50 }, cross[0]), '十字并集包含横臂端点');
assert(pointInPolygon({ x: 50, y: 100 }, cross[0]), '十字并集包含竖臂端点');

// 差集可重复执行（模拟连续剪洞）
const step1 = polygonBoolean(A, B, 'subtract')[0];
const bite2: Point[] = [[10, 10], [30, 10], [30, 30], [10, 30]].map(([x, y]) => ({ x, y }));
const step2 = polygonBoolean(step1, bite2, 'subtract');
assert(step2.length >= 1 && !pointInPolygon({ x: 20, y: 20 }, step2[0]), '连续两次求差可叠加剪洞');

console.log(`\n结果：${passed} 通过，${failed} 失败`);
if (failed) process.exit(1);
