/**
 * AuditContext Service
 * 
 * 用于在请求上下文中传递审计相关信息（user_id, trace_id）
 * v2.4 将实现完整的 trace_id 填充逻辑
 */

import type { Request, Response, NextFunction } from 'express'

/**
 * 审计上下文信息
 */
export class AuditContext {
  userId: string | null
  traceId: string | null

  constructor(userId: string | null, traceId: string | null = null) {
    this.userId = userId
    this.traceId = traceId
  }

  setUserId(userId: string | null): void {
    this.userId = userId
  }

  setTraceId(traceId: string | null): void {
    this.traceId = traceId
  }

  static create(userId: string | null, traceId: string | null = null): AuditContext {
    return new AuditContext(userId, traceId)
  }
}

// 使用 AsyncLocalStorage 实现请求级别的上下文存储
import { AsyncLocalStorage } from 'async_hooks'

const auditContextStorage = new AsyncLocalStorage<AuditContext>()

/**
 * 获取当前审计上下文
 */
export function getAuditContext(): AuditContext | null {
  return auditContextStorage.getStore() ?? null
}

/**
 * 在指定上下文中运行函数
 */
export function runWithAuditContext<T>(context: AuditContext, fn: () => T): T {
  return auditContextStorage.run(context, fn)
}

/**
 * Express 中间件：设置审计上下文
 * 
 * 从 JWT token 提取 user_id，设置到上下文中
 * v2.4 将添加 trace_id 生成逻辑
 */
export function auditContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const userId = req.user?.userId ?? null
  const context = new AuditContext(userId, null)
  
  auditContextStorage.run(context, () => {
    next()
  })
}

export function updateAuditContextUserIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const context = getAuditContext()
  if (context && req.user?.userId) {
    context.setUserId(req.user.userId)
  }
  next()
}

export function getCurrentUserId(): string | null {
  return getAuditContext()?.userId ?? null
}

export function getCurrentTraceId(): string | null {
  return getAuditContext()?.traceId ?? null
}