# mnx-agent

基于 MiniMax AI API 的多功能工具集，提供文本对话、语音合成、图像生成、音乐创作、视频生成等 AI 能力，内置定时任务调度系统与可视化工作流引擎。

## ✨ 功能特性

- 🤖 **文本对话** — 同步/流式，多模型支持
- 🎙️ **语音合成** — 多音色，支持语音克隆
- 🎨 **图像生成** — 文生图，多比例/AIGC 水印/自动重试
- 🎵 **音乐生成** — AI 音乐创作，支持歌词同步
- 🎬 **视频生成** — 文生视频，异步任务模式
- ⏰ **定时任务** — Cron 调度、DAG 工作流、指数退避重试、死信队列
- 📁 **媒体管理** — 文件存储、分类筛选、缩略图预览、批量下载
- 🔔 **实时通知** — WebSocket 推送 + Webhook（HMAC 签名）
- 🛡️ **安全加固** — JWT 认证、AES-256-GCM 加密、限流防护

## 🛠️ 技术栈

**后端**: Express + TypeScript + PostgreSQL + WebSocket  
**前端**: React 18 + TypeScript + Tailwind CSS + Zustand

## 快速开始

### 环境要求
- Node.js 18+
- npm 或 pnpm

### 安装依赖

```bash
npm install
```

### 配置环境变量

创建 `.env` 文件：

```env
# MiniMax API 配置
MINIMAX_API_KEY=your_api_key
MINIMAX_BASE_URL=https://api.minimax.chat

# 数据库配置 (PostgreSQL)
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=mnx_agent_server
DB_PASSWORD=your_password
DB_NAME=mnx_agent

# 可选：Cron 时区
CRON_TIMEZONE=Asia/Shanghai
```

### 启动开发服务器

```bash
# 仅前端
npm run dev

# 仅后端
npm run server

# 前后端同时启动
npm run dev:full
```

### 构建生产版本

```bash
npm run build
```

## 📚 文档

- [发布历史](https://github.com/Casual-AI-Coding/mnx-agent/releases) — 各版本 Release Note
- [设计规格](docs/specs/) — 系统架构与功能设计
- [开发指南](docs/guides/) — 环境配置、测试、发布流程
- [版本规划](docs/roadmap/) — 需求池与路线图

## 📄 许可证

MIT