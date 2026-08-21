---
name: fitness-update
description: 更新健身数据（训练记录、体重体脂、围度、InBody扫描）到 CSV 和 JSON 文件
tags: [fitness, data-entry]
---

# 健身数据更新助手

这个 skill 帮助你快速更新四类健身数据：

## 1. 训练记录更新
- 文件：`public/training-log.csv` + `standalone/training-log.csv`
- 包含：日期、运动时长、各种训练动作（重量×次数×组数）、有氧记录

## 2. 体重体脂更新
- 文件：`public/body-metrics.csv` + `standalone/body-metrics.csv`
- 包含：日期、体重（kg）、体脂率（%）
- **重要**：同时更新 public 和 standalone 两个目录的文件

## 3. 围度测量更新
- 文件：`public/girth.csv`
- 包含：日期（YYYY-MM-DD）、脖子、胸围、臂围、腰围、臀围、大腿根部（单位：cm）

## 4. InBody 扫描数据更新
- 文件：`public/inbody.json` + `standalone/inbody.json`
- 包含完整的 InBody 体成分分析数据：
  - 基础指标：体重、BMI、体脂率、去脂体重、骨骼肌量、体脂肪量
  - 身体成分：细胞内水分、细胞外水分、总水分、蛋白质、无机盐
  - 节段分析：四肢和躯干的肌肉量和脂肪量
  - 代谢指标：基础代谢率、推荐热量摄入
  - 其他指标：内脏脂肪面积、InBody 评分、腰臀比、身体细胞量、SMI、相位角等
- **重要**：同时更新 public 和 standalone 两个目录的文件

## 使用方式

直接告诉我你要更新什么数据，例如：
- "今天训练了背部，高位下拉30kg×15×4"
- "今天体重82.3kg，体脂率24.1%"
- "今天测量围度：腰围88cm，臀围99cm"
- "今天做了 InBody 扫描，体重80.7kg，体脂率22%，骨骼肌35.4kg..."

我会：
1. 读取当前数据文件
2. 添加新记录（自动填充日期为今天，或使用你指定的日期）
3. 更新相应的 CSV/JSON 文件（同时更新 public 和 standalone）
4. 运行 `node scripts/rebuild-training-log-md.mjs` 重新生成 data.json 和 training-log.md
5. **自动更新 `public/report.md` 页面**（供 http://localhost:5175/report.html 展示的临床参考报告）
6. **自动调用 `/weight-loss-report` 生成最新的减重进度分析报告**

## 注意事项

- 日期格式：`MM-DD`（如 07-06）或 `YYYY-MM-DD`（如 2026-07-06）
- 训练动作格式：`重量kg×次数×组数`（如 30kg×15×4）
- 围度日期格式：`YYYY-MM-DD`（如 2026-07-06）
- InBody 数据需要完整的扫描报告信息
- 自动按日期排序
- 如果当天已有记录，会询问是否覆盖或追加
- **关键**：体重体脂和 InBody 数据必须同时更新 public 和 standalone 目录
