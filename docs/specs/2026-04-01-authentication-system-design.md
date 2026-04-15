# 认证系统设计规格

> Version: v4 (Simplified)
> Date: 2026-04-01
> Status: Approved

## 概述

MiniMax 工作台通过 nginx + 内网穿透开放到公网，需要应用层认证保护。系统基于 JWT + RBAC，支持多用户、邀请码注册、数据隔离。

**详细实施计划：**
- v1.1.1: `docs/plans/2026-04-01-auth-v1.1.1-core.md` — 认证核心
- v1.1.2: `docs/plans/2026-04-01-auth-v1.1.2-permissions.md` — 权限控制
- v1.1.3: `docs/plans/2026-04-01-auth-v1.1.3-management.md` — 管理功能
- v1.1.4: `docs/plans/2026-04-01-auth-v1.1.4-compatibility.md` — 兼容性改造

---

## 角色权限矩阵

| 角色 | 调试台 | 管理功能 | 查看他人数据 | 用户管理 | 邀请码管理 |
|------|--------|----------|-------------|----------|-----------|
| **user** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **pro** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **admin** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **super** | ✅ | ✅ | ✅ | ✅ | ✅ |

**调试台页面：** `/text`, `/voice`, `/voice-async`, `/image`, `/music`, `/video`, `/video-agent`
**管理功能页面：** `/voice-mgmt`, `/files`, `/media`, `/templates`, `/capacity`, `/stats`, `/audit`, `/cron`, `/workflow-builder`

---

## 约束规则

### 用户管理
- **用户管理只有 super 能做**
- **admin 可以看所有用户的数据**
- **API Key 是用户自己配置的**

### 密码规则
- 最小长度: **6 位**
- 哈希算法: bcrypt (cost factor 12)

### 邀请码
- **邀请码过期时间可以在生成的时候指定**（可为 NULL 永不过期）
- 注册时验证：存在、未过期、未用完

### 数据隔离
- `user` / `pro`：只能查看和操作自己创建的数据
- `admin` / `super`：可以查看所有用户的数据
- 实现方式：业务表新增 `owner_id` 字段

---

## 技术规格

### JWT 配置
- Access Token: 15 分钟
- Refresh Token: 7 天
- 算法: HS256
- Secret: 环境变量 `JWT_SECRET`

### 数据库表
- `users` — 用户表（含 role, minimax_api_key）
- `invitation_codes` — 邀请码表
- 业务表新增 `owner_id` 字段

### API 路由
```
公开:
  POST /api/auth/login
  POST /api/auth/register

需认证:
  GET  /api/auth/me
  POST /api/auth/change-password
  ... 所有现有业务路由

super only:
  GET/POST/PATCH/DELETE /api/auth/users
  GET/POST/DELETE /api/invitation-codes
```

### WebSocket
连接 `/ws/cron?token=<jwt>` 通过 query string 传递 JWT token。

### Bootstrap
Migration 008 直接插入初始 super 用户和邀请码，解决 chicken-and-egg 问题。