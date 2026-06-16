#!/bin/bash

# 健身数据管理系统 - 一键启动脚本

echo "🚀 启动健身数据管理系统..."
echo ""
echo "⚠️  AI 助手配置说明："
echo "   1. 如果使用中转站（如 bmai.kun8.vip），请在浏览器中手动配置"
echo "   2. 如果使用官方 API，请设置环境变量："
echo "      export ANTHROPIC_BASE_URL=\"https://api.anthropic.com\""
echo "      export ANTHROPIC_AUTH_TOKEN=\"sk-ant-your-api-key\""
echo ""

# 设置中转站配置（可选，也可以在浏览器中手动配置）
# 注意：中转站通常使用 OpenAI 兼容格式，需要在 AI 助手页面选择正确的 API Path
# export ANTHROPIC_BASE_URL="https://bmai.kun8.vip"
# export ANTHROPIC_AUTH_TOKEN="your-api-key"

# 启动代理服务器（后台运行）
echo "📡 启动 AI 代理服务器..."
npm run proxy &
PROXY_PID=$!

# 等待代理服务器启动
sleep 2

# 启动前端开发服务器
echo "🌐 启动前端开发服务器..."
echo ""
echo "💡 在浏览器中访问 AI 助手页面后，配置："
echo "   Base URL: http://localhost:3001"
echo "   API Path: 中转站 (/v1)"
echo "   API Key: 你的完整 key"
echo ""
npm run dev

# 清理：当前端服务器停止时，也停止代理服务器
kill $PROXY_PID 2>/dev/null
