import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

const testsDir = fileURLToPath(new URL('./', import.meta.url))

// 仅供 tests/smoke 打包使用
export default defineConfig({
  plugins: [vue()],
  build: {
    write: true,
    outDir: `${testsDir}.smoke-dist`,
    emptyOutDir: true,
    lib: {
      entry: `${testsDir}entry-smoke.ts`,
      formats: ['es'],
      fileName: () => 'smoke.mjs'
    },
    rollupOptions: {
      output: { inlineDynamicImports: true }
    }
  }
})
