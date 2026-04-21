# 零构建静态站（无需 npm）

本目录可整体复制到任意位置，**不依赖 Node / Vite**，用系统自带方式起一个本地 HTTP 即可在浏览器中使用。

## 为什么不能用「双击打开 HTML」？

现代浏览器（尤其 Chrome）对 **`file://` 协议**下的 `fetch()` 读取本地 `.json` / `.md` 有安全限制，页面往往无法加载数据。

## 推荐：Python 一键起服务

在本目录（`standalone`）下执行：

```bash
python3 -m http.server 8765
```

浏览器打开：**http://localhost:8765/**

（若 8765 被占用，可换其他端口。）

## macOS 可选

```bash
cd "$(dirname "$0")"
python3 -m http.server 8765
```

将上述两行保存为 `serve.command` 并 `chmod +x serve.command`，可双击在终端里启动（需本机已装 Python 3）。

## 文件说明

| 文件 | 作用 |
|------|------|
| `index.html` | 首页入口 |
| `trends.html` + `trends.js` + `trends.css` | 趋势图，读 `./data.json`（含可选 `bodyGoals`）；「预测说明」选取区间时忽略换算 > 3.5 kg/周的过快降幅段，不输出记录斜率外推。 |
| `report.html` / `log.html` / `goals.html` | 渲染 `report.md`、`training-log.md`、`goals.md` |
| `data.json` | 图表数据（与主工程 `public/` 可手动同步） |

更新数据时，直接编辑 `data.json` 或 `.md`，刷新页面即可（趋势图需点「重新加载数据」）。
