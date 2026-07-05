/**
 * AuditContext Service
 * 
 * 用于在请求上下文中传递审计相关信息（user_id, trace_id）
 * 负责请求级 trace_id 生成、传播和读取
 */

import type { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'

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
 * 从 JWT token 提取 user_id，并为请求设置 trace_id
 */
export function auditContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const userId = req.user?.userId ?? null
  const traceId = req.get('x-trace-id')?.trim() || uuidv4()
  const context = new AuditContext(userId, traceId)
  res.setHeader('x-trace-id', traceId)
  
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

export function getAuditContextInfo(): { userId: string | null; traceId: string | null } {
  const context = getAuditContext()
  return {
    userId: context?.userId ?? null,
    traceId: context?.traceId ?? null,
  }
}
