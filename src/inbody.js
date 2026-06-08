import "./styles/trends.css";

const INBODY_PATH = `${import.meta.env.BASE_URL}inbody.json`;

const SEG_KEYS = ["rightArm", "leftArm", "trunk", "rightLeg", "leftLeg"];
const SEG_LABELS = { rightArm: "右臂", leftArm: "左臂", trunk: "躯干", rightLeg: "右腿", leftLeg: "左腿" };

// 参考范围 (男性)
const REF = {
  weight:            { lo: null, hi: null, unit: "kg",   note: "–" },
  bmi:               { lo: 18.5, hi: 24.9, unit: "",     note: "18.5–24.9" },
  bodyFatPct:        { lo: 10,   hi: 20,   unit: "%",    note: "10–20%" },
  skeletalMuscleMass:{ lo: null, hi: null, unit: "kg",   note: "维持或增加" },
  leanMass:          { lo: null, hi: null, unit: "kg",   note: "维持或增加" },
  bodyFatMass:       { lo: null, hi: null, unit: "kg",   note: "↓" },
  bmr:               { lo: null, hi: null, unit: "kcal", note: "维持 > 1700" },
  visceralFatArea:   { lo: null, hi: 100,  unit: "cm²",  note: "< 100" },
  inbodyScore:       { lo: 80,   hi: null, unit: "",     note: "≥ 80" },
  ecwRatio:          { lo: null, hi: 38,   unit: "%",    note: "< 38%" },
};

async function loadData() {
  const res = await fetch(INBODY_PATH);
  if (!res.ok) throw new Error(`无法加载 inbody.json: ${res.status}`);
  return res.json();
}

function getEcwPct(rec) {
  if (rec.ecwRatio != null) return +(rec.ecwRatio * 100).toFixed(1);
  const c = rec.composition;
  if (c.extracellularWater != null && c.totalBodyWater)
    return +((c.extracellularWater / c.totalBodyWater) * 100).toFixed(1);
  return null;
}

function statusClass(val, ref) {
  if (val == null) return "";
  if (ref.hi != null && val > ref.hi) return "ib-bad";
  if (ref.lo != null && val < ref.lo) return "ib-bad";
  if (ref.hi != null || ref.lo != null) return "ib-good";
  return "";
}

function arrow(delta, goodDown) {
  if (delta == null) return "";
  const d = parseFloat(delta);
  if (d === 0) return '<span class="ib-neutral">→</span>';
  const down = d < 0;
  return down === goodDown
    ? `<span class="ib-good">${down ? "↓" : "↑"} ${Math.abs(d)}</span>`
    : `<span class="ib-bad">${down ? "↓" : "↑"} ${Math.abs(d)}</span>`;
}

