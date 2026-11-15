import puppeteer from 'puppeteer-core';
import fs from 'fs';

const url = process.argv[2] || 'http://127.0.0.1:5173/';
const out = process.argv[3] || 'shots/shot.png';
const actions = process.argv[4] || '';
const w = +(process.env.W || 1600), h = +(process.env.H || 960);

fs.mkdirSync(out.replace(/[\/][^\/]+$/, ''), { recursive: true });
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
         '--enable-webgl', '--ignore-gpu-blocklist', `--window-size=${w},${h}`],
  defaultViewport: { width: w, height: h, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.evaluateOnNewDocument(() => {
  if (!sessionStorage.getItem('__cleared')) {
    localStorage.removeItem('eeg1020.trainer.v1');
    sessionStorage.setItem('__cleared', '1');
  }
});
await page.goto(url, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 1600));
if (actions) {
  try {
    await page.evaluate(actions);
    await new Promise((r) => setTimeout(r, +(process.env.SETTLE || 3200)));
  } catch (e) { logs.push('[action-error] ' + e.message); }
}
await page.screenshot({ path: out, fullPage: false });
const gl = await page.evaluate(() => {
  const c = document.createElement('canvas');
  const g2 = c.getContext('webgl2');
  return { webgl2: !!g2, renderer: g2 ? g2.getParameter(g2.RENDERER) : null };
});
console.log(JSON.stringify({ gl, logs }, null, 1));
await browser.close();
