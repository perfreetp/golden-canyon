// node test-e2e.js — 真实浏览器内的完整业务闭环 E2E
const { spawn } = require('child_process');
const http = require('http');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9337;
const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--remote-debugging-port=' + PORT,
  '--user-data-dir=D:\\ccfb\\runs\\10365\\workspace\\.chrome-e2e', 'about:blank']);
const get = p => new Promise((res, rej) => http.get({ host: '127.0.0.1', port: PORT, path: p }, r => {
  let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? ' → ' + extra : '')); }
}

(async () => {
  let tabs;
  for (let i = 0; i < 30; i++) { try { tabs = await get('/json'); break; } catch { await sleep(300); } }
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  let id = 0; const pending = new Map(); const errors = [];
  const send = (method, params = {}) => new Promise(resolve => {
    const mid = ++id; pending.set(mid, resolve);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
  };
  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.navigate', { url: 'http://localhost:8731/index.html' });
  await sleep(2000);
  // 保证测试隔离：清空本地数据并重新加载，应用检测到空存储会自动重新播种
  await send('Runtime.evaluate', { expression: "localStorage.clear()" });
  await send('Page.reload');
  await sleep(5000);
  const seedCount = await new Promise(resolve => {
    send('Runtime.evaluate', { expression: "JSON.parse(localStorage.getItem('geo-hazard-system-v1')||'{}').hazards?.length || 0", returnByValue: true }).then(r => resolve(r.result.value));
  });
  console.log('测试隔离：重置后种子隐患点数 =', seedCount);
  const evalJs = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) return { __error: r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || '') };
    return r.result.value;
  };
  const q = s => `document.querySelector('${s}')`;

  console.log('① 调查员：红色预警点提交拦截与复核确认');
  await evalJs(`[...document.querySelectorAll('.nav-tab')].find(b => b.textContent.includes('审核')).click()`);
  await sleep(600);
  // 选 YH-0001（待核查红色点，在已办列表里）
  await evalJs(`[...document.querySelectorAll('.seg button')][1].click()`);
  await sleep(400);
  await evalJs(`[...document.querySelectorAll('.wo-item')].find(e => e.textContent.includes('YH-0001'))?.click()`);
  await sleep(500);
  let h = await evalJs(`document.querySelector('.detail-title')?.textContent`);
  check('打开 YH-0001 详情', h && h.includes('YH-0001'), h);
  // 直接点提交审核（红色未复核），应被 toast 拦截
  await evalJs(`[...document.querySelectorAll('.action-bar .btn')].find(b => b.textContent.includes('提交审核'))?.click()`);
  await sleep(400);
  let toast1 = await evalJs(`${q('.toast')}?.textContent`);
  check('未复核提交被拦截', toast1 && toast1.includes('复核'), toast1);
  // 复核确认
  await evalJs(`[...document.querySelectorAll('.action-bar .btn')].find(b => b.textContent.includes('现场复核确认'))?.click()`);
  await sleep(400);
  let confirmed = await evalJs(`JSON.parse(localStorage.getItem('geo-hazard-system-v1')).hazards.find(x=>x.code==='YH-0001').recheckConfirmed`);
  check('复核确认已持久化', confirmed === true);
  // 提交审核
  await evalJs(`[...document.querySelectorAll('.action-bar .btn')].find(b => b.textContent.includes('提交审核'))?.click()`);
  await sleep(400);
  let st1 = await evalJs(`JSON.parse(localStorage.getItem('geo-hazard-system-v1')).hazards.find(x=>x.code==='YH-0001').status`);
  check('提交后状态=待审核', st1 === '待审核', st1);

  console.log('② 审核员：退回 → 调查员补证 → 再审通过派单');
  await evalJs(`document.querySelector('.role-select').value='reviewer'; document.querySelector('.role-select').dispatchEvent(new Event('change'))`);
  await sleep(500);
  await evalJs(`[...document.querySelectorAll('.seg button')][0].click()`);
  await sleep(400);
  await evalJs(`[...document.querySelectorAll('.wo-item')].find(e => e.textContent.includes('YH-0001'))?.click()`);
  await sleep(400);
  // 退回
  await evalJs(`[...document.querySelectorAll('.action-bar .btn')].find(b => b.textContent.includes('退回'))?.click()`);
  await sleep(400);
  await evalJs(`${q('.modal textarea')}.value='测试：补坡脚照片与撤离路线'; ${q('.modal textarea')}.dispatchEvent(new Event('input',{bubbles:true}))`);
  await evalJs(`[...document.querySelectorAll('.modal-foot .btn')].find(b => b.textContent.includes('确认退回'))?.click()`);
  await sleep(500);
  let st2 = await evalJs(`JSON.parse(localStorage.getItem('geo-hazard-system-v1')).hazards.find(x=>x.code==='YH-0001').status`);
  check('退回后状态=已退回', st2 === '已退回', st2);
  // 调查员补证
  await evalJs(`document.querySelector('.role-select').value='investigator'; document.querySelector('.role-select').dispatchEvent(new Event('change'))`);
  await sleep(400);
  await evalJs(`[...document.querySelectorAll('.seg button')][1].click()`);
  await sleep(400);
  await evalJs(`[...document.querySelectorAll('.wo-item')].find(e => e.textContent.includes('YH-0001'))?.click()`);
  await sleep(400);
  // 无照片无路线时重提应失败（先触发照片校验）
  await evalJs(`[...document.querySelectorAll('.action-bar .btn')].find(b => b.textContent.includes('重新提交'))?.click()`);
  await sleep(400);
  let toast2 = await evalJs(`${q('.toast')}?.textContent`);
  check('缺材料重提被拦截', toast2 && (toast2.includes('照片') || toast2.includes('撤离路线')), toast2);
  // 补路线（详情内输入框）并注入一张照片
  await evalJs(`(() => {
    const data = JSON.parse(localStorage.getItem('geo-hazard-system-v1'));
    const hz = data.hazards.find(x => x.code === 'YH-0001');
    hz.photos.push('data:image/svg+xml,补拍'); hz.evacuationRoute = '沿村道东行至安置点';
    localStorage.setItem('geo-hazard-system-v1', JSON.stringify(data));
  })()`);
  await send('Page.reload'); await sleep(4000);
  await evalJs(`[...document.querySelectorAll('.nav-tab')].find(b => b.textContent.includes('审核')).click()`);
  await sleep(500);
  await evalJs(`[...document.querySelectorAll('.seg button')][1].click()`);
  await sleep(400);
  await evalJs(`[...document.querySelectorAll('.wo-item')].find(e => e.textContent.includes('YH-0001'))?.click()`);
  await sleep(400);
  await evalJs(`[...document.querySelectorAll('.action-bar .btn')].find(b => b.textContent.includes('重新提交'))?.click()`);
  await sleep(500);
  let st3 = await evalJs(`JSON.parse(localStorage.getItem('geo-hazard-system-v1')).hazards.find(x=>x.code==='YH-0001').status`);
  check('补证后重提=待审核', st3 === '待审核', st3);
  // 审核通过派单（7天）
  await evalJs(`document.querySelector('.role-select').value='reviewer'; document.querySelector('.role-select').dispatchEvent(new Event('change'))`);
  await sleep(400);
  await evalJs(`[...document.querySelectorAll('.seg button')][0].click()`);
  await sleep(400);
  await evalJs(`[...document.querySelectorAll('.wo-item')].find(e => e.textContent.includes('YH-0001'))?.click()`);
  await sleep(400);
  await evalJs(`[...document.querySelectorAll('.action-bar .btn')].find(b => b.textContent.includes('确认并生成'))?.click()`);
  await sleep(500);
  const afterApprove = await evalJs(`(() => { const h = JSON.parse(localStorage.getItem('geo-hazard-system-v1')).hazards.find(x=>x.code==='YH-0001'); return { status: h.status, cycle: h.patrolCycle, due: h.nextDueAt }; })()`);
  check('审核通过派单', afterApprove.status === '已确认' && afterApprove.cycle === 7, JSON.stringify(afterApprove));
  check('生成下次巡查日期', !!afterApprove.due, afterApprove.due);

  console.log('③ 巡查员：打卡 + 新增裂缝触发复核');
  await evalJs(`document.querySelector('.role-select').value='patrol'; document.querySelector('.role-select').dispatchEvent(new Event('change'))`);
  await sleep(400);
  await evalJs(`[...document.querySelectorAll('.nav-tab')].find(b => b.textContent.includes('巡查')).click()`);
  await sleep(500);
  let cards = await evalJs(`document.querySelectorAll('.patrol-grid .card').length`);
  check('巡查任务卡片数≥3（含新派单）', cards >= 3, '实际 ' + cards);
  // 找到 YH-0001 卡片的打卡按钮
  await evalJs(`[...document.querySelectorAll('.patrol-grid .card')].find(c => c.textContent.includes('YH-0001'))?.querySelector('.btn.primary').click()`);
  await sleep(500);
  let modalOpen = await evalJs(`!!${q('.modal textarea')}`);
  check('打卡弹窗打开', modalOpen === true);
  // 勾选新增裂缝但不传照片 → 应拦截
  await evalJs(`${q('.modal textarea')}.value='坡体中部新增裂缝'; ${q('.modal textarea')}.dispatchEvent(new Event('input',{bubbles:true}))`);
  await evalJs(`document.querySelector('.modal .chk input').click()`);
  await sleep(300);
  await evalJs(`[...document.querySelectorAll('.modal-foot .btn')].find(b => b.textContent.includes('提交打卡'))?.click()`);
  await sleep(400);
  let toast3 = await evalJs(`${q('.toast')}?.textContent`);
  check('无照片裂缝上报被拦截', toast3 && toast3.includes('照片'), toast3);
  // 通过真实文件选择器注入一张图片再提交
  const injected = await evalJs(`(async () => {
    const blob = new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>'], { type: 'image/svg+xml' });
    const file = new File([blob], 'crack.svg', { type: 'image/svg+xml' });
    const dt = new DataTransfer(); dt.items.add(file);
    const input = document.querySelector('.modal-mask input[type=file]');
    input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 700));
    return document.querySelectorAll('.modal-mask .photo-thumb').length;
  })()`);
  check('现场照片经 FileReader 上传成功', injected >= 1, '缩略图 ' + injected);
  await evalJs(`[...document.querySelectorAll('.modal-foot .btn')].find(b => b.textContent.includes('提交打卡'))?.click()`);
  await sleep(600);
  const crackResult = await evalJs(`(() => { const h = JSON.parse(localStorage.getItem('geo-hazard-system-v1')).hazards.find(x=>x.code==='YH-0001'); return { status: h.status, newCrack: h.patrols[0].newCrack, hasPhoto: h.patrols[0].photos.length > 0, due: h.nextDueAt }; })()`);
  check('新增裂缝打卡后自动转待复核', crackResult.status === '待复核' && crackResult.newCrack && crackResult.hasPhoto, JSON.stringify(crackResult));

  console.log('④ 看板与台账数据一致性');
  await evalJs(`[...document.querySelectorAll('.nav-tab')].find(b => b.textContent.includes('看板')).click()`);
  await sleep(1800);
  const dash = await evalJs(`[...document.querySelectorAll('.kpi-num')].map(e => e.textContent)`);
  check('看板 5 个 KPI 均有值', dash.length === 5 && dash.every(v => v !== ''), JSON.stringify(dash));
  await evalJs(`[...document.querySelectorAll('.nav-tab')].find(b => b.textContent.includes('台账')).click()`);
  await sleep(600);
  let rows = await evalJs(`document.querySelectorAll('.ledger-view .table tbody tr').length`);
  check('台账 6 行隐患点', rows === 6, '实际 ' + rows);

  console.log('⑤ 历史追溯完整性');
  const hist = await evalJs(`JSON.parse(localStorage.getItem('geo-hazard-system-v1')).hazards.find(x=>x.code==='YH-0001').history.map(e=>e.action)`);
  const need = ['圈定隐患点', '红色复核确认', '提交审核', '审核退回', '补充材料并重新提交', '审核通过'];
  const covered = need.every(n => hist.some(x => x.includes(n)));
  check('YH-0001 全流程历史可追溯（6 个关键节点）', covered, JSON.stringify(hist));
  const everyHasUser = await evalJs(`JSON.parse(localStorage.getItem('geo-hazard-system-v1')).hazards.every(h => h.history.every(e => e.at && e.by))`);
  check('每条变更均记录人和时间', everyHasUser === true);

  console.log('\n浏览器异常:', errors.length, errors.join('; '));
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
  ws.close(); chrome.kill();
  process.exit(fail || errors.length ? 1 : 0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
