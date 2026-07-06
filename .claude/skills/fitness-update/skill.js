#!/usr/bin/env node

/**
 * 健身数据更新 Skill
 * 用于更新训练记录、体重体脂、围度测量数据
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '../..');
const TRAINING_LOG_PATH = path.join(BASE_DIR, 'public/training-log.csv');
const BODY_METRICS_PATH = path.join(BASE_DIR, 'public/body-metrics.csv');
const GIRTH_PATH = path.join(BASE_DIR, 'public/girth.csv');
const DATA_JSON_PATH = path.join(BASE_DIR, 'public/data.json');

/**
 * 获取今天的日期
 */
function getToday() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${mm}-${dd}`;
}

/**
 * 获取今天的完整日期（YYYY-MM-DD）
 */
function getTodayFull() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 读取 CSV 文件
 */
function readCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.trim().split('\n');
}

/**
 * 写入 CSV 文件
 */
function writeCSV(filePath, lines) {
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
}

/**
 * 更新训练记录
 */
function updateTrainingLog(date, data) {
  const lines = readCSV(TRAINING_LOG_PATH);
  if (lines.length === 0) {
    console.error('训练记录文件为空');
    return;
  }

  // 找到最新的序号
  const lastLine = lines[lines.length - 1];
  const lastId = parseInt(lastLine.split(',')[0]) || 0;
  const newId = lastId + 1;

  // 构建新行（根据 CSV 结构）
  const newRow = [
    newId,
    date,
    data.duration || '–',
    data.sitUpMachine || '–',
    data.armExtension || '–',
    data.lateralRaise || '–',
    data.benchPress || '–',
    data.latPulldown || '–',
    data.legExtension || '–',
    data.gluteBridge || '–',
    data.shoulderPress || '–',
    data.butterflyChest || '–',
    data.chestFly || '–',
    data.reverseFly || '–',
    data.seatedRow || '–',
    data.deadlift || '–',
    data.hackSquatBack || '–',
    data.hackSquatFront || '–',
    data.hipAbduction || '–',
    data.prostrateLeg || '–',
    data.animalFlow || '–',
    data.rowing || '–'
  ].join(',');

  lines.push(newRow);
  writeCSV(TRAINING_LOG_PATH, lines);
  console.log(`✓ 训练记录已添加：${date}`);
}

/**
 * 更新体重体脂
 */
function updateBodyMetrics(date, weight, bodyFat) {
  const lines = readCSV(BODY_METRICS_PATH);

  if (lines.length === 0) {
    lines.push('日期,体重kg,体脂率');
  }

  const newRow = `${date},${weight},${bodyFat}`;
  lines.push(newRow);
  writeCSV(BODY_METRICS_PATH, lines);
  console.log(`✓ 体重体脂已添加：${date} - ${weight}kg, ${bodyFat}%`);
}

/**
 * 更新围度测量
 */
function updateGirth(date, measurements) {
  const lines = readCSV(GIRTH_PATH);

  if (lines.length === 0) {
    lines.push('日期,脖子（最细处）,胸围（乳头水平，深呼吸后放松）,臂围（放松臂，二头最粗处）,腰围（肚脐水平）,臀围（最宽处）,大腿根部');
  }

  const newRow = [
    date,
    measurements.neck || '',
    measurements.chest || '',
    measurements.arm || '',
    measurements.waist || '',
    measurements.hip || '',
    measurements.thigh || ''
  ].join(',');

  lines.push(newRow);
  writeCSV(GIRTH_PATH, lines);
  console.log(`✓ 围度测量已添加：${date}`);
}

/**
 * 重新生成 data.json
 */
function regenerateDataJson() {
  // 这里需要调用 scripts/csv-to-json.js
  const { execSync } = require('child_process');
  try {
    execSync('node scripts/csv-to-json.js', {
      cwd: BASE_DIR,
      stdio: 'inherit'
    });
    console.log('✓ data.json 已重新生成');
  } catch (error) {
    console.error('✗ 重新生成 data.json 失败:', error.message);
  }
}

// 导出函数供 Claude 调用
module.exports = {
  updateTrainingLog,
  updateBodyMetrics,
  updateGirth,
  regenerateDataJson,
  getToday,
  getTodayFull
};

// 如果直接运行，显示帮助信息
if (require.main === module) {
  console.log(`
健身数据更新 Skill
==================

此 skill 用于更新健身数据。请通过 Claude 交互式调用。

示例用法：
  /fitness-update

然后告诉 Claude 你要更新什么数据。
  `);
}
