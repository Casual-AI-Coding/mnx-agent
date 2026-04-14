import { promises as fs } from 'fs'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'
import axios from 'axios'
import type { MediaType } from '../database/types'

const DEFAULT_MEDIA_ROOT = process.env.MEDIA_ROOT || './data/media'

export async function saveMediaFile(
  buffer: Buffer,
  originalName: string,
  type: MediaType,
  mediaRoot: string = DEFAULT_MEDIA_ROOT
): Promise<{ filepath: string; filename: string; size_bytes: number }> {
  if (process.env.NODE_ENV === 'test' && mediaRoot === './data/media') {
    throw new Error('CRITICAL: Tests must use TEST_MEDIA_ROOT, not production path ./data/media')
  }
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  
  const dirPath = join(mediaRoot, `${year}-${month}-${day}`)
  await fs.mkdir(dirPath, { recursive: true })
  
  const ext = extname(originalName) || getDefaultExtension(type)
  const uuid = randomUUID()
  const filename = `${year}-${month}-${day}/${uuid}${ext}`
  const filepath = join(mediaRoot, filename)
  
  await fs.writeFile(filepath, buffer)
  const stats = await fs.stat(filepath)
  
  return {
    filepath,
    filename,
    size_bytes: stats.size,
  }
}

export async function deleteMediaFile(filepath: string): Promise<void> {
  try {
    await fs.unlink(filepath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }
}

export async function readMediaFile(filepath: string, mediaRoot: string = DEFAULT_MEDIA_ROOT): Promise<Buffer> {
  const fullPath = filepath.startsWith(mediaRoot)
    ? filepath
    : join(mediaRoot, filepath)
  return fs.readFile(fullPath)
}

export function getMediaFilePath(filename: string, mediaRoot: string = DEFAULT_MEDIA_ROOT): string {
  return join(mediaRoot, filename)
}

function getDefaultExtension(type: MediaType): string {
  switch (type) {
    case 'audio': return '.wav'
    case 'image': return '.png'
    case 'video': return '.mp4'
    case 'music': return '.mp3'
    default: return '.bin'
  }
}

export async function saveFromUrl(
  url: string,
  originalName: string,
  type: MediaType,
  mediaRoot: string = DEFAULT_MEDIA_ROOT
): Promise<{ filepath: string; filename: string; size_bytes: number }> {
  const response = await axios.get(url, { responseType: 'arraybuffer' })
  const buffer = Buffer.from(response.data)
  return saveMediaFile(buffer, originalName, type, mediaRoot)
}