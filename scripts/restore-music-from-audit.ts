#!/usr/bin/env node
/**
 * restore-music-from-audit.ts
 *
 * 从 external_api_logs 恢复因上传失败而丢失的音乐记录
 * 1. 查询目标日志
 * 2. 下载音频文件
 * 3. 创建媒体记录
 */

import 'dotenv/config'
import { createConnection, closeConnection } from '../server/database/connection.js'
import { MediaRepository } from '../server/repositories/media-repository.js'
import { ExternalApiLogRepository } from '../server/repositories/external-api-log.repository.js'
import { getLogger } from '../server/lib/logger.js'
import { writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { pipeline } from 'stream/promises'
import { v4 as uuidv4 } from 'uuid'
import { toLocalISODateString } from '../server/lib/date-utils.js'

const logger = getLogger()
const MEDIA_ROOT = join(process.cwd(), 'data/media')

interface MusicLog {
  id: number
  audio_url: string
  lyrics: string
  song_title: string
  style_tags: string[]
  music_duration: number
  music_size: number
  created_at: string
  batch_name: string
  index: number
}

interface CreateMediaRecord {
  filename: string
  original_name: string
  filepath: string
  type: string
  mime_type: string
  size_bytes: number
  source: string
  task_id: string | null
  metadata: Record<string, unknown>
}

/**
 * 下载文件到本地
 */
async function downloadFile(url: string, filepath: string): Promise<number> {
  await mkdir(dirname(filepath), { recursive: true })

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  await writeFile(filepath, buffer)

  return buffer.length
}

/**
 * 主函数
 */
async function main() {
  try {
    logger.info({ msg: '开始从审计日志恢复音乐记录...' })

    // 创建数据库连接
    const conn = await createConnection()
    const mediaRepo = new MediaRepository(conn)
    const externalApiLogRepo = new ExternalApiLogRepository(conn)

    // 查询 Another_Way_Out 批次 (Silent screams...)
    const anotherWayLogs = await conn.query<{ id: number; response_body: string; created_at: string }>(
      `SELECT id, response_body, created_at FROM external_api_logs
       WHERE operation = 'music_generation' AND status = 'success'
       AND request_body::json->>'lyrics' LIKE '%Silent screams%'
       ORDER BY created_at ASC`
    )

    // 查询 Broken_Records 批次 (Clock ticks...)
    const brokenRecordsLogs = await conn.query<{ id: number; response_body: string; created_at: string }>(
      `SELECT id, response_body, created_at FROM external_api_logs
       WHERE operation = 'music_generation' AND status = 'success'
       AND request_body::json->>'lyrics' LIKE '%Clock ticks loud%'
       ORDER BY created_at ASC`
    )

    const allLogs: { logs: typeof anotherWayLogs; batchName: string }[] = [
      { logs: anotherWayLogs, batchName: 'Another_Way_Out_Lyrics' },
      { logs: brokenRecordsLogs, batchName: 'Broken_Records_Lyrics' },
    ]

    let totalInserted = 0
    let totalFailed = 0

    for (const { logs, batchName } of allLogs) {
      logger.info({ msg: `处理批次: ${batchName}`, count: logs.length })

      for (let i = 0; i < logs.length; i++) {
        const log = logs[i]
        const index = i + 1 // 1-based index

        try {
          const responseData = JSON.parse(log.response_body)
          const audioUrl = responseData?.data?.audio
          const extraInfo = responseData?.extra_info || {}
          const songTitle = responseData?.data?.song_title || batchName.replace('_Lyrics', '')

          if (!audioUrl) {
            logger.error({ msg: '跳过: 响应中没有 audio_url', logId: log.id })
            totalFailed++
            continue
          }

          // 生成文件名和路径
          const fileUuid = uuidv4()
          const filename = `${fileUuid}.mp3`
          const dateStr = toLocalISODateString().split('T')[0] // YYYY-MM-DD
          const filepath = join(dateStr, filename)
          const fullFilepath = join(MEDIA_ROOT, filepath)

          // 下载文件
          logger.info({ msg: `下载音频 [${index}/${logs.length}]: ${audioUrl.substring(0, 60)}...` })
          const fileSize = await downloadFile(audioUrl, fullFilepath)

          // 创建媒体记录
          const mediaRecord: CreateMediaRecord = {
            filename,
            original_name: `${batchName} (${index}).mp3`,
            filepath,
            type: 'music',
            mime_type: 'audio/mpeg',
            size_bytes: fileSize,
            source: 'music_generation',
            task_id: null,
            metadata: {
              title: songTitle,
              style_tags: extraInfo.style_tags || [],
              lyrics: responseData?.data?.lyrics || '',
              music_duration: extraInfo.music_duration || 0,
              music_size: fileSize,
              batch_name: batchName,
              batch_index: index,
              restored_from_audit_log: true,
              original_log_id: log.id,
              generated_at: log.created_at,
            },
          }

          await mediaRepo.create(mediaRecord as any)

          logger.info({
            msg: `成功恢复 [${index}/${logs.length}]: ${mediaRecord.original_name}`,
            fileSize,
            filepath,
          })

          totalInserted++
        } catch (error) {
          logger.error({
            msg: `处理失败 [${index}/${logs.length}]`,
            logId: log.id,
            error: (error as Error).message,
          })
          totalFailed++
        }
      }
    }

    logger.info({
      msg: '恢复完成',
      total: totalInserted + totalFailed,
      inserted: totalInserted,
      failed: totalFailed,
    })

    await closeConnection()
  } catch (error) {
    logger.error({ msg: '恢复失败', error: (error as Error).message })
    throw error
  }
}

// 执行脚本
main().catch((err) => {
  console.error('脚本执行失败:', err)
  process.exit(1)
})