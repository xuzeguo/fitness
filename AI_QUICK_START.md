# AI 助手快速使用指南

## ✅ 问题已修复

你的AI助手返回HTML页面的问题已经解决！现在代码支持两种API格式：

1. **Claude 官方格式** - 适用于 Anthropic 官方 API
2. **OpenAI 兼容格式** - 适用于大多数中转站（如 bmai.kun8.vip）

## 🚀 快速开始

### 步骤 1：启动服务

```bash
cd /Users/guoxuze/Documents/life/30岁后碎碎念/fitness
./start.sh
```

### 步骤 2：打开 AI 助手页面

在浏览器中访问：`http://localhost:5173/ai-assistant.html`

### 步骤 3：配置 API

在页面顶部的黄色配置栏中填写：

#### 配置方案 A：使用中转站（bmai.kun8.vip）

```
Base URL: https://bmai.kun8.vip
API Path: OpenAI 兼容（中转站）  ← 选择这个！
API Key: bma_5e849eb942c5ad9af1ec61b2460fccd88a0126fa1ba3c8bcff4832f93d4a4c18
```

**重要：** 必须选择 "OpenAI 兼容（中转站）" 选项，这样会使用 `/v1/chat/completions` 路径。

#### 配置方案 B：使用官方 API

```
Base URL: https://api.anthropic.com
API Path: Claude 官方
API Key: sk-ant-your-official-api-key
```

### 步骤 4：保存并测试

1. 点击 "保存" 按钮
2. 在输入框中输入：`你好，请介绍一下你自己`
3. 点击 "发送"

## 🔍 如何验证是否成功

### 成功的标志：
- ✅ 收到 AI 的文字回复
- ✅ 浏览器控制台显示：`✅ 请求成功，状态码: 200`
- ✅ 响应类型显示：`application/json`

### 失败的标志：
- ❌ 收到 HTML 内容
- ❌ 状态码：404 或 其他错误
- ❌ 响应类型显示：`text/html`

## 🛠️ 调试技巧

### 1. 打开浏览器开发者工具

按 `F12` 或右键点击页面 → "检查"

### 2. 查看 Console 标签

发送消息后，查看控制台输出：

```
🔍 调试信息:
Base URL: https://bmai.kun8.vip
API Path: /v1/chat/completions
完整 Endpoint: https://bmai.kun8.vip/v1/chat/completions
API 格式: OpenAI 兼容
✅ 请求成功，状态码: 200
响应类型: application/json
📦 响应数据结构: (4) ['id', 'object', 'created', 'choices']
```

### 3. 查看 Network 标签

1. 切换到 "Network" 标签
2. 发送一条消息
3. 找到 API 请求（通常是 `chat/completions` 或 `messages`）
4. 查看：
   - **Request URL**：确认是否正确
   - **Response**：查看返回内容是 JSON 还是 HTML

## ❓ 常见问题

### Q1: 仍然返回 HTML 页面？

**原因：** API Path 选择错误

**解决：** 
- 确保选择 "OpenAI 兼容（中转站）"
- 不要选择 "旧版中转站"

### Q2: 提示 CORS 错误？

**原因：** 中转站不支持跨域请求

**解决：** 使用代理服务器
```bash
# 在另一个终端运行
npm run proxy
```

然后在 AI 助手页面配置：
```
Base URL: http://localhost:3001
API Path: OpenAI 兼容（中转站）
API Key: 你的 API Key
```

### Q3: 提示 401 Unauthorized？

**原因：** API Key 错误或已过期

**解决：** 
1. 检查 API Key 是否正确
2. 联系中转站服务商确认 Key 是否有效

### Q4: 提示 404 Not Found？

**原因：** API 路径错误

**解决：** 
1. 确认中转站的正确 API 路径
2. 尝试不同的 API Path 选项

## 📝 测试示例

配置成功后，可以尝试这些功能：

### 1. 录入训练数据
```
今天练了卷腹机 45kg×12×4，卧推 40kg×10×3，运动时长 120分钟
```

### 2. 分析训练趋势
```
帮我分析一下最近的训练趋势
```

### 3. 获取训练建议
```
根据我的训练数据，给我一些改进建议
```

## 🎉 成功案例

如果看到类似这样的回复，说明配置成功：

```
好的！我帮你整理今天的训练数据：

**训练摘要：**
- 卷腹机：45kg × 12次 × 4组
- 卧推：40kg × 10次 × 3组
- 运动时长：120分钟

**CSV 数据：**
```csv
日期,运动时长,坐立卷腹机,曲臂伸机,...
04-29,120分钟,45kg×12×4,–,...
```
```

## 📞 需要帮助？

如果问题仍未解决，请提供：

1. **浏览器控制台的完整输出**（Console 标签）
2. **Network 标签中的请求详情**
   - Request URL
   - Request Headers
   - Response（前100行）
3. **你的配置信息**
   - Base URL
   - API Path 选择
   - API Key 前缀（前10个字符）

---

**最后更新：** 2026-04-29
**修复内容：** 支持 OpenAI 兼容格式的中转站 API
