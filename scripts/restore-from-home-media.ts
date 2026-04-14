import { promises as fs } from 'fs'
import { join, dirname } from 'path'

const RECOVERED_DIR = '/home/ogslp/media'
const TARGET_DIR = './data/media'
const RECORDS_FILE = '/tmp/music_records.txt'

async function main() {
  console.log('开始从 ~/media 恢复媒体文件...')
  
  const recordsText = await fs.readFile(RECORDS_FILE, 'utf-8')
  const records = recordsText.trim().split('\n').map(line => {
    const [size, path] = line.split('|')
    return { size: parseInt(size), path: path.replace('data/media/', '') }
  })
  
  console.log(`数据库中有 ${records.length} 个音乐记录`)
  
  const recoveredFiles = await fs.readdir(RECOVERED_DIR)
  const recoveredMp3s = recoveredFiles.filter(f => f.endsWith('.mp3'))
  
  console.log(`~/media 目录中有 ${recoveredMp3s.length} 个 mp3 文件`)
  
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
  
  let matched = 0
  let unmatched = 0
  const duplicates: number[] = []
  
  for (const record of records) {
    const candidates = sizeMap.get(record.size)
    
    if (candidates && candidates.length > 0) {
      const recoveredFile = candidates.shift()!
      const targetPath = join(TARGET_DIR, record.path)
      
      await fs.mkdir(dirname(targetPath), { recursive: true })
      await fs.copyFile(recoveredFile, targetPath)
      
      matched++
      
      if (candidates.length > 0) {
        duplicates.push(record.size)
      }
      
      if (matched % 50 === 0) {
        console.log(`已匹配 ${matched} 个文件...`)
      }
    } else {
      unmatched++
      console.log(`无法匹配: ${record.size} bytes - ${record.path}`)
    }
  }
  
  console.log(`\n完成！`)
  console.log(`匹配成功: ${matched}`)
  console.log(`无法匹配: ${unmatched}`)
  console.log(`重复大小（需要手动确认）: ${duplicates.length}`)
  
  const remaining: string[] = []
  for (const [size, files] of sizeMap) {
    if (files.length > 0) {
      remaining.push(...files.map(f => `${f} (${size} bytes)`))
    }
  }
  
  if (remaining.length > 0) {
    console.log(`\n剩余未使用的恢复文件 (${remaining.length} 个):`)
    remaining.slice(0, 20).forEach(f => console.log(f))
    if (remaining.length > 20) {
      console.log(`... 还有 ${remaining.length - 20} 个`)
    }
  }
}

main().catch(console.error)