// ── 综合趋势对比表（横向，每列一次测量） ──────────────────────
function renderTrend(records) {
  const sec = document.createElement("section");
  sec.className = "ib-trend";

  // 按时间正序排列（旧→新）
  const asc = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const n = asc.length;

  const ROWS = [
    { label: "体重",       unit: "kg",   key: "weight",             src: r => r.body.weight,             goodDown: true  },
    { label: "BMI",        unit: "",     key: "bmi",                src: r => r.body.bmi,                goodDown: true  },
    { label: "体脂率",     unit: "%",    key: "bodyFatPct",         src: r => r.body.bodyFatPct,         goodDown: true  },
    { label: "体脂量",     unit: "kg",   key: "bodyFatMass",        src: r => r.body.bodyFatMass,        goodDown: true  },
    { label: "去脂体重",   unit: "kg",   key: "leanMass",           src: r => r.body.leanMass,           goodDown: false },
    { label: "骨骼肌量",   unit: "kg",   key: "skeletalMuscleMass", src: r => r.body.skeletalMuscleMass, goodDown: false },
    { label: "基础代谢",   unit: "kcal", key: "bmr",                src: r => r.metabolism.bmr,          goodDown: false },
    { label: "内脏脂肪",   unit: "cm²",  key: "visceralFatArea",    src: r => r.visceralFatArea,         goodDown: true  },
    { label: "InBody评分", unit: "",     key: "inbodyScore",        src: r => r.inbodyScore,             goodDown: false },
    { label: "ECW比",      unit: "%",    key: "ecwRatio",           src: r => getEcwPct(r),              goodDown: true  },
  ];

  const headerCols = asc.map(r => `<th>${r.date.slice(2)}</th>`).join("");
  const trendRows = ROWS.map(row => {
    const vals = asc.map(r => row.src(r));
    const cells = vals.map((v, i) => {
      if (v == null) return `<td class="ib-na">–</td>`;
      const ref = REF[row.key];
      const cls = statusClass(v, ref);
      let delta = "";
      if (i > 0) {
        const prev = vals[i - 1];
        if (prev != null) {
          const d = (v - prev).toFixed(1);
          delta = arrow(d, row.goodDown);
        }
      }
      return `<td class="${cls}">${v}<small>${row.unit}</small>${delta ? `<br><span class="ib-step">${delta}</span>` : ""}</td>`;
    });
    const ref = REF[row.key];
    const first = vals.find(v => v != null);
    const last = [...vals].reverse().find(v => v != null);
    const totalDelta = (first != null && last != null && first !== last)
      ? arrow((last - first).toFixed(1), row.goodDown) : "";
    return `<tr>
      <td class="ib-row-label">${row.label}</td>
      <td class="ib-ref">${ref.note}</td>
      ${cells.join("")}
      <td class="ib-total">${totalDelta}</td>
    </tr>`;
  }).join("");

  sec.innerHTML = `
    <h2 class="ib-trend-h2">三次对比 <span class="ib-trend-sub">↑↓ 相邻变化 / 末列为首尾合计</span></h2>
    <div class="ib-trend-scroll">
      <table class="ib-table ib-ctable">
        <thead>
          <tr>
            <th>指标</th>
            <th class="ib-ref">参考范围</th>
            ${headerCols}
            <th>首→尾</th>
          </tr>
        </thead>
        <tbody>${trendRows}</tbody>
      </table>
    </div>
    <div id="ib-echarts-wrap" class="ib-charts-grid"></div>
  `;

  setTimeout(() => renderCharts(asc, sec.querySelector("#ib-echarts-wrap")), 80);
  return sec;
}

// ── ECharts 折线图 ────────────────────────────────────────────
function renderCharts(records, wrap) {
  if (typeof window.echarts === "undefined" || !wrap) return;
  const dates = records.map(r => r.date.slice(5));
  const defs = [
    { title: "体重 & 去脂体重 (kg)", series: [
        { name: "体重",     color: "#ef4444", data: records.map(r => r.body.weight) },
        { name: "去脂体重", color: "#3b82f6", data: records.map(r => r.body.leanMass) },
    ]},
    { title: "体脂率 (%)", series: [
        { name: "体脂率", color: "#f97316", data: records.map(r => r.body.bodyFatPct) },
    ]},
    { title: "骨骼肌量 (kg)", series: [
        { name: "骨骼肌量", color: "#22c55e", data: records.map(r => r.body.skeletalMuscleMass) },
    ]},
    { title: "内脏脂肪面积 (cm²)", series: [
        { name: "内脏脂肪", color: "#a855f7", data: records.map(r => r.visceralFatArea) },
    ]},
  ];
  defs.forEach(def => {
    const div = document.createElement("div");
    div.className = "ib-chart";
    wrap.appendChild(div);
    window.echarts.init(div).setOption({
      title: { text: def.title, textStyle: { fontSize: 13, fontWeight: 600 } },
      tooltip: { trigger: "axis" },
      legend: { bottom: 0, textStyle: { fontSize: 12 } },
      grid: { top: 40, bottom: 40, left: 40, right: 16 },
      xAxis: { type: "category", data: dates, axisLabel: { fontSize: 12 } },
      yAxis: { type: "value", scale: true, axisLabel: { fontSize: 11 } },
      series: def.series.map(s => ({
        name: s.name, type: "line", data: s.data, smooth: true,
        symbolSize: 8, lineStyle: { width: 2, color: s.color },
        itemStyle: { color: s.color },
        label: { show: true, position: "top", fontSize: 12, fontWeight: 600 },
      })),
    });
  });
}

