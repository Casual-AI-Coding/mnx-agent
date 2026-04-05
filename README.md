# MiniMax Toolset

基于 MiniMax AI API 的多功能工具集，支持文本对话、语音合成、图像生成、音乐创作、视频生成等功能，并内置强大的定时任务调度系统。

## 功能特性

### 🤖 AI 能力
- **文本对话** - 支持同步/流式对话，自定义模型参数
- **语音合成** - 同步/异步语音生成，支持多种音色
- **语音克隆** - 自定义音色克隆与管理
- **图像生成** - 文生图，支持多种风格
- **音乐生成** - AI 音乐创作
- **视频生成** - 文生视频，支持异步任务
- **视频 Agent** - 智能视频创作助手

### ⏰ 定时任务系统
- **Cron 调度** - 支持标准 cron 表达式，时区配置
- **工作流引擎** - DAG 工作流，支持条件、循环、队列节点
- **并发控制** - 限制同时运行的任务数（默认 5）
- **超时处理** - 同步任务 5 分钟，异步任务 10 分钟
- **指数退避重试** - 1s → 2s → 4s → ... 最大 5 分钟
- **任务标签** - 组织和筛选任务
- **任务依赖** - 支持任务链式执行
- **死信队列** - 存储和重试失败任务

### 📁 媒体管理
- **文件存储** - 自动保存生成的音频、图片、视频、音乐
- **分类筛选** - 按类型、来源过滤
- **缩略图预览** - 图片列表直接显示缩略图
- **全屏预览** - Lightbox 图片查看
- **批量下载** - 支持单个/批量下载
- **文件管理** - 重命名、删除、搜索

### 🔔 通知系统
- **WebSocket** - 实时推送任务状态更新
- **Webhook** - 任务事件通知（on_start/on_success/on_failure）
- **HMAC 签名** - Webhook 安全验证

### 📊 监控与管理
- **健康检查** - `/cron/health` 端点
- **容量追踪** - API 配额实时监控
- **执行日志** - 详细的任务执行记录
- **工作流模板** - 可复用的工作流定义

## 技术栈

### 后端
- **Express** - Web 框架
- **Better SQLite3** - 轻量级数据库
- **node-cron** - 定时任务调度
- **cron-parser** - Cron 表达式解析
- **WebSocket (ws)** - 实时通信

### 前端
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式
- **Zustand** - 状态管理
- **React Flow** - 工作流可视化
- **React Router** - 路由

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

## API 端点

### 媒体管理
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/media` | 获取媒体列表（分页、筛选） |
| GET | `/media/:id` | 获取单个媒体 |
| POST | `/media` | 创建媒体记录 |
| POST | `/media/upload` | 上传文件 |
| POST | `/media/upload-from-url` | 从 URL 上传 |
| GET | `/media/:id/download` | 下载文件 |
| PUT | `/media/:id` | 更新媒体信息 |
| DELETE | `/media/:id` | 删除媒体（软删除） |

### Cron 任务管理
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/cron/jobs` | 获取所有任务 |
| POST | `/cron/jobs` | 创建任务 |
| GET | `/cron/jobs/:id` | 获取单个任务 |
| PATCH | `/cron/jobs/:id` | 更新任务 |
| DELETE | `/cron/jobs/:id` | 删除任务 |
| POST | `/cron/jobs/:id/toggle` | 启用/禁用任务 |
| POST | `/cron/jobs/:id/run` | 手动执行任务 |

### 任务队列
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/cron/queue` | 获取任务队列 |
| POST | `/cron/queue` | 创建任务 |
| PATCH | `/cron/queue/:id` | 更新任务状态 |
| DELETE | `/cron/queue/:id` | 删除任务 |
| POST | `/cron/queue/:id/retry` | 重试任务 |

### 执行日志
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/cron/logs` | 获取执行日志 |
| GET | `/cron/logs/:id` | 获取单个日志详情 |

### Webhook 管理
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/cron/webhooks` | 获取 Webhook 配置 |
| POST | `/cron/webhooks` | 创建 Webhook |
| PATCH | `/cron/webhooks/:id` | 更新 Webhook |
| DELETE | `/cron/webhooks/:id` | 删除 Webhook |
| POST | `/cron/webhooks/:id/test` | 测试 Webhook |

### 其他
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/cron/health` | 健康检查 |
| GET | `/cron/capacity` | 获取 API 容量 |
| POST | `/cron/capacity/refresh` | 刷新容量数据 |

### WebSocket
连接 `/ws/cron` 接收实时事件：
- `jobs` - 任务事件
- `tasks` - 队列任务事件
- `logs` - 执行日志事件

## 工作流定义

工作流使用 JSON 格式定义，支持以下节点类型：

```json
{
  "nodes": [
    {
      "id": "node-1",
      "type": "action",
      "subtype": "text",
      "config": {
        "messages": [{"role": "user", "content": "Hello"}]
      }
    },
    {
      "id": "node-2",
      "type": "condition",
      "config": {
        "condition": "{{node-1.output.success}} == true"
      }
    },
    {
      "id": "node-3",
      "type": "transform",
      "config": {
        "transformType": "extract",
        "inputNode": "node-1",
        "inputPath": "choices[0].message.content"
      }
    }
  ],
  "edges": [
    {"id": "edge-1", "source": "node-1", "target": "node-2"},
    {"id": "edge-2", "source": "node-2", "target": "node-3"}
  ]
}
```

### 节点类型
- **action** - 执行 API 调用（text/voice/image/music/video）
- **condition** - 条件判断
- **transform** - 数据转换
- **loop** - 循环执行
- **queue** - 队列处理

## 项目结构

```
mnx-agent/
├── server/                 # 后端代码
│   ├── database/          # 数据库层
│   │   ├── schema.ts      # 表结构定义
│   │   ├── migrations.ts  # 迁移脚本
│   │   ├── service.ts     # 数据服务
│   │   └── types.ts       # 类型定义
│   ├── services/          # 业务逻辑
│   │   ├── cron-scheduler.ts      # 定时调度器
│   │   ├── workflow-engine.ts     # 工作流引擎
│   │   ├── task-executor.ts       # 任务执行器
│   │   ├── queue-processor.ts     # 队列处理器
│   │   ├── capacity-checker.ts    # 容量检查
│   │   ├── websocket-service.ts   # WebSocket 服务
│   │   └── notification-service.ts # Webhook 通知
│   ├── routes/            # API 路由
│   ├── middleware/        # Express 中间件
│   ├── validation/        # 请求验证
│   └── lib/               # 工具库
│       └── minimax.ts     # MiniMax API 客户端
├── src/                   # 前端代码
│   ├── components/        # React 组件
│   ├── pages/             # 页面
│   ├── stores/            # Zustand 状态
│   ├── lib/               # 工具库
│   └── types/             # 类型定义
└── data/                  # 数据目录
    └── media/             # 媒体文件存储
```

## 数据库表

| 表名 | 描述 |
|------|------|
| `cron_jobs` | 定时任务定义 |
| `task_queue` | 任务队列 |
| `execution_logs` | 执行日志 |
| `execution_log_details` | 详细执行记录 |
| `job_tags` | 任务标签 |
| `job_dependencies` | 任务依赖关系 |
| `webhook_configs` | Webhook 配置 |
| `webhook_deliveries` | Webhook 投递记录 |
| `dead_letter_queue` | 死信队列 |
| `capacity_tracking` | API 容量追踪 |
| `workflow_templates` | 工作流模板 |
| `media_records` | 媒体文件记录 |

## 许可证

MIT