/**
 * AI 训练助手
 * 使用 Claude API 提供智能对话、数据录入、训练分析等功能
 */

const DATA_PATH = `${import.meta.env.BASE_URL}data.json`;
const CONFIG_PATH = `${import.meta.env.BASE_URL}config.json`;
const API_KEY_STORAGE_KEY = "claude_api_key";
const BASE_URL_STORAGE_KEY = "claude_base_url";
const DEFAULT_BASE_URL = "https://api.anthropic.com";

let apiKey = null;
let baseUrl = null;
let conversationHistory = [];
let userData = null;
let config = null;

/**
 * 初始化
 */
async function init() {
  // 加载 API Key 和 Base URL
  apiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
  baseUrl = localStorage.getItem(BASE_URL_STORAGE_KEY) || DEFAULT_BASE_URL;

  if (apiKey) {
    document.getElementById("apiKeyBanner").classList.add("hidden");
  } else {
    // 如果有保存的 base URL，显示在输入框中
    if (baseUrl !== DEFAULT_BASE_URL) {
      document.getElementById("baseUrlInput").value = baseUrl;
    }
  }

  // 加载用户数据
  try {
    const [dataRes, configRes] = await Promise.all([
      fetch(DATA_PATH, { cache: "no-store" }),
      fetch(CONFIG_PATH, { cache: "no-store" }),
    ]);

    if (dataRes.ok) {
      userData = await dataRes.json();
    }
    if (configRes.ok) {
      config = await configRes.json();
    }
  } catch (error) {
    console.warn("无法加载数据:", error);
  }

  // 绑定事件
  document.getElementById("saveApiKeyBtn").addEventListener("click", saveApiKey);
  document.getElementById("sendBtn").addEventListener("click", sendMessage);
  document.getElementById("userInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // 快捷操作
  document.querySelectorAll(".quick-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      handleQuickAction(action);
    });
  });
}

/**
 * 保存 API Key 和 Base URL
 */
function saveApiKey() {
  const keyInput = document.getElementById("apiKeyInput");
  const urlInput = document.getElementById("baseUrlInput");
  const key = keyInput.value.trim();
  const url = urlInput.value.trim();

  if (!key) {
    alert("请输入 API Key");
    return;
  }

  // 保存 API Key
  apiKey = key;
  localStorage.setItem(API_KEY_STORAGE_KEY, key);

  // 保存 Base URL（如果提供了）
  if (url) {
    // 移除末尾的斜杠
    baseUrl = url.replace(/\/$/, "");
    localStorage.setItem(BASE_URL_STORAGE_KEY, baseUrl);
  } else {
    baseUrl = DEFAULT_BASE_URL;
    localStorage.removeItem(BASE_URL_STORAGE_KEY);
  }

  document.getElementById("apiKeyBanner").classList.add("hidden");

  const urlInfo = baseUrl !== DEFAULT_BASE_URL ? `\n使用自定义 Base URL: ${baseUrl}` : "";
  addMessage("assistant", `✅ API 配置已保存！${urlInfo}\n\n现在你可以开始使用 AI 助手了。`);
}

/**
 * 快捷操作
 */
function handleQuickAction(action) {
  const prompts = {
    record: "我想录入今天的训练数据",
    analyze: "帮我分析一下最近的训练趋势",
    suggest: "根据我的训练数据，给我一些改进建议",
    progress: "帮我看看我的训练进步情况",
  };

  const prompt = prompts[action];
  if (prompt) {
    document.getElementById("userInput").value = prompt;
    sendMessage();
  }
}

/**
 * 发送消息
 */
async function sendMessage() {
  if (!apiKey) {
    alert("请先设置 API Key");
    return;
  }

  const input = document.getElementById("userInput");
  const message = input.value.trim();

  if (!message) return;

  // 添加用户消息
  addMessage("user", message);
  input.value = "";

  // 显示加载状态
  const loadingId = addLoadingMessage();

  try {
    // 调用 Claude API
    const response = await callClaudeAPI(message);

    // 移除加载状态
    removeMessage(loadingId);

    // 添加 AI 回复
    addMessage("assistant", response);

    // 检查是否包含训练数据，如果有则提供下载
    checkAndOfferDownload(response);
  } catch (error) {
    removeMessage(loadingId);
    addMessage("assistant", `❌ 错误: ${error.message}`);
  }
}

/**
 * 调用 Claude API
 */
async function callClaudeAPI(userMessage) {
  // 构建系统提示
  const systemPrompt = buildSystemPrompt();

  // 添加到对话历史
  conversationHistory.push({
    role: "user",
    content: userMessage,
  });

  // 构建 API endpoint
  const apiEndpoint = `${baseUrl}/v1/messages`;

  const response = await fetch(apiEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      system: systemPrompt,
      messages: conversationHistory,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = "API 调用失败";

    try {
      const error = JSON.parse(errorText);
      errorMessage = error.error?.message || errorMessage;
    } catch {
      errorMessage = `${errorMessage}: ${response.status} ${response.statusText}`;
    }

    throw new Error(errorMessage);
  }

  const data = await response.json();
  const assistantMessage = data.content[0].text;

  // 添加到对话历史
  conversationHistory.push({
    role: "assistant",
    content: assistantMessage,
  });

  return assistantMessage;
}

