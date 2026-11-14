import { generateBatchViews } from '../src/generator.js'
import { checkBatch } from '../src/qc.js'
for (const [vt, seed, n] of [['PLAX','SEED-5555',2],['PLAX','SEED-2042',2],['A4C','SEED-2042',2],['PLAX','SEED-4100',2]]) {
  const views = generateBatchViews({ viewType:vt, probeAngle:0, level:'L3', seed, count:n })
  const iss = checkBatch({ id:'T', views })
  console.log(vt, seed, 'n='+n, '总数', iss.length, '严重', iss.filter(i=>i.severity==='severe').length, JSON.stringify(iss.map(i=>i.type+':'+i.severity[0])))
}
