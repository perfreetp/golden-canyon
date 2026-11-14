// 端到端：教师套索命题 → 发布 → 学员答题 → 自动评分 → 教师复核 → 成绩统计
const port = process.env.CDP_PORT || 9222
const base = 'http://localhost:5175/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const t = await (await fetch(`http://localhost:${port}/json/new?${encodeURIComponent(base)}`, { method: 'PUT' })).json()
const ws = new WebSocket(t.webSocketDebuggerUrl)
let id = 0; const pending = new Map(); const logs = []
const send = (m, p = {}) => new Promise((resolve, reject) => {
  const mid = ++id
  const timer = setTimeout(() => { pending.delete(mid); reject(new Error('CDP timeout: ' + m)) }, 15000)
  pending.set(mid, (r) => { clearTimeout(timer); resolve(r) })
  ws.send(JSON.stringify({ id: mid, method: m, params: p }))
})
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); return }
  if (m.method === 'Runtime.exceptionThrown') logs.push('[EXC] ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 200))
  // 自动接受/关闭原生 confirm/alert 对话框，避免阻塞无头页面 JS 线程
  if (m.method === 'Page.javascriptDialogOpening') {
    send('Page.handleJavaScriptDialog', { accept: true, promptText: '' }).catch(() => {})
  }
}
await new Promise((r) => (ws.onopen = r))
await send('Runtime.enable'); await send('Page.enable'); await send('Input.enable')
// 固定桌面视口，避免窄屏布局导致画布错位、点击落空
await send('Emulation.setDeviceMetricsOverride', { width: 1500, height: 950, deviceScaleFactor: 1, mobile: false })
// 双保险：预置 confirm/alert 桩（CDP 对话框事件处理为主，此为兜底）
await send('Page.addScriptToEvaluateOnNewDocument', {
  expression: 'window.confirm=()=>true;window.alert=()=>true;'
})
const ev = async (e) => {
  // CDP 偶发丢响应时重试一次
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })
      if (res.exceptionDetails) return 'JSERR:' + (res.exceptionDetails.exception?.description || res.exceptionDetails.text).slice(0, 150)
      return res.result.value
    } catch (err) {
      if (attempt === 0) { console.log('   (CDP 重试: ' + err.message + ')'); await sleep(500); continue }
      throw err
    }
  }
}
const waitFor = async (expr, timeout = 12000) => {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const v = await ev(expr)
    if (v && v !== 'null' && v !== 'undefined' && v !== 'false') return v
    await sleep(250)
  }
  throw new Error('等待超时: ' + expr)
}
await send('Page.navigate', { url: base })
await sleep(3500)
// 清空历史演示数据，保证 E2E 从干净状态开始
await ev('localStorage.clear()')
await send('Page.navigate', { url: base })
await sleep(4000)
const clickAt = async (x, y) => {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
  await sleep(40)
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
  await sleep(350)
}
const setSelect = async (selector, value) => ev(`(() => {
  const el = document.querySelector(${JSON.stringify(selector)})
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set
  setter.call(el, ${JSON.stringify(value)})
  el.dispatchEvent(new Event('change', { bubbles: true }))
  return 'ok'
})()`)
const setInput = async (selector, value) => ev(`(() => {
  const el = document.querySelector(${JSON.stringify(selector)})
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(el, ${JSON.stringify(value)})
  el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }))
  return 'ok'
})()`)