// ── 单份报告详情 ──────────────────────────────────────────────
function renderReport(rec, idx, asc) {
  const b = rec.body;
  const c = rec.composition;
  const sm = rec.segmental.muscle;
  const sf = rec.segmental.fat;
  const ecwR = getEcwPct(rec);
  const vfa = rec.visceralFatArea;
  const ibScore = rec.inbodyScore;
  const trunkFatPct = (sf.trunk / b.bodyFatMass * 100).toFixed(1);

  // 与上一次对比
  const prev = asc[idx - 1];
  function d(cur, pFn, goodDown) {
    if (!prev) return "";
    const p = pFn(prev);
    if (p == null || cur == null) return "";
    return arrow((cur - p).toFixed(1), goodDown);
  }

  // 主指标行
  const MAIN = [
    { label: "体重",       val: b.weight,             unit: "kg",   ref: REF.weight,             chg: d(b.weight,             p => p.body.weight,             true)  },
    { label: "BMI",        val: b.bmi,                unit: "",     ref: REF.bmi,                chg: d(b.bmi,                p => p.body.bmi,                true)  },
    { label: "体脂率",     val: b.bodyFatPct,         unit: "%",    ref: REF.bodyFatPct,         chg: d(b.bodyFatPct,         p => p.body.bodyFatPct,         true)  },
    { label: "体脂量",     val: b.bodyFatMass,        unit: "kg",   ref: REF.bodyFatMass,        chg: d(b.bodyFatMass,        p => p.body.bodyFatMass,        true)  },
    { label: "去脂体重",   val: b.leanMass,           unit: "kg",   ref: REF.leanMass,           chg: d(b.leanMass,           p => p.body.leanMass,           false) },
    { label: "骨骼肌量",   val: b.skeletalMuscleMass, unit: "kg",   ref: REF.skeletalMuscleMass, chg: d(b.skeletalMuscleMass, p => p.body.skeletalMuscleMass, false) },
    { label: "基础代谢率", val: rec.metabolism.bmr,   unit: "kcal", ref: REF.bmr,                chg: d(rec.metabolism.bmr,   p => p.metabolism.bmr,          false) },
    { label: "内脏脂肪面积", val: vfa,                unit: "cm²",  ref: REF.visceralFatArea,    chg: d(vfa,                  p => p.visceralFatArea,         true)  },
    { label: "InBody评分", val: ibScore,              unit: "",     ref: REF.inbodyScore,        chg: d(ibScore,              p => p.inbodyScore,             false) },
    { label: "ECW比",      val: ecwR,                 unit: "%",    ref: REF.ecwRatio,           chg: d(ecwR,                 p => getEcwPct(p),              true)  },
  ];

  const mainRows = MAIN.map(row => {
    if (row.val == null) return "";
    const cls = statusClass(row.val, row.ref);
    return `<tr>
      <td>${row.label}</td>
      <td class="ib-ref-sm">${row.ref.note}</td>
      <td class="${cls} ib-val-cell">${row.val}<small>${row.unit}</small></td>
      <td>${row.chg}</td>
    </tr>`;
  }).join("");

  // 节段哑铃行
  const maxMuscle = Math.max(...SEG_KEYS.map(k => sm[k]));
  const maxFat    = Math.max(...SEG_KEYS.map(k => sf[k]));
  const segRows = SEG_KEYS.map(k => {
    const mPct = (sm[k] / maxMuscle * 100).toFixed(0);
    const fPct = (sf[k] / maxFat    * 100).toFixed(0);
    const ratio = (sm[k] / sf[k]).toFixed(1);
    let prevMChg = "", prevFChg = "";
    if (prev) {
      prevMChg = arrow((sm[k] - prev.segmental.muscle[k]).toFixed(2), false);
      prevFChg = arrow((sf[k] - prev.segmental.fat[k]).toFixed(2),    true);
    }
    return `<tr>
      <td class="ib-seg-label">${SEG_LABELS[k]}</td>
      <td class="ib-bar-cell">
        <div class="ib-bar-wrap">
          <div class="ib-bar ib-bar-m" style="width:${mPct}%"></div>
        </div>
        <span class="ib-bar-num">${sm[k]} kg ${prevMChg}</span>
      </td>
      <td class="ib-bar-cell">
        <div class="ib-bar-wrap">
          <div class="ib-bar ib-bar-f" style="width:${fPct}%"></div>
        </div>
        <span class="ib-bar-num">${sf[k]} kg ${prevFChg}</span>
      </td>
      <td class="ib-ratio">${ratio}</td>
    </tr>`;
  }).join("");

  const card = document.createElement("section");
  card.className = "ib-report";
  card.innerHTML = `
    <div class="ib-report-hd">
      <span class="ib-date">${rec.date}</span>
      <span class="ib-badge">第 ${idx + 1} 次</span>
      ${rec.note ? `<span class="ib-note">${rec.note}</span>` : ""}
    </div>
    <div class="ib-report-body">
      <div>
        <div class="ib-section-title">核心指标</div>
        <table class="ib-table">
          <thead><tr><th>指标</th><th>参考</th><th>数值</th><th>变化</th></tr></thead>
          <tbody>${mainRows}</tbody>
        </table>
      </div>
      <div>
        <div class="ib-section-title">体成分构成</div>
        <div class="ib-comp-stack" id="comp-stack-${idx}"></div>
        <div class="ib-insight">
          <p>躯干脂肪 <strong>${sf.trunk} kg</strong>，占总体脂 <strong>${trunkFatPct}%</strong></p>
          ${ecwR != null ? `<p>ECW比 <strong>${ecwR}%</strong>（< 38% 正常）${parseFloat(ecwR) < 38 ? " ✅" : " ⚠️"}</p>` : ""}
          <p>估算日消耗 <strong>${Math.round(rec.metabolism.bmr * 1.5)}–${Math.round(rec.metabolism.bmr * 1.65)} kcal</strong></p>
        </div>
      </div>
    </div>
    <div class="ib-section-title">节段分布</div>
    <table class="ib-table ib-seg-table">
      <thead>
        <tr><th>部位</th><th>肌肉量</th><th>脂肪量</th><th>肌/脂</th></tr>
      </thead>
      <tbody>${segRows}</tbody>
    </table>
  `;

  // 体成分堆叠条（仿 InBody 原报告）
  const stackEl = card.querySelector(`#comp-stack-${idx}`);
  const fat = b.bodyFatMass;
  const icw = c.intracellularWater ?? (c.totalBodyWater * 0.71);
  const ecw = c.extracellularWater ?? (c.totalBodyWater * 0.29);
  const prot = c.protein;
  const min = c.mineral;
  const total = fat + icw + ecw + prot + min;
  const stackItems = [
    { label: "体脂",   val: fat,  pct: (fat  / total * 100).toFixed(0), cls: "s-fat"  },
    { label: "细胞外水", val: ecw,  pct: (ecw  / total * 100).toFixed(0), cls: "s-ecw"  },
    { label: "细胞内水", val: icw,  pct: (icw  / total * 100).toFixed(0), cls: "s-icw"  },
    { label: "蛋白质", val: prot, pct: (prot / total * 100).toFixed(0), cls: "s-prot" },
    { label: "矿物质", val: min,  pct: (min  / total * 100).toFixed(0), cls: "s-min"  },
  ];
  stackEl.innerHTML = `
    <div class="ib-stack-bar">
      ${stackItems.map(s => `<div class="ib-stack-seg ${s.cls}" style="width:${s.pct}%" title="${s.label}: ${s.val.toFixed(1)} kg"></div>`).join("")}
    </div>
    <div class="ib-stack-legend">
      ${stackItems.map(s => `<span class="ib-leg-item"><i class="${s.cls}"></i>${s.label} ${s.val.toFixed(1)} kg</span>`).join("")}
    </div>
  `;

  return card;
}

// ── 主入口 ────────────────────────────────────────────────────
async function main() {
  const app = document.getElementById("app");
  try {
    const records = await loadData();
    const asc = [...records].sort((a, b) => a.date.localeCompare(b.date));

    app.innerHTML = "";
    app.appendChild(renderTrend(asc));

    const hr = document.createElement("hr");
    hr.className = "ib-divider";
    app.appendChild(hr);

    const h = document.createElement("h2");
    h.className = "ib-section-h2";
    h.textContent = "历次报告详情";
    app.appendChild(h);

    // 最新在前
    [...asc].reverse().forEach((rec, i) => {
      const ascIdx = asc.indexOf(rec);
      app.appendChild(renderReport(rec, ascIdx, asc));
      if (i < asc.length - 1) {
        const d = document.createElement("hr");
        d.className = "ib-divider";
        app.appendChild(d);
      }
    });
  } catch (e) {
    app.innerHTML = `<div class="ib-error">加载失败：${e.message}</div>`;
  }
}

main();
