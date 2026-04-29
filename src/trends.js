import "./styles/trends.css";

const DATA_JSON_PATH = `${import.meta.env.BASE_URL}data.json`;
const CONFIG_JSON_PATH = `${import.meta.env.BASE_URL}config.json`;

const appState = {
  data: null,
  bodyPoints: [],
  bodyGoals: null,
  config: null,
  customWeights: null, // 用户自定义的权重
};

let charts;

/** 横轴区域缩放：底部滑块 + 图表内拖拽/滚轮（缓解横轴日期过多时的拥挤） */
const DATA_ZOOM_X = [
  {
    type: "slider",
    xAxisIndex: 0,
    start: 0,
    end: 100,
    height: 22,
    bottom: 10,
    fillerColor: "rgba(37, 99, 235, 0.12)",
    borderColor: "#e5e7eb",
    dataBackground: {
      lineStyle: { color: "#e5e7eb" },
      areaStyle: { color: "#f9fafb" },
    },
  },
  { type: "inside", xAxisIndex: 0, moveOnMouseMove: true, zoomOnMouseWheel: true },
];

/** ECharts 折线图数据点旁显示数值 */
function lineSeriesLabel(formatter, position = "top") {
  return {
    show: true,
    position,
    distance: 4,
    fontSize: 15,
    color: "#444",
    formatter,
  };
}

function assertEchartsLoaded() {
  if (typeof window.echarts === "undefined") {
    throw new Error(
      "ECharts 未加载。若你当前无网络，CDN 会加载失败；可改为离线引入 echarts.min.js。"
    );
  }
}

