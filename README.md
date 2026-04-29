# 健身数据管理系统

与仓库根目录其他碎碎念文档相对独立：静态数据在 `public/`，页面用 Vite 开发与打包。

## ✨ 最新优化（2026-04）

本项目经过系统性优化，大幅提升了数据录入效率和代码可维护性：

- ✅ **数据校验**：自动校验日期、体重、体脂、训练数据，防止录入错误
- ✅ **配置文件**：统一管理动作列表、评分权重、校验规则
- ✅ **脚本重构**：主脚本代码减少 66%（485 → 162 行），模块化设计
- ✅ **Web 表单**：可视化数据录入页面，录入时间从 10 分钟降至 2 分钟
- ✅ **权重调整**：综合评分权重可自定义，实时更新图表

详见 [OPTIMIZATION_PLAN.md](./OPTIMIZATION_PLAN.md) 查看完整优化计划。

## 技术架构与实现摘要（项目总览）

### 形态与技术栈

- **应用形态**：多页面静态站（MPA），每个页面一个 HTML 入口 + 一个 JS module。
- **开发/构建**：Vite（开发服务器 + Rollup 打包）。
- **运行时依赖**：
  - **Markdown 渲染**：`marked`（被 Vite 打包进页面脚本）
  - **图表**：ECharts（趋势页在 `trends.html` 通过 CDN `<script>` 引入）
- **运行时环境**：纯浏览器（不需要 Node）。Node 仅用于本地开发与打包阶段。

### 路由/页面入口（多入口构建）

项目通过 `vite.config.js` 配置多入口打包，构建输出为多个页面：

- **`/`**：首页（`index.html`）
- **`/entry.html`**：数据录入（`entry.html` + `src/entry.js`）⭐ 新增
- **`/trends.html`**：训练趋势（`trends.html` + `src/trends.js`）
- **`/report.html`**：减重报告（`report.html` + `src/report.js`）
- **`/log.html`**：训练记录原文（`log.html` + `src/log.js`）
- **`/goals.html`**：目标（`goals.html` + `src/goals.js`）

### 数据与内容（public/ → 运行时加载）

所有数据/正文都以**静态文件**形式放在 `public/`，由浏览器在运行时用 `fetch()` 读取：

- **配置文件**：`public/config.json`（动作列表、评分权重、校验规则）⭐ 新增
- **图表数据**：`public/data.json`
- **正文 Markdown**：`public/report.md`、`public/training-log.md`、`public/goals.md`

Vite 的约定是：`public/` 下文件会在构建时被**原样复制到 `dist/` 根目录**，因此打包后仍可通过相对路径被 `fetch()` 正常读取。

### Markdown 如何“转换”为页面内容（无需 Node）

本项目对 Markdown 的处理是 **浏览器运行时渲染**（不是在构建阶段把 Markdown 转成 JS 数据）：

- 页面脚本在浏览器中 `fetch(BASE_URL + xxx.md)` 获取 Markdown **文本**
- 用 `marked.parse(text)` 转成 **HTML 字符串**
- 写入页面容器（`#content`）的 `innerHTML`

这条链路只依赖浏览器 API + `marked`，因此在 `dist/` 中运行不需要 Node。

### 打包后为什么路径仍然正确（base 与 BASE_URL）

已配置 `base: './'`，并在代码里通过 `import.meta.env.BASE_URL` 拼接静态资源路径（例如 `data.json` / `report.md`）。

- **构建时**：Vite 会把 `import.meta.env.BASE_URL` 替换为实际 base 前缀（这里为相对路径）。
- **运行时**：浏览器使用相对路径从同目录加载 `.md/.json`，适配子目录部署与本地静态服务。

### 运行注意（为何不要 file:// 双击）

主流浏览器对 `file://` 下的 `fetch()` 读取本地 `.json/.md` 有安全限制，可能导致数据无法加载。请用任意静态 HTTP 服务打开目录（开发用 `npm run dev`；或 `standalone/` 用 `python3 -m http.server`）。

## 页面

| 路径 | 说明 |
|------|------|
| `/` | 首页入口 |
| `/entry.html` | **数据录入**（可视化表单，自动填充上次数据，生成 CSV）⭐ 新增 |
| `/trends.html` | 训练趋势（ECharts；支持自定义评分权重；体重图含目标区间、预测线与下方「预测说明」） |
| `/report.html` | 减重报告（渲染 `public/report.md`） |
| `/log.html` | 训练记录原文（渲染 `public/training-log.md`） |
| `/goals.html` | 目标（渲染 `public/goals.md`） |

## 开发

```bash
cd fitness
npm install
npm run dev
```

浏览器访问终端输出的本地地址（一般为 `http://localhost:5173`）。

## 构建

```bash
npm run build
npm run preview
```

产物在 `dist/`，可部署到任意静态托管。已设置 `base: './'`，资源为**相对路径**，适合子目录部署或本地用静态服务器打开整个 `dist/`。

## 不装 Node、不用 npm：纯静态 `standalone/`

`standalone/` 为**零构建**副本：复制到 U 盘或任意目录后，在该目录执行：

```bash
python3 -m http.server 8765
```

