// 纯逻辑单测：用 esbuild（vite 自带依赖）转译 TS 后在 Node 中运行
import { build } from 'esbuild';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const out = 'node_modules/.tmp-test/bundle.mjs';
mkdirSync(dirname(out), { recursive: true });

await build({
  entryPoints: ['src/test-entry.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: out,
  logLevel: 'silent',
});

const mod = await import('../node_modules/.tmp-test/bundle.mjs');
const results = mod.runTests();
let fail = 0;
for (const r of results) {
  if (r.ok) console.log(`✓ ${r.name}`);
  else { fail++; console.error(`✗ ${r.name}: ${r.detail}`); }
}
console.log(`\n${results.length - fail}/${results.length} passed`);
process.exit(fail ? 1 : 0);
