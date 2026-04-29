/**
 * CSV 解析模块
 * 提供 CSV 文件的读取和解析功能
 */

import fs from "fs";

/**
 * 解析单行 CSV（支持双引号转义）
 * @param {string} line - CSV 行
 * @returns {Array<string>} 解析后的字段数组
 */
export function parseCsvLine(line) {
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

/**
 * 安全读取文本文件
 * @param {string} path - 文件路径
 * @returns {string|null} 文件内容，失败返回 null
 */
export function safeReadText(path) {
  try {
    return fs.readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

/**
 * 读取并解析 CSV 文件
 * @param {string} path - CSV 文件路径
 * @returns {{ header: Array<string>, rows: Array<object> }}
 */
export function readCsv(path) {
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

/**
 * 读取并解析 CSV 文件（如果文件不存在则返回 null）
 * @param {string} path - CSV 文件路径
 * @returns {{ header: Array<string>, rows: Array<object> }|null}
 */
export function readCsvIfExists(path) {
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
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = (cols[j] ?? "").trim();
    }
    rows.push(row);
  }

  return { header, rows };
}

/**
 * 获取 CSV 行中的值（容错 BOM 和额外空格）
 * @param {object} row - CSV 行对象
 * @param {string} key - 列名
 * @returns {string} 列值
 */
export function getCsvValue(row, key) {
  if (!row) return "";
  if (key in row) return row[key];

  // 容错 BOM / 额外空格
  const normKey = String(key).trim();
  for (const k of Object.keys(row)) {
    if (String(k).trim() === normKey) return row[k];
  }
  return "";
}

/**
 * 转义 CSV 单元格内容
 * @param {any} value - 单元格值
 * @returns {string} 转义后的字符串
 */
export function escapeCsvCell(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * 写入 CSV 文件
 * @param {string} path - 文件路径
 * @param {Array<string>} header - 表头
 * @param {Array<object>} rows - 数据行
 */
export function writeCsv(path, header, rows) {
  const out = [];
  out.push(header.join(","));

  for (const row of rows) {
    out.push(header.map((h) => escapeCsvCell(row[h] ?? "")).join(","));
  }

  fs.writeFileSync(path, out.join("\n") + "\n");
}
