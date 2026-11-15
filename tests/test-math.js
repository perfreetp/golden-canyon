// 脱离浏览器的纯数学验证：node test-math.js
require('../js/geo-scene.js');
const m = global.GeoScene.math;

// 1. 高程与坡度分布
let slopeBins = { '<15': 0, '15-25': 0, '25-35': 0, '35-45': 0, '>45': 0 };
let hMin = Infinity, hMax = -Infinity;
const N = 200;
for (let j = 0; j < N; j++) {
  for (let i = 0; i < N; i++) {
    const x = -300 + (i / (N - 1)) * 600;
    const z = -300 + (j / (N - 1)) * 600;
    const h = m.heightAt(x, z);
    hMin = Math.min(hMin, h); hMax = Math.max(hMax, h);
    const s = m.slopeAt(x, z);
    if (s < 15) slopeBins['<15']++;
    else if (s < 25) slopeBins['15-25']++;
    else if (s < 35) slopeBins['25-35']++;
    else if (s < 45) slopeBins['35-45']++;
    else slopeBins['>45']++;
  }
}
console.log('高程范围:', hMin.toFixed(1), '~', hMax.toFixed(1), 'm');
console.log('坡度分布(40000采样):', slopeBins);
const steepPct = ((slopeBins['35-45'] + slopeBins['>45']) / (N * N) * 100).toFixed(1);
console.log('陡坡(>35°)占比:', steepPct + '%');

// 2. D8 汇水网格性能与结果
const t0 = Date.now();
const flow = m.buildFlowGrid();
console.log('D8网格构建耗时:', Date.now() - t0, 'ms, 分辨率:', flow.n);
console.log('最大累积单元数:', Array.from(flow.acc).sort((a, b) => b - a)[0].toFixed(0),
  '阈值25以上占比:', (flow.acc.filter(v => v >= 25).length / flow.acc.length * 100).toFixed(1) + '%');
console.log('流域中心汇水面积:', Math.round(m.catchAt(flow, 0, 0)), 'm²');

// 3. 几何工具
const poly = [{ x: 0, z: 0 }, { x: 40, z: 0 }, { x: 40, z: 30 }, { x: 0, z: 30 }];
console.log('矩形面积(应=1200):', m.polygonArea(poly));
console.log('质心(应=20,15):', JSON.stringify(m.centroidOf(poly)));
console.log('点(60,15)到多边形距离(应=20):', m.distToPolygon(60, 15, poly));
console.log('内部点距离(应=0):', m.distToPolygon(20, 15, poly));

// 4. 陡坡下方强制布房（红色复核场景）
const rng2 = m.mulberry32(20261116);
const steepSites = m.findSteepHouseSites(rng2, 2);
console.log('陡坡演示点数量:', steepSites.length);
steepSites.forEach(site => {
  const d = Math.hypot(site.steep.x - site.house.x, site.steep.z - site.house.z);
  const houseLower = m.heightAt(site.house.x, site.house.z) < m.heightAt(site.steep.x, site.steep.z);
  const sq = [
    { x: site.steep.x - 10, z: site.steep.z - 10 },
    { x: site.steep.x + 10, z: site.steep.z - 10 },
    { x: site.steep.x + 10, z: site.steep.z + 10 },
    { x: site.steep.x - 10, z: site.steep.z + 10 }
  ];
  const dist = m.distToPolygon(site.house.x, site.house.z, sq);
  console.log(`  坡度=${site.slope}° 房距=${d.toFixed(1)}m 房在下方=${houseLower} 房址坡度=${m.slopeAt(site.house.x, site.house.z).toFixed(1)}° 到隐患区边缘=${dist.toFixed(1)}m → 红色预警=${site.slope > 35 && dist <= 10 && houseLower}`);
});
