# 应用环境配置

> mnx-agent 运行环境、端口、构建目录及服务管理脚本配置

---

## 背景

mnx-agent 需要同时支持开发调试和公网部署：

- 开发模式（dev）：本地调试，实时编译，热更新
- 生产模式（prod）：公网访问，优化构建，nginx 集成
- 两者可同时运行，互不影响

### 整体架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              三种访问方式                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   内网用户（开发者）                         公网用户                         │
│                                                                             │
│   ┌───────────────┐  ┌───────────────┐           │                         │
│   │ 方式一        │  │ 方式二        │           ▼                         │
│   │ Dev 前端      │  │ Prod 前端     │    ┌───────────────────┐            │
│   │ localhost:4311│  │ localhost:4411│    │ 方式三            │            │
│   │               │  │               │    │ 公网访问          │            │
│   │ ◆ 热更新      │  │ ◆ 优化构建    │    │ mnx.ogslp.top     │            │
│   │ ◆ 实时生效    │  │ ◆ 发布前验证  │    │                   │            │
│   │ ◆ 开发首选    │  │ ◆ 内网预检    │    │                   │            │
│   └───────┬───────┘  └───────┬───────┘    └───────┬───────────┘            │
│           │                  │                    │                        │
│           │                  │                    ▼                        │
│           │                  │            ┌───────────────┐                │
│           │                  │            │    Nginx      │                │
│           │                  │            │     :80       │                │
│           │                  │            └───┬───┬───┬───┘                │
│           │                  │                │   │   │                     │
│           │                  │     ┌──────────┘   │   └──────────┐        │
│           │                  │     │              │              │        │
│           │                  │     ▼              ▼              ▼        │
│           │                  │ ┌────────────┐ ┌────────────┐ ┌──────────┐ │
│           │                  │ │ /assets/*  │ │   /api/*   │ │ 其他路径 │ │
│           │                  │ │            │ │            │ │          │ │
│           │                  │ │ 静态文件   │ │ 后端 API   │ │ Prod前端 │ │
│           │                  │ │ 直接服务   │ │ proxy_pass │ │ proxy    │ │
│           │                  │ │            │ │            │ │          │ │
│           │                  │ └─────┬──────┘ └─────┬──────┘ └────┬─────┘ │
│           │                  │       │              │             │       │
│           │                  │       │              │             │       │
│           │                  │       │              │             │       │
│           │                  │       │              │             │       │
│           │                  │       │              │             │       │
├───────────┼──────────────────┼───────┼──────────────┼─────────────┼───────┤
│                                                                             │
│                              服务进程                                        │
│                                                                             │
│   ┌─────────────┐                  ┌─────────────┐       ┌─────────────┐   │
│   │  Dev 前端   │                  │  Prod 前端  │       │   Backend   │   │
│   │   :4311     │                  │   :4411     │       │    :4511    │   │
│   │  vite dev   │                  │vite preview │       │  tsx watch  │   │
│   │             │                  │             │       │             │   │
│   │  热更新     │                  │  静态服务   │       │  共享 API   │   │
│   └──────┬──────┘                  └──────┬──────┘       └──────┬──────┘   │
│          │                                │                     │         │
│          │                                │                     │         │
│          │                                │                     │         │
│          │                                │                     │         │
│          ▼                                ▼                     ▼         │
│   ┌───────────────────────────────────────────────────────────────────┐   │
│   │                           数据流                                   │   │
│   │                                                                    │   │
│   │  Dev 前端 ─────────────────────────────────────► Backend          │   │
│   │           (proxy /api → :4511)                                     │   │
│   │                                                                    │   │
│   │  Prod 前端 ─────────────────────────────────────► Backend         │   │
│   │           (本地访问 :4411)                                          │   │
│   │                                                                    │   │
│   │  Nginx /assets/* ─────────────────────────────► 静态文件目录     │   │
│   │           (/var/www/mnx-agent/assets/)                            │   │
│   │                                                                    │   │
│   │  Nginx /api/* ─────────────────────────────────► Backend          │   │
│   │           (proxy_pass → :4511)                                     │   │
│   │                                                                    │   │
│   │  Nginx 其他路径 ─────────────────────────────► Prod 前端          │   │
│   │           (proxy_pass → :4411)                                     │   │
│   │                                                                    │   │
│   └───────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 目标

1. 支持 dev/prod 两种前端启动模式，可同时运行
2. 前端 dev 用于本地开发（热更新），prod 用于公网部署（优化构建）
3. 后端统一使用 tsx watch，不分 dev/prod，共享给两种前端
4. prod 静态文件通过 nginx 直接服务（性能最优）
5. SPA fallback 由 Vite preview 进程处理

---

## 端口分配

| 服务 | 端口 | 说明 |
|------|------|------|
| Dev 前端 | `4311` | Vite dev server，热更新 |
| Prod 前端 | `4411` | Vite preview，静态文件服务 + SPA fallback |
| Backend | `4511` | tsx server，dev/prod 共享 |

### 与当前配置的变更

| 服务 | 当前端口 | 新端口 | 说明 |
|------|----------|--------|------|
| Dev 前端 | 4411 | **4311** | 分离开发端口 |
| Prod 前端 | 无 | **4411** | 新增生产端口 |
| Backend | 4511 | 4511 | 保持不变 |

---

## 构建与静态文件服务

### 构建流程

```
npm run build (vite build)
    ↓
dist/
  ├ assets/        ← JS/CSS/images（哈希文件名）
  │  ├ index-xxx.js
  │  ├ index-xxx.css
  │  └ ...
  ├ index.html     ← SPA 入口
  └ ...
```

### 静态文件同步

构建后同步到 nginx 可访问目录：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          静态文件同步流程                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   npm run build                                                             │
│   (vite build)                                                              │
│         │                                                                   │
│         ▼                                                                   │
│   ┌──────────────────┐                                                     │
│   │ dist/            │                                                     │
│   │  ├ assets/       │  ← JS/CSS/images 等静态资源                          │
│   │  │  ├ index-xxx.js│                                                    │
│   │  │  ├ index-xxx.css│                                                   │
│   │  │  └ ...        │                                                     │
│   │  ├ index.html    │  ← SPA 入口                                         │
│   │  └ ...           │                                                     │
│   └──────────────────┘                                                     │
│         │                                                                   │
│         │  同步脚本 (scripts/dev.js sync)                                   │
│         │  rm -rf /var/www/mnx-agent/assets/*                              │
│         │  cp -r dist/* /var/www/mnx-agent/assets/                         │
│         ▼                                                                   │
│   ┌──────────────────────────────────────────────────────────────────────┐ │
│   │                      /var/www/mnx-agent/assets/                      │ │
│   │  ┌────────────┐  ┌────────────┐  ┌────────────┐                      │ │
│   │  │  assets/   │  │ index.html  │  │   ...      │                      │ │
│   │  └────────────┘  └────────────┘  └────────────┘                      │ │
│   └──────────────────────────────────────────────────────────────────────┘ │
│         │                                                                   │
│         │                                                                   │
│         ▼                                                                   │
│   ┌──────────────────┐                                                     │
│   │      nginx       │  ◀── 直接服务静态文件                               │
│   │                  │      Cache-Control: immutable                       │
│   │  :80             │      expires: 365d                                  │
│   └──────────────────┘                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**同步命令**：

```bash
# 在 scripts/dev.js sync 命令中执行
rm -rf /var/www/mnx-agent/assets/*
cp -r dist/* /var/www/mnx-agent/assets/
```

**原因**：nginx 以 www-data 用户运行，无法访问 `/home/ogslp` 目录（750权限）。

### 目录权限

```bash
sudo mkdir -p /var/www/mnx-agent/assets
sudo chown -R ogslp:www-data /var/www/mnx-agent
sudo chmod -R 775 /var/www/mnx-agent
```

---

## Nginx 反向代理配置

### 配置文件

```nginx
server {
    listen 80;
    server_name mnx.ogslp.top;

    # 静态文件直接服务（性能最优，绕过 Vite preview）
    location /assets/ {
        alias /var/www/mnx-agent/assets/assets/;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # 生成类 API - 长超时（匹配 /api/*/generate）
    location ~ ^/api/(music|image|video|video-agent)/generate {
        proxy_pass http://127.0.0.1:4511;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 生成类 API 最长 5 分钟
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }

    # 其他 API - 正常超时
    location /api/ {
        proxy_pass http://127.0.0.1:4511;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }

    # 其他路径 → Prod 前端（Vite preview 处理 SPA fallback）
    location / {
        proxy_pass http://127.0.0.1:4411;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Upgrade $http_upgrade;
    }
}
```

### 关键变化

| 配置项 | 当前配置 | 新配置 | 说明 |
|--------|----------|--------|------|
| `/assets/*` | 无 | **新增** | Nginx 直接服务静态文件 |
| `/api/*` | proxy_pass → `:4411` | proxy_pass → **`:4511`** | API 直连后端 |
| `/` | proxy_pass → `:4411` | proxy_pass → **`:4411`** | 保持不变（Prod 前端） |

---

## CLI 命令设计

使用现有的 `mnx-dev` CLI 工具（`scripts/dev.js`）扩展命令：

### 命令列表

| 命令 | Target | 说明 |
|------|--------|------|
| `start` | `dev` / `prod` / `all` | 启动服务 |
| `stop` | 无 | 停止所有服务 |
| `restart` | `dev` / `prod` / `all` | 重启服务 |
| `log` | `dev` / `prod` / `all` | 查看实时日志 |
| `status` | 无 | 显示所有服务状态 |
| `sync` | 无 | 仅同步静态文件（不重启服务） |

### Target 说明

| Target | 包含服务 | 行为 |
|--------|----------|------|
| `dev` | dev 前端 + 后端 | 启动开发环境 |
| `prod` | prod 前端 + 后端 | 构建 → 同步静态文件 → 启动生产环境 |
| `all` | dev 前端 + prod 前端 + 后端 | 同时运行两种前端 |

### 详细命令行为

#### `start <target>`

| Target | 步骤 | 说明 |
|--------|------|------|
| `dev` | 1. 检查 dev 前端是否运行 → 若已运行则跳过，否则启动 `vite --port 4311` | |
| | 2. 检查后端是否运行 → 若已运行则跳过，否则启动 `tsx server/index.ts` | |
| | 3. 记录 PID | |
| `prod` | 1. 构建前端 (`vite build`) | |
| | 2. 同步静态文件到 `/var/www/mnx-agent/assets/` | |
| | 3. 检查 prod 前端是否运行 → 若已运行则跳过，否则启动 `vite preview --port 4411` | |
| | 4. 检查后端是否运行 → 若已运行则跳过，否则启动 `tsx server/index.ts` | |
| | 5. 记录 PID | |
| `all` | 1. 构建 prod 前端 + 同步静态文件 | |
| | 2. **先启动 prod 前端**（4411） | |
| | 3. 启动 dev 前端（4311） | |
| | 4. 启动后端（共享，4511） | |
| | 5. 记录 PID | |

⚠️ **关键点**：`start all` 时先启动 prod，再启动 dev（按顺序启动更稳定）。

#### `stop`

```
stop:
  1. 停止 dev 前端进程
  2. 停止 prod 前端进程
  3. 停止后端进程
  4. 清理所有 PID 文件
```

#### `restart <target>`

```
restart dev:  stop → start dev
restart prod: stop → start prod
restart all:  stop → start all
```

#### `log <target>`

```
log dev:  tail -f .run/logs/dev.log + backend.log
log prod: tail -f .run/logs/prod.log + backend.log
log all:  tail -f .run/logs/*.log (全部合并)
```

#### `status`

显示：
- 各服务运行状态（运行/停止）
- PID 信息
- 端口监听状态
- HTTP 健康检查结果

#### `sync`

仅同步静态文件，不启动/重启任何服务：
```
sync:
  1. 执行 vite build
  2. rm -rf /var/www/mnx-agent/assets/*
  3. cp -r dist/* /var/www/mnx-agent/assets/
```

---

## 目录结构

### 运行时目录

```
.run/                    # Git 忽略
├── pids/
│   ├── dev.pid          # dev 前端进程 PID
│   ├── prod.pid         # prod 前端进程 PID
│   └── backend.pid      # 后端进程 PID
└── logs/
│   ├── dev.log          # dev 前端输出日志
│   ├── prod.log         # prod 前端输出日志
│   └── backend.log      # 后端输出日志
```

### 构建目录

```
dist/                    # Vite 构建产物（临时）
├── assets/              # JS/CSS/images
└── index.html           # SPA 入口
```

### Nginx 静态文件目录

```
/var/www/mnx-agent/
└── assets/              # prod 静态文件（nginx 直接服务）
    ├── assets/          # JS/CSS/images
    └── index.html       # SPA 入口
```

### 脚本文件

```
scripts/
└── dev.js               # CLI 工具（服务管理）
```

---

## 进程管理

### 进程识别

通过 PID 文件追踪进程，启动时：
1. 检查 PID 文件是否存在
2. 若存在，验证进程是否存活（`process.kill(pid, 0)`）
3. 若存活则跳过启动，否则清理过期 PID 文件

### 进程终止

`stop` 命令：
1. 读取各 PID 文件
2. 发送 `SIGTERM` 信号
3. 等待进程退出（最多 5 秒）
4. 若未退出，发送 `SIGKILL`
5. 清理 PID 文件

### 后端共享逻辑

后端进程只有一个，被 dev/prod 共享：
- `start dev` 或 `start prod` 时，若后端已运行则跳过
- `stop` 时后端一并停止

---

## 日志输出

### 日志格式

```
[timestamp] [service] message
```

示例：
```
2026-04-17 10:30:15 [mnx-dev] Dev 前端已启动 (PID 12345) - http://localhost:4311
2026-04-17 10:30:16 [mnx-dev] 后端已启动 (PID 12347) - http://localhost:4511
```

### 日志合并

`log dev` 和 `log prod` 合并对应前端和后端日志，使用 `tail -f` 同时追踪多个文件。

---

## 错误处理

### 端口冲突

检测端口是否被占用，若冲突则：
1. 尝试 kill 占用进程（若是本项目的进程）
2. 若不是本项目进程，提示用户手动处理

### 构建失败

构建失败时：
1. 显示构建错误日志
2. 不启动 prod 前端
3. 返回非零退出码

### 进程启动失败

启动失败时：
1. 记录错误到日志
2. 清理 PID 文件
3. 显示错误信息

---

## 使用示例

### 开发调试

```bash
# 启动开发环境
mnx-dev start dev

# 查看日志
mnx-dev log dev

# 重启开发环境
mnx-dev restart dev

# 停止
mnx-dev stop
```

### 公网部署

```bash
# 启动生产环境（自动构建 + 同步静态文件）
mnx-dev start prod

# 查看日志
mnx-dev log prod

# 重启
mnx-dev restart prod

# 仅同步静态文件（不重启服务）
mnx-dev sync
```

### 同时运行两种模式

```bash
# 本地开发 + 公网访问
mnx-dev start all

# 查看所有日志
mnx-dev log all

# 重启全部
mnx-dev restart all
```

### 状态检查

```bash
mnx-dev status
```

输出示例：
```
[mnx-dev] Dev 前端: 运行中 (PID 12345) - http://localhost:4311 ✓
[mnx-dev] Prod 前端: 运行中 (PID 12346) - http://localhost:4411 ✓
[mnx-dev] 后端: 运行中 (PID 12347) - http://localhost:4511 ✓
```

---

## 故障排查

### 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 端口已被占用 | 其他进程占用端口 | `fuser -k <端口>/tcp` 或 `mnx-dev stop` |
| 构建失败 | 依赖问题/代码错误 | 检查 `npm run build` 输出 |
| PID 文件残留 | 进程异常退出 | 手动删除 `.run/pids/*.pid` |
| nginx 403 | 权限问题 | `sudo chown -R ogslp:www-data /var/www/mnx-agent` |
| 静态文件不更新 | 同步未执行 | 手动 `mnx-dev sync` |

### 手动清理

```bash
# 停止所有服务
mnx-dev stop

# 强制清理残留进程
fuser -k 4311/tcp 4411/tcp 4511/tcp

# 清理 PID 文件
rm -rf .run/pids/*.pid

# 清理构建目录
rm -rf dist
```

### 重建 prod

```bash
# 完整重建流程
rm -rf dist
rm -rf /var/www/mnx-agent/assets/*
npm run build
mnx-dev sync
mnx-dev start prod
```

### 检查端口冲突

```bash
# 查看端口占用
lsof -i :4311
lsof -i :4411
lsof -i :4511

# 或使用 netstat
netstat -tlnp | grep -E '4311|4411|4511'
```

### 日志排查

```bash
# 查看错误日志
tail -50 .run/logs/dev.log
tail -50 .run/logs/prod.log
tail -50 .run/logs/backend.log

# 实时追踪
mnx-dev log all
```

---

## 实现文件清单

| 文件 | 说明 |
|------|------|
| `vite.config.ts` | Dev 端口改为 4311，proxy 目标保持 4511 |
| `scripts/dev.js` | CLI 工具扩展：start/stop/restart/log/status/sync 命令 |
| `.gitignore` | 添加 `.run/` |
| Nginx 配置 | 更新静态文件服务 + API 直连后端 |

---

*创建日期：2026-04-17*
*最后更新：2026-04-17*