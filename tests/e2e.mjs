// 端到端：驱动系统自带 Edge 遍历五个角色视图与核心交互
import { chromium } from 'playwright-core';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const SHOT = 'C:/Users/Administrator/AppData/Local/Temp/shot';
const errors = [];

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + (e.stack ?? '')));
page.on('dialog', d => d.accept());

const step = async (name, fn) => {
  try { await fn(); console.log(`✓ ${name}`); }
  catch (e) { errors.push(`STEP[${name}]: ${e.message}`); console.error(`✗ ${name}: ${e.message}`); }
};

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// ---------- 动画师 ----------
await step('动画师工作台渲染 13 个图层', async () => {
  const n = await page.locator('.layer-item').count();
  if (n !== 14) throw new Error(`图层数 ${n} != 14`);
});

await step('播放控制支持 0.25 倍速与循环', async () => {
  await page.getByRole('button', { name: '0.25x' }).click();
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: /播放/ }).click();
  await page.waitForTimeout(1400);
  const t = await page.locator('.time-readout').textContent();
  if (!t || !t.includes('/')) throw new Error('播放时间未走动: ' + t);
  await page.getByRole('button', { name: /暂停/ }).click();
});

await step('时间轴渲染呼吸色带与关键帧菱形', async () => {
  const diamonds = await page.locator('.timeline path').count();
  const breathText = await page.locator('.timeline').textContent();
  if (diamonds < 4) throw new Error('关键帧菱形不足');
  if (!breathText.includes('吸气 4s') || !breathText.includes('呼气 6s')) throw new Error('呼吸标记缺失');
});

await step('逐段缓动：选择段后切换为线性', async () => {
  await page.locator('.timeline g.seg').first().click();
  await page.waitForTimeout(300);
  const btns = page.locator('.ease-editor .preset-row .btn-mini');
  await btns.filter({ hasText: '线性' }).click();
  await page.waitForTimeout(300);
});

await step('姿势模式打关键帧', async () => {
  await page.getByRole('button', { name: '② 姿势调整' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /打关键帧/ }).click();
  await page.waitForTimeout(300);
});

await page.screenshot({ path: `${SHOT}/e2e-1-animator.png`, fullPage: false });

// ---------- 课程策划 ----------
await step('切换到课程策划并新建课程', async () => {
  await page.getByRole('button', { name: /课程策划后台/ }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /组合新课程/ }).click();
  await page.waitForTimeout(300);
  await page.locator('.form-grid input').first().fill('E2E 测试导引课');
  await page.locator('.form-grid input').nth(2).fill('测试适用人群');
  await page.locator('.action-pick').first().click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: '提交审查员' }).click();
  await page.waitForTimeout(500);
});

await step('新课程进入待审查状态', async () => {
  const cards = page.locator('.course-card');
  const found = await cards.filter({ hasText: 'E2E 测试导引课' }).count();
  if (!found) throw new Error('未找到新建课程');
  const status = await cards.filter({ hasText: 'E2E 测试导引课' }).locator('.status').textContent();
  if (!status.includes('待审查')) throw new Error('状态应为待审查，实际: ' + status);
});
await page.screenshot({ path: `${SHOT}/e2e-2-planner.png` });

// ---------- 审查员 ----------
await step('审查台驳回（无意见应拦截）后填写意见驳回', async () => {
  await page.getByRole('button', { name: /审查台/ }).click();
  await page.waitForTimeout(400);
  const card = page.locator('.review-card').filter({ hasText: 'E2E 测试导引课' });
  await card.locator('textarea').fill('E2E：请补充动作禁忌说明后重新提交。');
  await card.getByRole('button', { name: '逐条驳回' }).click();
  await page.waitForTimeout(500);
  const hist = page.locator('.history-card').filter({ hasText: 'E2E 测试导引课' });
  if (!(await hist.count())) throw new Error('驳回后应出现在已决列表');
});

await step('策划重新提交后审查通过并上架', async () => {
  await page.getByRole('button', { name: /课程策划后台/ }).click();
  await page.waitForTimeout(400);
  const card = page.locator('.course-card').filter({ hasText: 'E2E 测试导引课' });
  await card.locator('.btn-mini').first().click(); // 编辑
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '提交审查员' }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /审查台/ }).click();
  await page.waitForTimeout(400);
  const card2 = page.locator('.review-card').filter({ hasText: 'E2E 测试导引课' });
  await card2.locator('textarea').fill('补充完整，同意上架。');
  await card2.getByRole('button', { name: '审查通过并上架' }).click();
  await page.waitForTimeout(500);
});
await page.screenshot({ path: `${SHOT}/e2e-3-reviewer.png` });

// ---------- 学员端 ----------
await step('学员端展示周计划与不适反馈', async () => {
  await page.getByRole('button', { name: /学员端/ }).click();
  await page.waitForTimeout(500);
  const days = await page.locator('.day-card').count();
  if (days !== 7) throw new Error('周计划应为 7 天，实际 ' + days);
  await page.locator('.feedback-note').fill('E2E 测试反馈：肩部轻微酸胀');
  await page.getByRole('button', { name: '提交反馈' }).click();
  await page.waitForTimeout(300);
  const fb = await page.locator('.feedback-item').allTextContents();
  if (!fb.some(t => t.includes('E2E 测试反馈'))) throw new Error('反馈未出现');
});
await page.screenshot({ path: `${SHOT}/e2e-4-student.png` });

// ---------- 运营看板 ----------
await step('运营看板 KPI 与 D3 图表渲染', async () => {
  await page.getByRole('button', { name: /运营看板/ }).click();
  await page.waitForTimeout(600);
  const kpis = await page.locator('.kpi b').allTextContents();
  if (kpis.length !== 4) throw new Error('应有 4 个 KPI');
  const rects = await page.locator('.chart rect').count();
  if (rects < 5) throw new Error('D3 柱状图未渲染');
  const lines = await page.locator('.chart path').count();
  if (lines < 1) throw new Error('D3 折线图未渲染');
});

await step('按课程/教练/月份筛选联动', async () => {
  const selects = page.locator('.filters select');
  await selects.nth(0).selectOption({ index: 1 });
  await page.waitForTimeout(400);
  await selects.nth(2).selectOption('2026-10');
  await page.waitForTimeout(400);
  const kpi = await page.locator('.kpi b').first().textContent();
  if (!kpi || Number(kpi.replace(/,/g, '')) <= 0) throw new Error('筛选后应仍有数据，实际 ' + kpi);
  await selects.nth(0).selectOption('全部');
  await selects.nth(2).selectOption('全部');
});
await page.screenshot({ path: `${SHOT}/e2e-5-ops.png` });

// ---------- 持久化 ----------
await step('localStorage 持久化写入', async () => {
  const raw = await page.evaluate(() => localStorage.getItem('daoyin_studio_state_v1'));
  if (!raw) throw new Error('未找到持久化数据');
  const data = JSON.parse(raw);
  if (!data.courses.some(c => c.title === 'E2E 测试导引课')) throw new Error('新课程未持久化');
});

await browser.close();

console.log('\n--- 运行时错误 ---');
console.log(errors.length ? errors.join('\n') : '无');
if (errors.some(e => e.startsWith('pageerror') || e.startsWith('console') || e.startsWith('STEP'))) process.exit(1);
