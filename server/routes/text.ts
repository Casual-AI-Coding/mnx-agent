import { Router, Request, Response } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { createApiProxyRouter } from '../utils/api-proxy-router'
import { getClientFromRequest } from '../lib/minimax-client-factory'
import { handleApiError } from '../middleware/errorHandler'
import { errorResponse } from '../middleware/api-response'
import {
  buildChatRequestBody,
  isChatRequestBodyError,
} from './text/chat-request-builder.js'

const router = Router()

// 非流式 chat 端点：通过工厂装配，请求体构造委托给共享 helper
// （ADR-0006 Phase 2：消除 /chat 与 /chat/stream 的 buildRequestBody 重复）。
router.use(
  '/chat',
  createApiProxyRouter({
    endpoint: '/',
    clientMethod: 'chatCompletion',
    buildRequestBody: (req: Request) => buildChatRequestBody(req),
    extractClient: getClientFromRequest,
  })
)

// 流式 chat 端点：工厂暂不支持 SSE，仍需手写。
// 请求体构造复用 buildChatRequestBody，保证两端口径一致。
// 注意：原实现直接 `errorResponse(res, msg, 400)`，新实现保留 4xx 语义，
// 不让校验失败走 asyncHandler/handleApiError 的 5xx 默认路径
// （两者只识别 Error.code，不识别 throw 出来的 {status, message} 对象）。
router.post(
  '/chat/stream',
  asyncHandler(async (req: Request, res: Response) => {
    let body: Record<string, unknown>
    try {
      body = buildChatRequestBody(req, { stream: true })
    } catch (validationError) {
      if (isChatRequestBodyError(validationError)) {
        errorResponse(res, validationError.message, validationError.status)
        return
      }
      throw validationError
    }

    try {
      const client = getClientFromRequest(req)

      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('X-Accel-Buffering', 'no')

      const chunks = await client.chatCompletionStream(body)

      for (const chunk of chunks) {
        res.write(`data: ${chunk.data}\n\n`)
      }

      res.end()
    } catch (error) {
      handleApiError(req, res, error)
    }
  })
)

export default router
