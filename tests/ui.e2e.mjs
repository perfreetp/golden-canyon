// UI end-to-end test. Boots Vite, drives the real browser, and asserts the
// batch lifecycle. Run with `npm run test:e2e` (Chrome required).
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const PORT = 5299;
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', '--port', String(PORT), '--strictPort'],
  { stdio: 'ignore', shell: process.platform === 'win32' }
);

let browser;
let failures = 0;
const results = [];

function check(name, cond, detail = '') {
  results.push({ name, ok: !!cond, detail });
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  ' + detail}`);
}

try {
  // wait for the dev server
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/`);
      if (r.ok) break;
    } catch {
      /* not up yet */
    }
    await wait(300);
  }

  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text());
  });

  const nav = async (name) => {
    await page.evaluate((n) => {
      [...document.querySelectorAll('.nav-btn')].find((b) => b.title === n)?.click();
    }, name);
    await wait(320);
  };
  const clickButton = async (text, scope = null) =>
    page.evaluate(
      (t, sc) => {
        const root = sc ? document.querySelector(sc) : document;
        const b = [...(root?.querySelectorAll('button') || [])].find((x) =>
          x.textContent.replace(/\s+/g, '').includes(String(t).replace(/\s+/g, ''))
        );
        if (!b || b.disabled) return false;
        b.click();
        return true;
      },
      text,
      scope
    );

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(700);

  // ---------------------------------------------------------- determinism
  const firstRendered = await page.evaluate(() =>
    [...document.querySelectorAll('g[data-lesion-id]')].map((g) => g.getAttribute('transform'))
  );
  check('workbench renders lesion markers', firstRendered.length > 0);

  await nav('批次总览');
  const rowCount = await page.evaluate(() => document.querySelectorAll('table tbody tr').length);
  check('batch overview lists every case', rowCount === 9, `got ${rowCount}`);

  const sevMix = await page.evaluate(() => {
    const text = document.body.textContent;
    return {
      high: /严重/.test(text),
      medium: /一般/.test(text),
      low: /提示/.test(text)
    };
  });
  check('all three severity grades appear', sevMix.high && sevMix.medium && sevMix.low);

  // --------------------------------------- drag + regenerate preservation
  await page.evaluate(() => {
    const row = [...document.querySelectorAll('table tbody tr')].find((tr) =>
      tr.textContent.includes('草稿')
    );
    row?.click();
  });
  await wait(220);
  await nav('报告工作台');
  await wait(400);

  const readTransforms = () =>
    page.evaluate(() => ({
      lesions: [...document.querySelectorAll('g[data-lesion-id]')].map((g) => ({
        id: g.dataset.lesionId,
        t: g.getAttribute('transform')
      })),
      anns: [...document.querySelectorAll('g[data-ann-id]')].map((g) => ({
        id: g.dataset.annId,
        t: g.getAttribute('transform')
      }))
    }));

  const t0 = await readTransforms();
  check('draft case renders markers', t0.lesions.length > 0);

  const dragBy = async (selector, dx, dy) => {
    const box = await page.evaluate((s) => {
      const g = document.querySelector(s);
      if (!g) return null;
      const r = g.getBoundingClientRect();
      return { x: r.x + Math.min(r.width / 2, 12), y: r.y + Math.min(r.height / 2, 12) };
    }, selector);
    if (!box) return false;
    await page.mouse.move(box.x, box.y);
    await page.mouse.down();
    await page.mouse.move(box.x + dx, box.y + dy, { steps: 10 });
    await page.mouse.up();
    await wait(260);
    return true;
  };

  await dragBy('g[data-lesion-id]', 24, 16);
  await dragBy('g[data-ann-id]', -28, 34);
  const t1 = await readTransforms();
  check(
    'dragging moves a lesion marker',
    t1.lesions[0].t !== t0.lesions[0].t,
    `${t0.lesions[0].t} -> ${t1.lesions[0].t}`
  );
  check(
    'dragging moves an annotation box',
    t1.anns[0].t !== t0.anns[0].t,
    `${t0.anns[0].t} -> ${t1.anns[0].t}`
  );

  // regenerate with identical parameters -> manual edits kept
  await clickButton('重新生成');
  await wait(500);
  const t2 = await readTransforms();
  check(
    'regeneration keeps the dragged marker',
    t2.lesions[0].t === t1.lesions[0].t,
    `${t1.lesions[0].t} vs ${t2.lesions[0].t}`
  );
  check('regeneration keeps the dragged label', t2.anns[0].t === t1.anns[0].t);

  const keptToast = await page.evaluate(() => document.querySelector('.toast')?.textContent || '');
  check('regeneration reports how many manual edits were kept', /保留/.test(keptToast), keptToast);

  // change the seed -> manual micro-edits are dropped
  await page.evaluate(() => {
    const input = document.querySelector('#seed');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'SEED-SWITCH-9');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '应用')?.click();
  });
  await wait(600);
  const t3 = await readTransforms();
  check('changing the seed drops manual edits', t3.lesions[0].t !== t2.lesions[0].t);
  const seedToast = await page.evaluate(() => document.querySelector('.toast')?.textContent || '');
  check('changing the seed warns that edits were cleared', /清空/.test(seedToast), seedToast);

  await nav('批次总览');

  // -------------------------------------------------- fix and resubmit drafts
  let rounds = 0;
  while (rounds++ < 12) {
    const work = await page.evaluate(() =>
      [...document.querySelectorAll('table tbody tr')]
        .map((tr, i) => ({ i, t: tr.textContent }))
        .filter((r) => r.t.includes('草稿') || r.t.includes('待整改'))
    );
    if (!work.length) break;
    await page.evaluate((i) => document.querySelectorAll('table tbody tr')[i].click(), work[0].i);
    await wait(200);
    await nav('报告工作台');
    await wait(250);
    // repair any missing panel
    await page.evaluate(() => {
      const row = [...document.querySelectorAll('.part-row')].find((r) => r.textContent.includes('缺失'));
      row?.querySelector('input[type=checkbox]')?.click();
    });
    await wait(200);
    await clickButton('提交复核');
    await clickButton('重新提交');
    await page.evaluate(() => window.scrollTo(0, 0));
    await nav('批次总览');
  }
  const stillOpen = await page.evaluate(
    () =>
      [...document.querySelectorAll('table tbody tr')].filter(
        (tr) => tr.textContent.includes('草稿') || tr.textContent.includes('待整改')
      ).length
  );
  check('drafts and rework cases are resubmitted', stillOpen === 0, `${stillOpen} left`);

  // -------------------------------------------------------------- review
  await nav('复核台');
  let reviewRounds = 0;
  while (reviewRounds++ < 80) {
    const state = await page.evaluate(() => ({
      hasIssue: !!document.querySelector('.issue-head'),
      sigBtn: [...document.querySelectorAll('button')].find((b) =>
        b.textContent.includes('复核签名')
      )?.disabled
    }));
    if (!state.hasIssue) {
      const signed = await clickButton('复核签名');
      const next = await page.evaluate(() => {
        const it = [...document.querySelectorAll('.queue-item')].find(
          (x) => !x.textContent.includes('已签名')
        );
        it?.click();
        return !!it;
      });
      if (!signed && !next) break;
      await wait(320);
      continue;
    }
    const confirmed = await clickButton('确认通过', '.issue.active');
    if (!confirmed) break;
    await wait(150);
  }
  const signedCount = await page.evaluate(
    () => [...document.querySelectorAll('.queue-item')].filter((x) => x.textContent.includes('已签名')).length
  );
  // signed cases leave the review queue, so assert from the batch table instead
  await nav('批次总览');
  const signedRows = await page.evaluate(
    () =>
      [...document.querySelectorAll('table tbody tr')].filter((tr) =>
        tr.textContent.includes('已签名')
      ).length
  );
  check('every queued case is signed', signedRows === 9, `signed ${signedRows} (queue ${signedCount})`);

  // ------------------------------------------------------------- release
  const canReleaseNow = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) =>
      x.textContent.includes('放行并生成批次清单')
    );
    return !!b && !b.disabled;
  });
  check('release gate opens once everything is signed', canReleaseNow);

  if (canReleaseNow) {
    await clickButton('放行并生成批次清单');
    await wait(250);
    await clickButton('确认放行');
    await wait(600);
  }
  const released = await page.evaluate(() => {
    const text = document.body.textContent;
    return {
      badge: text.includes('已放行'),
      manifest: text.includes('清单已生成'),
      signature: /签名码/.test(text)
    };
  });
  check('batch releases and produces a manifest', released.badge && released.manifest && released.signature);

  // ------------------------------------------------------------- archive
  await nav('历史归档');
  const archiveRows = await page.evaluate(() => document.querySelectorAll('.batch-item').length);
  check('released batch appears in the archive', archiveRows >= 3, `${archiveRows} rows`);

  // filter by operator
  const filtered = await page.evaluate(() => {
    const sel = document.querySelector('#op');
    const target = [...sel.options].find((o) => o.value !== 'all');
    sel.value = target.value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return new Promise((res) =>
      setTimeout(() => res({ op: target.value, rows: document.querySelectorAll('.batch-item').length }), 300)
    );
  });
  check('archive filters by operator', filtered.rows >= 1, JSON.stringify(filtered));

  // filter by exam date
  const dateFiltered = await page.evaluate(() => {
    const from = document.querySelector('#from');
    const to = document.querySelector('#to');
    for (const [el, v] of [
      [from, '2026-11-01'],
      [to, '2026-11-30']
    ]) {
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return new Promise((res) =>
      setTimeout(() => res(document.querySelectorAll('.batch-item').length), 350)
    );
  });
  check('archive filters by exam date range', dateFiltered >= 1, `${dateFiltered} rows`);

  // ---------------------------------------------------------------- import
  await page.evaluate(() => document.querySelectorAll('.batch-picker .btn')[1]?.click());
  await wait(320);
  await clickButton('填入示例');
  await wait(300);
  const previewCount = await page.evaluate(() => document.querySelectorAll('.preview tbody tr').length);
  check('import parses the sample payload', previewCount === 3, `${previewCount} rows`);
  await clickButton('导入并自动质检');
  await wait(700);
  const importedTitle = await page.evaluate(() => document.querySelector('.case-title')?.textContent || '');
  check('import creates a batch and opens the first case', /周|李|王/.test(importedTitle));

  // ------------------------------------------------------------- responsive
  for (const [w, h] of [
    [1280, 800],
    [1024, 768],
    [390, 844]
  ]) {
    await page.setViewport({ width: w, height: h });
    for (const view of ['报告工作台', '复核台', '批次总览', '历史归档']) {
      await nav(view);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      );
      check(`no horizontal overflow at ${w}px (${view})`, !overflow);
    }
  }

  check('no runtime errors', errors.length === 0, errors.join(' | '));
} catch (err) {
  check('test harness completed', false, err.message);
} finally {
  if (browser) await browser.close();
  server.kill();
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(server.pid), '/f', '/t'], { stdio: 'ignore' });
  }
}

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
if (failures) process.exitCode = 1;
