import { store, issuesOf, verdictOf, searchArchive } from '../src/store.js'
console.log('批次数:', store.batches.length)
for (const b of store.batches) {
  const iss = issuesOf(b.id)
  const v = verdictOf(b.id)
  console.log(b.id, b.status, '切面', b.views.length, '问题', iss.length,
    '严重', iss.filter(i=>i.severity==='severe').length,
    '待复核', v.pendingCount, '可放行', v.releasable)
}
console.log('归档检索(全部):', searchArchive('', '').map(b=>b.id+':'+b.verdict).join(', '))
console.log('归档检索(供应方):', searchArchive('', '心韵教具科技').map(b=>b.id).join(', '))
