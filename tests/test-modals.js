// node test-modals.js — 截图录入表单与撤离明白卡
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--no-sandbox', '--remote-debugging-port=9343', '--window-size=1600,950', '--user-data-dir=D:/ccfb/runs/10365/workspace/.chrome-modal', 'about:blank']);
const get = p => new Promise((res, rej) => http.get({ host: '127.0.0.1', port: 9343, path: p }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d))); }).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let tabs;
  for (let i = 0; i < 30; i++) { try { tabs = await get('/json'); break; } catch { await sleep(300); } }
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  let id = 0; const pend = new Map(); const errs = [];
  const send = (m, p = {}) => new Promise(r => { const mid = ++id; pend.set(mid, r); ws.send(JSON.stringify({ id: mid, method: m, params: p })); });
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.text); };
  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.navigate', { url: 'http://localhost:8731/index.html' });
  await sleep(5000);
  const ev = async x => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result.value;
  const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(n, Buffer.from(r.data, 'base64')); console.log('saved', n); };

  // 录入弹窗：直接构造一个红色预警圈定点（用 GeoScene 数学 + 触发 store 录入前的表单）
  // 走真实 UI：切到三维，点圈定按钮，通过模拟 onDrawComplete 不易；改为直接调用应用暴露的表单不现实。
  // 方案：选一个红色点 YH-0001 打开详情后点"编辑判读信息"，得到录入表单（含红色预警横幅）
  await ev(`[...document.querySelectorAll('.hazard-card')].find(c=>c.textContent.includes('YH-0001'))?.click()`);
  await sleep(400);
  await ev(`document.querySelector('.tool-group .btn:last-child')?.click()`);
  await sleep(500);
  await ev(`[...document.querySelectorAll('.action-bar .btn')].find(b=>b.textContent.includes('编辑判读信息'))?.click()`);
  await sleep(600);
  await shot('../docs/screenshots/shot-8-form.png');
  await ev(`document.querySelector('.modal-foot .btn')?.click()`); // 取消
  await sleep(400);

  // 明白卡：台账视图，点第一行明白卡
  await ev(`[...document.querySelectorAll('.nav-tab')].find(b => b.textContent.includes('台账')).click()`);
  await sleep(600);
  await ev(`document.querySelector('.table tbody tr .btn-mini')?.click()`);
  await sleep(700);
  await shot('../docs/screenshots/shot-9-card.png');

  console.log('errors:', errs.length, errs.join(';'));
  ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
