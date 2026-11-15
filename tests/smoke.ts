// 在 happy-dom 真实 DOM 中运行打包后的冒烟测试
import { Window } from 'happy-dom'
import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'

const window = new Window({ url: 'http://localhost/' })
const define = (k: string, v: unknown) => Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true })
define('window', window)
define('document', window.document)
define('navigator', window.navigator)
define('localStorage', window.localStorage)
define('location', window.location)
define('history', window.history)
define('HTMLElement', window.HTMLElement)
define('HTMLCanvasElement', window.HTMLCanvasElement)
define('HTMLInputElement', window.HTMLInputElement)
define('Element', window.Element)
define('Node', window.Node)
define('Event', window.Event)
define('CustomEvent', window.CustomEvent)
define('Blob', window.Blob)
define('URL', window.URL)
define('getComputedStyle', window.getComputedStyle.bind(window))
define('matchMedia', window.matchMedia?.bind(window) ?? (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })))
define('devicePixelRatio', 1)
define('requestAnimationFrame', ((cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0) as unknown as number) as typeof requestAnimationFrame)
define('cancelAnimationFrame', ((id: number) => clearTimeout(id)) as typeof cancelAnimationFrame)
window.HTMLCanvasElement.prototype.getContext = (() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext

// 统一暴露 window 上的 DOM 构造器与全局函数（SVGElement/DocumentFragment 等）
for (const key of Object.getOwnPropertyNames(window)) {
  if (key in globalThis) continue
  const v = (window as unknown as Record<string, unknown>)[key]
  if (typeof v === 'function' || (typeof v === 'object' && v !== null && key.endsWith('Element'))) {
    try { define(key, v) } catch { /* 只读属性跳过 */ }
  }
}

const smokePath = fileURLToPath(new URL('./.smoke-dist/smoke.mjs', import.meta.url))
const mod = await import(pathToFileURL(smokePath).href)
const container = document.createElement('div')
document.body.appendChild(container)

try {
  const results = await mod.runSmoke(container)
  for (const r of results) console.log(`  ✓ ${r}`)
  console.log(`\n浏览器环境冒烟全部通过（${results.length} 项）✅`)
} catch (e) {
  console.error('冒烟测试失败：', e)
  process.exit(1)
}
