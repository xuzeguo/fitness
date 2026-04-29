import fs from "fs";
import {
  validateDate,
  validateWeight,
  validateBodyFat,
  validateTrainingLogRow,
  validateBodyMetricsRow,
} from "./lib/data-validator.mjs";

function parseCsvLine(line) {
  // Minimal CSV parser supporting double quotes.
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        const next = line[i + 1];
        if (next === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQ = true;
      continue;
    }
    if (ch === ",") {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function safeReadText(path) {
  try {
    return fs.readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function readTrainingCsv(path) {
  const raw = fs.readFileSync(path, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { header: [], rows: [] };
  const header = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (!cols.some((c) => String(c).trim() !== "")) continue;
    const row = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = (cols[j] ?? "").trim();
    }
    rows.push(row);
  }
  return { header, rows };
}

function readCsvIfExists(path) {
  const raw = safeReadText(path);
  if (raw == null) return null;
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { header: [], rows: [] };
  const header = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (!cols.some((c) => String(c).trim() !== "")) continue;
    const row = {};
    for (let j = 0; j < header.length; j++) row[header[j]] = (cols[j] ?? "").trim();
    rows.push(row);
  }
  return { header, rows };
}

function getCsvVal(row, key) {
  if (!row) return "";
  if (key in row) return row[key];
  // tolerate BOM / extra spaces
  const normKey = String(key).trim();
  for (const k of Object.keys(row)) {
    if (String(k).trim() === normKey) return row[k];
  }
  return "";
}

function buildRowsForDataJson(csvRows) {
  // Use CSV order as "latest first", and re-number 序号 starting from 1.
  return csvRows.map((r, idx) => {
    const out = { ...r };
    out["序号"] = String(idx + 1);
    return out;
  });
}

const dataPath = "public/data.json";
const csvPath = "public/training-log.csv";
const bodyMetricsCsvPath = "public/body-metrics.csv";
const gymVisitsCsvPath = "public/gym-visits.csv";
const girthCsvPath = "public/girth.csv";

const existing = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const { header: csvHeader, rows: csvRows } = readTrainingCsv(csvPath);

// 校验训练日志数据
console.log("正在校验训练日志数据...");
const trainingErrors = [];
csvRows.forEach((row, idx) => {
  const result = validateTrainingLogRow(row, idx + 2); // +2 因为第1行是表头
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

const newRows = buildRowsForDataJson(csvRows);

function csvEscapeCell(v) {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeTrainingCsvNormalized({ path, header, rows }) {
  const out = [];
  out.push(header.join(","));
  for (let i = 0; i < rows.length; i++) {
    const r = { ...rows[i], 序号: String(i + 1) };
    out.push(header.map((h) => csvEscapeCell(r[h] ?? "")).join(","));
  }
  fs.writeFileSync(path, out.join("\n") + "\n");
}

// Normalize CSV 序号 so it stays consistent (latest first).
if (csvHeader && csvHeader.length > 0) {
  writeTrainingCsvNormalized({ path: csvPath, header: csvHeader, rows: newRows });
}

function toNumOrNull(s) {
  if (s == null) return null;
  const t = String(s).trim();
  if (!t || t === "–" || t === "-" || t.toLowerCase() === "null") return null;
  const n = Number(t.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function buildBodyMetricsFromCsvRows(csvRows) {
  // CSV order is assumed "latest first" (same as training-log.csv)
  const out = [];
  for (const r of csvRows) {
    const date = String(r["日期"] ?? "").trim();
    const w = toNumOrNull(r["体重kg"]);
    const bf = toNumOrNull(r["体脂率"]);
    if (!date || w == null) continue;
    out.push({
      日期: date,
      体重kg: w,
      体脂率: bf,
    });
  }
  return out;
}

const bmCsv = readCsvIfExists(bodyMetricsCsvPath);

// 校验体重体脂数据
if (bmCsv && bmCsv.rows && bmCsv.rows.length > 0) {
  console.log("正在校验体重体脂数据...");
  const bodyMetricsErrors = [];
  bmCsv.rows.forEach((row, idx) => {
    const result = validateBodyMetricsRow(row, idx + 2); // +2 因为第1行是表头
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
}

const bmFromCsv = bmCsv ? buildBodyMetricsFromCsvRows(bmCsv.rows) : null;
const nextBodyMetrics =
  bmFromCsv && bmFromCsv.length > 0 ? bmFromCsv : existing.bodyMetrics ?? [];

const data = {
  ...existing,
  source: "training-log.csv",
  generatedFrom: "public/training-log.csv（手工维护，脚本生成 data.json 与 training-log.md）",
  rows: newRows.map((r) => {
    // Ensure we only keep the columns we expect; tolerate extra columns.
    const keep = {};
    for (const k of [
      "日期",
      "运动时长",
      "坐立卷腹机",
      "曲臂伸机",
      "坐姿器械侧平举",
      "卧推",
      "高位下拉机",
      "腿屈伸机",
      "臀桥/臀桥机",
      "肩部推举",
      "蝴蝶夹胸",
      "胸飞鸟",
      "反向飞鸟",
      "坐姿划船",
      "硬拉",
      "背靠哈克深蹲",
      "正面哈克深蹲",
      "髋外展/内收",
      "俯身倒蹬",
      "动物流",
      "划船机(配速/距离/功率/时间/频率)",
      "序号",
    ]) {
      if (r[k] != null) keep[k] = r[k];
    }
    return keep;
  }),
  bodyMetrics: nextBodyMetrics,
};

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + "\n");
fs.mkdirSync("standalone", { recursive: true });
fs.writeFileSync("standalone/data.json", JSON.stringify(data, null, 2) + "\n");

function fmtDur(s) {
  let t = String(s);
  t = t.replace(/^(\d+)分钟$/, "$1 分钟");
  t = t.replace(/^约(\d+)分钟/, "约 $1 分钟");
  return t;
}

function fmtBf(bf) {
  if (bf == null) return "–";
  const n = Number(bf);
  if (!Number.isFinite(n)) return String(bf);
  return (n % 1 === 0 ? n.toFixed(1) : String(n)) + "%";
}

function mdSep(cols) {
  return "| " + cols.map(() => "------").join(" | ") + " |";
}

const keys = [
  "序号",
  "日期",
  "运动时长",
  "坐立卷腹机",
  "曲臂伸机",
  "坐姿器械侧平举",
  "卧推",
  "高位下拉机",
  "腿屈伸机",
  "臀桥/臀桥机",
  "肩部推举",
  "蝴蝶夹胸",
  "胸飞鸟",
  "反向飞鸟",
  "坐姿划船",
  "硬拉",
  "背靠哈克深蹲",
  "正面哈克深蹲",
  "髋外展/内收",
  "俯身倒蹬",
  "动物流",
  "划船机（配速 / 距离 / 功率 / 时间 / 频率）",
];
const rowKeys = [
  "序号",
  "日期",
  "运动时长",
  "坐立卷腹机",
  "曲臂伸机",
  "坐姿器械侧平举",
  "卧推",
  "高位下拉机",
  "腿屈伸机",
  "臀桥/臀桥机",
  "肩部推举",
  "蝴蝶夹胸",
  "胸飞鸟",
  "反向飞鸟",
  "坐姿划船",
  "硬拉",
  "背靠哈克深蹲",
  "正面哈克深蹲",
  "髋外展/内收",
  "俯身倒蹬",
  "动物流",
  "划船机(配速/距离/功率/时间/频率)",
];

const out = [];
out.push("## 健身训练记录表（汇总）");
out.push("");
out.push("| " + keys.join(" | ") + " |");
out.push(mdSep(keys));
for (const row of data.rows) {
  const cells = rowKeys.map((k) => {
    let v = row[k] ?? "";
    if (k === "运动时长") v = fmtDur(v);
    return v;
  });
  out.push("| " + cells.join(" | ") + " |");
}
out.push("");
out.push("> 说明：");
out.push(
  '> - 「有/无」表示是否做了该项拉伸或动作；空缺用「–」表示当次未记录或未做。',
);
out.push(
  "> - 表格按**日历日期倒序**排列（最新训练日在最上方）；原误标为 03-16 的短训练已更正为 **03-26**（250m×4）；原标为 03-23 的递增倒蹬+长划船已更正为 **03-29**。",
);
out.push(
  "> - **04-08** 为混训日：卷腹机/弯举/斜下拉/腿屈伸/深蹲/胸推 + 滑雪风阻机 + 战绳；有氧与力量分项记在「划船机」列作补充说明。",
);
out.push(
  "> - **2026-04-07～2026-05-14** 在 **my steps life** 健身房训练（见下「进店记录」场馆说明）。",
);
out.push("> - 你可以继续按这一行格式，在表格**上方**追加新的训练记录（保持倒序）。");
out.push("");
out.push("## 健身房进店记录（汇总）");
out.push("");
out.push("来源：门店/App 记录；**按日期倒序**（同日多次进店按时段自上而下）。时长为店内停留约计。");
out.push("");
out.push(
  "**场馆说明：** **2026-04-07～2026-05-14** 期间力量/有氧训练改在 **my steps life** 健身房进行（自 4 月 7 日起切换，至 5 月 14 日止；之后若有变更再记）。",
);
out.push("");
out.push("| 序号 | 日期 | 进店时段 | 时长（分钟） | 备注 |");
out.push("|------|------|----------|--------------|------|");

const gymCsv = readCsvIfExists(gymVisitsCsvPath);
const gymRows = gymCsv?.rows?.length
  ? gymCsv.rows.map((r) => [
      String(getCsvVal(r, "日期") ?? "").trim(),
      String(getCsvVal(r, "进店时段") ?? "").trim(),
      String(getCsvVal(r, "时长（分钟）") ?? getCsvVal(r, "时长") ?? "").trim(),
      String(getCsvVal(r, "备注") ?? "").trim() || "–",
    ])
  : [
      // 兼容：若你暂时没建 CSV，就继续沿用这份默认数据（不影响现有输出）
      ["2026-04-07", "18:20～21:30", "190", "下午；my steps life"],
      ["2026-04-06", "19:07～22:16", "189", "–"],
      ["2026-04-05", "19:41～21:39", "119", "小鸭卡"],
      ["2026-04-04", "19:18～20:34", "77", "小鸭卡"],
      ["2026-04-03", "20:24～22:18", "115", "小鸭卡"],
      ["2026-03-29", "16:53～19:22", "149", "小鸭卡"],
      ["2026-03-27", "20:04～22:06", "123", "小鸭卡"],
      ["2026-03-26", "19:18～21:46", "148", "返场"],
      ["2026-03-26", "19:14～19:14", "1", "小鸭卡"],
      ["2026-03-25", "19:21～21:22", "122", "小鸭卡"],
      ["2026-03-24", "19:58～21:45", "107", "小鸭卡"],
      ["2026-03-23", "17:25～19:31", "126", "小甲卡"],
      ["2026-03-20", "19:29～20:28", "59", "小电卡"],
      ["2026-03-19", "19:33～21:45", "133", "小多卡"],
      ["2026-03-18", "19:55～21:44", "110", "小鸭卡"],
      ["2026-03-17", "20:02～21:54", "113", "小鸭卡"],
      ["2026-03-16", "22:00～22:57", "58", "小鸭卡"],
      ["2026-03-14", "21:45～次日 00:24", "160", "小用卡"],
      ["2026-03-13", "19:39～21:28", "109", "小鸭卡"],
      ["2026-03-12", "19:36～21:47", "131", "小卡"],
      ["2026-03-11", "19:45～21:48", "123", "小鸭卡"],
      ["2026-03-09", "19:40～21:33", "113", "小鸭卡"],
      ["2026-03-08", "18:58～20:35", "98", "小鸭卡"],
      ["2026-03-07", "19:36～21:40", "124", "小鸭卡"],
      ["2026-03-06", "19:08～20:48", "100", "小卡"],
      ["2026-03-05", "20:54～22:55", "122", "小鸭卡"],
      ["2026-03-03", "19:54～21:54", "120", "小鸭卡"],
      ["2026-03-02", "19:44～21:41", "117", "小鸭卡"],
      ["2026-02-28", "20:14～22:07", "113", "小鸭卡"],
      ["2026-02-27", "19:30～21:12", "102", "小鸭卡"],
      ["2026-02-24", "19:52～21:54", "123", "返场"],
      ["2026-02-24", "19:40～19:47", "7", "小鸭卡"],
      ["2026-02-22", "19:18～21:09", "111", "小鸭卡"],
      ["2026-02-20", "20:17～22:24", "128", "小鸭卡"],
      ["2026-02-19", "15:34～17:07", "93", "小电卡"],
      ["2026-02-18", "18:09～19:56", "108", "–"],
    ];

gymRows.forEach((row, i) => {
  if (!row[0]) return;
  out.push(`| ${i + 1} | ${row[0]} | ${row[1] || "–"} | ${row[2] || "–"} | ${row[3] || "–"} |`);
});
out.push("");
out.push(
  "> 购卡、金额等以门店系统为准；上表「备注」仅摘录你提供的卡别/返场字样。",
);
out.push("");
out.push("");
out.push("## 体重与体脂记录（汇总）");
out.push("");
out.push("| 序号 | 日期 | 体重 | 体脂率 |");
out.push("|------|------|------|--------|");

const bmRev = [...data.bodyMetrics];
bmRev.forEach((r, i) => {
  const w = r["体重kg"];
  const wStr =
    typeof w === "number"
      ? (w % 1 === 0 ? w.toFixed(1) : String(w)) + "kg"
      : `${w}kg`;
  out.push(`| ${i + 1} | ${r["日期"]} | ${wStr} | ${fmtBf(r["体脂率"])} |`);
});

out.push("");
out.push("## 围度记录（汇总）");
out.push("");
out.push(
  "| 序号 | 日期 | 脖子（最细处） | 胸围（乳头水平，深呼吸后放松） | 臂围（放松臂，二头最粗处） | 腰围（肚脐水平） | 臀围（最宽处） | 大腿根部 |",
);
out.push(
  "|------|------|----------------|----------------------------------|------------------------------|------------------|----------------|----------|",
);

const girthCsv = readCsvIfExists(girthCsvPath);
const girthRows = girthCsv?.rows?.length
  ? girthCsv.rows
      .map((r) => [
        String(getCsvVal(r, "日期") ?? "").trim(),
        String(getCsvVal(r, "脖子（最细处）") ?? getCsvVal(r, "脖子") ?? "").trim(),
        String(getCsvVal(r, "胸围（乳头水平，深呼吸后放松）") ?? getCsvVal(r, "胸围") ?? "").trim(),
        String(getCsvVal(r, "臂围（放松臂，二头最粗处）") ?? getCsvVal(r, "臂围") ?? "").trim(),
        String(getCsvVal(r, "腰围（肚脐水平）") ?? getCsvVal(r, "腰围") ?? "").trim(),
        String(getCsvVal(r, "臀围（最宽处）") ?? getCsvVal(r, "臀围") ?? "").trim(),
        String(getCsvVal(r, "大腿根部") ?? getCsvVal(r, "大腿") ?? "").trim(),
      ])
      // 这里希望“越新越靠前”，但你 CSV 的习惯可能是最新在上，所以不强行 reverse；按你文件顺序出表更直观
  : [
      ["2026-02-27", "41", "114", "35", "109", "110", "71"],
      ["2026-03-05", "42", "112", "34", "107", "108", "69"],
      ["2026-03-20", "41", "107", "33", "105", "108", "68"],
      ["2026-03-29", "40", "107", "33", "104", "107", "68"],
      ["2026-04-06", "39", "106", "32", "103", "106", "68"],
    ].reverse();

girthRows.forEach((row, i) => {
  if (!row[0]) return;
  out.push(`| ${i + 1} | ${row.map((c) => (c == null || c === "" ? "–" : c)).join(" | ")} |`);
});

out.push("");
out.push("");

fs.writeFileSync("public/training-log.md", out.join("\n"));
fs.writeFileSync("standalone/training-log.md", out.join("\n"));

// Keep standalone CSV in sync (public is the source of truth).
try {
  fs.copyFileSync(csvPath, "standalone/training-log.csv");
} catch {
  // ignore
}
