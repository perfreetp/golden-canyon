# 验证脚本

- `smoke.mjs`：纯 Node 冒烟测试，验证断层数据生成（3400+ 要素、LOD 分层、bbox）、点选命中、自动评分（满分/偏移/容差/退化答案）。运行：`npm test`
- `cdp-e2e.mjs`：基于 Chrome DevTools Protocol 的端到端流程测试，驱动「教师套索命题 → 发布 → 学员答题（图层锁定）→ 自动评分 → 教师复核改分 → 成绩与错误率统计」全链路。
  - 前置：`npm run dev` 启动 Vite，并用 `chrome --headless --remote-debugging-port=9224` 启动一个带远程调试的 Chrome。
  - 运行：`CDP_PORT=9224 node scripts/cdp-e2e.mjs`
