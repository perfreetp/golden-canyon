// 导出管线测试：真实点击导出，验证精灵图入库与下载文件生成
import { chromium } from 'playwright-core';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const DL = 'C:/Users/Administrator/AppData/Local/Temp/shot/downloads';
const errors = [];

const browser = await chromium.launch({
  executablePath: EDGE, headless: true,
  acceptDownloads: true,
});
const ctx = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  acceptDownloads: true,
});
const page = await ctx.newPage();
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('dialog', d => d.accept());

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const downloads = [];
page.on('download', async d => {
  const path = `${DL}/${d.suggestedFilename()}`;
  await d.saveAs(path);
  downloads.push(d.suggestedFilename());
});

// 选 8fps 减少帧数，真实导出
await page.locator('.export-panel select').selectOption('8');
await page.getByRole('button', { name: /导出 PNG/ }).click();

// 等待导出完成提示
await page.waitForSelector('.export-done', { timeout: 60000 });
const doneText = await page.locator('.export-done').textContent();
console.log('导出提示:', doneText);

// 课程库应出现新动作（种子 1 个 + 新导出 1 个 = 2）
await page.getByRole('button', { name: /课程库/ }).click();
await page.waitForTimeout(400);
const libCount = await page.locator('.lib-item').count();
console.log('课程库动作数:', libCount);

// 验证入库动作的精灵图是有效 PNG dataURL
const valid = await page.evaluate(() => {
  const raw = localStorage.getItem('daoyin_studio_state_v1');
  const data = JSON.parse(raw);
  const newest = data.actions[data.actions.length - 1];
  return {
    isPng: newest.spriteSheet?.startsWith('data:image/png') ?? false,
    atlas: newest.atlas,
    name: newest.name,
  };
});
console.log('入库精灵图:', JSON.stringify(valid));

await page.waitForTimeout(1500); // 等最后几张下载落盘
console.log(`下载文件数: ${downloads.length}，示例: ${downloads.slice(0, 3).join(', ')}${downloads.length > 3 ? ' …' : ''}`);

let ok = true;
if (libCount < 2) { console.error('✗ 课程库未新增动作'); ok = false; }
if (!valid.isPng) { console.error('✗ 精灵图不是有效 PNG dataURL'); ok = false; }
if (!valid.atlas?.cols || !valid.atlas?.count) { console.error('✗ atlas 元数据缺失'); ok = false; }
if (downloads.length < 3) { console.error('✗ 序列帧下载数量异常: ' + downloads.length); ok = false; }
if (!downloads.includes('spritesheet.png')) { console.error('✗ 缺少 spritesheet.png'); ok = false; }
if (errors.length) { console.error('运行时错误:', errors.join('\n')); ok = false; }

console.log(ok ? '\n✓ 导出管线全部通过' : '\n✗ 导出管线存在失败项');
await browser.close();
process.exit(ok ? 0 : 1);
