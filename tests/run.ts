// 通过 Vite 的模块图加载 TS 测试（支持无扩展名/别名导入）
import { createServer } from 'vite'

const vite = await createServer({
  server: { middlewareMode: true },
  logLevel: 'error',
  appType: 'custom',
  ssr: { external: ['vue', 'vue-router', 'happy-dom'] }
})

try {
  await vite.ssrLoadModule('/tests/core.test.ts')
} finally {
  await vite.close()
}
