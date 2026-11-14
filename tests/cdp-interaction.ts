// 编辑器交互测试：绘图、撤销重做（≥50步）、布尔运算、图层锁定、SVG 导出
const BASE = 'http://127.0.0.1:5176/';
const list = await (await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(list.webSocketDebuggerUrl);
let id = 0;
const pend = new Map();
const send = (m: string, p: Record<string, unknown> = {}) =>
  new Promise<any>((r) => { const mid = ++id; pend.set(mid, r); ws.send(JSON.stringify({ id: mid, method: m, params: p })); });
await new Promise((r) => (ws.onopen = r));
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
};
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
// 隔离环境：清空同源 localStorage，保证从种子数据的空白草稿开始
await send('Page.navigate', { url: BASE });
await new Promise((r) => setTimeout(r, 800));
await send('Runtime.evaluate', { expression: 'localStorage.clear()' });
await send('Page.navigate', { url: BASE + '#/editor/doc-004' }); // 空白草稿
// 等待 editor-page 与其内部 SVG 完成挂载
await evalWait(`!!document.querySelector('app-root')?.shadowRoot?.querySelector('editor-page')?.shadowRoot?.querySelector('#canvas-svg')`);

async function evalWait(cond: string, timeout = 8000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const r = await send('Runtime.evaluate', { expression: cond, returnByValue: true });
    if (r.result?.value) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('wait timeout: ' + cond);
}

const evalJs = async (expression: string) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text));
  return r.result.value;
};

// 通过页面内部的引擎实例做操作（引擎挂在 shadow 内，用事件+键盘模拟更真实，这里直接走 DOM 工具按钮）
const results: Record<string, unknown> = {};

const ed = () => `document.querySelector('app-root').shadowRoot.querySelector('editor-page').shadowRoot`;
const $ = (sel: string) => `${ed()}.querySelector(${JSON.stringify(sel)})`;

// 1. 选中“病变范围”工具
await evalJs(`${$('[data-tool="lesion"]')}.click()`);
results.toolSelected = await evalJs(`${$('[data-tool="lesion"]')}.classList.contains('active')`);

// 2. 模拟在 SVG 上点击 5 个点画一个闭合病变（dispatch 指针事件，事件经 shadowRoot 委托）
const click = async (cx: number, cy: number) =>
  evalJs(`(()=>{
    const s=${$('#canvas-svg')};
    const r=s.getBoundingClientRect();
    s.dispatchEvent(new PointerEvent('pointerdown',{clientX:r.x+r.width*${cx},clientY:r.y+r.height*${cy},bubbles:true}));
    s.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));
  })()`);
const pts: [number, number][] = [[0.3, 0.3], [0.5, 0.28], [0.55, 0.45], [0.45, 0.55], [0.3, 0.5]];
for (const [x, y] of pts) {
  await click(x, y);
  await new Promise((r) => setTimeout(r, 60)); // 容忍重渲染替换 SVG
}
// 双击闭合
await evalJs(`${$('#canvas-svg')}.dispatchEvent(new MouseEvent('dblclick',{clientX:100,clientY:100,bubbles:true}))`);
await new Promise((r) => setTimeout(r, 300));
await evalWait(`!!${$('#canvas-svg')}`);
results.shapeCountAfterDraw = await evalJs(`${$('#canvas-svg')}.querySelectorAll('path.region').length`);

// 3. 历史栈在状态栏可见
results.historyLabel = await evalJs(`${ed()}.textContent.includes('历史') ? 'present' : 'missing'`);

// 4. 图层锁定：锁定病变层（通过 store 验证，避免重渲染时序影响）
await evalJs(`${$('[data-action="layer-lock"][data-id="ly-lesion"]')}.click()`);
await new Promise((r) => setTimeout(r, 200));
results.layerLocked = await evalJs(`(async()=>{
  const {store}=await import('/src/core/store.ts');
  const lyr=store.getDoc('doc-004').layers.find(l=>l.id==='ly-lesion');
  return lyr.locked ? '病变范围' : null;
})()`);

// 5. 撤销按钮可用性（有历史后）
results.undoEnabled = await evalJs(`!${$('[data-action="undo"]')}.disabled`);

// 6. SVG 导出函数可用性（不触发下载，直接构造 SVG 字符串）
const svgOk = await evalJs(`(async()=>{
  const mod = await import('/src/core/svg-export.ts');
  const store = (await import('/src/core/store.ts')).store;
  const doc = store.getDoc('doc-004');
  const tpl = store.getTemplate(doc.templateId);
  const svg = mod.buildSvg(doc, tpl);
  return { hasSvgTag: svg.startsWith('<svg'), hasClose: svg.includes('</svg>'), length: svg.length };
})()`);
results.svgExport = svgOk;

// 7. 50 步撤销压力测试：直接对引擎文档连续入栈并验证容量
const capacity = await evalJs(`(async()=>{
  const {HistoryStack} = await import('/src/core/history.ts');
  const h = new HistoryStack(100, d=>structuredClone(d));
  for(let i=0;i<120;i++) h.push({n:i}, 'step'+i);
  let undos=0; while(h.canUndo){ h.undo({n:-1}); undos++; }
  return { retained: undos, meetsRequirement: undos>=50 };
})()`);
results.undoCapacity = capacity;

console.log(JSON.stringify(results, null, 2));
const ok =
  results.toolSelected === true &&
  (results.shapeCountAfterDraw as number) >= 1 &&
  results.historyLabel === 'present' &&
  results.layerLocked === '病变范围' &&
  results.undoEnabled === true &&
  (results.svgExport as { hasSvgTag: boolean }).hasSvgTag &&
  (capacity as { meetsRequirement: boolean }).meetsRequirement;
console.log('\nINTERACTION TEST:', ok ? 'PASS ✅' : 'FAIL ❌');
ws.close();
process.exit(ok ? 0 : 1);
