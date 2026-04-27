import fs from "fs";

function existsNonEmpty(path) {
  try {
    const s = fs.statSync(path);
    return s.isFile() && s.size > 0;
  } catch {
    return false;
  }
}

function readText(path) {
  return fs.readFileSync(path, "utf8");
}

function writeIfMissing(path, content) {
  if (existsNonEmpty(path)) return false;
  fs.writeFileSync(path, content.endsWith("\n") ? content : content + "\n");
  return true;
}

function isOnlyHeaderCsv(path) {
  if (!existsNonEmpty(path)) return true;
  const lines = readText(path)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length <= 1;
}

function csvEscape(s) {
  const t = String(s ?? "");
  if (/[",\n\r]/.test(t)) return `"${t.replaceAll('"', '""')}"`;
  return t;
}

function parseCsvLine(line) {
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

function readCsvRows(path) {
  if (!existsNonEmpty(path)) return { header: [], rows: [] };
  const raw = readText(path);
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { header: parseCsvLine(lines[0] ?? ""), rows: [] };
  const header = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const row = {};
    for (let j = 0; j < header.length; j++) row[header[j]] = (cols[j] ?? "").trim();
    rows.push(row);
  }
  return { header, rows };
}

function ensureCsvHasData(path, headerLine, dataLines) {
  if (!isOnlyHeaderCsv(path)) return false;
  const content = [headerLine, ...dataLines].join("\n") + "\n";
  fs.writeFileSync(path, content);
  return true;
}

const dataJsonPath = "public/data.json";
const bodyMetricsPath = "public/body-metrics.csv";
const gymVisitsPath = "public/gym-visits.csv";
const girthPath = "public/girth.csv";

// 1) Ensure template CSVs exist (header only)
writeIfMissing(bodyMetricsPath, "日期,体重kg,体脂率\n");
writeIfMissing(gymVisitsPath, "日期,进店时段,时长（分钟）,备注\n");
writeIfMissing(
  girthPath,
  "日期,脖子（最细处）,胸围（乳头水平，深呼吸后放松）,臂围（放松臂，二头最粗处）,腰围（肚脐水平）,臀围（最宽处）,大腿根部\n",
);

// 2) Seed body-metrics.csv from data.json.bodyMetrics (only if empty)
try {
  const json = JSON.parse(readText(dataJsonPath));
  const bm = Array.isArray(json?.bodyMetrics) ? json.bodyMetrics : [];
  const lines = bm.map((r) => {
    const date = r?.日期 ?? r?.["日期"] ?? "";
    const w = r?.体重kg ?? r?.["体重kg"] ?? "";
    const bf = r?.体脂率 ?? r?.["体脂率"] ?? "";
    return [date, w, bf].map(csvEscape).join(",");
  });
  ensureCsvHasData(bodyMetricsPath, "日期,体重kg,体脂率", lines);
} catch {
  // ignore
}

// 3) Seed gym-visits.csv and girth.csv from existing script defaults
// We intentionally keep these here so you can eliminate hard-coded arrays from rebuild script later if desired.
const DEFAULT_GYM_VISITS = [
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
const DEFAULT_GIRTH = [
  ["2026-02-27", "41", "114", "35", "109", "110", "71"],
  ["2026-03-05", "42", "112", "34", "107", "108", "69"],
  ["2026-03-20", "41", "107", "33", "105", "108", "68"],
  ["2026-03-29", "40", "107", "33", "104", "107", "68"],
  ["2026-04-06", "39", "106", "32", "103", "106", "68"],
].reverse();

ensureCsvHasData(
  gymVisitsPath,
  "日期,进店时段,时长（分钟）,备注",
  DEFAULT_GYM_VISITS.map((r) => r.map(csvEscape).join(",")),
);
ensureCsvHasData(
  girthPath,
  "日期,脖子（最细处）,胸围（乳头水平，深呼吸后放松）,臂围（放松臂，二头最粗处）,腰围（肚脐水平）,臀围（最宽处）,大腿根部",
  DEFAULT_GIRTH.map((r) => r.map(csvEscape).join(",")),
);

// 4) Report summary
const bmCount = readCsvRows(bodyMetricsPath).rows.length;
const gymCount = readCsvRows(gymVisitsPath).rows.length;
const girthCount = readCsvRows(girthPath).rows.length;
console.log(
  `seed:csv done. body-metrics=${bmCount} rows, gym-visits=${gymCount} rows, girth=${girthCount} rows`,
);