/**
 * 构建系统提示
 */
function buildSystemPrompt() {
  const latestTraining = userData?.rows?.[0];
  const latestBodyMetrics = userData?.bodyMetrics?.[0];
  const exerciseList = config?.exercises?.map((e) => e.name).join("、") || "";

  return `你是一个专业的健身训练助手，帮助用户管理训练数据、分析进步、提供建议。

## 你的能力

1. **自然语言录入训练数据**
   - 用户可以用自然语言描述训练，如"今天练了卷腹机 45kg×12×4，卧推 40kg×10×3"
   - 你需要解析并生成标准的 CSV 格式数据
   - 格式：日期,运动时长,动作1,动作2,...
   - 动作格式：重量kg×次数×组数（如 45kg×12×4）
   - 未做的动作填写"–"

2. **训练数据分析**
   - 分析训练趋势、进步情况
   - 识别强项和弱项
   - 对比不同时期的表现

3. **个性化建议**
   - 根据用户数据提供训练建议
   - 调整训练计划
   - 提醒注意事项

4. **回答健身问题**
   - 解答健身相关疑问
   - 提供科学的训练知识

## 用户数据

**可用动作列表：**
${exerciseList}

**最近一次训练（${latestTraining?.日期 || "无"}）：**
${latestTraining ? JSON.stringify(latestTraining, null, 2) : "暂无数据"}

**最近体重体脂（${latestBodyMetrics?.日期 || "无"}）：**
${latestBodyMetrics ? `体重 ${latestBodyMetrics.体重kg}kg，体脂率 ${latestBodyMetrics.体脂率 || "未测"}%` : "暂无数据"}

**训练记录总数：** ${userData?.rows?.length || 0} 条

## 重要规则

1. **录入数据时**，必须生成完整的 CSV 格式，包含所有动作列（未做的填"–"）
2. 生成 CSV 时，用代码块包裹，并标注 \`\`\`csv
3. 日期格式必须是 MM-DD（如 04-29）
4. 分析时要具体、有数据支撑
5. 建议要实用、可执行
6. 保持友好、鼓励的语气

## 示例对话

用户："今天练了卷腹机 45kg×12×4，卧推 40kg×10×3，运动时长 120分钟"

你的回复：
好的！我帮你整理今天的训练数据：

**训练摘要：**
- 卷腹机：45kg × 12次 × 4组
- 卧推：40kg × 10次 × 3组
- 运动时长：120分钟

**CSV 数据：**
\`\`\`csv
日期,运动时长,坐立卷腹机,曲臂伸机,坐姿器械侧平举,卧推,...
04-29,120分钟,45kg×12×4,–,–,40kg×10×3,...
\`\`\`

你可以复制上面的 CSV 数据，替换 public/training-log.csv 的第二行（表头下方），然后运行 \`npm run rebuild:data\` 更新数据。

现在开始对话吧！`;
}

/**
 * 添加消息到聊天界面
 */
function addMessage(role, content) {
  const container = document.getElementById("chatContainer");

  // 移除欢迎消息
  const welcome = container.querySelector(".welcome");
  if (welcome) {
    welcome.remove();
  }

  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${role}`;
  messageDiv.innerHTML = `
    <div class="message-avatar">${role === "user" ? "👤" : "🤖"}</div>
    <div class="message-content">${formatMessage(content)}</div>
  `;

  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;

  return messageDiv;
}

/**
 * 格式化消息内容
 */
function formatMessage(content) {
  // 简单的 Markdown 支持
  let formatted = content
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');

  return formatted;
}

/**
 * 添加加载消息
 */
function addLoadingMessage() {
  const container = document.getElementById("chatContainer");
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "message assistant";
  loadingDiv.id = `loading-${Date.now()}`;
  loadingDiv.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="message-content">
      <div class="loading">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;

  container.appendChild(loadingDiv);
  container.scrollTop = container.scrollHeight;

  return loadingDiv.id;
}

/**
 * 移除消息
 */
function removeMessage(id) {
  const message = document.getElementById(id);
  if (message) {
    message.remove();
  }
}

/**
 * 检查并提供下载
 */
function checkAndOfferDownload(response) {
  // 检查是否包含 CSV 数据
  const csvMatch = response.match(/```csv\n([\s\S]*?)```/);
  if (csvMatch) {
    const csvContent = csvMatch[1].trim();
    // 可以在这里添加下载按钮
    console.log("检测到 CSV 数据:", csvContent);
  }
}

// 初始化
init();
