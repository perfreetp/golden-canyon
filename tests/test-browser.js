// node test-browser.js — 通过 CDP 驱动无头 Chrome，捕获 console 错误并验证运行时状态
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9333;
const userDir = 'D:\\ccfb\\runs\\10365\\workspace\\.chrome-profile';

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu=false', '--no-sandbox',
  '--remote-debugging-port=' + PORT, '--window-size=1600,950',
  '--user-data-dir=' + userDir, 'about:blank'
]);

function get(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: PORT, path }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let tabs;
  for (let i = 0; i < 30; i++) {
    try { tabs = await get('/json'); break; } catch { await sleep(300); }
  }
  if (!tabs) { console.error('Chrome DevTools 未就绪'); process.exit(1); }
  const tab = tabs.find(t => t.type === 'page');
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const logs = [];
  const send = (method, params = {}) => new Promise(resolve => {
    const mid = ++id;
    pending.set(mid, resolve);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      logs.push('CONSOLE.ERROR: ' + msg.params.args.map(a => a.value || a.description || '').join(' '));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      logs.push('UNCAUGHT: ' + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text));
    }
  };

  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: 'http://localhost:8731/index.html' });
  await sleep(6000);

  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    if (r.exceptionDetails) return { __error: r.exceptionDetails.text };
    return r.result.value;
  };

  const state = await evalJs(`(() => {
    const app = document.querySelector('#app').__vue_app__;
    const canvas = document.querySelector('canvas');
    const gl = canvas ? canvas.getContext('webgl2') || canvas.getContext('webgl') : null;
    return {
      vueMounted: !!app,
      canvasSize: canvas ? [canvas.width, canvas.height] : null,
      hazardCards: document.querySelectorAll('.hazard-card').length,
      navTabs: document.querySelectorAll('.nav-tab').length,
      readPixels: gl ? (() => { const px = new Uint8Array(4); gl.readPixels(canvas.width/2|0, canvas.height/2|0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return Array.from(px); })() : null,
      nonBlankPixels: gl ? (() => {
        const w = Math.min(canvas.width, 200), h = Math.min(canvas.height, 200);
        const buf = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
        let nonBg = 0;
        for (let i = 0; i < buf.length; i += 4) {
          if (Math.abs(buf[i]-188) > 24 || Math.abs(buf[i+1]-212) > 24 || Math.abs(buf[i+2]-234) > 24) nonBg++;
        }
        return nonBg;
      })() : 0
    };
  })()`);
  console.log('页面状态:', JSON.stringify(state, null, 2));

  // 视图切换冒烟：逐一切到其余 4 个视图
  for (const v of ['review', 'patrol', 'dashboard', 'ledger']) {
    await evalJs(`[...document.querySelectorAll('.nav-tab')].find(b => b.textContent.includes('${ {review:'审核',patrol:'巡查',dashboard:'看板',ledger:'台账'}[v] }')).click()`);
    await sleep(1200);
  }
  const after = await evalJs(`(() => ({
    view: document.querySelector('.nav-tab.active').textContent.trim(),
    kpi: document.querySelectorAll('.kpi').length,
    tableRows: document.querySelectorAll('.table tbody tr').length,
    canvases: document.querySelectorAll('canvas').length,
    chartCanvas: !!document.querySelector('.chart-box canvas')
  }))()`);
  console.log('视图切换后:', JSON.stringify(after, null, 2));

  // 回到看板截图
  await sleep(500);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(require('path').join(__dirname, '..', 'docs', 'screenshots', 'smoke-dashboard.png'), Buffer.from(shot.data, 'base64'));

  console.log('\n浏览器错误日志 (' + logs.length + '):');
  logs.forEach(l => console.log('  ' + l));
  ws.close();
  chrome.kill();
  process.exit(logs.length ? 2 : 0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
