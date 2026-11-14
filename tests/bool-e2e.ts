const BASE='http://127.0.0.1:5176/';
const list = await (await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(list.webSocketDebuggerUrl);
let id=0; const pend=new Map(); const errs=[];
const send=(m,p={})=>new Promise(r=>{const mid=++id;pend.set(mid,r);ws.send(JSON.stringify({id:mid,method:m,params:p}));});
await new Promise(r=>ws.onopen=r);
ws.onmessage=(e)=>{const m=JSON.parse(e.data);
  if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result);pend.delete(m.id);}
  if(m.method==='Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
};
const ev=async expr=>{const r=await send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await send('Page.navigate',{url:BASE}); await new Promise(r=>setTimeout(r,600));
await send('Runtime.evaluate',{expression:'localStorage.clear()'});
await send('Page.navigate',{url:BASE}); await new Promise(r=>setTimeout(r,800));
// 新建一份文档并进入编辑器
const docId = await ev("(async function(){var s=await import('/src/core/store.ts');var d=s.store.createDoc({title:'布尔测试'});return d.id;})()");
await send('Page.navigate',{url:BASE+'#/editor/'+docId});
await new Promise(r=>setTimeout(r,1800));
const H="document.querySelector('app-root').shadowRoot.querySelector('editor-page')";
const N="function(arr){return arr.map(function(p,i){return {id:'n'+i,x:p[0],y:p[1],smooth:.3};});}";
await ev("(function(){var e="+H+".engine; e.setTool('lesion'); e.draftNodes=("+N+")([[300,300],[420,300],[420,420],[300,420]]); e.commitDraft();})()");
await ev("(function(){var e="+H+".engine; e.setTool('eloquent'); e.draftNodes=("+N+")([[360,360],[480,360],[480,480],[360,480]]); e.commitDraft();})()");
const before = await ev(H+".engine.doc.shapes.length");
const out = await ev([
  "(function(){var h="+H+",e=h.engine,log=[];",
  "var regs=e.doc.shapes.filter(function(s){return s.kind==='region';});",
  "var a=regs[0],b=regs[1];",
  "e.select(a.id); e.booleanWith(b.id,'union');",
  "log.push(['unionPts', a.points.length, 'hasSource', !!a.booleanSource, 'sourceOp', a.booleanSource&&a.booleanSource.op]);",
  "e.setTool('lesion'); e.draftNodes=("+N+")([[320,320],[380,320],[380,400],[320,400]]); e.commitDraft();",
  "var c=e.doc.shapes.filter(function(s){return s.kind==='region';}).pop();",
  "var ptsBefore=a.points.length;",
  "e.select(a.id); e.booleanWith(c.id,'subtract');",
  "log.push(['subtractChanged', a.points.length!==ptsBefore, 'aPts', a.points.length, 'historyCanUndo', h.history.canUndo]);",
  "return log;})()"
].join(''));
console.log('shapes before bool:', before);
console.log(JSON.stringify(out,null,1));
console.log('ERRORS:', errs.length?errs.join(' | '):'none');
// out[0] = ['unionPts', n, 'hasSource', bool, 'sourceOp', 'union']
// out[1] = ['subtractChanged', bool, 'aPts', n, 'historyCanUndo', bool]
const unionOk = out[0][1] >= 6 && out[0][3] === true && out[0][5] === 'union';
const diffOk = out[1][1] === true && out[1][5] === true;
console.log('BOOLEAN E2E:', (errs.length === 0 && unionOk && diffOk) ? 'PASS ✅' : 'FAIL ❌');
ws.close(); process.exit((errs.length === 0 && unionOk && diffOk) ? 0 : 1);
