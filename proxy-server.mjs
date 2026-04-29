/**
 * AI 助手代理服务器
 * 解决中转站 CORS 问题
 */

import http from 'http';
import https from 'https';

const PORT = 3001;
const TARGET_BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://bmai.kun8.vip';
const API_KEY = process.env.ANTHROPIC_AUTH_TOKEN || '';

const server = http.createServer((req, res) => {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, anthropic-version');

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 只处理 POST 请求
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // 收集请求体
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    // 构建目标 URL
    const targetUrl = `${TARGET_BASE_URL}${req.url}`;
    const url = new URL(targetUrl);

    console.log(`\n🔄 代理请求: ${req.method} ${targetUrl}`);

    // 准备请求选项
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': req.headers['x-api-key'] || API_KEY,
        'anthropic-version': req.headers['anthropic-version'] || '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    // 发送请求到中转站
    const proxyReq = https.request(options, (proxyRes) => {
      console.log(`✅ 响应状态: ${proxyRes.statusCode}`);

      // 转发响应头
      res.writeHead(proxyRes.statusCode, proxyRes.headers);

      // 转发响应体
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
      console.error('❌ 代理请求失败:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    });

    // 发送请求体
    proxyReq.write(body);
    proxyReq.end();
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 AI 助手代理服务器已启动`);
  console.log(`📍 本地地址: http://localhost:${PORT}`);
  console.log(`🎯 目标地址: ${TARGET_BASE_URL}`);
  console.log(`🔑 API Key: ${API_KEY ? API_KEY.substring(0, 10) + '...' : '未设置'}`);
  console.log(`\n💡 在 AI 助手页面配置：`);
  console.log(`   Base URL: http://localhost:${PORT}`);
  console.log(`   API Path: /v1`);
  console.log(`   API Key: ${API_KEY || '你的 API Key'}`);
  console.log(`\n按 Ctrl+C 停止服务器\n`);
});
