# 后台用户批量操作边界 - 设计规格

> 目标：将 `POST /api/users/batch` 从 Route 直连数据库收敛为 Route → Service → Repository 分层。此后 `server/routes/users.ts` 零直连连接。

## 背景

`server/routes/users.ts` 的 GET / POST(创建) / PATCH / DELETE / POST(reset-password) 已全部收敛。`POST /batch` 是唯一剩余直连端点。迁移完成后可删除 `getConnection` 和 `toLocalISODateString` import。

## 当前 batch 行为

- Zod `batchOperationSchema`: `{action: 'activate'|'deactivate'|'delete', userIds: uuid[]}`
- Delete self-guard（Route 保留）：`action === 'delete' && userIds.includes(currentUserId)` → 400
- Deactivate self-guard（Service 内）：`id === currentUserId` → 计数为 fail
- 逐项顺序执行，每项 try/catch，空 catch 吞没错误为 failCount
- 统一返回 `{action, successCount, failCount, total}` + 中文 message

## 架构

```
Route (validate → delete self-guard → delegate)
  → AdminUserService.batchProcess({action, userIds, currentUserId})
    → loop userIds:
      case 'activate':   repo.activateUser(id, now)   → success/fail
      case 'deactivate': if id===currentUserId → fail; else repo.deactivateUser(id, now)
      case 'delete':     repo.deleteUser(id)           → success/fail
    → return {action, successCount, failCount, total}
  → successResponse(res, {data, message})
```

## Repository 新增方法

```typescript
activateUser(id: string, now: string): Promise<boolean>
  // UPDATE users SET is_active = true, updated_at = $2 WHERE id = $1

deactivateUser(id: string, now: string): Promise<boolean>
  // UPDATE users SET is_active = false, updated_at = $2 WHERE id = $1
```

`deleteUser` 已存在，无需新增。

## Route 最终状态

迁移后 `server/routes/users.ts` 仅保留以下 import：

```typescript
import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireRole } from '../middleware/auth-middleware.js'
import { getAdminUserService } from '../service-registration.js'
import { z } from 'zod'
import { validate, validateQuery } from '../middleware/validate.js'
import { successResponse, errorResponse } from '../middleware/api-response'
```

**删除**: `getConnection`, `toLocalISODateString`

## 非范围

- 不改变 batch 顺序执行策略
- 不改变空 catch 吞没错误的行为
- 不改变 deactivate 自删除计数为 fail、delete 返回 400 的区别

## 测试策略

| 层 | 测试类型 | 验证要点 |
|----|----------|----------|
| Repository | 单元 | activateUser/deactivateUser 参数化 SQL |
| Service | 单元 | 循环、计数、self-guard、错误吞没 |
| Route | 行为 | 400 self-guard、service delegate、删除 getConnection/toLocalISODateString |
| Route DI 契约 | 文本 | 无 getConnection、无 toLocalISODateString、batchProcess 委托 |
