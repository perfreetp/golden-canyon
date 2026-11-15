import puppeteer from 'puppeteer-core';
import fs from 'fs';
const outDir = 'shots';
fs.mkdirSync(outDir, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'],
  defaultViewport: { width: 1680, height: 1000 },
});
const logs = [];
const page = await browser.newPage();
page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') logs.push('[err] ' + m.text().slice(0,140)); });
await page.evaluateOnNewDocument(() => localStorage.clear());
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 900));

const views = [['课程总览','1-dashboard'],['出题建课','2-builder'],['人工复核','3-review'],['布点实训','4-training'],['成绩与错题','5-result'],['结课报表','6-reports'],['后台维护','7-admin']];
for (const [label, name] of views) {
  await page.evaluate((l) => [...document.querySelectorAll('.nav-item')].find(x => x.textContent.includes(l)).click(), label);
  await new Promise(r => setTimeout(r, 1700));
  await page.screenshot({ path: `${outDir}/${name}.png` });
}

// Train: place all then top view + symmetry
await page.evaluate(() => [...document.querySelectorAll('.nav-item')].find(x => x.textContent.includes('布点实训')).click());
await new Promise(r => setTimeout(r, 1200));
await page.evaluate(async () => {
  for (const c of document.querySelectorAll('.lead-chip')) { c.click(); await new Promise(r => setTimeout(r, 40)); }
});
await new Promise(r => setTimeout(r, 1500));
await page.evaluate(() => [...document.querySelectorAll('.vbtn')].find(b => b.textContent === '俯视')?.click());
await new Promise(r => setTimeout(r, 1800));
await page.evaluate(() => document.querySelector('.vbtn.sym')?.click());
await new Promise(r => setTimeout(r, 700));
await page.screenshot({ path: `${outDir}/4b-training-symmetry.png` });

// Spacing violation demo
await page.evaluate(async () => {
  const st = document.querySelectorAll('.lead-chip');
  // move one electrode onto another via the exposed DOM-free path: click then drag is hard; skip
});
console.log(JSON.stringify({ logs }, null, 1));
await browser.close();
