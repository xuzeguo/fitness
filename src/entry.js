/**
 * 训练数据录入表单
 */

const CONFIG_PATH = `${import.meta.env.BASE_URL}config.json`;
const DATA_PATH = `${import.meta.env.BASE_URL}data.json`;

let config = null;
let lastTraining = null;

/**
 * 加载配置文件
 */
async function loadConfig() {
  try {
    const res = await fetch(CONFIG_PATH, { cache: "no-store" });
    if (!res.ok) throw new Error("无法加载配置文件");
    config = await res.json();
  } catch (error) {
    showAlert("无法加载配置文件，请刷新页面重试", "error");
    throw error;
  }
}

/**
 * 加载最近一次训练数据
 */
async function loadLastTraining() {
  try {
    const res = await fetch(DATA_PATH, { cache: "no-store" });
    if (!res.ok) throw new Error("无法加载训练数据");
    const data = await res.json();
    if (data.rows && data.rows.length > 0) {
      lastTraining = data.rows[0]; // 最新的记录在第一个
    }
  } catch (error) {
    console.warn("无法加载上次训练数据:", error);
  }
}

/**
 * 显示提示信息
 */
function showAlert(message, type = "success") {
  const alert = document.getElementById("alert");
  alert.textContent = message;
  alert.className = `alert alert-${type}`;
  alert.classList.remove("hidden");

  setTimeout(() => {
    alert.classList.add("hidden");
  }, 5000);
}

/**
 * 渲染动作输入框
 */
function renderExercises() {
  const container = document.getElementById("exercisesContainer");
  const exercises = config.exercises.filter((ex) => ex.enabled);

  exercises.forEach((exercise) => {
    const lastValue = lastTraining ? lastTraining[exercise.name] || "–" : "–";

    const div = document.createElement("div");
    div.className = "exercise-item";
    div.innerHTML = `
      <div class="exercise-header">
        <span class="exercise-name">${exercise.name}</span>
        <span class="last-value">上次: ${lastValue}</span>
      </div>
      <div class="exercise-input">
        <div class="input-group">
          <label>重量 (kg)</label>
          <input type="text" name="${exercise.name}_weight" placeholder="20">
        </div>
        <div class="input-group">
          <label>次数</label>
          <input type="text" name="${exercise.name}_reps" placeholder="12">
        </div>
        <div class="input-group">
          <label>组数</label>
          <input type="text" name="${exercise.name}_sets" placeholder="4">
        </div>
      </div>
    `;

    container.appendChild(div);
  });
}

/**
 * 获取今天的日期（MM-DD 格式）
 */
function getTodayDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${month}-${day}`;
}

/**
 * 复制上次训练数据
 */
function copyLastTraining() {
  if (!lastTraining) {
    showAlert("没有找到上次训练数据", "error");
    return;
  }

  // 填充时长
  const durationInput = document.getElementById("duration");
  if (lastTraining["运动时长"]) {
    durationInput.value = lastTraining["运动时长"];
  }

  // 填充各个动作
  const exercises = config.exercises.filter((ex) => ex.enabled);
  exercises.forEach((exercise) => {
    const value = lastTraining[exercise.name];
    if (!value || value === "–" || value === "未做") return;

    // 尝试解析格式：20kg×12×4
    const match = value.match(/(\d+(?:\.\d+)?)\s*kg\s*[×x*]\s*(\d+)\s*[×x*]\s*(\d+)/i);
    if (match) {
      const [, weight, reps, sets] = match;
      document.querySelector(`[name="${exercise.name}_weight"]`).value = weight;
      document.querySelector(`[name="${exercise.name}_reps"]`).value = reps;
      document.querySelector(`[name="${exercise.name}_sets"]`).value = sets;
    }
  });

  showAlert("已复制上次训练数据", "success");
}

/**
 * 清空表单
 */
function clearForm() {
  document.getElementById("trainingForm").reset();
  document.getElementById("date").value = getTodayDate();
  showAlert("表单已清空", "success");
}

/**
 * 生成 CSV 行
 */
function generateCsvRow(formData) {
  const row = {
    序号: "1", // 会被脚本重新编号
    日期: formData.get("date"),
    运动时长: formData.get("duration") || "–",
  };

  const exercises = config.exercises.filter((ex) => ex.enabled);
  exercises.forEach((exercise) => {
    const weight = formData.get(`${exercise.name}_weight`);
    const reps = formData.get(`${exercise.name}_reps`);
    const sets = formData.get(`${exercise.name}_sets`);

    if (weight && reps && sets) {
      row[exercise.name] = `${weight}kg×${reps}×${sets}`;
    } else {
      row[exercise.name] = "–";
    }
  });

  return row;
}

/**
 * 下载 CSV 文件
 */
function downloadCsv(csvContent, filename) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 处理表单提交
 */
async function handleSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const date = formData.get("date");

  // 验证日期格式
  if (!/^\d{2}-\d{2}$/.test(date)) {
    showAlert("日期格式错误，应为 MM-DD（如 04-29）", "error");
    return;
  }

  try {
    // 生成新行
    const newRow = generateCsvRow(formData);

    // 读取现有 CSV
    const res = await fetch(`${import.meta.env.BASE_URL}training-log.csv`, {
      cache: "no-store",
    });
    const csvText = await res.text();
    const lines = csvText.split("\n").filter((l) => l.trim());

    // 插入新行（在表头后）
    const header = lines[0];
    const headerCols = header.split(",");

    const newRowCsv = headerCols
      .map((col) => {
        const value = newRow[col.trim()] || "–";
        // 简单转义
        if (value.includes(",") || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(",");

    const newCsvContent = [header, newRowCsv, ...lines.slice(1)].join("\n");

    // 下载 CSV
    downloadCsv(newCsvContent, `training-log-${date}.csv`);

    showAlert(
      "CSV 已生成！请将下载的文件替换 public/training-log.csv，然后运行 npm run rebuild:data",
      "success"
    );
  } catch (error) {
    showAlert(`生成失败: ${error.message}`, "error");
  }
}

/**
 * 初始化
 */
async function init() {
  try {
    await loadConfig();
    await loadLastTraining();

    renderExercises();

    // 设置默认日期
    document.getElementById("date").value = getTodayDate();

    // 绑定事件
    document.getElementById("trainingForm").addEventListener("submit", handleSubmit);
    document.getElementById("copyLastBtn").addEventListener("click", copyLastTraining);
    document.getElementById("clearBtn").addEventListener("click", clearForm);
  } catch (error) {
    console.error("初始化失败:", error);
  }
}

init();
