import puppeteer from 'puppeteer-core';
const views = [
  ['dashboard', '课程总览', 'A'],
  ['builder', '出题建课', 'B'],
  ['review', '人工复核', 'C'],
  ['train', '布点实训', 'D'],
  ['result', '成绩与错题', 'E'],
  ['reports', '结课报表', 'F'],
  ['admin', '后台维护', 'G'],
];
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'],
  defaultViewport: { width: 1680, height: 1000, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
const logs = [];
page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') logs.push('[err] ' + m.text().slice(0, 160)); });
await page.evaluateOnNewDocument(() => localStorage.clear());
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 900));
for (const [id, label, tag] of views) {
  await page.evaluate((label) => {
    const b = [...document.querySelectorAll('.nav-item')].find(x => x.textContent.includes(label));
    b?.click();
  }, label);
  await new Promise(r => setTimeout(r, 1800));
  await page.screenshot({ path: `shots/final-${tag}-${id}.png` });
}
console.log(JSON.stringify({ logs }, null, 1));
await browser.close();
