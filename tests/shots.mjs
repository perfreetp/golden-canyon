// 页面截图：node tests/shots.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('dialog', d => d.accept().catch(() => {}));
await page.goto('http://127.0.0.1:5173');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector('aside nav');
await page.getByRole('button', { name: '载入演示数据' }).click();
await page.waitForTimeout(400);

const shots = [
  ['馆长看板', '馆长看板', 'dashboard'],
  ['藏品档案', '藏品档案', 'figures'],
  ['展陈设计', '展陈设计', 'cabinet'],
  ['灯光与紫外线', '灯光与紫外线', 'lighting'],
  ['养护计划', '养护计划', 'maintenance'],
  ['借展流转', '借展流转', 'loans']
];
for (const [, nav, name] of shots) {
  await page.getByRole('button', { name: nav }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `tests/shot-${name}.png`, fullPage: true });
  console.log('saved', name);
}
await browser.close();
