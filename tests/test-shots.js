// node test-shots.js — 逐视图截图（地形/坡度/审核/巡查/看板/台账）
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9334;
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu=false', '--no-sandbox',
  '--remote-debugging-port=' + PORT, '--window-size=1600,950',
  '--user-data-dir=D:\\ccfb\\runs\\10365\\workspace\\.chrome-shot', 'about:blank']);
const get = p => new Promise((res, rej) => http.get({ host: '127.0.0.1', port: PORT, path: p }, r => {
  let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

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
  await sleep(5500);

  const evalJs = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value;
  const shot = async name => {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(name, Buffer.from(r.data, 'base64'));
    console.log('saved', name);
  };
  const clickNav = kw => evalJs(`[...document.querySelectorAll('.nav-tab')].find(b => b.textContent.includes('${kw}')).click()`);
  const clickBtn = sel => evalJs(`document.querySelector('${sel}')?.click()`);

  // 1. 地形默认视图
  await shot('../docs/screenshots/shot-1-terrain.png');
  // 2. 坡度渲染 + 汇水线
  await clickBtn('.tool-group:nth-child(2) .btn:nth-child(3)');
  await evalJs(`document.querySelectorAll('.chk input')[1].click()`);
  await sleep(800);
  await shot('../docs/screenshots/shot-2-slope-flow.png');
  // 3. 审核视图
  await clickNav('审核'); await sleep(900);
  await evalJs(`document.querySelector('.wo-item')?.click()`); await sleep(700);
  await shot('../docs/screenshots/shot-3-review.png');
  // 4. 巡查视图
  await clickNav('巡查'); await sleep(900);
  await shot('../docs/screenshots/shot-4-patrol.png');
  // 5. 看板
  await clickNav('看板'); await sleep(1600);
  await shot('../docs/screenshots/shot-5-dashboard.png');
  // 6. 台账
  await clickNav('台账'); await sleep(800);
  await shot('../docs/screenshots/shot-6-ledger.png');
  // 7. 录入弹窗（先切调查员，回三维，圈定按钮存在即可验证表单——用直接打开已有详情模拟）
  await clickNav('三维'); await sleep(800);
  await evalJs(`document.querySelector('.hazard-card')?.click()`); await sleep(500);
  await clickBtn('.tool-group .btn:last-child'); await sleep(600);
  await shot('../docs/screenshots/shot-7-detail.png');

  console.log('errors:', errors.length, errors.join('; '));
  ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
