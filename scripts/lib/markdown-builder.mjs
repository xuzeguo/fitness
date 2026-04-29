/**
 * Markdown 生成模块
 * 提供训练日志 Markdown 文档的生成功能
 */

import { formatDuration, formatBodyFat } from "./data-transformer.mjs";
import { getCsvValue } from "./csv-parser.mjs";

/**
 * 生成 Markdown 表格分隔行
 * @param {Array<string>} columns - 列数组
 * @returns {string} 分隔行
 */
function mdSeparator(columns) {
  return "| " + columns.map(() => "------").join(" | ") + " |";
}

/**
 * 生成训练记录表格
 * @param {Array<object>} rows - 训练记录行
 * @returns {Array<string>} Markdown 行数组
 */
export function buildTrainingTable(rows) {
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
  out.push(mdSeparator(keys));

  for (const row of rows) {
    const cells = rowKeys.map((k) => {
      let v = row[k] ?? "";
      if (k === "运动时长") v = formatDuration(v);
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

  return out;
}

/**
 * 生成进店记录表格
 * @param {Array<Array<string>>} gymRows - 进店记录行
 * @returns {Array<string>} Markdown 行数组
 */
export function buildGymVisitsTable(gymRows) {
  const out = [];
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

  return out;
}

/**
 * 生成体重体脂表格
 * @param {Array<object>} bodyMetrics - 体重体脂数据
 * @returns {Array<string>} Markdown 行数组
 */
export function buildBodyMetricsTable(bodyMetrics) {
  const out = [];
  out.push("## 体重与体脂记录（汇总）");
  out.push("");
  out.push("| 序号 | 日期 | 体重 | 体脂率 |");
  out.push("|------|------|------|--------|");

  bodyMetrics.forEach((r, i) => {
    const w = r["体重kg"];
    const wStr =
      typeof w === "number"
        ? (w % 1 === 0 ? w.toFixed(1) : String(w)) + "kg"
        : `${w}kg`;
    out.push(`| ${i + 1} | ${r["日期"]} | ${wStr} | ${formatBodyFat(r["体脂率"])} |`);
  });

  out.push("");

  return out;
}

/**
 * 生成围度记录表格
 * @param {Array<Array<string>>} girthRows - 围度记录行
 * @returns {Array<string>} Markdown 行数组
 */
export function buildGirthTable(girthRows) {
  const out = [];
  out.push("## 围度记录（汇总）");
  out.push("");
  out.push(
    "| 序号 | 日期 | 脖子（最细处） | 胸围（乳头水平，深呼吸后放松） | 臂围（放松臂，二头最粗处） | 腰围（肚脐水平） | 臀围（最宽处） | 大腿根部 |",
  );
  out.push(
    "|------|------|----------------|----------------------------------|------------------------------|------------------|----------------|----------|",
  );

  girthRows.forEach((row, i) => {
    if (!row[0]) return;
    out.push(`| ${i + 1} | ${row.map((c) => (c == null || c === "" ? "–" : c)).join(" | ")} |`);
  });

  out.push("");
  out.push("");

  return out;
}

/**
 * 生成完整的训练日志 Markdown
 * @param {object} options - 配置选项
 * @returns {string} Markdown 内容
 */
export function buildTrainingLogMarkdown(options) {
  const { trainingRows, gymRows, bodyMetrics, girthRows } = options;

  const sections = [
    ...buildTrainingTable(trainingRows),
    ...buildGymVisitsTable(gymRows),
    ...buildBodyMetricsTable(bodyMetrics),
    ...buildGirthTable(girthRows),
  ];

  return sections.join("\n");
}
