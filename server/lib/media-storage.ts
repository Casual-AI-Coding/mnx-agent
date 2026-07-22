import { promises as fs, createReadStream, createWriteStream, type ReadStream } from 'fs'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'
import { pipeline } from 'stream/promises'
import axios from 'axios'
import { Transform, type Readable } from 'stream'
import type { MediaType } from '../database/types'

const DEFAULT_MEDIA_ROOT = process.env.MEDIA_ROOT || './data/media'

interface SaveMediaResult {
  filepath: string
  filename: string
  size_bytes: number
}

function buildMediaTargetPath(originalName: string, type: MediaType, mediaRoot: string): { filepath: string; filename: string } {
  if (process.env.NODE_ENV === 'test' && mediaRoot === './data/media') {
    throw new Error('CRITICAL: Tests must use TEST_MEDIA_ROOT, not production path ./data/media')
  }
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  const ext = extname(originalName) || getDefaultExtension(type)
  const uuid = randomUUID()
  const filename = `${year}-${month}-${day}/${uuid}${ext}`
  const filepath = join(mediaRoot, filename)
  return { filepath, filename }
}

async function ensureMediaDir(mediaRoot: string): Promise<void> {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const dirPath = join(mediaRoot, `${year}-${month}-${day}`)
  await fs.mkdir(dirPath, { recursive: true })
}

export async function saveMediaFile(
  buffer: Buffer,
  originalName: string,
  type: MediaType,
  mediaRoot: string = DEFAULT_MEDIA_ROOT
): Promise<SaveMediaResult> {
  if (process.env.NODE_ENV === 'test' && mediaRoot === './data/media') {
    throw new Error('CRITICAL: Tests must use TEST_MEDIA_ROOT, not production path ./data/media')
  }
  await ensureMediaDir(mediaRoot)
  const { filepath, filename } = buildMediaTargetPath(originalName, type, mediaRoot)

  await fs.writeFile(filepath, buffer)
  const stats = await fs.stat(filepath)

  return {
    filepath,
    filename,
    size_bytes: stats.size,
  }
}

/**
 * 流式落盘：将已存在文件（如 multer diskStorage 临时文件）通过流复制到媒体目录。
 * 适用于 multer 改用 diskStorage 后的大文件上传，避免将文件全部读入内存。
 */
export async function saveMediaFromFile(
  sourcePath: string,
  originalName: string,
  type: MediaType,
  mediaRoot: string = DEFAULT_MEDIA_ROOT
): Promise<SaveMediaResult> {
  if (process.env.NODE_ENV === 'test' && mediaRoot === './data/media') {
    throw new Error('CRITICAL: Tests must use TEST_MEDIA_ROOT, not production path ./data/media')
  }
  await ensureMediaDir(mediaRoot)
  const { filepath, filename } = buildMediaTargetPath(originalName, type, mediaRoot)

  const source = createReadStream(sourcePath)
  const dest = createWriteStream(filepath)
  await pipeline(source, dest)
  const stats = await fs.stat(filepath)

  return {
    filepath,
    filename,
    size_bytes: stats.size,
  }
}

/**
 * 流式从可读流落盘：将任意 Readable（如 axios stream 响应、HTTP 请求体）流式写入媒体目录。
 */
export async function saveMediaFromStream(
  stream: Readable,
  originalName: string,
  type: MediaType,
  mediaRoot: string = DEFAULT_MEDIA_ROOT
): Promise<SaveMediaResult> {
  if (process.env.NODE_ENV === 'test' && mediaRoot === './data/media') {
    throw new Error('CRITICAL: Tests must use TEST_MEDIA_ROOT, not production path ./data/media')
  }
  await ensureMediaDir(mediaRoot)
  const { filepath, filename } = buildMediaTargetPath(originalName, type, mediaRoot)

  const dest = createWriteStream(filepath)
  await pipeline(stream, dest)
  const stats = await fs.stat(filepath)

  return {
    filepath,
    filename,
    size_bytes: stats.size,
  }
}

export interface MediaReadStreamResult {
  stream: ReadStream
  size: number
}

/**
 * 创建媒体文件读取流，避免将整个文件读入内存。
 * 可选 range 参数支持 HTTP Range 请求（partial content）。
 */
export async function createMediaReadStream(
  filepath: string,
  mediaRoot: string = DEFAULT_MEDIA_ROOT,
  range?: { start: number; end: number }
): Promise<MediaReadStreamResult> {
  const resolvedPath = resolveMediaPath(filepath, mediaRoot)
  const stats = await fs.stat(resolvedPath)
  const stream = range
    ? createReadStream(resolvedPath, { start: range.start, end: range.end })
    : createReadStream(resolvedPath)
  return { stream, size: stats.size }
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

export function resolveMediaPath(filepath: string, mediaRoot: string = DEFAULT_MEDIA_ROOT): string {
  if (filepath.startsWith(mediaRoot)) {
    return filepath
  }
  if (filepath.startsWith('data/media') || filepath.startsWith('./data/media')) {
    return filepath.startsWith('./') ? filepath : './' + filepath
  }
  const resolved = join(mediaRoot, filepath)
  const normalizedRoot = mediaRoot.endsWith('/') ? mediaRoot.slice(0, -1) : mediaRoot
  const normalizedResolved = resolved.endsWith('/') ? resolved.slice(0, -1) : resolved
  if (!normalizedResolved.startsWith(normalizedRoot) && !normalizedResolved.startsWith(normalizedRoot.replace('./', ''))) {
    throw new Error('Path traversal detected')
  }
  return resolved
}

export async function readMediaFile(filepath: string, mediaRoot: string = DEFAULT_MEDIA_ROOT): Promise<Buffer> {
  return fs.readFile(resolveMediaPath(filepath, mediaRoot))
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

export interface SaveStreamFromUrlOptions {
  timeoutMs?: number
  maxBytes?: number
}

/**
 * 流式从 URL 下载到媒体目录：通过 HTTP stream → pipeline 直接写入文件，避免大文件全部读入内存。
 * 返回写入的 filepath/filename/size_bytes。失败时清理已创建的部分文件。
 */
export async function saveStreamFromUrl(
  url: string,
  originalName: string,
  type: MediaType,
  mediaRoot: string = DEFAULT_MEDIA_ROOT,
  options?: SaveStreamFromUrlOptions
): Promise<SaveMediaResult> {
  const timeoutMs = options?.timeoutMs ?? 30000
  const maxBytes = options?.maxBytes ?? 100 * 1024 * 1024

  const response = await axios.get<Readable>(url, {
    responseType: 'stream',
    timeout: timeoutMs,
    maxContentLength: maxBytes,
    maxBodyLength: maxBytes,
  })

  const { filepath, filename } = buildMediaTargetPath(originalName, type, mediaRoot)
  await ensureMediaDir(mediaRoot)
  const dest = createWriteStream(filepath)

  let bytesWritten = 0
  const sizeGuard = new Transform({
    transform(chunk, _encoding, callback) {
      bytesWritten += chunk.length
      if (bytesWritten > maxBytes) {
        callback(new Error(`Remote file exceeds max size ${maxBytes} bytes`))
        return
      }
      callback(null, chunk)
    },
  })

  try {
    await pipeline(response.data, sizeGuard, dest)
  } catch (error) {
    await fs.unlink(filepath).catch(() => {})
    throw error
  }

  const stats = await fs.stat(filepath)
  return {
    filepath,
    filename,
    size_bytes: stats.size,
  }
}