try {
// ---------- 1. 切换到教师 ----------
await setSelect('.user-box select', 'teacher-li')
await sleep(800)
console.log('1) 当前视图标题:', await ev(`document.querySelector('.section-title')?.innerText`))

// ---------- 2. 新建任务 ----------
await ev(`[...document.querySelectorAll('button')].find(b => b.innerText.includes('新建考核任务'))?.click()`)
await sleep(800)
await setInput('.form-field input', 'E2E 断层识别考核')
console.log('2) 进入编辑器:', await ev(`document.querySelector('.section-title')?.innerText`))

// ---------- 3. 在画布上画一个套索（圆形轨迹拖拽） ----------
await waitFor(`document.querySelector('canvas') ? 'ready' : null`)
await sleep(1200) // 等待 Pixi 异步 init 与首次 syncFromProps 完成
const canvasRect = JSON.parse(await ev(`(() => { const c=document.querySelector('canvas'); const r=c.getBoundingClientRect(); return JSON.stringify({x:r.x,y:r.y,w:r.width,h:r.height}) })()`))
const cx = canvasRect.x + canvasRect.w * 0.5, cy = canvasRect.y + canvasRect.h * 0.45, R = 70
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx + R, y: cy, button: 'left', clickCount: 1 })
for (let k = 1; k <= 24; k++) {
  const a = (k / 24) * Math.PI * 2
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, button: 'left' })
  await sleep(25)
}
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx + R, y: cy, button: 'left', clickCount: 1 })
await sleep(700)
const lassoState = await ev(`[...document.querySelectorAll('.q-actions span')].map(s=>s.innerText).join(' | ')`)
console.log('3) 套索结果:', lassoState)
if (!lassoState.includes('圈画完成')) throw new Error('套索未被识别: ' + lassoState)

// 确认入卷
await ev(`[...document.querySelectorAll('button')].find(b => b.innerText.includes('确认圈画并加入试卷'))?.click()`)
await waitFor(`document.querySelectorAll('.q-card').length >= 1 ? 'has-q' : null`)
const qCount = await ev(`document.querySelectorAll('.q-card').length`)
console.log('   入卷题目数:', qCount)

// ---------- 4. 发布 ----------
await ev(`[...document.querySelectorAll('button')].find(b => b.innerText.includes('校验并发布'))?.click()`)
await sleep(1000)
const taskRow = await ev(`document.querySelector('table tbody tr')?.innerText.replace(/\\n/g, ' | ').slice(0, 120)`)
console.log('4) 发布后任务列表:', taskRow)

// ---------- 5. 切换学员 ----------
await setSelect('.user-box select', 'stu-chen')
await sleep(800)
// 学员默认进入「断层学习」，需切换到「考核任务」导航
await ev(`[...document.querySelectorAll('.main-nav button')].find(b => b.innerText.includes('考核任务'))?.click()`)
await sleep(800)
console.log('5) 学员考核页:', await ev(`document.querySelector('.section-title')?.innerText`))
await ev(`[...document.querySelectorAll('button')].find(b => b.innerText.includes('进入答题'))?.click()`)
await waitFor(`document.querySelector('.lock-note') ? 'locked' : null`)
const lockNote = await ev(`document.querySelector('.lock-note')?.innerText`)
const question = await ev(`[...document.querySelectorAll('.q-card')].pop()?.innerText.replace(/\\n/g,' | ').slice(0,120)`)
console.log('   锁定提示:', lockNote)
console.log('   题目区:', question)

// ---------- 6. 学员套索作答 ----------
await waitFor(`document.querySelector('canvas') ? 'ready' : null`)
await sleep(1500) // 等待答题画布 Pixi 异步 init 与事件绑定完成
const cr2 = JSON.parse(await ev(`(() => {
  const c=document.querySelector('canvas'); const r=c.getBoundingClientRect()
  const px=r.x+r.width*0.5, py=r.y+r.height*0.45
  return JSON.stringify({x:r.x,y:r.y,w:r.width,h:r.height, hit:document.elementFromPoint(px,py)?.tagName})
})()`))
console.log('   作答画布:', cr2.hit, `${cr2.w}x${cr2.h}`)
const ax = cr2.x + cr2.w * 0.5, ay = cr2.y + cr2.h * 0.45
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: ax + R * 0.8, y: ay, button: 'left', buttons: 1, clickCount: 1 })
for (let k = 1; k <= 24; k++) {
  const a = (k / 24) * Math.PI * 2
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: ax + Math.cos(a) * R * 0.8 + 15, y: ay + Math.sin(a) * R * 0.8 + 10, buttons: 1 })
  await sleep(22)
}
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: ax + R * 0.8, y: ay, button: 'left', buttons: 0, clickCount: 1 })
await waitFor(`document.body.innerText.includes('已圈画') ? 'answered' : null`)
const answered = await ev(`[...document.querySelectorAll('.panel-title')].map(p=>p.innerText).join(' | ')`)
console.log('6) 面板状态:', answered)

