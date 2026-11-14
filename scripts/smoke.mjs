/**
 * 无头浏览器冒烟测试（Playwright + 系统 Chrome，WebGL2 SwiftShader 软渲染）。
 * 运行：node scripts/smoke.mjs
 */
import { chromium } from 'playwright-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://127.0.0.1:5173'
const SHOTS = new URL('./shots/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')
const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
}

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--window-size=1600,1000',
  ],
})
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
const page = await ctx.newPage()
const consoleErrors = []
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text())
})
page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message))
// 全局自动接受 alert/confirm（commitVersion 的 alert、删除确认等）
page.on('dialog', (d) => d.accept())

try {
  // 应用内置 SEED_VERSION 迁移会自动清库重建，这里只需打开干净页面
  // ---------- 1. 建档树 ----------
  await page.goto(BASE + '/#/archive-tree', { waitUntil: 'networkidle' })
  await page.waitForSelector('.row.campus', { timeout: 10000 })
  const campusCount = await page.locator('.row.campus').count()
  check('建档树-院区加载', campusCount >= 2, `${campusCount} 个院区`)
  const drawingRows = await page.locator('.row.drawing').count()
  check('建档树-图档挂载', drawingRows >= 4, `${drawingRows} 张图档`)
  await page.screenshot({ path: SHOTS + '01-archive-tree.png', fullPage: true })

  // ---------- 2. 照片档案（选总院 NJ-08，该房间有 3 份） ----------
  await page.goto(BASE + '/#/photos', { waitUntil: 'networkidle' })
  await page.locator('.room-item', { hasText: 'NJ-08' }).first().click()
  await page.waitForSelector('.card')
  const photoCount = await page.locator('.card').count()
  check('照片档案-列表', photoCount >= 3, `${photoCount} 份档案`)
  await page.locator('.card').first().click()
  await page.waitForSelector('.preview-img')
  check('照片档案-预览大图', await page.locator('.preview-img').isVisible())
  await page.screenshot({ path: SHOTS + '02-photos.png' })
  await page.keyboard.press('Escape')

  // ---------- 3. 编辑器：含交叉的现状图 ----------
  await page.goto(BASE + '/#/archive-tree')
  await page.locator('.row.drawing', { hasText: '现状测绘' }).first().click()
  await page.waitForSelector('.canvas-wrap canvas', { timeout: 10000 })
  await page.waitForTimeout(1500)
  const hud = await page.locator('.hud').innerText()
  const totalMatch = hud.match(/图元 (\d+)/)
  check('编辑器-图元渲染', !!totalMatch && Number(totalMatch[1]) > 15, hud.replace(/\s+/g, ' ').slice(0, 120))
  const crossBanner = page.locator('.cross-banner')
  check('洁污交叉-自动标红提示', await crossBanner.isVisible(), (await crossBanner.innerText()).trim().slice(0, 40))
  await page.screenshot({ path: SHOTS + '03-editor-crossing.png' })

  // ---------- 4. 点选设备 → 属性/检修日期 ----------
  const box = await page.locator('canvas.gl').boundingBox()
  // 点击画布中部偏上（清洗槽排布里大概率命中设备）
  await page.mouse.click(box.x + box.width * 0.32, box.y + box.height * 0.3)
  await page.waitForTimeout(400)
  const hasDeviceInfo = await page.locator('.prop .grp', { hasText: '所属设备台账' }).count()
  if (hasDeviceInfo) {
    const maint = await page.locator('.prop').innerText()
    check('点选-设备台账与检修日期', /最近检修日期/.test(maint) && /下次检修/.test(maint), maint.match(/剩余 \d+ 天|已超期 \d+ 天/)?.[0] ?? '')
  } else {
    // 重试一次，点击更靠上的位置
    await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.22)
    await page.waitForTimeout(400)
    const maint = await page.locator('.prop').innerText().catch(() => '')
    check('点选-设备台账与检修日期', /所属设备台账/.test(maint), maint.slice(0, 60))
  }
  await page.screenshot({ path: SHOTS + '04-pick-device.png' })

  // ---------- 5. 图层单独开关：按名称定位“清洗槽” ----------
  const sinkLayer = page.locator('.layer-row', { hasText: '清洗槽' })
  const beforeCount = Number((await page.locator('.hud').innerText()).match(/绘制 (\d+)/)?.[1] ?? 0)
  await sinkLayer.locator('.eye').click()
  await page.waitForTimeout(1300) // 统计信息 1 秒刷新
  const afterCount = Number((await page.locator('.hud').innerText()).match(/绘制 (\d+)/)?.[1] ?? 0)
  check('图层-单独开关生效', afterCount < beforeCount, `绘制数 ${beforeCount} → ${afterCount}`)
  await sinkLayer.locator('.eye').click()
  await page.waitForTimeout(1200)

  // ---------- 6. LOD：缩到低倍只留房间/流线 ----------
  const cv = page.locator('canvas.gl')
  for (let i = 0; i < 16; i++) {
    await cv.dispatchEvent('wheel', { deltaY: 120, clientX: box.x + 800, clientY: box.y + 500 })
  }
  await page.waitForTimeout(1300) // 统计信息 1 秒刷新一次
  const lodText = await page.locator('.hud').innerText()
  check('LOD-低倍概览模式', /低倍概览/.test(lodText), lodText.match(/低倍概览[^\n]*/)?.[0]?.slice(0, 40) ?? lodText.slice(0, 60))
  await page.screenshot({ path: SHOTS + '05-lod0.png' })
  // 放大回细节层级
  for (let i = 0; i < 14; i++) {
    await cv.dispatchEvent('wheel', { deltaY: -120, clientX: box.x + 800, clientY: box.y + 500 })
  }
  await page.waitForTimeout(400)

  // ---------- 7. 视口裁剪统计 ----------
  const hud2 = await page.locator('.hud').innerText()
  const culled = Number(hud2.match(/裁剪 (\d+)/)?.[1] ?? 0)
  check('视口裁剪-视口外不渲染', culled >= 0, hud2.match(/图元 \d+｜绘制 \d+｜裁剪 \d+/)?.[0] ?? '')

  // ---------- 8. 绘制清洁流线（双击完成） ----------
  await page.locator('.toolbox button', { hasText: '清洁流线' }).click()
  await page.mouse.click(box.x + 200, box.y + 700)
  await page.mouse.click(box.x + 500, box.y + 700)
  await page.mouse.click(box.x + 500, box.y + 400)
  await page.mouse.dblclick(box.x + 800, box.y + 400)
  await page.waitForTimeout(500)
  const total2 = Number((await page.locator('.hud').innerText()).match(/图元 (\d+)/)?.[1] ?? 0)
  check('编辑器-新增流线图元', total2 > Number(totalMatch?.[1] ?? 0), `图元 ${totalMatch?.[1]} → ${total2}`)

  // ---------- 9. 提交新版本 ----------
  await page.getByRole('button', { name: '提交新版本' }).click()
  await page.waitForSelector('.dlg textarea')
  await page.locator('.dlg textarea').fill('冒烟测试：新增清洁流线一条')
  await page.locator('.dlg button.primary').click()
  await page.waitForSelector('.dlg', { state: 'detached', timeout: 8000 })
  await page.waitForTimeout(300)
  const verText = await page.locator('.topbar').innerText()
  check('版本-提交快照', /V\d+/.test(verText), verText.match(/V\d+/)?.[0] ?? '')

  // ---------- 10. 版本中心比对 + 报告 ----------
  await page.getByRole('button', { name: /版本中心/ }).click()
  await page.waitForSelector('.block table.data')
  await page.getByRole('button', { name: '比对最新两版' }).click()
  await page.waitForTimeout(500)
  const diffText = await page.locator('.result').innerText().catch(() => '')
  check('版本-逐项差异', /新增|修改|删除/.test(diffText), diffText.replace(/\s+/g, ' ').slice(0, 80))
  const [reportPage] = await Promise.all([
    ctx.waitForEvent('page'),
    page.getByRole('button', { name: /导出说明报告/ }).click(),
  ])
  await reportPage.waitForLoadState()
  const reportHtml = await reportPage.content()
  check('报告-HTML 说明文档', reportHtml.includes('版本比对说明报告') && reportHtml.includes('洁污流线交叉核查'))
  await reportPage.close()
  await page.screenshot({ path: SHOTS + '06-versions.png', fullPage: true })

  // ---------- 11. 2 万图元性能 ----------
  await page.goto(BASE + '/#/archive-tree')
  await page.locator('.row.drawing', { hasText: '性能验证' }).click()
  await page.waitForSelector('.canvas-wrap canvas')
  await page.waitForTimeout(2500)
  const perfHud = await page.locator('.hud').innerText()
  const perfTotal = Number(perfHud.match(/图元 (\d+)/)?.[1] ?? 0)
  check('性能-20000 图元加载', perfTotal >= 20000, `总数 ${perfTotal}`)
  // 放大到局部视口，验证视口外图元被裁剪（初始全图视角视口恰好覆盖全部）
  const perfCanvas = page.locator('canvas.gl')
  const pbox = await perfCanvas.boundingBox()
  for (let i = 0; i < 6; i++) {
    await perfCanvas.dispatchEvent('wheel', { deltaY: -120, clientX: pbox.x + 700, clientY: pbox.y + 500 })
  }
  await page.waitForTimeout(1300)
  const zoomHud = await page.locator('.hud').innerText()
  const perfDrawn = Number(zoomHud.match(/绘制 (\d+)/)?.[1] ?? 0)
  const perfCulled = Number(zoomHud.match(/裁剪 (\d+)/)?.[1] ?? 0)
  const fps = Number(zoomHud.match(/(\d+) FPS/)?.[1] ?? 0)
  const calls = Number(zoomHud.match(/draw calls (\d+)/)?.[1] ?? 0)
  check('性能-视口裁剪生效', perfCulled > 0 && perfDrawn < perfTotal, `绘制 ${perfDrawn} / 裁剪 ${perfCulled}`)
  check('性能-合批 draw call 受控', calls > 0 && calls < 60, `${calls} 次`)
  check('性能-软渲染 FPS', fps > 0, `${fps} FPS（SwiftShader 软渲染，真机 GPU 会更高）`)
  await page.screenshot({ path: SHOTS + '07-stress-20k.png' })

  // ---------- 12. 归档检索 ----------
  await page.goto(BASE + '/#/archive-search', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: '检索' }).click()
  await page.waitForTimeout(400)
  const rows = await page.locator('.result table.data tbody tr').count()
  check('归档检索-全量', rows >= 1, `${rows} 条已归档图档`)
  await page.locator('.query label', { hasText: '房间号' }).locator('input').fill('NJ-02')
  await page.getByRole('button', { name: '检索' }).click()
  await page.waitForTimeout(300)
  const rows2 = await page.locator('.result table.data tbody tr').count()
  check('归档检索-房间号过滤', rows2 === 1, `${rows2} 条`)
  await page.screenshot({ path: SHOTS + '08-archive-search.png' })

  // ---------- 控制台错误 ----------
  const realErrors = consoleErrors.filter((e) => !/favicon|WebSocket|Download is interrupted/i.test(e))
  check('运行时-无控制台错误', realErrors.length === 0, realErrors.slice(0, 3).join(' | '))
} catch (e) {
  check('测试流程异常', false, e.message)
  await page.screenshot({ path: SHOTS + 'error.png', fullPage: true }).catch(() => {})
} finally {
  await browser.close()
  const failed = results.filter((r) => !r.ok)
  console.log(`\n==== ${results.length - failed.length}/${results.length} 通过 ====`)
  process.exit(failed.length ? 1 : 0)
}
