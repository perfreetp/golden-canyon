# 骨科病区设备与管线平面图批次质检系统

面向骨科医院基建办的设计图纸批次质检平台。设计院按批次提交病区平面图后，系统按
**楼栋 / 楼层 / 护理单元** 建档，在 SVG 平面图上叠加病床、设备带、呼叫、医气、强弱电
五类要素与四系统管线，自动执行规范检查并支撑复核、放行、退回与留档检索全流程。

## 技术栈

- **SolidJS + TypeScript**：细粒度响应式，仅更新变化的 SVG 节点
- **SVG + d3-zoom**：滚轮缩放 / 拖拽平移，千级点位流畅渲染
- **d3-scale / d3-axis**：批次总览的问题分布统计图
- **Vite** 构建，**localStorage** 持久化（无后端依赖，可直接静态部署；存储层集中在
  `src/store.ts`，替换为 REST API 即可接入后端）

## 启动

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm run build    # 类型检查 + 生产构建到 dist/
npm run preview  # 预览生产构建
```

内置三个演示批次：已放行批次（含完整留档）、复核中批次（部分问题待办）、收图中批次
（可体验从检查到退回的完整流程）。右上角「重置演示数据」可一键还原。

## 核心功能与实现位置

| 需求 | 实现 |
| --- | --- |
| 楼栋/楼层/护理单元建档、批次收图 | `src/components/BatchSidebar.tsx`、`store.ts#createBatch/uploadDrawing` |
| 五类要素 + 四系统管线叠加渲染 | `src/lib/generator.ts`（种子图纸，每张 305 点位）、`components/MapView.tsx` |
| 缩放平移流畅、视口外裁剪 | d3-zoom + 视口矩形 memo 过滤（`MapView.tsx#visiblePoints`），视口外节点不进 DOM |
| 缩放层级切换细节（LOD） | 三级：总览简化点 → 分区标准符号 → 详图标签/安装高度 |
| 点选点位高亮 + 挂靠管线 | `MapView` 选中联动，`lib/rules.ts#findHostPipeline` 按 150mm 容差反算归属管线并高亮 |
| 图层单独开关 | `components/LayerPanel.tsx` + `store.ts#layerVisible`，要素与关联管线同步隐藏 |
| 自动规范检查（三级问题） | `lib/rules.ts`，规则与阈值集中在 `lib/spec.ts` |
| 逐条确认/驳回并写依据 | `components/ReviewPanel.tsx`，无依据禁止提交（`reviewIssue`） |
| 全部处理完才放行 | `store.ts#canRelease` 放行门禁，按钮禁用 + 总览门禁提示 |
| 不达标整批退回 + 整改清单 | `store.ts#returnBatch`、`lib/export.ts` 导出 CSV |
| 检查项/问题分布/放行时间留档 | `CheckRun`、`ReleaseLog` 两张留档表，`components/BatchDashboard.tsx` |
| 按楼栋/楼层/批次/复核员检索 | `components/ArchiveView.tsx` 四维过滤 |

## 规范检查规则

| 规则代码 | 检查项 | 判定阈值 | 定级 |
| --- | --- | --- | --- |
| `BELT_HEIGHT` | 设备带安装高度 | 标称 1350mm，偏差超 ±50mm 报警；超 ±100mm | 一般 / 严重 |
| `BED_SPACING` | 同病室床位间距 | < 1000mm 报警；< 800mm | 一般 / 严重 |
| `EW_SPACING` | 强电-弱电终端间距 | < 300mm 报警；< 150mm | 一般 / 严重 |
| `PIPE_BEAM` | 管线穿结构梁 | 折线与梁矩形投影相交（Liang–Barsky 裁剪判定） | 严重 |
| `MISSING_TERMINAL` | 床旁呼叫/医气终端缺失 | 床旁 600mm 服务半径内无对应终端 | 提示 |

阈值集中于 `src/lib/spec.ts#RULE_THRESHOLDS`，规范条文依据随每条问题展示并进入留档。

## 数据与流程模型

```
Batch（批次）
 ├─ Drawing（按护理单元建档的平面图）
 │   ├─ Room / Beam（房间、结构梁）
 │   ├─ Pipeline（gas/call/strong/weak 四系统折线）
 │   └─ PlanPoint（bed/belt/call/gas/strong/weak 六类点位，含管线归属）
 ├─ Issue（问题：severe/major/minor 三级，open→confirmed/rejected→fixed）
 ├─ CheckRun（每轮检查的规则命中与级别分布留档）
 └─ ReleaseLog（放行/退回动作、时间、操作人、问题分布）
```

退回后设计院重传会开启新一轮（`round + 1`），历史轮次问题与留档保留，门禁按当前轮次计算。

## 测试

```bash
# 规则引擎与种子数据校验（点位数、五类规则触发、管线归属反算）
npx esbuild scripts/verify.ts --bundle --platform=node --format=esm --outfile=scripts/verify.mjs
node scripts/verify.mjs

# 全业务流程集成测试（复核门禁、放行/退回、轮次、留档检索、持久化）
npx esbuild scripts/flow-test.ts --bundle --platform=node --format=esm --outfile=scripts/flow-test.mjs
node scripts/flow-test.mjs
```

## 目录结构

```
src/
├─ types.ts              领域模型
├─ store.ts              全局状态 + 持久化 + 全部业务动作
├─ lib/
│  ├─ spec.ts            规范阈值、规则元数据、图层/要素样式
│  ├─ rules.ts           五项检查引擎 + 管线归属反算
│  ├─ geometry.ts        几何工具（线段距离、折线-矩形相交等）
│  ├─ generator.ts       确定性种子图纸生成（含缺陷注入）
│  └─ export.ts          整改清单 / 发行留档 CSV 导出
└─ components/
   ├─ MapView.tsx        SVG 画布（d3-zoom、视口裁剪、LOD、联动高亮）
   ├─ BatchSidebar.tsx   批次建档树与收图
   ├─ LayerPanel.tsx     图层开关
   ├─ IssueList.tsx      问题清单（三级分组）
   ├─ ReviewPanel.tsx    点位详情与问题复核
   ├─ BatchDashboard.tsx 批次总览（进度、D3 图表、放行/退回、留档）
   └─ ArchiveView.tsx    留档多维检索
```
