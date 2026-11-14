import { generateBatchViews } from '../src/generator.js'
import { checkBatch } from '../src/qc.js'
for (const seed of ['SEED-5555','SEED-3077','SEED-6001','SEED-6002','SEED-6003','SEED-7777']) {
  const views = generateBatchViews({ viewType:'PSAX', probeAngle:0, level:'L3', seed, count:2 })
  const iss = checkBatch({ id:'T', views })
  console.log(seed, '总数', iss.length, JSON.stringify(iss.map(i=>i.type+':'+i.severity[0]+':v'+(i.viewIndex+1))))
}
