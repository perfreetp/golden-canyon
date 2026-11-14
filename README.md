# 神经外科术前谈话图示编辑与发布平台

原生 **TypeScript + Web Components** 搭建界面，三维头模使用 **Babylon.js**（按需动态加载），
零前端框架、零 UI 库依赖。面向医生、审核员、运营与病房患者四类角色，覆盖
「绘制 → 审核 → 发布 → 患者查看 → 数据统计」全流程。

## 技术栈

| 关注点 | 选型 |
| --- | --- |
| 构建 | Vite + TypeScript（strict） |
| 界面 | 原生 Web Components（Custom Elements + Shadow DOM） |
| 状态 | 自研事件订阅 Store + localStorage 持久化 |
| 2D 画布 | 自研 SVG 引擎（吸附 / 参考线 / 节点编辑 / 布尔运算） |
| 3D 头模 | Babylon.js（深度按需导入，独立异步 chunk） |
| 路由 | 自研 Hash Router |
| 测试 | Node 原生 TS 单测 + Headless Chrome CDP 冒烟/交互测试 |

## 快速开始

```bash
npm install
npm run dev        # 开发服务器
npm run build      # 类型检查 + 生产构建
npm run preview    # 预览构建产物
```

## 七个界面（三端）

| # | 路由 | 端 | 界面 |
| --- | --- | --- | --- |
| 1 | `#/` | 编辑端 | 工作台：图示列表、状态筛选、缩略图、新建 |
| 2 | `#/editor/:id` | 编辑端 | 画布工作台：绘图 / 图层 / 属性 / 布尔 / 导出 / 发布 |
| 3 | `#/review` | 审核端 | 审核队列：自动预检提示 |
| 4 | `#/review/:id` | 审核端 | 逐条核对清单，退回强制写明修改项 |
| 5 | `#/admin` | 运营后台 | 脑区模板 / 术语库 / 配色规范管理 |
| 6 | `#/stats` | 运营后台 | 提交量、退回率、患者端平均查看时长 |
| 7 | `#/share/:token` | 患者端 | 3D 头模旋转查看 + 脑区通俗说明与风险提示 |

## 核心能力与实现位置

### 画布编辑（`src/editor/canvas-engine.ts`）
- **四类语义图形**：病变范围、功能区（面状）；血管走行、手术入路（线状）；文字标注。
- **路径布尔运算**：`src/core/boolean.ts` 实现 Greiner–Hormann 多边形裁剪，
  支持两块重叠区域**求并 / 求差**剪出不规则形状，内含孔洞走零宽走廊拼接，
  含交点退化微扰重试与包含 / 分离退化处理。
- **吸附与参考线**：节点与圆弧端点吸附到模板网格、其它图形端点、模板轮廓顶点；
  水平 / 垂直对齐时绘制琥珀色参考线（`snapPoint` / `findGuides`）。
- **节点与圆弧**：拖拽节点、双击边线加节点、双击节点删除、逐节点 Catmull-Rom
  圆滑度（转三次贝塞尔）调节。
- **撤销 / 重做**：`src/core/history.ts` 快照式历史，容量 **100 步（≥ 要求的 50 步）**，
  变更前压栈，支持 Ctrl+Z / Ctrl+Shift+Z。
- **图层**：锁定（阻止该层编辑）、隐藏、透明度调节。
- **SVG 导出**：`src/core/svg-export.ts` 生成独立可打印 SVG，含模板、图形、标题栏。

### 3D 头模（`src/core/head3d.ts`）
- 半透明线框头颅 + 鼻突朝向标识 + 按脑区锚点球坐标分布的可点击区域。
- ArcRotateCamera 仅允许旋转 / 缩放（禁用平移，适配平板），闲置自动旋转。
- 点击脑区高亮并联动患者端说明面板；Babylon 经动态 `import()` 拆为独立 chunk，
  主应用包仅约 100 KB。

### 审核与规范
- 提交时与审核页均运行**自动预检**：缺解剖标注、颜色不符配色规范即时提示。
- 审核清单逐条「通过 / 不符」，**退回必须填写至少一条具体修改项**，否则无法提交。
- 配色规范是编辑端取色与审核预检的唯一数据源，后台改色全局生效。

### 患者端与统计
- 分享链接（令牌）推送到病房平板，患者旋转 3D、点脑区看通俗说明与风险。
- 查看时长与打开脑区上报为会话记录，统计页计算各医生提交量、退回率（分级标色）
  与患者端平均查看时长 / 时长分布。

## 测试

```bash
npm run test:geometry     # 28 项几何引擎单测（布尔并/差、吸附、参考线、圆滑路径）
npm run test:smoke        # Headless Chrome 七路由零控制台错误 + 截图
npm run test:interaction  # 编辑器绘图/锁定/撤销容量/SVG 导出交互测试
```

CDP 测试需要本机 Chrome（默认探测 `Program Files/Google/Chrome`）并先启动 `npm run dev`，
脚本通过 `http://127.0.0.1:5173`（或 Vite 实际端口）连接，每次自动清空 localStorage 隔离数据。
截图输出到 `tests/shots/`。

## 目录结构

```
src/
├─ core/            引擎与基础设施
│  ├─ geometry-base.ts   吸附/参考线/圆滑路径/面积/线段求交
│  ├─ boolean.ts         Greiner–Hormann 布尔裁剪
│  ├─ geometry.ts        几何统一出口
│  ├─ history.ts         撤销重做栈（100 步）
│  ├─ store.ts           全局状态 + 持久化 + 预检 + 统计
│  ├─ router.ts          Hash 路由
│  ├─ svg-export.ts      SVG 序列化与下载
│  └─ head3d.ts          Babylon 三维头模
├─ data/seed.ts     模板/术语/配色/示例图示/会话种子数据
├─ editor/          画布引擎
├─ ui/              八个 Web Components（含 app-root 外壳）
├─ types.ts         领域模型
└─ main.ts          组件注册入口
tests/             单测与 CDP 浏览器测试
```

## 说明与边界

- 数据存于浏览器 localStorage，刷新保留；`Store.resetToSeed()` 可恢复种子数据。
- 布尔引擎对共线 / 顶点相交等退化情形采用确定性微扰重试，极端自相交多边形不在目标范围。
- 无后端，分享链接与「推送病房平板」为前端模拟；接入真实服务时替换 `store` 的持久化层即可。
