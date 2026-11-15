// 端到端冒烟测试：node tests/e2e.smoke.mjs
// 验证核心业务链路：种子数据 → 陈列冲突 → 拖拽 → UV → 养护 → 借展流转 → 损伤登记 → 交接单
import { chromium } from 'playwright';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';

const BASE = 'http://127.0.0.1:5173';
const results = [];
function check(name, fn) { results.push({ name, fn }); }

let passed = 0;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('dialog', d => d.accept().catch(() => {}));

await page.goto(BASE);
// 保证每次运行从空库开始，避免种子数据追加累积
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector('aside nav');

// 1. 载入演示数据
await page.getByRole('button', { name: '载入演示数据' }).click();
await page.waitForTimeout(400);

await page.getByRole('button', { name: '馆长看板' }).click();
await page.waitForTimeout(300);
const kpiText = await page.locator('.kpi-grid').innerText();
check('看板 KPI 渲染藏品总数 8', () => assert.match(kpiText, /8/));
check('看板显示在展数量', () => assert.match(kpiText, /在展数量/));
check('看板显示超期未还指标', () => assert.match(kpiText, /超期未还/));

// 2. 藏品档案
await page.getByRole('button', { name: '藏品档案' }).click();
await page.waitForTimeout(200);
const figRows = await page.locator('table tbody tr').count();
check('藏品列表有 8 条记录', () => assert.equal(figRows, 8));
const heightText = await page.locator('table').innerText();
check('1:7 换算高度出现（1580/7≈226）', () => assert.match(heightText, /225\.7|226/));

// 3. 展陈设计与冲突
await page.getByRole('button', { name: '展陈设计' }).click();
await page.waitForTimeout(300);
const stage = await page.locator('.stage-card').textContent();
check('承重超限实时提示', () => assert.match(stage, /承重[\s\S]*超限/));
check('立面图上标注间距 20mm < 30', () => assert.match(stage, /间距 20mm/));
const sideText = await page.locator('.side').innerText();
check('间距不足 30mm 提示', () => assert.match(sideText, /低于 30mm/));
check('冲突标出两件藏品（机械少女+龙裔）', () => {
  assert.match(sideText, /机械少女 MK-II/);
  assert.match(sideText, /龙裔战士 重装/);
});
const conflictRects = await page.locator('svg.svg-cabinet .fig-rect.conflict').count();
check('SVG 中冲突手办红色虚线框 ≥2', () => assert.ok(conflictRects >= 2, `实际 ${conflictRects}`));

