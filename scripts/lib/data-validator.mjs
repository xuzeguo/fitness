/**
 * 数据校验模块
 * 提供训练数据、体重体脂、日期等字段的校验功能
 */

import { getValidationRules } from "./config-loader.mjs";

// 加载校验规则
const validationRules = getValidationRules();

/**
 * 校验日期格式 (MM-DD)
 * @param {string} dateStr - 日期字符串
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") {
    return { valid: false, error: "日期不能为空" };
  }

  const trimmed = dateStr.trim();
  const pattern = /^(\d{2})-(\d{2})$/;
  const match = trimmed.match(pattern);

  if (!match) {
    return {
      valid: false,
      error: `日期格式错误: "${dateStr}"，应为 MM-DD 格式（如 04-28）`,
    };
  }

  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);

  if (month < 1 || month > 12) {
    return {
      valid: false,
      error: `月份超出范围: ${month}，应在 01-12 之间`,
    };
  }

  if (day < 1 || day > 31) {
    return {
      valid: false,
      error: `日期超出范围: ${day}，应在 01-31 之间`,
    };
  }

  return { valid: true };
}

/**
 * 校验体重
 * @param {number|string} weight - 体重值
 * @param {object} options - 配置选项
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateWeight(weight, options = {}) {
  const rules = validationRules.weight || {};
  const { min = rules.min || 40, max = rules.max || 200, allowNull = true } = options;

  if (weight == null || weight === "" || weight === "–" || weight === "-") {
    return allowNull
      ? { valid: true }
      : { valid: false, error: "体重不能为空" };
  }

  const num = typeof weight === "number" ? weight : parseFloat(String(weight).replace(/[^\d.-]/g, ""));

  if (!Number.isFinite(num)) {
    return { valid: false, error: `体重格式错误: "${weight}"` };
  }

  if (num < min || num > max) {
    return {
      valid: false,
      error: `体重超出合理范围: ${num}kg，应在 ${min}-${max}kg 之间`,
    };
  }

  return { valid: true };
}

/**
 * 校验体脂率
 * @param {number|string} bodyFat - 体脂率值
 * @param {object} options - 配置选项
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateBodyFat(bodyFat, options = {}) {
  const rules = validationRules.bodyFat || {};
  const { min = rules.min || 5, max = rules.max || 50, allowNull = true } = options;

  if (bodyFat == null || bodyFat === "" || bodyFat === "–" || bodyFat === "-") {
    return allowNull
      ? { valid: true }
      : { valid: false, error: "体脂率不能为空" };
  }

  const num = typeof bodyFat === "number" ? bodyFat : parseFloat(String(bodyFat).replace(/[^\d.-]/g, ""));

  if (!Number.isFinite(num)) {
    return { valid: false, error: `体脂率格式错误: "${bodyFat}"` };
  }

  if (num < min || num > max) {
    return {
      valid: false,
      error: `体脂率超出合理范围: ${num}%，应在 ${min}-${max}% 之间`,
    };
  }

  return { valid: true };
}

/**
 * 校验训练重量
 * @param {number|string} weight - 训练重量值
 * @param {object} options - 配置选项
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateTrainingWeight(weight, options = {}) {
  const rules = validationRules.trainingWeight || {};
  const { min = rules.min || 0, max = rules.max || 300, allowNull = true } = options;

  if (weight == null || weight === "" || weight === "–" || weight === "-") {
    return allowNull
      ? { valid: true }
      : { valid: false, error: "训练重量不能为空" };
  }

  const num = typeof weight === "number" ? weight : parseFloat(String(weight).replace(/[^\d.-]/g, ""));

  if (!Number.isFinite(num)) {
    return { valid: false, error: `训练重量格式错误: "${weight}"` };
  }

  if (num < min || num > max) {
    return {
      valid: false,
      error: `训练重量超出合理范围: ${num}kg，应在 ${min}-${max}kg 之间`,
    };
  }

  return { valid: true };
}

/**
 * 校验训练次数
 * @param {number|string} reps - 次数值
 * @param {object} options - 配置选项
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateReps(reps, options = {}) {
  const rules = validationRules.reps || {};
  const { min = rules.min || 1, max = rules.max || 100, allowNull = true } = options;

  if (reps == null || reps === "" || reps === "–" || reps === "-") {
    return allowNull
      ? { valid: true }
      : { valid: false, error: "训练次数不能为空" };
  }

  const num = typeof reps === "number" ? reps : parseInt(String(reps).replace(/[^\d]/g, ""), 10);

  if (!Number.isFinite(num)) {
    return { valid: false, error: `训练次数格式错误: "${reps}"` };
  }

  if (num < min || num > max) {
    return {
      valid: false,
      error: `训练次数超出合理范围: ${num}，应在 ${min}-${max} 之间`,
    };
  }

  return { valid: true };
}

/**
 * 校验训练组数
 * @param {number|string} sets - 组数值
 * @param {object} options - 配置选项
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateSets(sets, options = {}) {
  const rules = validationRules.sets || {};
  const { min = rules.min || 1, max = rules.max || 20, allowNull = true } = options;

  if (sets == null || sets === "" || sets === "–" || sets === "-") {
    return allowNull
      ? { valid: true }
      : { valid: false, error: "训练组数不能为空" };
  }

  const num = typeof sets === "number" ? sets : parseInt(String(sets).replace(/[^\d]/g, ""), 10);

  if (!Number.isFinite(num)) {
    return { valid: false, error: `训练组数格式错误: "${sets}"` };
  }

  if (num < min || num > max) {
    return {
      valid: false,
      error: `训练组数超出合理范围: ${num}，应在 ${min}-${max} 之间`,
    };
  }

  return { valid: true };
}

/**
 * 校验训练日志行
 * @param {object} row - CSV 行数据
 * @param {number} rowIndex - 行号（用于错误提示）
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateTrainingLogRow(row, rowIndex) {
  const errors = [];
  const prefix = `第 ${rowIndex} 行`;

  const dateResult = validateDate(row["日期"]);
  if (!dateResult.valid) {
    errors.push(`${prefix}: ${dateResult.error}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 校验体重体脂记录行
 * @param {object} row - CSV 行数据
 * @param {number} rowIndex - 行号（用于错误提示）
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateBodyMetricsRow(row, rowIndex) {
  const errors = [];
  const prefix = `第 ${rowIndex} 行`;

  const dateResult = validateDate(row["日期"]);
  if (!dateResult.valid) {
    errors.push(`${prefix}: ${dateResult.error}`);
  }

  const weightResult = validateWeight(row["体重kg"], { allowNull: false });
  if (!weightResult.valid) {
    errors.push(`${prefix}: ${weightResult.error}`);
  }

  const bodyFatResult = validateBodyFat(row["体脂率"], { allowNull: true });
  if (!bodyFatResult.valid) {
    errors.push(`${prefix}: ${bodyFatResult.error}`);
  }

  return { valid: errors.length === 0, errors };
}
