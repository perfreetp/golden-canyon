import { generateBatchViews, regenerateKeepingLocks } from '../src/generator.js'
import { checkBatch } from '../src/qc.js'
const params = { viewType:'A4C', probeAngle:6, level:'L3', seed:'SEED-1001', count:3 }
const a = generateBatchViews(params)
const b = generateBatchViews(params)
console.log('确定性一致:', JSON.stringify(a) === JSON.stringify(b))
a[0].annotations[0].locked = true; a[0].annotations[0].x = 111; a[0].annotations[0].y = 222
const regen = regenerateKeepingLocks(params, a)
const lk = regen[0].annotations.find(x => x.id === a[0].annotations[0].id)
console.log('锁定位置保留:', lk.x === 111 && lk.y === 222 && lk.locked)
const unlocked = regen[0].annotations.find(x => x.id === a[0].annotations[1].id)
console.log('未锁定重排与原始一致:', unlocked.x === b[0].annotations[1].x)
const issues = checkBatch({ id:'T1', views:a })
const by = {}
issues.forEach(i => by[i.type+':'+i.severity] = (by[i.type+':'+i.severity]||0)+1)
console.log('质检分布:', JSON.stringify(by), '总数:', issues.length)
