/**
 * Media Routes — Aggregation Point
 *
 * 业务子域 router 按依赖与具体性顺序 mount。聚合层只负责 mount 顺序，
 * 不包含任何端点定义；每个子 router 内部路径与原 `server/routes/media.ts`
 * （v3.1.0 单文件版本）完全一致，对外保持 `/api/media/*` 路径不变。
 *
 * Mount 顺序约束（铁律）:
 *  - `GET /recoverable` 必须先于 `GET /:id` 注册，否则会被 `/:id` 参数路径拦截。
 *  - `POST /recover/:logId` 路径独立，与 `POST /` 不冲突。
 *  - `POST /batch/download` / `POST /batch/public` / `DELETE /batch` 方法或路径互斥，不冲突。
 *  - `PATCH /:id/{favorite,pin,public}` 与 `GET /:id` 方法互斥，不冲突。
 *
 * 详见 ADR-0013 Phase B。
 */

import { Router } from 'express'
import recoveryRouter from './recovery.js'
import uploadRouter from './upload.js'
import downloadRouter from './download.js'
import operationsRouter from './operations.js'
import crudRouter from './crud.js'

const router = Router()

// 具体性优先: 字面量路径与子路径先 mount，参数路径最后
router.use(recoveryRouter)    // GET /recoverable, POST /recover/:logId
router.use(uploadRouter)      // POST /upload, POST /upload-from-url
router.use(downloadRouter)    // GET /:id/token, GET /:id/download, POST /batch/download
router.use(operationsRouter)  // PATCH /:id/{favorite,pin,public}, POST /batch/public
router.use(crudRouter)        // GET /, GET /:id, POST /, PUT /:id, DELETE /batch, DELETE /:id

export default router
