/**
 * 配置加载模块
 * 从 config.json 读取配置
 */

import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let cachedConfig = null;

/**
 * 加载配置文件
 * @returns {object} 配置对象
 */
export function loadConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = resolve(__dirname, "../../config.json");

  try {
    const raw = fs.readFileSync(configPath, "utf8");
    cachedConfig = JSON.parse(raw);
    return cachedConfig;
  } catch (error) {
    console.error(`❌ 无法加载配置文件: ${configPath}`);
    console.error(`   错误: ${error.message}`);
    process.exit(1);
  }
}

/**
 * 获取启用的动作列表
 * @returns {Array<object>} 启用的动作列表
 */
export function getEnabledExercises() {
  const config = loadConfig();
  return config.exercises
    .filter((ex) => ex.enabled)
    .sort((a, b) => a.order - b.order);
}

/**
 * 获取动作名称列表
 * @returns {Array<string>} 动作名称数组
 */
export function getExerciseNames() {
  return getEnabledExercises().map((ex) => ex.name);
}

/**
 * 获取评分权重配置
 * @returns {object} 权重配置
 */
export function getScoreWeights() {
  const config = loadConfig();
  return config.scoreWeights || {
    strength: 0.5,
    cardio: 0.35,
    duration: 0.15,
  };
}

/**
 * 获取校验规则配置
 * @returns {object} 校验规则
 */
export function getValidationRules() {
  const config = loadConfig();
  return config.validation || {};
}

/**
 * 根据名称获取动作配置
 * @param {string} name - 动作名称
 * @returns {object|null} 动作配置对象
 */
export function getExerciseByName(name) {
  const config = loadConfig();
  return config.exercises.find((ex) => ex.name === name) || null;
}