浏览器访问 `http://localhost:8765/` 即可。**不要**依赖「双击 HTML 用 `file://` 打开」：主流浏览器会拦截对本地 `data.json` / `.md` 的 `fetch`，数据无法加载。详见 `standalone/README.md`。

## 数据维护

### 🚀 快速录入（推荐）

访问 `/entry.html` 使用可视化表单录入训练数据：

1. 自动填充今天的日期
2. 显示上次训练数据作为参考
3. 一键复制上次训练记录
4. 填写完成后点击「生成 CSV」
5. 下载生成的 CSV 文件，替换 `public/training-log.csv`
6. 运行 `npm run rebuild:data` 更新数据

**优势：** 录入时间从 10 分钟降至 2 分钟，自动校验数据格式。

### 📝 手动维护（传统方式）

- **配置文件**：`config.json`（动作列表、评分权重、校验规则）
- 图表数据：`public/data.json`（含 `rows`、`bodyMetrics` 与可选 `bodyGoals`）
- 报告正文：`public/report.md`
- 训练手账：**只维护** `public/training-log.csv`，然后执行 `npm run rebuild:data` 自动生成/更新 `public/data.json` 与 `public/training-log.md`（并同步到 `standalone/`）
- 体重/体脂：推荐维护 `public/body-metrics.csv`（可选）；脚本会在重建时把它写回 `public/data.json.bodyMetrics`
- 进店记录：推荐维护 `public/gym-visits.csv`（可选）
- 围度记录：推荐维护 `public/girth.csv`（可选）
- 目标正文：`public/goals.md`

### ⚙️ 配置文件说明

`config.json` 统一管理系统配置：

```json
{
  "exercises": [
    {
      "name": "坐立卷腹机",
      "category": "核心",
      "unit": "kg",
      "enabled": true,
      "order": 1
    }
  ],
  "scoreWeights": {
    "strength": 0.5,
    "cardio": 0.35,
    "duration": 0.15
  },
  "validation": {
    "weight": { "min": 40, "max": 200 },
    "bodyFat": { "min": 5, "max": 50 }
  }
}
```

**修改配置后无需重新编译**，刷新页面即可生效。

### 初始化 / 一键导出历史数据到 CSV（推荐）

如果你希望把脚本内置的「进店记录/围度」历史数据导出到 CSV，并把 `data.json.bodyMetrics` 也导出到 `body-metrics.csv`（避免手抄），执行：

```bash
npm run seed:csv
```

说明：
- 该命令**只在 CSV 为空或只有表头时**写入数据；如果你已经手动维护了 CSV，不会覆盖。
- 执行后会自动同步 `standalone/`。

### 高效更新训练数据（推荐流程）

1. **只编辑一个文件**：`public/training-log.csv`
   - 在表头下一行插入一条新记录（保持**最新在上**）。
   - `序号` 可随便填（脚本会按 CSV 当前顺序自动重排为 1,2,3…）。
2. **一键生成并同步**：

```bash
npm run rebuild:data
```

该命令会从 `public/training-log.csv` 自动生成/覆盖：

- `public/data.json`（更新 `rows`，保留 `bodyMetrics/bodyGoals`）
- `public/training-log.md`
- `standalone/` 下对应副本（等价于再执行一次 `npm run sync:standalone`）

**输入格式建议**（便于趋势页解析）：

- 力量：尽量写 `20kg×14×4`；多个项目用 `；` 分隔；未做写 `未做` 或 `–`
- 划船机：尽量包含 `3000m 13:35.4 2:15.9/500m`（没有也可）

### 更新体重/体脂（bodyMetrics）

体重与体脂趋势图读取的是 `public/data.json` 里的 `bodyMetrics`。推荐更新方式如下（二选一）：

**方式 A（推荐，单一数据源）**：只维护 `public/body-metrics.csv`，然后执行 `npm run rebuild:data`（会自动写回 `data.json.bodyMetrics` 并同步 `standalone/`）。

**方式 B（兼容旧方式）**：继续手动改 `public/data.json.bodyMetrics`，然后执行 `npm run sync:standalone` 同步。

方式 B 的手动更新步骤：

1. 编辑 `public/data.json` 的 `bodyMetrics` 数组，在顶部或合适位置新增一条：
   - `日期`：`"MM-DD"`（例如 `"04-23"`；同一天多次测量可以写多条相同日期）
   - `体重kg`：数字（例如 `88.0`）
   - `体脂率`：数字（例如 `26.9`；没有可省略或写 `null`）
2. 如需调整目标区间，编辑 `public/data.json` 的 `bodyGoals`（可选）：
   - `weightKg.min/max`
   - `bodyFatPercent.min/max`
3. 同步到零构建副本：

```bash
npm run sync:standalone
```

说明：`npm run rebuild:data` **只会重建** `data.json.rows` 与 `training-log.md`，并**保留** `bodyMetrics/bodyGoals`，所以你可以放心先手改 `bodyMetrics`，再跑 `rebuild:data`。

可与仓库根目录的 `健身训练记录表.md`、`健身减重报告.md` 手动同步，或使用脚本复制覆盖。

## 旧目录说明

历史版本曾放在 `../fitness-trends/`，现已迁入本项目；请优先使用本目录。
