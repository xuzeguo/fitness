#!/usr/bin/env node

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { updateReport } = require('./skill.cjs');

// 直接调用更新报告函数
try {
  updateReport();
} catch (error) {
  console.error('❌ 更新报告失败:', error.message);
  process.exit(1);
}
