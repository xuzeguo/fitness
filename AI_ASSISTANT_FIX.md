# AI 助手 API 调用问题修复指南

## 问题描述

AI 助手在调用 API 时返回了 HTML 页面（北妈AI 的登录页），而不是预期的 JSON API 响应。

## 问题原因

**代理服务器配置的目标地址是网站首页，而不是 API 端点。**

- ❌ 错误配置：`https://bmai.kun8.vip` → 这是网站首页
- ✅ 正确配置：需要找到实际的 API 端点地址

## 解决方案

### 方案 1：使用官方 Claude API（推荐）

如果你有 Anthropic 官方 API Key：

1. **修改环境变量**（在 `start.sh` 或命令行中）：
   ```bash
   export ANTHROPIC_BASE_URL="https://api.anthropic.com"
   export ANTHROPIC_AUTH_TOKEN="sk-ant-your-api-key"
   ```

2. **在 AI 助手页面配置**：
   - Base URL: `http://localhost:3001`
   - API Path: `/v1/messages`（选择"官方"）
   - API Key: 你的官方 API Key

### 方案 2：使用中转站（需要确认正确的 API 路径）

如果你使用的是 `bmai.kun8.vip` 中转站，需要找到正确的 API 端点：

#### 步骤 1：确认中转站的 API 路径

中转站可能的 API 路径：
- `/v1/chat/completions` （OpenAI 兼容格式）
- `/v1/messages` （Claude 官方格式）
- `/api/v1/chat/completions`
- `/api/v1/messages`

**如何确认：**

1. 查看中转站的文档或帮助页面
2. 或者尝试用 curl 测试：

```bash
# 测试方法 1：OpenAI 兼容格式
curl -X POST https://bmai.kun8.vip/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [{"role": "user", "content": "Hello"}]
  }'

# 测试方法 2：Claude 官方格式
curl -X POST https://bmai.kun8.vip/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

#### 步骤 2：修改代码以支持中转站

如果中转站使用 OpenAI 兼容格式，需要修改 `src/ai-assistant.js`：

**当前代码（Claude 官方格式）：**
```javascript
headers: {
  "Content-Type": "application/json",
  "x-api-key": apiKey,
  "anthropic-version": "2023-06-01",
}
```

**改为 OpenAI 格式：**
```javascript
headers: {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${apiKey}`,
}
```

并且请求体格式也需要调整。

### 方案 3：直接在浏览器中配置（不使用代理服务器）

如果中转站支持 CORS，可以直接在 AI 助手页面配置：

1. **不启动代理服务器**
2. **在 AI 助手页面配置**：
   - Base URL: `https://bmai.kun8.vip`
   - API Path: `/v1/chat/completions`（或其他正确路径）
   - API Key: 你的中转站 API Key

## 调试步骤

### 1. 检查代理服务器日志

启动代理服务器时，查看控制台输出：

```bash
npm run dev
```

在另一个终端查看代理服务器日志，看看实际请求的 URL 是什么。

### 2. 使用浏览器开发者工具

1. 打开 AI 助手页面
2. 按 F12 打开开发者工具
3. 切换到 "Network" 标签
4. 发送一条消息
5. 查看请求详情：
   - Request URL（请求地址）
   - Request Headers（请求头）
   - Response（响应内容）

### 3. 常见错误信息

| 错误 | 原因 | 解决方法 |
|------|------|----------|
| 返回 HTML | API 地址错误 | 确认正确的 API 端点 |
| CORS 错误 | 跨域问题 | 使用代理服务器 |
| 401 Unauthorized | API Key 错误 | 检查 API Key 是否正确 |
| 404 Not Found | API 路径错误 | 确认正确的 API Path |

## 推荐配置

### 配置 1：官方 API（最稳定）

```bash
# .env 或 start.sh
export ANTHROPIC_BASE_URL="https://api.anthropic.com"
export ANTHROPIC_AUTH_TOKEN="sk-ant-your-api-key"
```

### 配置 2：中转站（需要确认路径）

```bash
# .env 或 start.sh
export ANTHROPIC_BASE_URL="https://bmai.kun8.vip"
export ANTHROPIC_AUTH_TOKEN="your-relay-api-key"
```

然后在 AI 助手页面选择正确的 API Path。

## 下一步

1. **确认你使用的是哪种 API**（官方 or 中转站）
2. **如果是中转站，联系服务商确认正确的 API 端点**
3. **按照上述方案配置**
4. **使用调试步骤验证**

## 需要帮助？

如果问题仍未解决，请提供：
1. 你使用的 API 类型（官方/中转站）
2. 浏览器开发者工具中的 Network 请求详情
3. 代理服务器的控制台日志

---

**最后更新：** 2026-04-29