// 提交（原生对话框已在页面初始化时桩接）
console.log('   confirm 桩:', await ev(`typeof window.confirm === 'function' ? window.confirm.toString().slice(0, 30) : 'missing'`))
await ev(`[...document.querySelectorAll('button')].find(b => b.innerText.includes('提交答卷并自动评分'))?.click()`)
console.log('   提交点击已派发，等待评分…')
// 等待自动评分结果渲染（只读回看模式出现机评指标）
await waitFor(`document.querySelector('.metric-row') ? 'scored' : null`)
const feedback = await ev(`document.querySelector('.metric-row')?.innerText`)
const autoScore = await ev(`[...document.querySelectorAll('.metric-row b')].map(b=>b.innerText).join(' / ')`)
console.log('   自动评分反馈:', feedback, '|', autoScore)

// ---------- 7. 教师复核 ----------
await setSelect('.user-box select', 'teacher-li')
await sleep(700)
await ev(`[...document.querySelectorAll('.main-nav button')].find(b => b.innerText.includes('复核中心'))?.click()`)
await waitFor(`document.querySelector('.canvas-toolbar select') ? 'review-ready' : null`)
// 注意：页面顶部还有用户切换下拉，复核控件必须限定在 .canvas-toolbar 内
await ev(`(() => { const s=document.querySelectorAll('.canvas-toolbar select')[0]; if(s && s.options.length>1){ const set=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set; set.call(s, s.options[1].value); s.dispatchEvent(new Event('change',{bubbles:true})) } })()`)
await sleep(700)
await ev(`(() => { const s=document.querySelectorAll('.canvas-toolbar select')[1]; if(s && s.options.length>0){ const set=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set; set.call(s, s.options[0].value); s.dispatchEvent(new Event('change',{bubbles:true})) } })()`)
await waitFor(`document.querySelector('.score-big') ? 'has-score' : null`)
const reviewScore = await ev(`document.querySelector('.score-big')?.innerText`)
console.log('7) 复核中心成绩:', reviewScore)

// 改分 + 评语
await waitFor(`document.querySelector('input[type=number]') ? 'has-input' : null`)
await setInput('input[type=number]', '9')
await ev(`(() => { const ta=document.querySelector('textarea'); const set=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set; set.call(ta,'定位基本准确，边界略偏差，注意对照邻近血管走形。'); ta.dispatchEvent(new Event('input',{bubbles:true})) })()`)
await ev(`[...document.querySelectorAll('button')].find(b => b.innerText.includes('保存本题复核'))?.click()`)
await waitFor(`document.body.innerText.includes('复核已保存') ? 'review-saved' : null`)
console.log('   复核保存:', await ev(`[...document.querySelectorAll('.toast, .tag.green')].map(e=>e.innerText).join(' | ')`) || '已保存')

// ---------- 8. 成绩分析 ----------
await ev(`[...document.querySelectorAll('.main-nav button')].find(b => b.innerText.includes('成绩分析'))?.click()`)
await sleep(900)
await ev(`(() => { const s=document.querySelector('canvas-toolbar select, .canvas-toolbar select'); const sel=document.querySelectorAll('.canvas-toolbar select')[0]; if(sel && sel.options[0]){const set=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set; set.call(sel, sel.options[0].value); sel.dispatchEvent(new Event('change',{bubbles:true}))} })()`)
await sleep(800)
const stats = await ev(`[...document.querySelectorAll('.stat-card')].map(c => c.innerText.replace(/\\n/g, '=')).join('  ')`)
console.log('8) 成绩统计:', stats)
const rankRow = await ev(`document.querySelector('table tbody tr')?.innerText.replace(/\\n/g,' | ').slice(0,140)`)
console.log('   错误率排名首行:', rankRow)

console.log('\n--- 运行期异常 (' + logs.length + ') ---')
console.log(logs.join('\n') || '(none)')
} catch (err) {
  console.error('E2E 流程失败:', err.message)
  console.log('截至失败时异常日志:\n' + (logs.join('\n') || '(none)'))
}
await send('Page.close').catch(() => {}); ws.close(); process.exit(0)
