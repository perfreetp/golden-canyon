// 轻量 CDP 冒烟测试：加载各 hash 路由，收集 console 错误与页面异常，输出截图清单
const BASE = 'http://127.0.0.1:5176/';
const ROUTES = [
  { hash: '#/', name: 'dashboard' },
  { hash: '#/review', name: 'review-list' },
  { hash: '#/admin', name: 'admin' },
  { hash: '#/stats', name: 'stats' },
  { hash: '#/editor/doc-001', name: 'editor' },
  { hash: '#/review/doc-002', name: 'review-detail' },
  { hash: '#/share/shr-a1b2c3d4', name: 'patient-3d' },
];

const list = await (await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(list.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const errors = [];
const messages = [];

function send(method, params = {}) {
  return new Promise((resolve) => {
    const mid = ++id;
    pending.set(mid, resolve);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
}

await new Promise((r) => (ws.onopen = r));
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
  }
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    errors.push(msg.params.args.map((a: { value?: unknown; description?: string }) => a.description ?? String(a.value)).join(' '));
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    errors.push('EXCEPTION: ' + (msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text));
  }
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'log') {
    messages.push(msg.params.args.map((a: { value?: unknown }) => String(a.value)).join(' '));
  }
};

await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
// 隔离：清空 localStorage，统一从种子数据渲染
await send('Page.navigate', { url: BASE });
await new Promise((r) => setTimeout(r, 800));
await send('Runtime.evaluate', { expression: 'localStorage.clear()' });

const results = [];
for (const route of ROUTES) {
  errors.length = 0;
  await send('Page.navigate', { url: BASE + route.hash });
  await new Promise((r) => setTimeout(r, 2500));
  const dims = await send('Runtime.evaluate', {
    expression: `(() => {
      const host = document.querySelector('app-root');
      const root = host && host.shadowRoot;
      return {
        hasApp: !!host,
        childTags: root ? Array.from(root.children).map((c) => c.tagName.toLowerCase()) : [],
        text: root ? root.textContent.slice(0, 120) : 'NO SHADOW ROOT',
        canvasCount: root ? root.querySelectorAll('canvas').length : 0,
        svgCount: root ? root.querySelectorAll('svg').length : 0,
        bodyHeight: document.body.scrollHeight,
      };
    })()`,
    returnByValue: true,
  });
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const fs = await import('node:fs');
  const out = `tests/shots/${route.name}.png`;
  fs.mkdirSync('tests/shots', { recursive: true });
  fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
  results.push({ route: route.name, errors: [...errors], dom: dims.result.value, shot: out });
}

console.log(JSON.stringify(results, null, 2));
const totalErrors = results.reduce((n, r) => n + r.errors.length, 0);
console.log(`\nTOTAL CONSOLE ERRORS: ${totalErrors}`);
ws.close();
process.exit(totalErrors ? 1 : 0);
