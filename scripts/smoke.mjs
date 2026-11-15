/**
 * Headless smoke test for the joint-check workspace.
 *
 *   npm run dev            (in another shell)
 *   node scripts/smoke.mjs
 *
 * Exercises the three-role happy path plus the accessory-revision invalidation
 * cascade, and fails on console errors or a missing release report.
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(`PAGEERROR ${e.message}`))

let failures = 0
const check = (label, ok, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ` — ${extra}` : ''}`)
  if (!ok) failures++
}

const routes = ['home', 'model', 'bench', 'accessories', 'tasks', 'reports']
for (const r of routes) {
  await page.goto(`${BASE}/#/${r}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 1)
  check(`route /${r} renders without horizontal overflow`, !overflow)
}

// --- engineer: recalibrate a joint ---
await page.goto(`${BASE}/#/model`, { waitUntil: 'networkidle' })
await page.waitForTimeout(900)
await page.click('.joint-row:has-text("左膝")')
await page.click('button:has-text("标定…")')
await page.fill('.modal input[type=number] >> nth=1', '92')
await page.click('.modal-foot button:has-text("保存标定")')
await page.waitForTimeout(500)
check('engineer can save a joint calibration', (await page.locator('.toast b').count()) > 0)

// --- prototyper: equip, pose, snapshot ---
await page.click('button:has-text("原型师")')
await page.click('.nav button:has-text("配件库")')
await page.waitForTimeout(600)
for (const name of ['持剑手', '长剑 · 苍', '圆形底座']) {
  await page.click(`tr:has-text("${name}") >> text=装配试用`)
  await page.waitForTimeout(250)
}
await page.click('.nav button:has-text("姿势测试台")')
await page.waitForTimeout(1800)
await page.click('button:has-text("抱膝坐姿")')
await page.waitForTimeout(900)
check(
  'bench flags over-limit penetration for the default pose',
  (await page.locator('.side.right .chip:has-text("超限")').count()) > 0,
)
await page.click('button:has-text("拔剑准备")')
await page.waitForTimeout(900)
await page.click('.side.right .side-head button:has-text("保存")')
await page.fill('.modal input[type=text]', '冒烟测试姿势')
await page.click('.modal-foot button:has-text("保存")')
await page.waitForTimeout(600)
check('prototyper can save a pose snapshot', (await page.locator('text=冒烟测试姿势').count()) > 0)

// --- submit + QC approve ---
const submitBtn = page.locator('.side.right .side-head button.primary')
if (!(await submitBtn.isDisabled())) {
  await submitBtn.click()
  await page.waitForTimeout(500)
  await page.fill('.modal input[type=text]', '冒烟测试校核单')
  await page.click('.modal-foot button:has-text("提交给品控")')
  await page.waitForTimeout(800)
  check('check card submitted', (await page.locator('text=冒烟测试校核单').count()) > 0)

  await page.click('button:has-text("品控主管")')
  await page.click('.nav button:has-text("校核任务")')
  await page.waitForTimeout(600)
  await page.click('tr:has-text("冒烟测试校核单")')
  await page.waitForTimeout(700)
  await page.click('.modal-foot button:has-text("通过并锁定版本")')
  await page.waitForTimeout(700)
  await page.click('.nav button:has-text("放行报告")')
  await page.waitForTimeout(600)
  check(
    'QC approval produced a release report',
    (await page.locator('text=冒烟测试校核单').count()) > 0,
  )
} else {
  check('pose is submittable (needs no blockers)', false)
}

// --- invalidation cascade ---
await page.click('button:has-text("原型师")')
await page.click('.nav button:has-text("配件库")')
await page.waitForTimeout(600)
await page.click('tr:has-text("持剑手") >> text=改版')
await page.fill('.modal textarea', '冒烟测试：球窝加深至 3.4mm')
await page.click('.modal-foot button:has-text("发布")')
await page.waitForTimeout(700)
await page.click('.nav button:has-text("校核任务")')
await page.waitForTimeout(600)
check(
  'accessory revision invalidates referencing check cards',
  (await page.locator('text=结果已失效').count()) > 0,
)

check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '))
await browser.close()
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed')
process.exit(failures ? 1 : 0)
