# 认证系统设计 (Authentication System Design)

> Version: v3 (Final)
> Date: 2026-04-01
> Status: Approved

## 概述

MiniMax 工作台通过 nginx + 内网穿透开放到公网，需要应用层认证保护。系统基于 JWT + RBAC，支持多用户、邀请码注册、数据隔离。

## 角色定义

| 角色 | 调试台 | 管理功能 | 查看他人数据 | 用户管理 | 邀请码管理 |
|------|--------|----------|-------------|----------|-----------|
| **user** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **pro** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **admin** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **super** | ✅ | ✅ | ✅ | ✅ | ✅ |

**调试台页面：** `/text`, `/voice`, `/voice-async`, `/image`, `/music`, `/video`, `/video-agent`
**管理功能页面：** `/voice-mgmt`, `/files`, `/media`, `/templates`, `/capacity`, `/stats`, `/audit`, `/cron`, `/workflow-builder`

## 数据隔离

- `user` / `pro`：只能查看和操作自己创建的数据（cron 任务、媒体文件、日志等）
- `admin` / `super`：可以查看所有用户的数据
- 实现方式：业务表新增 `owner_id` 字段，查询时根据角色自动过滤

## 数据库

### users 表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 用户 ID |
| username | VARCHAR(50) | UNIQUE NOT NULL | 用户名 |
| email | VARCHAR(255) | | 邮箱（可选） |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt 哈希 |
| minimax_api_key | VARCHAR(255) | | 用户自己的 MiniMax API Key |
| minimax_region | VARCHAR(20) | DEFAULT 'cn' | cn/intl |
| role | VARCHAR(20) | DEFAULT 'user' | super/admin/pro/user |
| is_active | BOOLEAN | DEFAULT true | 是否启用 |
| last_login_at | TIMESTAMP | | 最后登录时间 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

### invitation_codes 表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| code | VARCHAR(32) | UNIQUE NOT NULL | 邀请码 |
| created_by | UUID | FK → users(id) | 创建者 |
| max_uses | INTEGER | DEFAULT 1 | 最大使用次数 |
| used_count | INTEGER | DEFAULT 0 | 已使用次数 |
| expires_at | TIMESTAMP | NULL | 过期时间，NULL=永不过期 |
| is_active | BOOLEAN | DEFAULT true | 是否有效 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

### 业务表新增字段

所有业务表（cron_jobs, media_records, execution_logs, task_queue, workflow_templates, prompt_templates, webhook_configs, dead_letter_queue）新增：
- `owner_id UUID REFERENCES users(id)` — 数据归属

## JWT 配置

- Access Token: 15 分钟有效期
- Refresh Token: 7 天有效期，存数据库，支持撤销
- 算法: HS256
- Secret: 环境变量 `JWT_SECRET`

## API 路由保护

```
公开路由（无需认证）:
  POST /api/auth/login
  POST /api/auth/register
  POST /api/auth/refresh

需认证路由（所有 /api/* 除公开路由外）:
  GET  /api/auth/me
  POST /api/auth/logout
  POST /api/auth/change-password
  GET  /api/auth/users          (super only)
  POST /api/auth/users          (super only)
  PATCH /api/auth/users/:id     (super only)
  DELETE /api/auth/users/:id    (super only)
  GET  /api/invitation-codes    (super only)
  POST /api/invitation-codes/batch  (super only)
  DELETE /api/invitation-codes/:id  (super only)
  ... 所有现有业务路由
```

## WebSocket 认证

WebSocket 连接 `/ws/cron?token=<jwt>` 通过 query string 传递 JWT token。

## 密码规则

- 最小长度: 6 位
- 哈希算法: bcrypt (cost factor 12)

## 注册流程

1. 用户访问 → 未登录 → 跳转 /login
2. 选择注册 → 输入用户名 + 密码(≥6位) + 邀请码
3. 后端验证邀请码（是否存在、是否过期、是否用完）
4. 验证通过 → 创建用户(role='user') → 邀请码 used_count++
5. 返回 JWT → 自动登录

## 前端

- 登录页面：用户名/密码登录 + 邀请码注册
- AuthGuard：路由守卫，未登录跳转 /login
- RoleGuard：按角色控制菜单项和按钮可见性
- axios 拦截器：自动附加 JWT token，401 时清除 token 并跳转登录
- 用户自己的 MiniMax API Key 配置从 Settings 页面管理
