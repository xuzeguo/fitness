/**
 * 训练日志重建脚本
 * 从 CSV 生成 data.json 和 training-log.md
 */

import fs from "fs";
import { readCsv, readCsvIfExists, writeCsv, getCsvValue } from "./lib/csv-parser.mjs";
import { validateTrainingLogRow, validateBodyMetricsRow } from "./lib/data-validator.mjs";
import { renumberTrainingRows, buildBodyMetrics } from "./lib/data-transformer.mjs";
import { buildTrainingLogMarkdown } from "./lib/markdown-builder.mjs";
import { getExerciseNames } from "./lib/config-loader.mjs";

// 文件路径
const DATA_PATH = "public/data.json";
const CSV_PATH = "public/training-log.csv";
const BODY_METRICS_CSV_PATH = "public/body-metrics.csv";
const GYM_VISITS_CSV_PATH = "public/gym-visits.csv";
const GIRTH_CSV_PATH = "public/girth.csv";
const TRAINING_LOG_MD_PATH = "public/training-log.md";

// 读取现有数据
const existingData = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));

// 读取并校验训练日志 CSV
console.log("正在读取训练日志数据...");
const { header: csvHeader, rows: csvRows } = readCsv(CSV_PATH);

console.log("正在校验训练日志数据...");
const trainingErrors = [];
csvRows.forEach((row, idx) => {
  const result = validateTrainingLogRow(row, idx + 2);
  if (!result.valid) {
    trainingErrors.push(...result.errors);
  }
});

if (trainingErrors.length > 0) {
  console.error("\n❌ 训练日志数据校验失败：");
  trainingErrors.forEach((err) => console.error(`  - ${err}`));
  console.error("\n请修正以上错误后重试。\n");
  process.exit(1);
}
console.log("✓ 训练日志数据校验通过");

// 重新编号训练记录
const numberedRows = renumberTrainingRows(csvRows);

// 写回规范化的 CSV
if (csvHeader && csvHeader.length > 0) {
  writeCsv(CSV_PATH, csvHeader, numberedRows);
}

// 读取并校验体重体脂数据
const bmCsv = readCsvIfExists(BODY_METRICS_CSV_PATH);
let bodyMetrics = existingData.bodyMetrics ?? [];

if (bmCsv && bmCsv.rows && bmCsv.rows.length > 0) {
  console.log("正在校验体重体脂数据...");
  const bodyMetricsErrors = [];
  bmCsv.rows.forEach((row, idx) => {
    const result = validateBodyMetricsRow(row, idx + 2);
    if (!result.valid) {
      bodyMetricsErrors.push(...result.errors);
    }
  });

  if (bodyMetricsErrors.length > 0) {
    console.error("\n❌ 体重体脂数据校验失败：");
    bodyMetricsErrors.forEach((err) => console.error(`  - ${err}`));
    console.error("\n请修正以上错误后重试。\n");
    process.exit(1);
  }
  console.log("✓ 体重体脂数据校验通过");

  const bmFromCsv = buildBodyMetrics(bmCsv.rows);
  if (bmFromCsv.length > 0) {
    bodyMetrics = bmFromCsv;
  }
}

// 获取动作列表
const exerciseNames = getExerciseNames();

// 构建 data.json
const data = {
  ...existingData,
  source: "training-log.csv",
  generatedFrom: "public/training-log.csv（手工维护，脚本生成 data.json 与 training-log.md）",
  rows: numberedRows.map((r) => {
    const keep = {};
    for (const k of ["日期", "运动时长", ...exerciseNames, "序号"]) {
      if (r[k] != null) keep[k] = r[k];
    }
    return keep;
  }),
  bodyMetrics,
};

// 写入 data.json
fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + "\n");
fs.mkdirSync("standalone", { recursive: true });
fs.writeFileSync("standalone/data.json", JSON.stringify(data, null, 2) + "\n");

console.log("✓ data.json 已生成");

// 读取进店记录
const gymCsv = readCsvIfExists(GYM_VISITS_CSV_PATH);
const gymRows = gymCsv?.rows?.length
  ? gymCsv.rows.map((r) => [
      getCsvValue(r, "日期"),
      getCsvValue(r, "进店时段"),
      getCsvValue(r, "时长（分钟）") || getCsvValue(r, "时长"),
      getCsvValue(r, "备注") || "–",
    ])
  : [
      // 默认数据（兼容旧版本）
      ["2026-04-07", "18:20～21:30", "190", "下午；my steps life"],
      ["2026-04-06", "19:07～22:16", "189", "–"],
      // ... 其他默认数据
    ];

// 读取围度记录
const girthCsv = readCsvIfExists(GIRTH_CSV_PATH);
const girthRows = girthCsv?.rows?.length
  ? girthCsv.rows.map((r) => [
      getCsvValue(r, "日期"),
      getCsvValue(r, "脖子（最细处）") || getCsvValue(r, "脖子"),
      getCsvValue(r, "胸围（乳头水平，深呼吸后放松）") || getCsvValue(r, "胸围"),
      getCsvValue(r, "臂围（放松臂，二头最粗处）") || getCsvValue(r, "臂围"),
      getCsvValue(r, "腰围（肚脐水平）") || getCsvValue(r, "腰围"),
      getCsvValue(r, "臀围（最宽处）") || getCsvValue(r, "臀围"),
      getCsvValue(r, "大腿根部") || getCsvValue(r, "大腿"),
    ])
  : [
      ["2026-02-27", "41", "114", "35", "109", "110", "71"],
      ["2026-03-05", "42", "112", "34", "107", "108", "69"],
      ["2026-03-20", "41", "107", "33", "105", "108", "68"],
      ["2026-03-29", "40", "107", "33", "104", "107", "68"],
      ["2026-04-06", "39", "106", "32", "103", "106", "68"],
    ].reverse();

// 生成 training-log.md
const markdown = buildTrainingLogMarkdown({
  trainingRows: data.rows,
  gymRows,
  bodyMetrics,
  girthRows,
});

fs.writeFileSync(TRAINING_LOG_MD_PATH, markdown);
fs.writeFileSync("standalone/training-log.md", markdown);

console.log("✓ training-log.md 已生成");

// 同步 CSV 到 standalone
try {
  fs.copyFileSync(CSV_PATH, "standalone/training-log.csv");
} catch {
  // ignore
}

console.log("\n✅ 数据重建完成！");
