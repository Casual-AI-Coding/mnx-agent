import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  user: process.env.PGUSER || 'mnx_agent_server',
  password: process.env.PGPASSWORD || '',
  database: process.env.PGDATABASE || 'mnx-agent',
})

const MEDIA_DIR = '/home/ogslp/media3'
const TARGET_DIR = './data/media'

const MATCHES = [
  { source: 'music-1775913713912.mp3', size: 4780920, target: '2026-04-11/65c5ba6f-b07b-4e13-bed4-bfb296381569.mp3', id: 'fc2cec87-14c3-4a55-b12a-0e60829756ee' },
  { source: 'music_1775919043385.mp3', size: 6836443, target: '2026-04-11/db10364a-b137-40da-8f4a-453010bad5df.mp3', id: '35a54ea6-549c-4a60-90ee-c8b13fa0e878' },
  { source: 'Ricochet_Remix_ (4).mp3', size: 7687408, target: '2026-04-12/b3095249-9937-433c-9340-f4f6da4a3a83.mp3', id: '2d931953-2e34-4573-9445-793c93cc7c46' },
  { source: 'audio_effect_0629447966e5409ee01228bc7e36c5ed_1775899126497_7602.mp3', size: 8005057, target: '2026-04-11/e1aa98d5-8948-4135-82b5-afe99c3bce52.mp3', id: '8d6d78e3-6281-4bf2-a8b3-393e0973e779' },
  { source: 'music_1775924232194.mp3', size: 8407134, target: '2026-04-11/8853ad5c-87cf-4222-afb3-1db27acf1878.mp3', id: '96582a8e-0043-4a71-9af6-2a109c32df61' },
]

async function main() {
  console.log('开始从 ~/media3 恢复文件...')
  console.log(`找到 ${MATCHES.length} 个匹配`)
  
  const client = await pool.connect()
  
  for (const match of MATCHES) {
    const sourcePath = join(MEDIA_DIR, match.source)
    const targetPath = join(TARGET_DIR, match.target)
    
    const stat = await fs.stat(sourcePath)
    if (stat.size !== match.size) {
      console.log(`大小不匹配: ${match.source} (${stat.size} != ${match.size})`)
      continue
    }
    
    await fs.mkdir(dirname(targetPath), { recursive: true })
    await fs.copyFile(sourcePath, targetPath)
    
    console.log(`已复制: ${match.source} -> ${match.target}`)
    
    await client.query(`
      UPDATE media_records 
      SET is_deleted = false, updated_at = NOW()
      WHERE id = $1
    `, [match.id])
    
    console.log(`已恢复数据库记录: ${match.id}`)
  }
  
  client.release()
  await pool.end()
  
  console.log('\n完成！')
}

main().catch(console.error)