import { promises as fs } from 'fs'
import { join } from 'path'
import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || 'mnx_agent_server',
  password: process.env.PGPASSWORD || '',
  database: process.env.PGDATABASE || 'mnx_agent',
})

async function main() {
  console.log('开始软删除未恢复的媒体记录...')
  
  const restoredFiles = await fs.readdir('./data/media', { recursive: true })
  const mp3Files = restoredFiles.filter(f => typeof f === 'string' && f.endsWith('.mp3'))
  
  console.log(`已恢复的 mp3 文件: ${mp3Files.length}`)
  
  const restoredPaths = mp3Files.map(f => `data/media/${f}`)
  
  const client = await pool.connect()
  
  const musicRecords = await client.query(`
    SELECT id, file_path, filename 
    FROM media_records 
    WHERE type = 'music' AND is_deleted = false
  `)
  
  console.log(`数据库中未删除的音乐记录: ${musicRecords.rows.length}`)
  
  const toDelete = musicRecords.rows.filter(r => !restoredPaths.includes(r.file_path))
  
  console.log(`需要软删除的记录: ${toDelete.length}`)
  
  if (toDelete.length > 0) {
    const ids = toDelete.map(r => r.id)
    
    const result = await client.query(`
      UPDATE media_records 
      SET is_deleted = true, updated_at = NOW()
      WHERE id = ANY($1)
    `, [ids])
    
    console.log(`已软删除 ${result.rowCount} 条记录`)
    
    console.log('\n删除的记录 (前 10 条):')
    toDelete.slice(0, 10).forEach(r => {
      console.log(`  ${r.filename} (${r.file_path})`)
    })
  }
  
  client.release()
  await pool.end()
  
  console.log('\n完成！')
}

main().catch(console.error)