function parseMinutes(s) {
  if (!s) return null;
  const m = String(s).match(/(\d+)\s*分钟/);
  if (m) return Number(m[1]);
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function normalizeDate(mmdd) {
  // treat as 2026-MM-DD for sorting
  const [mm, dd] = String(mmdd).split("-").map((x) => x.trim());
  if (!mm || !dd) return null;
  return `2026-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function parseRowing(s) {
  if (!s) return { paceSec: null, meters: null, watts: null };
  const pace = String(s).match(/(\d{1,2}):(\d{2})\s*\/\s*500m/);
  const meters = String(s).match(/(\d+)\s*m/);
  const watts = String(s).match(/(\d+)\s*W/);
  return {
    paceSec: pace ? Number(pace[1]) * 60 + Number(pace[2]) : null,
    meters: meters ? Number(meters[1]) : null,
    watts: watts ? Number(watts[1]) : null,
  };
}

function parseSetExpr(expr) {
  // Returns array of { weightKg, reps, sets }, best-effort.
  if (!expr) return [];
  const s = String(expr).trim();
  if (!s || s === "–" || s === "-" || s === "无") return [];

  // Pattern: "50kg×12×4" or "50kg 12×4" variants.
  const items = [];
  const parts = s
    .split(/[；;]+/)
    .map((x) => x.trim())
    .filter(Boolean);

  for (const p of parts) {
    // Pattern: "50/45/40/35kg 各12"
    const multi = p.match(/^(\d+(?:\s*\/\s*\d+)+)\s*kg.*各\s*(\d+)\s*$/i);
    if (multi) {
      const weights = multi[1]
        .split("/")
        .map((x) => Number(x.trim()))
        .filter((n) => Number.isFinite(n));
      const reps = Number(multi[2]);
      for (const w of weights) items.push({ weightKg: w, reps, sets: 1 });
      continue;
    }

    // Pattern: "外展50kg×12×4；内收50kg×12×4" (we keep label in a separate mapping outside)
    const simple = p.match(/(\d+(?:\.\d+)?)\s*kg\s*[×x\*]\s*(\d+)\s*[×x\*]\s*(\d+)/i);
    if (simple) {
      items.push({
        weightKg: Number(simple[1]),
        reps: Number(simple[2]),
        sets: Number(simple[3]),
      });
      continue;
    }

    // Pattern: "30kg×12×1" but without middle separators variations
    const loose = p.match(/(\d+(?:\.\d+)?)\s*kg.*?(\d+)\s*.*?(\d+)\s*$/i);
    if (loose && p.includes("kg") && (p.includes("×") || p.includes("*") || p.includes("x"))) {
      items.push({
        weightKg: Number(loose[1]),
        reps: Number(loose[2]),
        sets: Number(loose[3]),
      });
      continue;
    }
  }
  return items.filter((x) => Number.isFinite(x.weightKg) && Number.isFinite(x.reps) && Number.isFinite(x.sets));
}

function calcVolume(items) {
  // kg * reps * sets (unit: kg·次)
  return items.reduce((sum, it) => sum + it.weightKg * it.reps * it.sets, 0);
}

function maxWeight(items) {
  return items.length ? Math.max(...items.map((x) => x.weightKg)) : null;
}

function standardize(values) {
  const nums = values.filter((v) => typeof v === "number" && Number.isFinite(v));
  if (nums.length < 2) return values.map(() => 0);
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
  const sd = Math.sqrt(variance) || 1;
  return values.map((v) =>
    typeof v === "number" && Number.isFinite(v) ? (v - mean) / sd : 0
  );
}

function movingAverage(arr, window) {
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = arr.slice(start, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    out.push(mean);
  }
  return out;
}

function buildDataFromJsonRows(jsonRows) {
  const rows = jsonRows || [];
  if (!rows.length) return { exercises: [], items: [] };

  const header = Object.keys(rows[0]);
  const exercises = header.filter(
    (h) => !["序号", "日期", "运动时长", "划船机(配速/距离/功率/时间/频率)"].includes(h)
  );

  const items = rows.map((r) => {
    const date = r["日期"];
    const iso = normalizeDate(date);
    const minutes = parseMinutes(r["运动时长"]);
    const rowing = parseRowing(r["划船机(配速/距离/功率/时间/频率)"]);

    const perExercise = {};
    for (const ex of exercises) {
      const raw = r[ex];
      const list = parseSetExpr(raw);
      perExercise[ex] = {
        raw,
        items: list,
        volume: list.length ? calcVolume(list) : null,
        maxWeight: list.length ? maxWeight(list) : null,
      };
    }

    const strengthVolume = exercises.reduce((sum, ex) => {
      const v = perExercise[ex].volume;
      return sum + (typeof v === "number" ? v : 0);
    }, 0);

    return { date, iso, minutes, rowing, perExercise, strengthVolume };
  });

  items.sort((a, b) => (a.iso || "").localeCompare(b.iso || ""));
  return { exercises, items };
}

function fmtDateLabel(iso) {
  if (!iso) return "";
  const m = iso.slice(5, 7);
  const d = iso.slice(8, 10);
  return `${m}-${d}`;
}

/** ISO 日期字符串加若干天（本地正午，避免夏令时边界） */
function addDaysIso(iso, days) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function diffDaysIso(olderIso, newerIso) {
  const a = new Date(`${olderIso}T12:00:00`);
  const b = new Date(`${newerIso}T12:00:00`);
  return Math.round((b - a) / 864e5);
}

/** 参考减脂节奏（kg/周），与图中粉色预测线一致 */
const PLAN_WEEKLY_KG = 0.5;

/** 超过该速降率（kg/周）视为脱水/秤误差等异常，斜率计算时跳过该段 */
const MAX_WEEKLY_DROP_KG = 3.5;

/**
 * 与「最后一次称重」同日之前的、最近一个不同日期的测量点（不做异常过滤）。
 */
function peekRawRecentOlder(points) {
  if (points.length < 2) return null;
  const newer = points[points.length - 1];
  for (let i = points.length - 2; i >= 0; i--) {
    if (points[i].iso !== newer.iso) return points[i];
  }
  return null;
}

/**
 * 找可算斜率的两点：自最近往前找不同日期，若该段速降 > MAX_WEEKLY_DROP_KG kg/周则跳过；
 * 若均异常则尝试首尾不同日期；仍异常则返回 null。
 */
function findWeightComparePair(points) {
  if (points.length < 2) return null;
  const newer = points[points.length - 1];
  for (let i = points.length - 2; i >= 0; ) {
    const older = points[i];
    if (older.iso === newer.iso) {
      i--;
      continue;
    }
    const days = Math.max(1, diffDaysIso(older.iso, newer.iso));
    const weeklyKg = (older.weightKg - newer.weightKg) / (days / 7);
    if (weeklyKg > MAX_WEEKLY_DROP_KG) {
      const skipIso = older.iso;
      while (i >= 0 && points[i].iso === skipIso) i--;
      continue;
    }
    return { older, newer, mode: "recent" };
  }
  if (points[0].iso !== newer.iso) {
    const older = points[0];
    const days = Math.max(1, diffDaysIso(older.iso, newer.iso));
    const weeklyKg = (older.weightKg - newer.weightKg) / (days / 7);
    if (weeklyKg <= MAX_WEEKLY_DROP_KG) {
      return { older, newer, mode: "span" };
    }
  }
  return null;
}

/**
 * 体重与体脂下方「预测说明」文案（纯文本，避免 XSS）
 */
function buildBodyForecastNarrative(points, bodyGoals) {
  const lines = [];
  const last = points[points.length - 1];
  const targetWmin = Number(bodyGoals?.weightKg?.min);
  const bfLo = Number(bodyGoals?.bodyFatPercent?.min);
  const bfHi = Number(bodyGoals?.bodyFatPercent?.max);
  const targetBfMid =
    Number.isFinite(bfLo) && Number.isFinite(bfHi) ? (bfLo + bfHi) / 2 : 13;

  lines.push("【预测说明】");
  lines.push(
    "以下由已有记录估算，会随新数据变化。选取说明用的时间区间时，若某段速降折合超过 3.5 kg/周，则视为脱水/测量误差并跳过该段，改用更早区间（折线仍全部画在图上）；下文只标注区间与参考节奏下的目标到达粗算，不给出按记录斜率换算的 kg/周 或外推到达日。短间隔与体脂秤噪声也会放大波动，请结合围度与训练感受综合看。",
  );

  const pair = findWeightComparePair(points);
  const rawRecentOlder = peekRawRecentOlder(points);
  const skippedAbnormalRecent =
    pair &&
    rawRecentOlder &&
    pair.older.iso !== rawRecentOlder.iso &&
    (() => {
      const d = Math.max(1, diffDaysIso(rawRecentOlder.iso, pair.newer.iso));
      const w = (rawRecentOlder.weightKg - pair.newer.weightKg) / (d / 7);
      return w > MAX_WEEKLY_DROP_KG;
    })();

  if (!pair) {
    lines.push("");
    lines.push(
      "· 无法选出有效时间区间：至少需要两个不同日期的体重；若从近往远每段换算速降均 > 3.5 kg/周，则相关段会全部忽略，亦无可用区间。",
    );
    if (Number.isFinite(targetWmin) && last.weightKg > targetWmin) {
      const rem = last.weightKg - targetWmin;
      const wksPlan = rem / PLAN_WEEKLY_KG;
      const datePlan = addDaysIso(last.iso, Math.ceil(wksPlan * 7));
      lines.push(
        `· 若仅按参考节奏 ${PLAN_WEEKLY_KG} kg/周 粗算：距目标体重下限 ${targetWmin} kg 约余 ${rem.toFixed(
          1,
        )} kg → 约 ${wksPlan.toFixed(1)} 周，大致不早于 ${datePlan}（理想化，待有连续称重后再算动态预测）。`,
      );
    }
    return lines.join("\n");
  }

  const { older, newer, mode } = pair;
  const days = Math.max(1, diffDaysIso(older.iso, newer.iso));

  lines.push("");
  if (skippedAbnormalRecent) {
    lines.push(
      `· 最近一段（相对上一不同日期）换算降幅超过 ${MAX_WEEKLY_DROP_KG} kg/周，已忽略（多见于脱水/测量误差），以下用更早区间。`,
    );
    lines.push("");
  }
  lines.push(
    `· 计算区间：${fmtDateLabel(older.iso)} → ${fmtDateLabel(newer.iso)}，间隔 ${days} 天${
      mode === "span" ? "（全记录首尾对比，跨度大，仅作粗趋势）" : ""
    }。`,
  );

  lines.push("");
  lines.push("【到达目标的动态预测】");
  if (Number.isFinite(targetWmin) && newer.weightKg > targetWmin) {
    const rem = newer.weightKg - targetWmin;
    const wksPlan = rem / PLAN_WEEKLY_KG;
    const datePlan = addDaysIso(newer.iso, Math.ceil(wksPlan * 7));
    lines.push(
      `· 目标体重下限 ${targetWmin} kg：尚余约 ${rem.toFixed(1)} kg。若长期维持参考节奏 ${PLAN_WEEKLY_KG} kg/周 → 约 ${wksPlan.toFixed(
        1,
      )} 周，大致不早于 ${datePlan}。`,
    );
  } else if (Number.isFinite(targetWmin)) {
    lines.push(`· 当前体重已达或低于目标下限 ${targetWmin} kg，体重维度以维持与形体为主。`);
  } else {
    lines.push("· 未配置 bodyGoals.weightKg.min，无法推算到达目标体重的日期。");
  }

  if (
    Number.isFinite(older.bodyFat) &&
    Number.isFinite(newer.bodyFat) &&
    Number.isFinite(last.bodyFat) &&
    days >= 1
  ) {
    const deltaBf = older.bodyFat - newer.bodyFat;
    const weeklyBf = deltaBf / (days / 7);
    lines.push("");
    lines.push("【体脂】");
    lines.push(
      `· 同段体脂率变化：约 ${Math.abs(weeklyBf).toFixed(3)} 个百分点/周（${
        weeklyBf > 0 ? "下降" : weeklyBf < 0 ? "上升" : "持平"
      }）。`,
    );
    if (last.bodyFat > targetBfMid && weeklyBf > 0.02) {
      const remBf = last.bodyFat - targetBfMid;
      const wksBf = remBf / weeklyBf;
      const dateBf = addDaysIso(last.iso, Math.ceil(wksBf * 7));
      lines.push(
        `· 粗估到达体脂中点 ${targetBfMid.toFixed(1)}%：约 ${wksBf.toFixed(1)} 周 → 大致 ${dateBf}（体脂测量噪声大，仅供参考）。`,
      );
    } else if (last.bodyFat <= targetBfMid) {
      lines.push(`· 当前体脂已处于或低于目标区间中点 ${targetBfMid.toFixed(1)}% 附近。`);
    } else {
      lines.push("· 体脂下降斜率偏弱或数据不足，暂不外推到达日。");
    }
  }

  return lines.join("\n");
}

function renderBodyForecastNote(points, bodyGoals) {
  const el = document.getElementById("bodyForecastNote");
  if (!el) return;
  if (!points?.length) {
    el.textContent = "";
    return;
  }
  el.textContent = buildBodyForecastNarrative(points, bodyGoals);
}

/**
 * 自最近一次测量起，按每周 −0.5kg 延伸预测；体脂按周线性至目标体脂区间中点。
 * 返回扩展后的 x 轴与各序列数据；若无空间下降则返回 null。
 */
function buildBodyWeeklyProjection(points, bodyGoals) {
  if (!points?.length) return null;
  const last = points[points.length - 1];
  const lastW = last.weightKg;
  const lastBf = last.bodyFat;
  const targetW = Number(bodyGoals?.weightKg?.min);
  if (!Number.isFinite(lastW) || !Number.isFinite(targetW) || lastW <= targetW) return null;

  const K = Math.min(Math.ceil((lastW - targetW) / 0.5), 52);
  if (K < 1) return null;

  const bfLo = Number(bodyGoals?.bodyFatPercent?.min);
  const bfHi = Number(bodyGoals?.bodyFatPercent?.max);
  const targetBf =
    Number.isFinite(bfLo) && Number.isFinite(bfHi) ? (bfLo + bfHi) / 2 : 13;

  const len = points.length;
  const histXs = labelBodyAxis(points);
  const foreXs = [];
  for (let k = 1; k <= K; k++) {
    foreXs.push(fmtDateLabel(addDaysIso(last.iso, 7 * k)));
  }
  const xs = [...histXs, ...foreXs];

  const wPadded = [...points.map((p) => p.weightKg), ...Array(K).fill(null)];
  const bfPadded = [
    ...points.map((p) => (p.bodyFat == null ? null : p.bodyFat)),
    ...Array(K).fill(null),
  ];

  const wFore = new Array(len + K).fill(null);
  const bfFore = new Array(len + K).fill(null);
  wFore[len - 1] = lastW;
  for (let k = 1; k <= K; k++) {
    wFore[len - 1 + k] = Number((lastW - 0.5 * k).toFixed(2));
  }

  const hasBfForecast = Number.isFinite(lastBf);
  if (hasBfForecast) {
    bfFore[len - 1] = lastBf;
    for (let k = 1; k <= K; k++) {
      bfFore[len - 1 + k] = Number((lastBf + ((targetBf - lastBf) * k) / K).toFixed(2));
    }
  }

  return {
    xs,
    wPadded,
    bfPadded,
    wFore,
    bfFore,
    hasBfForecast,
    weeks: K,
  };
}

function parseBodyMetricRows(rawRows) {
  const rows = rawRows || [];
  const points = [];
  for (const r of rows) {
    const date = r["日期"];
    const iso = normalizeDate(date);
    const w = r["体重kg"];
    const bf = r["体脂率"];
    const weightKg = typeof w === "number" ? w : w != null ? Number(String(w).replace(/[^\d.-]/g, "")) : NaN;
    const bodyFat = typeof bf === "number" ? bf : bf != null ? Number(String(bf).replace(/[^\d.-]/g, "")) : NaN;
    if (!iso || !Number.isFinite(weightKg)) continue;
    points.push({
      iso,
      weightKg,
      bodyFat: Number.isFinite(bodyFat) ? bodyFat : null,
    });
  }
  points.sort((a, b) => (a.iso || "").localeCompare(b.iso || ""));
  return points;
}

function labelBodyAxis(points) {
  const perIso = {};
  return points.map((p) => {
    const base = fmtDateLabel(p.iso);
    const n = (perIso[p.iso] = (perIso[p.iso] || 0) + 1);
    return n === 1 ? base : `${base}·${n}`;
  });
}

/** 从 data.json 的 bodyGoals 生成体重序列上的目标区间与边界线 */
function bodyGoalExtrasWeight(bodyGoals) {
  const g = bodyGoals?.weightKg;
  if (!g) return {};
  const min = Number(g.min);
  const max = Number(g.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return {};
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const out = {
    markArea: {
      silent: true,
      itemStyle: { color: "rgba(82, 196, 26, 0.14)" },
      data: [[{ yAxis: lo }, { yAxis: hi }]],
    },
  };
  if (lo < hi) {
    out.markLine = {
      symbol: ["none", "none"],
      lineStyle: { type: "dashed", color: "#389e0d", width: 1.5 },
      label: { formatter: "{b}", fontSize: 15, color: "#389e0d" },
      data: [
        { name: `目标体重 ${lo}`, yAxis: lo },
        { name: `目标体重 ${hi}`, yAxis: hi },
      ],
    };
  }
  return out;
}

/** 体脂率序列上的目标区间与边界线（右轴 %） */
function bodyGoalExtrasBodyFat(bodyGoals) {
  const g = bodyGoals?.bodyFatPercent;
  if (!g) return {};
  const min = Number(g.min);
  const max = Number(g.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return {};
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const out = {
    markArea: {
      silent: true,
      itemStyle: { color: "rgba(22, 119, 255, 0.14)" },
      data: [[{ yAxis: lo }, { yAxis: hi }]],
    },
  };
  if (lo < hi) {
    out.markLine = {
      symbol: ["none", "none"],
      lineStyle: { type: "dashed", color: "#1677ff", width: 1.5 },
      label: { formatter: "{b}", fontSize: 15, color: "#1677ff" },
      data: [
        { name: `目标体脂 ${lo}%`, yAxis: lo },
        { name: `目标体脂 ${hi}%`, yAxis: hi },
      ],
    };
  }
  return out;
}

function renderBodyChart(chart, points, bodyGoals) {
  const container = document.getElementById("bodyHint");
  if (!points.length) {
    chart.clear();
    if (container) container.textContent = "暂无体重数据：请在 data.json 中填写 bodyMetrics。";
    const noteEl = document.getElementById("bodyForecastNote");
    if (noteEl) noteEl.textContent = "";
    return;
  }
  const proj = buildBodyWeeklyProjection(points, bodyGoals);
  const goalHint =
    bodyGoals?.weightKg || bodyGoals?.bodyFatPercent
      ? "浅绿带/虚线：目标体重区间（bodyGoals.weightKg）；浅蓝带/虚线：目标体脂区间（bodyGoals.bodyFatPercent）。"
      : "";
  const projHint = proj
    ? `粉色虚线：目标体重预测（自最近测量起每周 −0.5kg，共 ${proj.weeks} 周）；${
        proj.hasBfForecast
          ? "紫色虚线：目标体脂预测（同期线性至目标体脂区间中点）。"
          : "最近无有效体脂数据，未画体脂预测。"
      }`
    : "";
  if (container) {
    container.textContent =
      "左轴：体重（kg）；右轴：体脂率（%）。同日多次测量会显示为 月-日·2、·3…" +
      "\n下方「预测说明」与上图同源：选取说明用区间时会忽略换算速降 > 3.5 kg/周 的区段（异常点仍画在图上）。" +
      "\n阶段心态：收益递减正常；第二段「百天」最易变慢，忌因焦虑而加练、节食走极端——可对照目标页：腰围、力量、状态三样。" +
      (goalHint ? `\n${goalHint}` : "") +
      (projHint ? `\n${projHint}` : "");
  }

  const histXs = labelBodyAxis(points);
  const xs = proj?.xs ?? histXs;
  const w = proj?.wPadded ?? points.map((p) => p.weightKg);
  const bf = proj?.bfPadded ?? points.map((p) => (p.bodyFat == null ? null : p.bodyFat));

  const wExtra = bodyGoalExtrasWeight(bodyGoals);
  const bfExtra = bodyGoalExtrasBodyFat(bodyGoals);

  // 默认只展示「实际测量值覆盖的日期范围」；预测部分可手动拖动/缩放查看。
  const zoomStartValue = histXs[0];
  const zoomEndValue = histXs[histXs.length - 1];
  const dataZoom = proj
    ? DATA_ZOOM_X.map((z) => ({ ...z, startValue: zoomStartValue, endValue: zoomEndValue }))
    : DATA_ZOOM_X;

  const legendData = ["体重", "体脂率"];
  const seriesList = [
    {
      name: "体重",
      type: "line",
      yAxisIndex: 0,
      data: w,
      symbolSize: 6,
      lineStyle: { width: 2 },
      label: lineSeriesLabel((p) => {
        const v = p.value;
        if (v == null || v === "") return "";
        const n = Number(v);
        return Number.isFinite(n) ? n.toFixed(1) : "";
      }, "top"),
      ...wExtra,
    },
    {
      name: "体脂率",
      type: "line",
      yAxisIndex: 1,
      data: bf,
      symbolSize: 6,
      lineStyle: { width: 2 },
      label: lineSeriesLabel((p) => {
        const v = p.value;
        if (v == null || v === "") return "";
        const n = Number(v);
        return Number.isFinite(n) ? n.toFixed(1) : "";
      }, "bottom"),
      ...bfExtra,
    },
  ];

  if (proj) {
    legendData.push("目标体重预测");
    seriesList.push({
      name: "目标体重预测",
      type: "line",
      yAxisIndex: 0,
      data: proj.wFore,
      connectNulls: true,
      // 预测点不是“实际测量值”，仅保留虚线，不画点位
      showSymbol: false,
      symbol: "none",
      symbolSize: 5,
      lineStyle: { width: 2, type: "dashed", color: "#db2777" },
      itemStyle: { color: "#db2777" },
      label: lineSeriesLabel((p) => {
        const v = p.value;
        if (v == null || v === "") return "";
        const n = Number(v);
        return Number.isFinite(n) ? n.toFixed(1) : "";
      }, "top"),
    });
    if (proj.hasBfForecast) {
      legendData.push("目标体脂预测");
      seriesList.push({
        name: "目标体脂预测",
        type: "line",
        yAxisIndex: 1,
        data: proj.bfFore,
        connectNulls: true,
        // 预测点不是“实际测量值”，仅保留虚线，不画点位
        showSymbol: false,
        symbol: "none",
        symbolSize: 5,
        lineStyle: { width: 2, type: "dashed", color: "#7c3aed" },
        itemStyle: { color: "#7c3aed" },
        label: lineSeriesLabel((p) => {
          const v = p.value;
          if (v == null || v === "") return "";
          const n = Number(v);
          return Number.isFinite(n) ? n.toFixed(1) : "";
        }, "bottom"),
      });
    }
  }

  chart.setOption({
    animation: false,
    grid: { left: 52, right: 52, top: proj ? 52 : 44, bottom: 62 },
    tooltip: { trigger: "axis", textStyle: { fontSize: 15 } },
    legend: {
      data: legendData,
      top: 0,
      type: proj ? "scroll" : "plain",
      textStyle: { fontSize: 15 },
    },
    dataZoom,
    xAxis: { type: "category", data: xs, axisLabel: { rotate: 40, fontSize: 15 } },
    yAxis: [
      {
        type: "value",
        name: "kg",
        scale: true,
        nameTextStyle: { fontSize: 15 },
        axisLabel: { fontSize: 15 },
      },
      {
        type: "value",
        name: "%",
        scale: true,
        nameTextStyle: { fontSize: 15 },
        axisLabel: { fontSize: 15 },
      },
    ],
    series: seriesList,
  });

  renderBodyForecastNote(points, bodyGoals);
}

function createCharts() {
  const exerciseChart = echarts.init(document.getElementById("exerciseChart"));
  const scoreChart = echarts.init(document.getElementById("scoreChart"));
  const bodyChart = echarts.init(document.getElementById("bodyChart"));
  window.addEventListener("resize", () => {
    exerciseChart.resize();
    scoreChart.resize();
    bodyChart.resize();
  });
  return { exerciseChart, scoreChart, bodyChart };
}

function setExerciseOptions(select, exercises) {
  select.innerHTML = "";
  for (const ex of exercises) {
    const opt = document.createElement("option");
    opt.value = ex;
    opt.textContent = ex;
    select.appendChild(opt);
  }
  // default
  if (exercises.includes("坐立卷腹机")) select.value = "坐立卷腹机";
}

function renderExerciseChart(chart, data, exName, metric) {
  const xs = data.items.map((it) => fmtDateLabel(it.iso));
  const ys = data.items.map((it) => {
    const ex = it.perExercise[exName];
    if (!ex) return null;
    return metric === "weight" ? ex.maxWeight : ex.volume;
  });

  const unit = metric === "weight" ? "kg" : "kg·次";
  const title = metric === "weight" ? "重量（取当日最大）" : "总训练量（重量×次数×组数）";

  chart.setOption({
    animation: false,
    grid: { left: 48, right: 18, top: 44, bottom: 62 },
    tooltip: { trigger: "axis", textStyle: { fontSize: 15 } },
    dataZoom: DATA_ZOOM_X,
    xAxis: { type: "category", data: xs, axisLabel: { rotate: 40, fontSize: 15 } },
    yAxis: {
      type: "value",
      name: unit,
      nameTextStyle: { fontSize: 15 },
      axisLabel: { fontSize: 15 },
    },
    series: [
      {
        name: `${exName} · ${title}`,
        type: "line",
        data: ys,
        connectNulls: false,
        symbolSize: 6,
        lineStyle: { width: 2 },
        label: lineSeriesLabel((p) => {
          const v = p.value;
          if (v == null || v === "") return "";
          const n = Number(v);
          if (!Number.isFinite(n)) return "";
          return metric === "weight" ? n.toFixed(1) : String(Math.round(n));
        }),
      },
    ],
  });

  return { xs, ys };
}

function renderScoreChart(chart, data) {
  const xs = data.items.map((it) => fmtDateLabel(it.iso));
  const strength = data.items.map((it) => it.strengthVolume);
  const watts = data.items.map((it) => it.rowing.watts);
  const mins = data.items.map((it) => it.minutes);

  const zStrength = standardize(strength);
  const zWatts = standardize(watts);
  const zMins = standardize(mins);

  // 使用自定义权重或配置文件权重
  const weights = appState.customWeights || appState.config?.scoreWeights || {
    strength: 0.5,
    cardio: 0.35,
    duration: 0.15,
  };

  const rawScore = data.items.map((_, i) =>
    weights.strength * zStrength[i] +
    weights.cardio * zWatts[i] +
    weights.duration * zMins[i]
  );
  const smooth = movingAverage(rawScore, 3);

  chart.setOption({
    animation: false,
    grid: { left: 48, right: 18, top: 44, bottom: 62 },
    tooltip: { trigger: "axis", textStyle: { fontSize: 15 } },
    dataZoom: DATA_ZOOM_X,
    xAxis: { type: "category", data: xs, axisLabel: { rotate: 40, fontSize: 15 } },
    yAxis: {
      type: "value",
      name: "综合评分(标准化)",
      nameTextStyle: { fontSize: 15 },
      axisLabel: { fontSize: 15 },
    },
    series: [
      {
        name: "综合评分（3 日均线）",
        type: "line",
        data: smooth.map((v) => Number(v.toFixed(3))),
        symbolSize: 6,
        lineStyle: { width: 2 },
        label: lineSeriesLabel((p) => {
          const v = p.value;
          if (v == null || v === "") return "";
          const n = Number(v);
          return Number.isFinite(n) ? n.toFixed(3) : "";
        }),
      },
    ],
  });
}

function renderMissingHint(container, xs, ys, show) {
  if (!show) {
    container.textContent = "";
    return;
  }
  const missing = xs
    .map((d, i) => (ys[i] == null ? d : null))
    .filter(Boolean);
  container.textContent = missing.length
    ? `该动作在以下日期没有记录：${missing.join("、")}`
    : "该动作在所有日期都有记录。";
}

function rerenderAll() {
  const data = appState.data;
  const bodyPoints = appState.bodyPoints;
  if (!data?.items?.length) return;
  const exerciseSelect = document.getElementById("exerciseSelect");
  const metricSelect = document.getElementById("metricSelect");
  const showMissing = document.getElementById("showMissing");
  const missingHint = document.getElementById("missingHint");
  const ex = exerciseSelect.value;
  const metric = metricSelect.value;
  const { xs, ys } = renderExerciseChart(charts.exerciseChart, data, ex, metric);
  renderMissingHint(missingHint, xs, ys, showMissing.checked);
  renderScoreChart(charts.scoreChart, data);
  renderBodyChart(charts.bodyChart, bodyPoints, appState.bodyGoals);
}

async function loadData() {
  assertEchartsLoaded();

  // 加载配置文件
  try {
    const configRes = await fetch(CONFIG_JSON_PATH, { cache: "no-store" });
    if (configRes.ok) {
      appState.config = await configRes.json();
    }
  } catch (error) {
    console.warn("无法加载配置文件，将使用默认配置:", error);
  }

  const res = await fetch(DATA_JSON_PATH, { cache: "no-store" });
  if (!res.ok) throw new Error(`读取 data.json 失败：${res.status}`);
  const json = await res.json();
  const data = buildDataFromJsonRows(json?.rows);
  if (!data.items.length) throw new Error("data.json 中 rows 为空。");
  appState.data = data;
  appState.bodyPoints = parseBodyMetricRows(json?.bodyMetrics);
  appState.bodyGoals = json?.bodyGoals ?? null;
  setExerciseOptions(document.getElementById("exerciseSelect"), data.exercises);
  rerenderAll();
}

function init() {
  charts = createCharts();
  const exerciseSelect = document.getElementById("exerciseSelect");
  const metricSelect = document.getElementById("metricSelect");
  const showMissing = document.getElementById("showMissing");
  const reloadBtn = document.getElementById("reloadBtn");

  // 权重控制
  const strengthWeight = document.getElementById("strengthWeight");
  const cardioWeight = document.getElementById("cardioWeight");
  const durationWeight = document.getElementById("durationWeight");
  const strengthWeightValue = document.getElementById("strengthWeightValue");
  const cardioWeightValue = document.getElementById("cardioWeightValue");
  const durationWeightValue = document.getElementById("durationWeightValue");
  const resetWeightsBtn = document.getElementById("resetWeightsBtn");

  // 从 localStorage 加载自定义权重
  const savedWeights = localStorage.getItem("scoreWeights");
  if (savedWeights) {
    try {
      appState.customWeights = JSON.parse(savedWeights);
      strengthWeight.value = Math.round(appState.customWeights.strength * 100);
      cardioWeight.value = Math.round(appState.customWeights.cardio * 100);
      durationWeight.value = Math.round(appState.customWeights.duration * 100);
    } catch (e) {
      console.warn("无法加载保存的权重:", e);
    }
  }

  // 更新权重显示
  function updateWeightDisplay() {
    const s = parseInt(strengthWeight.value) / 100;
    const c = parseInt(cardioWeight.value) / 100;
    const d = parseInt(durationWeight.value) / 100;
    strengthWeightValue.textContent = s.toFixed(2);
    cardioWeightValue.textContent = c.toFixed(2);
    durationWeightValue.textContent = d.toFixed(2);
  }

  // 权重变化时更新
  function handleWeightChange() {
    const s = parseInt(strengthWeight.value) / 100;
    const c = parseInt(cardioWeight.value) / 100;
    const d = parseInt(durationWeight.value) / 100;

    appState.customWeights = {
      strength: s,
      cardio: c,
      duration: d,
    };

    // 保存到 localStorage
    localStorage.setItem("scoreWeights", JSON.stringify(appState.customWeights));

    updateWeightDisplay();

    // 重新渲染评分图表
    if (appState.data) {
      renderScoreChart(charts.scoreChart, appState.data);
    }
  }

  // 重置权重
  function resetWeights() {
    const defaultWeights = appState.config?.scoreWeights || {
      strength: 0.5,
      cardio: 0.35,
      duration: 0.15,
    };

    strengthWeight.value = Math.round(defaultWeights.strength * 100);
    cardioWeight.value = Math.round(defaultWeights.cardio * 100);
    durationWeight.value = Math.round(defaultWeights.duration * 100);

    appState.customWeights = null;
    localStorage.removeItem("scoreWeights");

    updateWeightDisplay();

    if (appState.data) {
      renderScoreChart(charts.scoreChart, appState.data);
    }
  }

  updateWeightDisplay();

  exerciseSelect.addEventListener("change", rerenderAll);
  metricSelect.addEventListener("change", rerenderAll);
  showMissing.addEventListener("change", rerenderAll);
  strengthWeight.addEventListener("input", handleWeightChange);
  cardioWeight.addEventListener("input", handleWeightChange);
  durationWeight.addEventListener("input", handleWeightChange);
  resetWeightsBtn.addEventListener("click", resetWeights);
  reloadBtn.addEventListener("click", async () => {
    reloadBtn.disabled = true;
    try {
      await loadData();
    } finally {
      reloadBtn.disabled = false;
    }
  });

  loadData().catch((err) => {
    const hint = document.getElementById("missingHint");
    hint.textContent =
      `页面加载失败：${err?.message || err}\n\n` +
      `请在 fitness 目录执行：npm run dev\n` +
      `然后按终端提示访问本地地址（勿直接双击打开）。`;
  });
}

init();

