import { generateBatchViews } from '../src/generator.js'
import { checkBatch } from '../src/qc.js'
for (const seed of ['SEED-1001','SEED-2042','SEED-3077','SEED-4100','SEED-5555']) {
  for (const vt of ['A4C','PLAX','PSAX','SC']) {
    const views = generateBatchViews({ viewType:vt, probeAngle:6, level:'L3', seed, count:3 })
    const issues = checkBatch({ id:'T', views })
    const by = {}
    issues.forEach(i => by[i.type+':'+i.severity[0]] = (by[i.type+':'+i.severity[0]]||0)+1)
    console.log(seed, vt, JSON.stringify(by))
  }
}
