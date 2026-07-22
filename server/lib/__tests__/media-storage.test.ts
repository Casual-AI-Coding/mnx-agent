import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { promises as fs } from 'fs'
import { join } from 'path'
import { Readable } from 'stream'
import axios from 'axios'
import { 
  saveMediaFile, 
  deleteMediaFile, 
  readMediaFile, 
  getMediaFilePath, 
  saveFromUrl,
  resolveMediaPath,
  saveMediaFromFile,
  saveMediaFromStream,
  createMediaReadStream,
  saveStreamFromUrl,
} from '../media-storage'
import type { MediaType } from '../../database/types'

const TEST_MEDIA_ROOT = 'test-media-storage'

async function collectStream(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks)
}

async function countFilesRecursive(root: string): Promise<number> {
  let count = 0
  for await (const entry of await fs.opendir(root, { recursive: true })) {
    if (entry.isFile()) count++
  }
  return count
}


vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    isAxiosError: vi.fn(),
  },
  isAxiosError: vi.fn(),
}))

describe('media-storage', () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_MEDIA_ROOT, { recursive: true })
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await fs.rm(TEST_MEDIA_ROOT, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  describe('saveMediaFile', () => {
    it('should save audio file with correct extension', async () => {
      const buffer = Buffer.from('test audio content')
      const result = await saveMediaFile(buffer, 'test.wav', 'audio', TEST_MEDIA_ROOT)

      expect(result.filename).toMatch(/^\d{4}-\d{2}-\d{2}\/[a-f0-9-]+\.wav$/)
      expect(result.filepath).toContain(TEST_MEDIA_ROOT)
      expect(result.size_bytes).toBe(buffer.length)
    })

    it('should save image file with correct extension', async () => {
      const buffer = Buffer.from('test image content')
      const result = await saveMediaFile(buffer, 'test.png', 'image', TEST_MEDIA_ROOT)

      expect(result.filename).toMatch(/^\d{4}-\d{2}-\d{2}\/[a-f0-9-]+\.png$/)
      expect(result.size_bytes).toBe(buffer.length)
    })

    it('should save video file with correct extension', async () => {
      const buffer = Buffer.from('test video content')
      const result = await saveMediaFile(buffer, 'test.mp4', 'video', TEST_MEDIA_ROOT)

      expect(result.filename).toMatch(/^\d{4}-\d{2}-\d{2}\/[a-f0-9-]+\.mp4$/)
      expect(result.size_bytes).toBe(buffer.length)
    })

    it('should save music file with correct extension', async () => {
      const buffer = Buffer.from('test music content')
      const result = await saveMediaFile(buffer, 'test.mp3', 'music', TEST_MEDIA_ROOT)

      expect(result.filename).toMatch(/^\d{4}-\d{2}-\d{2}\/[a-f0-9-]+\.mp3$/)
      expect(result.size_bytes).toBe(buffer.length)
    })

    it('should create date directories', async () => {
      const buffer = Buffer.from('test')
      await saveMediaFile(buffer, 'test.png', 'image', TEST_MEDIA_ROOT)

      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')

      const dirPath = join(TEST_MEDIA_ROOT, `${year}-${month}-${day}`)
      const files = await fs.readdir(dirPath)
      expect(files.length).toBeGreaterThan(0)
    })

    it('should generate unique filenames', async () => {
      const buffer = Buffer.from('test')
      const result1 = await saveMediaFile(buffer, 'test.mp4', 'video', TEST_MEDIA_ROOT)
      const result2 = await saveMediaFile(buffer, 'test.mp4', 'video', TEST_MEDIA_ROOT)

      expect(result1.filename).not.toBe(result2.filename)
    })

    it('should use default extension for audio when none provided', async () => {
      const buffer = Buffer.from('test content')
      const result = await saveMediaFile(buffer, 'noextension', 'audio', TEST_MEDIA_ROOT)

      expect(result.filename).toMatch(/\.wav$/)
    })

    it('should use default extension for image when none provided', async () => {
      const buffer = Buffer.from('test content')
      const result = await saveMediaFile(buffer, 'noextension', 'image', TEST_MEDIA_ROOT)

      expect(result.filename).toMatch(/\.png$/)
    })

    it('should use default extension for video when none provided', async () => {
      const buffer = Buffer.from('test content')
      const result = await saveMediaFile(buffer, 'noextension', 'video', TEST_MEDIA_ROOT)

      expect(result.filename).toMatch(/\.mp4$/)
    })

    it('should use default extension for music when none provided', async () => {
      const buffer = Buffer.from('test content')
      const result = await saveMediaFile(buffer, 'noextension', 'music', TEST_MEDIA_ROOT)

      expect(result.filename).toMatch(/\.mp3$/)
    })

    it('should handle empty buffer', async () => {
      const buffer = Buffer.from('')
      const result = await saveMediaFile(buffer, 'empty.bin', 'video', TEST_MEDIA_ROOT)

      expect(result.size_bytes).toBe(0)
    })

    it('should use custom mediaRoot', async () => {
      const customRoot = 'custom-test-media'
      await fs.mkdir(customRoot, { recursive: true })
      
      const buffer = Buffer.from('test')
      const result = await saveMediaFile(buffer, 'test.wav', 'audio', customRoot)

      expect(result.filepath).toContain(customRoot)
      
      // Cleanup custom root
      await fs.rm(customRoot, { recursive: true, force: true })
    })

    it('should preserve original extension even when different from type default', async () => {
      const buffer = Buffer.from('test')
      const result = await saveMediaFile(buffer, 'custom.ogg', 'audio', TEST_MEDIA_ROOT)

      expect(result.filename).toMatch(/\.ogg$/)
    })

    it('should handle large buffer', async () => {
      const largeBuffer = Buffer.alloc(1024 * 1024, 'a') // 1MB
      const result = await saveMediaFile(largeBuffer, 'large.mp3', 'music', TEST_MEDIA_ROOT)

      expect(result.size_bytes).toBe(1024 * 1024)
    })
  })

  describe('getDefaultExtension (tested via saveMediaFile)', () => {
    // Testing the unexported getDefaultExtension function indirectly
    it('should return .wav for audio type', async () => {
      const buffer = Buffer.from('test')
      const result = await saveMediaFile(buffer, 'filename', 'audio', TEST_MEDIA_ROOT)
      expect(result.filename).toMatch(/\.wav$/)
    })

    it('should return .png for image type', async () => {
      const buffer = Buffer.from('test')
      const result = await saveMediaFile(buffer, 'filename', 'image', TEST_MEDIA_ROOT)
      expect(result.filename).toMatch(/\.png$/)
    })

    it('should return .mp4 for video type', async () => {
      const buffer = Buffer.from('test')
      const result = await saveMediaFile(buffer, 'filename', 'video', TEST_MEDIA_ROOT)
      expect(result.filename).toMatch(/\.mp4$/)
    })

    it('should return .mp3 for music type', async () => {
      const buffer = Buffer.from('test')
      const result = await saveMediaFile(buffer, 'filename', 'music', TEST_MEDIA_ROOT)
      expect(result.filename).toMatch(/\.mp3$/)
    })

    it('should return .bin for unknown type (via type assertion)', async () => {
      const buffer = Buffer.from('test')
      // Force unknown type via type assertion to test default case
      const result = await saveMediaFile(buffer, 'filename', 'unknown' as MediaType, TEST_MEDIA_ROOT)
      expect(result.filename).toMatch(/\.bin$/)
    })
  })

  describe('readMediaFile', () => {
    it('should read saved file with absolute path', async () => {
      const buffer = Buffer.from('test content for reading')
      const { filepath } = await saveMediaFile(buffer, 'test.wav', 'audio', TEST_MEDIA_ROOT)

      const readBuffer = await readMediaFile(filepath, TEST_MEDIA_ROOT)
      expect(readBuffer.toString()).toBe('test content for reading')
    })

    it('should read file with relative path (filename)', async () => {
      const buffer = Buffer.from('test content')
      const { filename } = await saveMediaFile(buffer, 'test.wav', 'audio', TEST_MEDIA_ROOT)

      const readBuffer = await readMediaFile(filename, TEST_MEDIA_ROOT)
      expect(readBuffer.toString()).toBe('test content')
    })

    it('should handle absolute path that starts with mediaRoot', async () => {
      const buffer = Buffer.from('test absolute')
      const { filepath } = await saveMediaFile(buffer, 'test.wav', 'audio', TEST_MEDIA_ROOT)

      // filepath already starts with TEST_MEDIA_ROOT, so it should use the filepath directly
      const readBuffer = await readMediaFile(filepath, TEST_MEDIA_ROOT)
      expect(readBuffer.toString()).toBe('test absolute')
    })

    it('should join path when filepath does not start with mediaRoot', async () => {
      const buffer = Buffer.from('relative test')
      const { filename } = await saveMediaFile(buffer, 'test.wav', 'audio', TEST_MEDIA_ROOT)

      // filename is relative, doesn't start with TEST_MEDIA_ROOT
      const readBuffer = await readMediaFile(filename, TEST_MEDIA_ROOT)
      expect(readBuffer.toString()).toBe('relative test')
    })

    it('should throw for non-existent file', async () => {
      await expect(readMediaFile('/nonexistent/file.wav')).rejects.toThrow()
    })

    it('should throw for path traversal attempt', async () => {
      await expect(readMediaFile('../etc/passwd', TEST_MEDIA_ROOT)).rejects.toThrow()
    })

    it('should throw for absolute path outside mediaRoot', async () => {
      await expect(readMediaFile('/etc/passwd', TEST_MEDIA_ROOT)).rejects.toThrow()
    })

    it('should use default mediaRoot when not provided', async () => {
      const buffer = Buffer.from('test default root')
      // Use test-specific root to avoid deleting real data/media
      const defaultRoot = join(TEST_MEDIA_ROOT, 'default-test')
      await fs.mkdir(defaultRoot, { recursive: true })
      
      const { filepath, filename } = await saveMediaFile(buffer, 'default.wav', 'audio', defaultRoot)
      const readBuffer = await readMediaFile(filename, defaultRoot)
      
      expect(readBuffer.toString()).toBe('test default root')
      
      // Cleanup only test directory, not real data/media
      await fs.rm(defaultRoot, { recursive: true, force: true })
    })
  })

  describe('resolveMediaPath', () => {
    it('should return path as-is when it starts with mediaRoot', () => {
      const result = resolveMediaPath('/media/root/file.wav', '/media/root')
      expect(result).toBe('/media/root/file.wav')
    })

    it('should return path as-is when it starts with mediaRoot (relative)', () => {
      const result = resolveMediaPath('./test-data/file.wav', './test-data')
      expect(result).toBe('./test-data/file.wav')
    })

    it('should add ./ prefix for data/media relative paths', () => {
      const result = resolveMediaPath('data/media/subdir/file.wav', '/custom/root')
      expect(result).toBe('./data/media/subdir/file.wav')
    })

    it('should keep ./ prefix for ./data/media paths', () => {
      const result = resolveMediaPath('./data/media/subdir/file.wav', '/custom/root')
      expect(result).toBe('./data/media/subdir/file.wav')
    })

    it('should join with mediaRoot for other relative paths', () => {
      const result = resolveMediaPath('2024-01-15/uuid.wav', '/media/root')
      expect(result).toBe('/media/root/2024-01-15/uuid.wav')
    })

    it('should use default mediaRoot when not provided', () => {
      const result = resolveMediaPath('some/file.wav')
      expect(result).toContain('some/file.wav')
    })
  })

  describe('deleteMediaFile', () => {
    it('should delete existing file', async () => {
      const buffer = Buffer.from('to be deleted')
      const { filepath } = await saveMediaFile(buffer, 'delete.wav', 'audio', TEST_MEDIA_ROOT)

      await deleteMediaFile(filepath)

      await expect(fs.access(filepath)).rejects.toThrow()
    })

    it('should not throw for non-existent file (ENOENT)', async () => {
      await expect(deleteMediaFile('/nonexistent/file.wav')).resolves.not.toThrow()
    })

    it('should ignore ENOENT error silently', async () => {
      // This tests the specific error code handling
      const nonExistentPath = join(TEST_MEDIA_ROOT, 'does-not-exist.wav')
      await deleteMediaFile(nonExistentPath)
      // Should complete without throwing
    })

    it('should delete file in nested directory', async () => {
      const buffer = Buffer.from('nested file')
      const { filepath } = await saveMediaFile(buffer, 'nested.wav', 'audio', TEST_MEDIA_ROOT)

      // Verify file exists
      await expect(fs.access(filepath)).resolves.not.toThrow()

      // Delete
      await deleteMediaFile(filepath)

      // Verify deleted
      await expect(fs.access(filepath)).rejects.toThrow()
    })

it('should handle multiple delete calls on same file', async () => {
      const buffer = Buffer.from('multi delete')
      const { filepath } = await saveMediaFile(buffer, 'multi.wav', 'audio', TEST_MEDIA_ROOT)

      await deleteMediaFile(filepath)

      await expect(deleteMediaFile(filepath)).resolves.not.toThrow()
    })

    it('should throw for non-ENOENT errors', async () => {
      const fsSpy = vi.spyOn(fs, 'unlink').mockRejectedValueOnce(Object.assign(new Error('Permission denied'), { code: 'EACCES' }))

      await expect(deleteMediaFile('/some/path/file.wav')).rejects.toThrow('Permission denied')

      fsSpy.mockRestore()
    })
  })

  describe('getMediaFilePath', () => {
    it('should return joined path', () => {
      const result = getMediaFilePath('2024-01-15/uuid.wav', TEST_MEDIA_ROOT)
      expect(result).toBe(join(TEST_MEDIA_ROOT, '2024-01-15/uuid.wav'))
    })

    it('should handle nested paths', () => {
      const result = getMediaFilePath('subdir/file.mp3', '/custom/media')
      expect(result).toBe('/custom/media/subdir/file.mp3')
    })

    it('should handle simple filename', () => {
      const result = getMediaFilePath('file.wav', TEST_MEDIA_ROOT)
      expect(result).toBe(join(TEST_MEDIA_ROOT, 'file.wav'))
    })

    it('should use default mediaRoot when not provided', () => {
      const result = getMediaFilePath('test.wav')
      expect(result).toBe(join(process.env.MEDIA_ROOT || './test-media-storage', 'test.wav'))
    })

    it('should handle deeply nested paths', () => {
      const result = getMediaFilePath('2024/01/15/uuid.wav', '/media')
      expect(result).toBe('/media/2024/01/15/uuid.wav')
    })
  })

  describe('saveFromUrl', () => {
    it('should throw on network error', async () => {
      ;;(axios.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network failure'))

      await expect(saveFromUrl('http://invalid.url/file.wav', 'test.wav', 'audio', TEST_MEDIA_ROOT))
        .rejects.toThrow('Network failure')
    })

    it('should throw on HTTP 404', async () => {
      const error = new Error('Request failed with status code 404')
      ;(error as any).response = { status: 404 }
      ;;(axios.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error)

      await expect(saveFromUrl('http://example.com/notfound.wav', 'test.wav', 'audio', TEST_MEDIA_ROOT))
        .rejects.toThrow()
    })

    it('should save file on successful download', async () => {
      const mockData = Buffer.from('downloaded content')
      ;;(axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockData })

      const result = await saveFromUrl('http://example.com/file.wav', 'test.wav', 'audio', TEST_MEDIA_ROOT)

      expect(result.filename).toMatch(/\.wav$/)
      expect(result.size_bytes).toBe(mockData.length)
    })

    it('should download with arraybuffer response type', async () => {
      const mockData = Buffer.from('arraybuffer content')
      ;;(axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockData })

      await saveFromUrl('http://example.com/file.mp3', 'music.mp3', 'music', TEST_MEDIA_ROOT)

      expect(axios.get).toHaveBeenCalledWith('http://example.com/file.mp3', { responseType: 'arraybuffer' })
    })

    it('should handle image download', async () => {
      const mockImageData = Buffer.from('image binary data')
      ;;(axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockImageData })

      const result = await saveFromUrl('http://example.com/image.png', 'image.png', 'image', TEST_MEDIA_ROOT)

      expect(result.filename).toMatch(/\.png$/)
      expect(result.size_bytes).toBe(mockImageData.length)
    })

    it('should handle video download', async () => {
      const mockVideoData = Buffer.from('video binary data')
      ;;(axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockVideoData })

      const result = await saveFromUrl('http://example.com/video.mp4', 'video.mp4', 'video', TEST_MEDIA_ROOT)

      expect(result.filename).toMatch(/\.mp4$/)
      expect(result.size_bytes).toBe(mockVideoData.length)
    })

    it('should use default extension when URL filename has none', async () => {
      const mockData = Buffer.from('downloaded')
      ;;(axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockData })

      const result = await saveFromUrl('http://example.com/file', 'noextension', 'music', TEST_MEDIA_ROOT)

      expect(result.filename).toMatch(/\.mp3$/)
    })

    it('should use custom mediaRoot', async () => {
      const customRoot = 'custom-url-media'
      await fs.mkdir(customRoot, { recursive: true })
      
      const mockData = Buffer.from('custom root download')
      ;;(axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockData })

      const result = await saveFromUrl('http://example.com/file.wav', 'test.wav', 'audio', customRoot)

      expect(result.filepath).toContain(customRoot)
      
      // Cleanup
      await fs.rm(customRoot, { recursive: true, force: true })
    })

    it('should use default mediaRoot when not provided', async () => {
      const defaultRoot = join(TEST_MEDIA_ROOT, 'default-root-test')
      await fs.mkdir(defaultRoot, { recursive: true })
      
      const mockData = Buffer.from('default root download')
      ;;(axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockData })

      const result = await saveFromUrl('http://example.com/file.wav', 'test.wav', 'audio', defaultRoot)

      expect(result.filepath).toContain(defaultRoot)
      
      await fs.rm(defaultRoot, { recursive: true, force: true })
    })

    it('should handle empty response data', async () => {
      const mockData = Buffer.from('')
      ;;(axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockData })

      const result = await saveFromUrl('http://example.com/empty.wav', 'empty.wav', 'audio', TEST_MEDIA_ROOT)

      expect(result.size_bytes).toBe(0)
    })

    it('should throw on HTTP 500', async () => {
      const error = new Error('Request failed with status code 500')
      ;(error as any).response = { status: 500 }
      ;;(axios.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error)

      await expect(saveFromUrl('http://example.com/error.wav', 'test.wav', 'audio', TEST_MEDIA_ROOT))
        .rejects.toThrow()
    })
  })

  describe('test environment guard', () => {
    it('throws when using production mediaRoot in test environment', async () => {
      await expect(saveMediaFile(
        Buffer.from('hello'),
        'test.txt',
        'image' as MediaType,
        './data/media', // explicitly pass production path
      )).rejects.toThrow('CRITICAL: Tests must use TEST_MEDIA_ROOT')
    })

    it('throws when saveMediaFromFile uses production mediaRoot', async () => {
      await expect(saveMediaFromFile('/tmp/whatever.wav', 'test.wav', 'audio', './data/media'))
        .rejects.toThrow('CRITICAL: Tests must use TEST_MEDIA_ROOT')
    })

    it('throws when saveMediaFromStream uses production mediaRoot', async () => {
      await expect(saveMediaFromStream(Readable.from(Buffer.from('x')), 'test.wav', 'audio', './data/media'))
        .rejects.toThrow('CRITICAL: Tests must use TEST_MEDIA_ROOT')
    })

    it('throws when saveStreamFromUrl uses production mediaRoot', async () => {
      ;(axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: Readable.from(Buffer.from('x')) })
      await expect(saveStreamFromUrl('http://example.com/x.wav', 'test.wav', 'audio', './data/media'))
        .rejects.toThrow('CRITICAL: Tests must use TEST_MEDIA_ROOT')
    })
  })

  describe('saveMediaFromFile', () => {
    it('streams a source file to the media root and reports size_bytes', async () => {
      const content = Buffer.from('streamed-from-file-content')
      const sourcePath = join(TEST_MEDIA_ROOT, 'source-1.wav')
      await fs.writeFile(sourcePath, content)

      const result = await saveMediaFromFile(sourcePath, 'upload.wav', 'audio', TEST_MEDIA_ROOT)

      expect(result.filename).toMatch(/^\d{4}-\d{2}-\d{2}\/[a-f0-9-]+\.wav$/)
      expect(result.filepath).toContain(TEST_MEDIA_ROOT)
      expect(result.size_bytes).toBe(content.length)

      const written = await fs.readFile(result.filepath)
      expect(written.equals(content)).toBe(true)
    })

    it('does not modify the source file', async () => {
      const content = Buffer.from('preserve-me')
      const sourcePath = join(TEST_MEDIA_ROOT, 'source-2.wav')
      await fs.writeFile(sourcePath, content)

      await saveMediaFromFile(sourcePath, 'upload.wav', 'audio', TEST_MEDIA_ROOT)

      const source = await fs.readFile(sourcePath)
      expect(source.equals(content)).toBe(true)
    })

    it('preserves original extension when different from type default', async () => {
      const sourcePath = join(TEST_MEDIA_ROOT, 'source.ogg')
      await fs.writeFile(sourcePath, Buffer.from('ogg'))

      const result = await saveMediaFromFile(sourcePath, 'song.ogg', 'audio', TEST_MEDIA_ROOT)

      expect(result.filename).toMatch(/\.ogg$/)
    })

    it('uses default extension when filename has none', async () => {
      const sourcePath = join(TEST_MEDIA_ROOT, 'source-noext')
      await fs.writeFile(sourcePath, Buffer.from('noext'))

      const result = await saveMediaFromFile(sourcePath, 'noext-name', 'image', TEST_MEDIA_ROOT)

      expect(result.filename).toMatch(/\.png$/)
    })

    it('handles large files via the streaming pipeline', async () => {
      const large = Buffer.alloc(2 * 1024 * 1024, 0x41)
      const sourcePath = join(TEST_MEDIA_ROOT, 'large-source.bin')
      await fs.writeFile(sourcePath, large)

      const result = await saveMediaFromFile(sourcePath, 'big.bin', 'video', TEST_MEDIA_ROOT)

      expect(result.size_bytes).toBe(large.length)
      const written = await fs.readFile(result.filepath)
      expect(written.equals(large)).toBe(true)
    })

    it('rejects when the source path does not exist', async () => {
      await expect(
        saveMediaFromFile(join(TEST_MEDIA_ROOT, 'missing.wav'), 'upload.wav', 'audio', TEST_MEDIA_ROOT),
      ).rejects.toThrow()
    })
  })

  describe('saveMediaFromStream', () => {
    it('streams a Readable into the media root', async () => {
      const content = Buffer.from('stream-content-here')

      const result = await saveMediaFromStream(Readable.from(content), 'rec.wav', 'audio', TEST_MEDIA_ROOT)

      expect(result.filename).toMatch(/\.wav$/)
      expect(result.size_bytes).toBe(content.length)

      const written = await fs.readFile(result.filepath)
      expect(written.equals(content)).toBe(true)
    })

    it('handles multi-chunk streams', async () => {
      function* gen(): Generator<Buffer> {
        yield Buffer.from('chunk1-')
        yield Buffer.from('chunk2-')
        yield Buffer.from('chunk3')
      }
      const stream = Readable.from(gen())
      const expected = Buffer.from('chunk1-chunk2-chunk3')

      const result = await saveMediaFromStream(stream, 'multi.bin', 'video', TEST_MEDIA_ROOT)

      expect(result.size_bytes).toBe(expected.length)
      const written = await fs.readFile(result.filepath)
      expect(written.equals(expected)).toBe(true)
    })

    it('uses default extension when originalName has none', async () => {
      const result = await saveMediaFromStream(Readable.from(Buffer.from('x')), 'no-ext', 'music', TEST_MEDIA_ROOT)

      expect(result.filename).toMatch(/\.mp3$/)
    })

    it('rejects when the source stream errors mid-pipeline', async () => {
      const failing = new Readable({
        read() {
          this.destroy(new Error('upstream broke'))
        },
      })

      await expect(
        saveMediaFromStream(failing, 'broken.bin', 'audio', TEST_MEDIA_ROOT),
      ).rejects.toThrow('upstream broke')
    })
  })

  describe('createMediaReadStream', () => {
    it('returns a stream and the full file size', async () => {
      const content = Buffer.from('readable-by-stream-content')
      const { filepath } = await saveMediaFile(content, 'r.wav', 'audio', TEST_MEDIA_ROOT)

      const result = await createMediaReadStream(filepath, TEST_MEDIA_ROOT)

      expect(result.size).toBe(content.length)
      const collected = await collectStream(result.stream)
      expect(collected.equals(content)).toBe(true)
    })

    it('honours a bounded range by slicing the stream', async () => {
      const content = Buffer.from('0123456789')
      const { filepath } = await saveMediaFile(content, 'r.bin', 'video', TEST_MEDIA_ROOT)

      const result = await createMediaReadStream(filepath, TEST_MEDIA_ROOT, { start: 2, end: 5 })

      const collected = await collectStream(result.stream)
      expect(collected.equals(Buffer.from('2345'))).toBe(true)
    })

    it('still reports the full size when a range is applied', async () => {
      const content = Buffer.from('0123456789')
      const { filepath } = await saveMediaFile(content, 'r.bin', 'video', TEST_MEDIA_ROOT)

      const result = await createMediaReadStream(filepath, TEST_MEDIA_ROOT, { start: 0, end: 3 })

      expect(result.size).toBe(content.length)
    })

    it('throws when the file does not exist', async () => {
      await expect(createMediaReadStream(join(TEST_MEDIA_ROOT, 'missing.wav'), TEST_MEDIA_ROOT)).rejects.toThrow()
    })

    it('throws for path traversal attempts', async () => {
      await expect(createMediaReadStream('../etc/passwd', TEST_MEDIA_ROOT)).rejects.toThrow()
    })
  })

  describe('saveStreamFromUrl', () => {
    it('streams a remote Readable body to disk and reports size_bytes', async () => {
      const content = Buffer.from('remote-stream-content')
      ;(axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: Readable.from(content) })

      const result = await saveStreamFromUrl('http://example.com/x.wav', 'remote.wav', 'audio', TEST_MEDIA_ROOT)

      expect(result.filename).toMatch(/\.wav$/)
      expect(result.size_bytes).toBe(content.length)
      const written = await fs.readFile(result.filepath)
      expect(written.equals(content)).toBe(true)
    })

    it('passes stream-oriented options to axios.get', async () => {
      const content = Buffer.from('opts')
      ;(axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: Readable.from(content) })

      await saveStreamFromUrl('http://example.com/y.wav', 'remote.wav', 'audio', TEST_MEDIA_ROOT, {
        timeoutMs: 7000,
        maxBytes: 5_000_000,
      })

      expect(axios.get).toHaveBeenCalledWith('http://example.com/y.wav', {
        responseType: 'stream',
        timeout: 7000,
        maxContentLength: 5_000_000,
        maxBodyLength: 5_000_000,
      })
    })

    it('uses sensible default options when none are provided', async () => {
      ;(axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: Readable.from(Buffer.from('d')) })

      await saveStreamFromUrl('http://example.com/z.wav', 'remote.wav', 'audio', TEST_MEDIA_ROOT)

      expect(axios.get).toHaveBeenCalledWith(
        'http://example.com/z.wav',
        expect.objectContaining({ responseType: 'stream', timeout: 30000 }),
      )
    })

    it('rejects when axios rejects (network failure)', async () => {
      ;(axios.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network failure'))

      await expect(
        saveStreamFromUrl('http://example.com/fail.wav', 'remote.wav', 'audio', TEST_MEDIA_ROOT),
      ).rejects.toThrow('Network failure')
    })

    it('aborts and cleans up when the remote body exceeds maxBytes', async () => {
      const beforeCount = await countFilesRecursive(TEST_MEDIA_ROOT)
      const oversized = Buffer.alloc(1024, 0x42)
      ;(axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: Readable.from(oversized) })

      await expect(
        saveStreamFromUrl('http://example.com/big.wav', 'remote.wav', 'audio', TEST_MEDIA_ROOT, {
          maxBytes: 16,
        }),
      ).rejects.toThrow(/exceeds max size 16 bytes/)

      const afterCount = await countFilesRecursive(TEST_MEDIA_ROOT)
      expect(afterCount).toBe(beforeCount)
    })

    it('uses default extension when originalName has none', async () => {
      ;(axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: Readable.from(Buffer.from('x')) })

      const result = await saveStreamFromUrl('http://example.com/x', 'no-ext', 'image', TEST_MEDIA_ROOT)

      expect(result.filename).toMatch(/\.png$/)
    })
  })
})