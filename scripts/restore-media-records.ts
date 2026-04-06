#!/usr/bin/env node
/**
 * 恢复媒体记录脚本
 * 
 * 从 data/media/ 目录扫描文件并恢复到数据库
 */

// 加载环境变量
import 'dotenv/config'

import { readdir, stat } from 'fs/promises'
import { join, basename, extname } from 'path'
import { createConnection, closeConnection } from '../server/database/connection.js'
import { MediaRepository } from '../server/repositories/media-repository.js'
import type { CreateMediaRecord } from '../server/database/types.js'
import { getLogger } from '../server/lib/logger.js'

const logger = getLogger()
const MEDIA_ROOT = join(process.cwd(), 'data/media')

interface FileInfo {
  id: string // UUID from filename
  filename: string
  filepath: string // relative to MEDIA_ROOT
  size: number
  created_at: Date
  extension: string
}

/**
 * 递归扫描目录获取所有媒体文件
 */
async function scanMediaFiles(dir: string, basePath: string = ''): Promise<FileInfo[]> {
  const files: FileInfo[] = []
  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    const relativePath = basePath ? join(basePath, entry.name) : entry.name

    if (entry.isDirectory()) {
      // 递归扫描子目录
      const subFiles = await scanMediaFiles(fullPath, relativePath)
      files.push(...subFiles)
    } else if (entry.isFile()) {
      // 只处理支持的媒体文件类型
      const ext = extname(entry.name).toLowerCase()
      if (['.png', '.jpg', '.jpeg', '.webp', '.mp3', '.wav', '.mp4', '.webm', '.m4a'].includes(ext)) {
        const stats = await stat(fullPath)
        
        // 从文件名提取 UUID（文件名格式：UUID.ext）
        const uuidMatch = basename(entry.name, ext).match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
        
        if (!uuidMatch) {
          logger.warn({ msg: '文件名不符合 UUID 格式，跳过', file: entry.name })
          continue
        }

        files.push({
          id: uuidMatch[0],
          filename: entry.name,
          filepath: relativePath,
          size: stats.size,
          created_at: stats.birthtime,
          extension: ext,
        })
      }
    }
  }

  return files
}

/**
 * 根据文件扩展名推断媒体类型和 MIME 类型
 */
function getMediaTypeInfo(ext: string): { type: string; mime_type: string } {
  const typeMap: Record<string, { type: string; mime_type: string }> = {
    '.png': { type: 'image', mime_type: 'image/png' },
    '.jpg': { type: 'image', mime_type: 'image/jpeg' },
    '.jpeg': { type: 'image', mime_type: 'image/jpeg' },
    '.webp': { type: 'image', mime_type: 'image/webp' },
    '.mp3': { type: 'audio', mime_type: 'audio/mpeg' },
    '.wav': { type: 'audio', mime_type: 'audio/wav' },
    '.m4a': { type: 'audio', mime_type: 'audio/mp4' },
    '.mp4': { type: 'video', mime_type: 'video/mp4' },
    '.webm': { type: 'video', mime_type: 'video/webm' },
  }
  
  return typeMap[ext] || { type: 'image', mime_type: 'application/octet-stream' }
}

/**
 * 根据媒体类型推断来源
 */
function inferSource(type: string): string {
  const sourceMap: Record<string, string> = {
    'image': 'image_generation',
    'audio': 'voice_async',
    'video': 'video_generation',
    'music': 'music_generation',
  }
  
  return sourceMap[type] || 'image_generation'
}

/**
 * 主函数
 */
async function main() {
  try {
    logger.info({ msg: '开始恢复媒体记录...', mediaRoot: MEDIA_ROOT })
    
    // 创建数据库连接
    const conn = await createConnection()
    const mediaRepo = new MediaRepository(conn)
    
    // 扫描文件
    const files = await scanMediaFiles(MEDIA_ROOT)
    logger.info({ msg: '扫描完成，找到文件', count: files.length })
    
    if (files.length === 0) {
      logger.info({ msg: '没有找到需要恢复的文件' })
      return
    }
    
    // 检查现有记录（避免重复）
    const existingRecords = await mediaRepo.list({ limit: 10000, includeDeleted: true })
    const existingIds = new Set(existingRecords.items.map(r => r.id))
    
    // 过滤需要插入的文件
    const filesToInsert = files.filter(f => !existingIds.has(f.id))
    logger.info({ 
      msg: '需要插入的记录', 
      totalFiles: files.length,
      existingRecords: existingIds.size,
      toInsert: filesToInsert.length 
    })
    
    if (filesToInsert.length === 0) {
      logger.info({ msg: '所有文件记录已存在，无需恢复' })
      await closeConnection()
      return
    }
    
    // 批量插入（分批处理，避免一次插入过多）
    const BATCH_SIZE = 50
    let inserted = 0
    let failed = 0
    
    for (let i = 0; i < filesToInsert.length; i += BATCH_SIZE) {
      const batch = filesToInsert.slice(i, i + BATCH_SIZE)
      
      logger.info({ 
        msg: '正在插入批次', 
        batch: Math.floor(i / BATCH_SIZE) + 1,
        batchSize: batch.length,
        progress: `${i}/${filesToInsert.length}`
      })
      
      for (const file of batch) {
        try {
          const { type, mime_type } = getMediaTypeInfo(file.extension)
          const source = inferSource(type)
          
          const record: CreateMediaRecord = {
            filename: file.filename,
            original_name: file.filename,
            filepath: file.filepath,
            type,
            mime_type,
            size_bytes: file.size,
            source,
            task_id: null,
            metadata: {
              restored_from_filesystem: true,
              original_created_at: file.created_at.toISOString(),
            },
          }
          
          // 使用文件 UUID 作为记录 ID（需要直接 SQL 插入以指定 ID）
          await conn.execute(
            `INSERT INTO media_records (id, filename, original_name, filepath, type, mime_type, size_bytes, source, task_id, metadata, created_at, updated_at, owner_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
              file.id,
              record.filename,
              record.original_name,
              record.filepath,
              record.type,
              record.mime_type,
              record.size_bytes,
              record.source,
              record.task_id,
              JSON.stringify(record.metadata),
              file.created_at.toISOString(),
              new Date().toISOString(),
              null,
            ]
          )
          
          inserted++
        } catch (error) {
          logger.error({ 
            msg: '插入记录失败', 
            file: file.filename,
            error: (error as Error).message 
          })
          failed++
        }
      }
    }
    
    logger.info({ 
      msg: '恢复完成', 
      inserted, 
      failed,
      total: filesToInsert.length 
    })
    
    // 验证结果
    const finalRecords = await mediaRepo.list({ limit: 10000, includeDeleted: true })
    logger.info({ msg: '最终记录数量', total: finalRecords.total })
    
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