// 4. D3 拖拽：把待陈列区一件拖到层板（GK 白模已在底层，拖剩余的——演示数据全部已陈列，先撤下一件再拖回）
const beforeCount = await page.locator('.palette-item').count();
// 撤下清单中第一件
await page.locator('.loan-actions, .side button:has-text("撤下")').first().click();
await page.waitForTimeout(200);
const afterRemove = await page.locator('.palette-item').count();
check('撤下后待陈列区 +1', () => assert.equal(afterRemove, beforeCount + 1));
// 拖拽 palette 第一项到 SVG 中层区域
const palette = page.locator('.palette-item').first();
const svg = page.locator('svg.svg-cabinet');
const sb = await palette.boundingBox();
const vb = await svg.boundingBox();
await page.mouse.move(sb.x + 30, sb.y + 20);
await page.mouse.down();
await page.mouse.move(vb.x + vb.width * 0.45, vb.y + vb.height * 0.55, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(300);
const paletteAfterDrag = await page.locator('.palette-item').count();
check('D3 拖拽摆位成功，待陈列区恢复', () => assert.equal(paletteAfterDrag, beforeCount));

// 5. 灯光与紫外线
await page.getByRole('button', { name: '灯光与紫外线' }).click();
await page.waitForTimeout(400);
const lightText = await page.locator('main').innerText();
check('显示日剂量计算', () => assert.match(lightText, /日剂量/));
check('UV 超标换位建议出现（花嫁树脂件）', () => assert.match(lightText, /换位/));
const bars = await page.locator('.chart-host svg rect').count();
check('D3 柱状图渲染', () => assert.ok(bars >= 5, `rect 数 ${bars}`));

// 6. 养护
await page.getByRole('button', { name: '养护计划' }).click();
await page.waitForTimeout(200);
const maintText = await page.locator('main').innerText();
check('养护逾期任务标红', () => assert.match(maintText, /逾期/));
check('90 天周期说明', () => assert.match(maintText, /90 天/));

// 7. 借展流转
await page.getByRole('button', { name: '借展流转' }).click();
await page.waitForTimeout(300);
const loanText = await page.locator('main').innerText();
check('超期单据自动标黄', () => assert.match(loanText, /超期 \d+ 天/));
check('状态机按钮显示下一阶段', () => assert.match(loanText, /推进至：/));
// 待出库单据推进：在展 → 归还验收中（精确作用域到该单据卡片）
const card3Init = page.locator('.loan-card', { hasText: 'JZ-20261114-3' });
await card3Init.getByRole('button', { name: '推进至：在展' }).click();
await page.waitForTimeout(250);
const afterFirst = await page.locator('.loan-card', { hasText: 'JZ-20261114-3' }).innerText();
check('待出库 → 在展 流转成功', () => assert.match(afterFirst, /在展/));
// 推进到归还验收中以解锁损伤登记
await page.locator('.loan-card', { hasText: 'JZ-20261114-3' }).getByRole('button', { name: '推进至：归还验收中' }).click();
await page.waitForTimeout(250);
await page.locator('.loan-card', { hasText: 'JZ-20261114-3' }).getByRole('button', { name: '损伤登记' }).click();
await page.waitForTimeout(300);

// 8. 损伤登记：图上点选 + 模拟拍照（用 canvas 生成测试图）
await page.locator('.figure-canvas svg').click({ position: { x: 120, y: 90 } });
await page.waitForTimeout(150);
const spotCount = await page.locator('.figure-canvas svg circle').count();
check('图上点选生成损伤标记', () => assert.ok(spotCount >= 1));
// 上传测试图片（Node 端构造最小有效 JPEG）
const jpeg = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AvwA//9k=',
  'base64'
);
await page.setInputFiles('input[type=file][multiple]', { name: 'dmg.jpg', mimeType: 'image/jpeg', buffer: jpeg });
await page.waitForTimeout(500);
const photoCount = await page.locator('.photo-wrap').count();
check('损伤照片留档上传成功', () => assert.equal(photoCount, 1));
await page.getByRole('button', { name: '提交损伤登记并留档' }).click();
await page.waitForTimeout(300);
const afterDmg = await page.locator('main').innerText();
check('损伤登记回写到借展单', () => assert.match(afterDmg, /已登记 1 条损伤记录/));

// 9. 交接单导出：拦截下载
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.locator('.loan-card', { hasText: 'JZ-20261114-3' }).getByRole('button', { name: '导出交接单' }).click()
]);
const fname = download.suggestedFilename();
check('交接单 HTML 下载触发', () => assert.match(fname, /借展交接单.*\.html/));
const handoverPath = await download.path();
const handoverContent = await readFile(handoverPath, 'utf8');
check('交接单含明细、瑕疵表与签字栏', () => {
  assert.match(handoverContent, /藏品借展交接单/);
  assert.match(handoverContent, /JZ-20261114-3/);
  assert.match(handoverContent, /归还验收损伤登记/);
  assert.match(handoverContent, /签字/);
});

// 10. 数据持久化：刷新后仍在
await page.reload();
await page.waitForTimeout(400);
const persisted = await page.locator('main').innerText();
check('localStorage 持久化（刷新后仍见单据）', () => assert.match(persisted, /JZ-20261114-3/));

// 执行全部断言
let failed = 0;
for (const r of results) {
  try {
    await r.fn();
    console.log('✔', r.name);
    passed++;
  } catch (e) {
    failed++;
    console.log('✘', r.name, '—', e.message.split('\n')[0]);
    await page.screenshot({ path: `tests/fail-${failed}.png`, fullPage: true }).catch(() => {});
  }
}
console.log(`\n${passed}/${results.length} 通过`);
if (errors.length) {
  console.log('\n浏览器错误:');
  console.log([...new Set(errors)].slice(0, 10).join('\n'));
}
await browser.close();
process.exit(passed === results.length && errors.filter(e => !e.includes('favicon')).length === 0 ? 0 : 1);
