# 健身数据（前端）

与仓库根目录其他碎碎念文档相对独立：静态数据在 `public/`，页面用 Vite 开发与打包。

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
- **`/trends.html`**：训练趋势（`trends.html` + `src/trends.js`）
- **`/report.html`**：减重报告（`report.html` + `src/report.js`）
- **`/log.html`**：训练记录原文（`log.html` + `src/log.js`）
- **`/goals.html`**：目标（`goals.html` + `src/goals.js`）

### 数据与内容（public/ → 运行时加载）

所有数据/正文都以**静态文件**形式放在 `public/`，由浏览器在运行时用 `fetch()` 读取：

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
| `/trends.html` | 训练趋势（ECharts；体重图含目标区间、预测线与下方「预测说明」；选取说明区间时忽略换算 > 3.5 kg/周的过快降幅段，不输出按记录斜率外推的 kg/周 与到达日） |
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

- 图表数据：`public/data.json`（含 `rows`、`bodyMetrics` 与可选 `bodyGoals`；趋势页「体重与体脂」图会按 `bodyGoals.weightKg.min` 与每周 −0.5kg 生成粉色 **目标体重预测** 虚线，体脂为紫色 **目标体脂预测** 虚线。图下「预测说明」选取区间时，若相邻不同日期段换算速降超过 **3.5 kg/周** 则跳过该段（折线仍全部显示）；正文不再给出按记录斜率换算的 kg/周 或外推到达日，仅保留参考节奏下的粗算）
- 报告正文：`public/report.md`
- 训练手账：`public/training-log.md` / `public/training-log.csv`
- 目标正文：`public/goals.md`

可与仓库根目录的 `健身训练记录表.md`、`健身减重报告.md` 手动同步，或使用脚本复制覆盖。

## 旧目录说明

历史版本曾放在 `../fitness-trends/`，现已迁入本项目；请优先使用本目录。
