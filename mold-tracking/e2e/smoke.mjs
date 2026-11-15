// 端到端冒烟测试：puppeteer-core + 系统 Edge（SwiftShader 软渲染 WebGL）
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = 'http://localhost:5173/';
const results = [];
const check = (name, cond, extra = '') => {
  results.push({ name, ok: !!cond, extra: extra ? String(extra).slice(0, 220) : '' });
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`);
};

const btnByText = async (page, text, root = document_root()) => page.evaluateHandle((t) => {
  const btns = [...document.querySelectorAll('button')];
  return btns.find((b) => b.textContent.includes(t)) ?? null;
}, text);
function document_root() { return null; }

const clickBtn = async (page, text) => {
  const h = await btnByText(page, text);
  const el = h.asElement();
  if (!el) throw new Error(`找不到按钮: ${text}`);
  await el.click();
  await new Promise((r) => setTimeout(r, 250));
};

const state = async (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('mold-tracking-v1')));

// 1x1 PNG
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');
const tmpFile = path.resolve('./e2e/tmp-defect.png');
fs.mkdirSync(path.dirname(tmpFile), { recursive: true });
fs.writeFileSync(tmpFile, png);

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1600,1000'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 1000 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('favicon')) errors.push('console: ' + m.text());
});
page.on('response', (r) => {
  if (r.status() >= 400 && !r.url().includes('favicon')) errors.push('http ' + r.status() + ': ' + r.url());
});

try {
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.app', { timeout: 10000 });
  check('应用启动', true);

  // 工作台
  const dashText = await page.evaluate(() => document.querySelector('.content').innerText);
  check('工作台显示模具统计', dashText.includes('副模具'));
  check('工作台显示寿命红线拦截提醒', dashText.includes('排产拦截'));

  // 款式与分件 + three.js
  await clickBtn(page, '款式与分件');
  await page.waitForSelector('canvas', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1200));
  const canvasInfo = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return c ? { w: c.width, h: c.height } : null;
  });
  check('装配 3D 画布渲染', canvasInfo && canvasInfo.w > 0, JSON.stringify(canvasInfo));

  // 建开模单（p7 右腿件，待开模）
  await clickBtn(page, '建开模单');
  await page.waitForSelector('.modal');
  await clickBtn(page, '提交开模单');
  await new Promise((r) => setTimeout(r, 300));
  let s = await state(page);
  const newOrderCount = s.orders.length;
  check('开模单提交后分件进入待试模', newOrderCount === 12, `orders=${newOrderCount}`);
  const pageText1 = await page.evaluate(() => document.body.innerText);
  check('开模成功提示', pageText1.includes('开模单已建立'));

  // 试模：照片强制 + 修模方案强制
  await clickBtn(page, '试模管理');
  await page.waitForSelector('.tbl');
  await clickBtn(page, '登记试模');
  await page.waitForSelector('.modal canvas');
  await new Promise((r) => setTimeout(r, 800));
  // 不填照片直接添加
  await page.evaluate(() => {
    const ta = document.querySelector('.modal textarea');
    ta.value = '分型面飞边 0.2mm';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await clickBtn(page, '添加缺陷条目');
  let mt = await page.evaluate(() => document.querySelector('.modal .err')?.textContent ?? '');
  check('无照片被拦截', mt.includes('缺陷照片为必传项'), mt);
  // 上传照片
  const fileInput = await page.$('.modal input[type=file]');
  await fileInput.uploadFile(tmpFile);
  await page.waitForFunction(() => document.querySelector('.modal img.photo-thumb'), { timeout: 8000 });
  await clickBtn(page, '添加缺陷条目');
  await new Promise((r) => setTimeout(r, 200));
  check('带照片缺陷登记成功', (await page.evaluate(() => document.body.innerText)).includes('已登记缺陷'));
  // 不通过但不写修模方案
  await clickBtn(page, '提交试模结论');
  mt = await page.evaluate(() => document.querySelector('.modal .err')?.textContent ?? '');
  check('无修模方案被拦截', mt.includes('修模方案'), mt);
  // 写方案再提交
  await page.evaluate(() => {
    const tas = document.querySelectorAll('.modal textarea');
    const plan = tas[tas.length - 1];
    plan.value = '浇口加大 0.3mm，配合面减胶 0.05mm 并抛光型腔';
    plan.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await clickBtn(page, '提交试模结论');
  await new Promise((r) => setTimeout(r, 300));
  s = await state(page);
  const target = s.parts.find((p) => p.name === '躯干主壳');
  const trial = s.trials.filter((t) => t.partId === 'p3');
  check('不通过转修模且次数累计', target.status === 'repairing' && target.repairCount === 3,
    `status=${target.status} repair=${target.repairCount}`);
  check('试模记录含照片数据', trial.at(-1).defects.every((d) => d.photo.startsWith('data:image/')),
    `defects=${trial.at(-1).defects.length}`);

  // 批次：红线模具排产拦截（b5 → o5 余 6.7%）
  await clickBtn(page, '批次跟单');
  await page.waitForSelector('.tbl');
  await page.evaluate(() => {
    const rows = [...document.querySelectorAll('table tr')];
    const row = rows.find((r) => r.textContent.includes('BN-261105'));
    const sel = row.querySelector('select');
    sel.value = [...sel.options].find((o) => o.value.startsWith('m')).value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 300));
  const blockedMsg = await page.evaluate(() => document.querySelector('.toast-danger')?.textContent ?? '');
  check('剩余寿命<10% 排产拦截', blockedMsg.includes('低于 10%') || blockedMsg.includes('红线'), blockedMsg);
  s = await state(page);
  check('被拦批次仍为待排产', s.batches.find((b) => b.id === 'b5').status === 'pending_schedule');

  // 打模扣寿命（b1 → o1，86000 起）
  await clickBtn(page, '登记打模');
  await page.waitForSelector('.modal');
  await page.evaluate(() => {
    const ins = document.querySelectorAll('.modal input[type=number]');
    ins[0].value = '100'; ins[0].dispatchEvent(new Event('input', { bubbles: true }));
    ins[1].value = '5'; ins[1].dispatchEvent(new Event('input', { bubbles: true }));
  });
  await clickBtn(page, '确认扣减寿命');
  await new Promise((r) => setTimeout(r, 300));
  s = await state(page);
  const o1 = s.orders.find((x) => x.id === 'o1');
  const b1 = s.batches.find((x) => x.id === 'b1');
  check('每打一模自动扣减寿命', o1.lifeUsed === 86100, `lifeUsed=${o1.lifeUsed}`);
  check('打模联动良不良与穴数(4穴)', b1.goodQty === 18400 + 395 && b1.defectQty === 320 + 5,
    `good=${b1.goodQty} defect=${b1.defectQty}`);
  check('打模日志落账', s.shotLogs.some((l) => l.batchId === 'b1' && l.shots === 100));

  // 车间看板
  await clickBtn(page, '车间看板');
  await new Promise((r) => setTimeout(r, 200));
  const board = await page.evaluate(() => document.querySelector('.content').innerText);
  check('看板按机台统计当日模次', board.includes('当日模次') && board.includes('IM-01'));
  check('看板展示超期批次', board.includes('超期批次'));

  // 客户跟单数据隔离
  await clickBtn(page, '客户跟单');
  await new Promise((r) => setTimeout(r, 300));
  let portal = await page.evaluate(() => document.querySelector('.content').innerText);
  check('客户门户只显示自己款式', portal.includes('机甲少女') && !portal.includes('巨兽哥莫拉'));
  await page.evaluate(() => {
    const sel = document.querySelector('.topbar select');
    sel.value = 'c2';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 300));
  portal = await page.evaluate(() => document.querySelector('.content').innerText);
  check('切换客户后数据隔离', portal.includes('巨兽哥莫拉') && !portal.includes('机甲少女'));
  check('客户看不到工艺菜单', !(await page.evaluate(() => document.body.innerText.includes('模具台账'))));

  // 模穴分布 3D
  await clickBtn(page, '工艺员');
  await clickBtn(page, '模具台账');
  await clickBtn(page, '模穴/详情');
  await page.waitForSelector('.modal canvas');
  await new Promise((r) => setTimeout(r, 1000));
  const cavityCanvas = await page.evaluate(() => ({ n: document.querySelectorAll('.modal canvas').length }));
  check('模穴分布 3D 弹窗渲染', cavityCanvas.n >= 1, JSON.stringify(cavityCanvas));
} catch (e) {
  check('测试异常: ' + e.message, false, e.stack);
} finally {
  fs.rmSync(tmpFile, { force: true });
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n=== ${results.length - failed.length}/${results.length} 通过 ===`);
if (errors.length) {
  console.log('\n浏览器错误:');
  errors.forEach((e) => console.log(' • ' + e));
}
process.exit(failed.length || errors.length ? 1 : 0);
