/**
 * 数据转换模块
 * 提供数据格式转换和处理功能
 */

/**
 * 转换数值或返回 null
 * @param {any} value - 输入值
 * @returns {number|null}
 */
export function toNumOrNull(value) {
  if (value == null) return null;
  const t = String(value).trim();
  if (!t || t === "–" || t === "-" || t.toLowerCase() === "null") return null;
  const n = Number(t.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * 重新编号训练日志行（最新在上）
 * @param {Array<object>} rows - CSV 行数组
 * @returns {Array<object>} 重新编号后的行数组
 */
export function renumberTrainingRows(rows) {
  return rows.map((r, idx) => {
    const out = { ...r };
    out["序号"] = String(idx + 1);
    return out;
  });
}

/**
 * 从 CSV 行构建体重体脂数据
 * @param {Array<object>} rows - CSV 行数组
 * @returns {Array<object>} 体重体脂数据数组
 */
export function buildBodyMetrics(rows) {
  const out = [];
  for (const r of rows) {
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

/**
 * 格式化时长字符串
 * @param {string} duration - 时长字符串
 * @returns {string} 格式化后的字符串
 */
export function formatDuration(duration) {
  let t = String(duration);
  t = t.replace(/^(\d+)分钟$/, "$1 分钟");
  t = t.replace(/^约(\d+)分钟/, "约 $1 分钟");
  return t;
}

/**
 * 格式化体脂率
 * @param {number|null} bodyFat - 体脂率
 * @returns {string} 格式化后的字符串
 */
export function formatBodyFat(bodyFat) {
  if (bodyFat == null) return "–";
  const n = Number(bodyFat);
  if (!Number.isFinite(n)) return String(bodyFat);
  return (n % 1 === 0 ? n.toFixed(1) : String(n)) + "%";
}
