import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { createConnection, closeConnection, getConnection } from '../server/database/connection.js'

const RECOVERED_DIR = '/home/ogslp/media2'
const TARGET_DIR = './data/media'

async function main() {
  console.log('开始恢复媒体文件...')
  
  // 获取数据库中的音乐记录
  await createConnection({
    pgHost: process.env.DB_HOST || 'localhost',
    pgPort: parseInt(process.env.DB_PORT || '5432'),
    pgUser: process.env.DB_USER || 'mnx_agent_server',
    pgPassword: process.env.DB_PASSWORD || 'mnx_agent_password',
    pgDatabase: process.env.DB_NAME || 'mnx_agent',
  })
  const conn = getConnection()
  const result = await conn.query(
    'SELECT id, filename, filepath, size_bytes, original_name FROM media_records WHERE type = $1 AND deleted_at IS NULL ORDER BY created_at',
    ['music']
  )
  const musicRecords = result.rows
  console.log(`数据库中有 ${musicRecords.length} 个音乐记录`)
  
  // 获取恢复目录中的所有 mp3 文件及其大小
  const recoveredFiles = await fs.readdir(RECOVERED_DIR)
  const recoveredMp3s = recoveredFiles.filter(f => f.endsWith('.mp3'))
  
  console.log(`恢复目录中有 ${recoveredMp3s.length} 个 mp3 文件`)
  
  // 构建恢复文件大小映射
  const sizeMap = new Map<number, string[]>()
  for (const file of recoveredMp3s) {
    const filepath = join(RECOVERED_DIR, file)
    const stats = await fs.stat(filepath)
    const size = stats.size
    if (!sizeMap.has(size)) {
      sizeMap.set(size, [])
    }
    sizeMap.get(size)!.push(filepath)
  }
  
  // 按大小匹配并复制
  let matched = 0
  let unmatched = 0
  const matchedRecords: Array<{ id: string; originalPath: string; recoveredFile: string }> = []
  
  for (const record of musicRecords) {
    const targetSize = record.size_bytes
    const candidates = sizeMap.get(targetSize)
    
    if (candidates && candidates.length > 0) {
      // 取第一个匹配的文件
      const recoveredFile = candidates.shift()!
      const targetPath = join(TARGET_DIR, record.filepath.replace('data/media/', '').replace(/^\.\//, ''))
      
      // 创建目标目录
      await fs.mkdir(dirname(targetPath), { recursive: true })
      
      // 复制文件
      await fs.copyFile(recoveredFile, targetPath)
      
      matched++
      matchedRecords.push({
        id: record.id,
        originalPath: record.filepath,
        recoveredFile,
      })
      
      if (matched % 50 === 0) {
        console.log(`已匹配 ${matched} 个文件...`)
      }
    } else {
      unmatched++
    }
  }
  
  console.log(`\n完成！`)
  console.log(`匹配成功: ${matched}`)
  console.log(`无法匹配: ${unmatched}`)
  
  // 输出匹配详情
  await fs.writeFile('./matched-records.json', JSON.stringify(matchedRecords, null, 2))
  console.log(`匹配详情已保存到 matched-records.json`)
  
  await closeConnection()
}

main().catch(console.error)