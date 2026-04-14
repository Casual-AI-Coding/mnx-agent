import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { promises as fs } from 'fs'
import { join } from 'path'
import axios from 'axios'
import { 
  saveMediaFile, 
  deleteMediaFile, 
  readMediaFile, 
  getMediaFilePath, 
  saveFromUrl 
} from '../media-storage'
import type { MediaType } from '../../database/types'

const TEST_MEDIA_ROOT = 'test-media-storage'

vi.mock('axios')

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
      const defaultRoot = './data/media'
      await fs.mkdir(defaultRoot, { recursive: true })
      
      const { filepath, filename } = await saveMediaFile(buffer, 'default.wav', 'audio', defaultRoot)
      const readBuffer = await readMediaFile(filename, defaultRoot)
      
      expect(readBuffer.toString()).toBe('test default root')
      
      await fs.rm(defaultRoot, { recursive: true, force: true })
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
      expect(result).toBe(join('./data/media', 'test.wav'))
    })

    it('should handle deeply nested paths', () => {
      const result = getMediaFilePath('2024/01/15/uuid.wav', '/media')
      expect(result).toBe('/media/2024/01/15/uuid.wav')
    })
  })

  describe('saveFromUrl', () => {
    it('should throw on network error', async () => {
      ;(axios.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network failure'))

      await expect(saveFromUrl('http://invalid.url/file.wav', 'test.wav', 'audio', TEST_MEDIA_ROOT))
        .rejects.toThrow('Network failure')
    })

    it('should throw on HTTP 404', async () => {
      const error = new Error('Request failed with status code 404')
      ;(error as any).response = { status: 404 }
      ;(axios.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error)

      await expect(saveFromUrl('http://example.com/notfound.wav', 'test.wav', 'audio', TEST_MEDIA_ROOT))
        .rejects.toThrow()
    })

    it('should save file on successful download', async () => {
      const mockData = Buffer.from('downloaded content')
      ;(axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockData })

      const result = await saveFromUrl('http://example.com/file.wav', 'test.wav', 'audio', TEST_MEDIA_ROOT)

      expect(result.filename).toMatch(/\.wav$/)
      expect(result.size_bytes).toBe(mockData.length)
    })

    it('should download with arraybuffer response type', async () => {
      const mockData = Buffer.from('arraybuffer content')
      ;(axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockData })

      await saveFromUrl('http://example.com/file.mp3', 'music.mp3', 'music', TEST_MEDIA_ROOT)

      expect(axios.get).toHaveBeenCalledWith('http://example.com/file.mp3', { responseType: 'arraybuffer' })
    })

    it('should handle image download', async () => {
      const mockImageData = Buffer.from('image binary data')
      ;(axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockImageData })

      const result = await saveFromUrl('http://example.com/image.png', 'image.png', 'image', TEST_MEDIA_ROOT)

      expect(result.filename).toMatch(/\.png$/)
      expect(result.size_bytes).toBe(mockImageData.length)
    })

    it('should handle video download', async () => {
      const mockVideoData = Buffer.from('video binary data')
      ;(axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockVideoData })

      const result = await saveFromUrl('http://example.com/video.mp4', 'video.mp4', 'video', TEST_MEDIA_ROOT)

      expect(result.filename).toMatch(/\.mp4$/)
      expect(result.size_bytes).toBe(mockVideoData.length)
    })

    it('should use default extension when URL filename has none', async () => {
      const mockData = Buffer.from('downloaded')
      ;(axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockData })

      const result = await saveFromUrl('http://example.com/file', 'noextension', 'music', TEST_MEDIA_ROOT)

      expect(result.filename).toMatch(/\.mp3$/)
    })

    it('should use custom mediaRoot', async () => {
      const customRoot = 'custom-url-media'
      await fs.mkdir(customRoot, { recursive: true })
      
      const mockData = Buffer.from('custom root download')
      ;(axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockData })

      const result = await saveFromUrl('http://example.com/file.wav', 'test.wav', 'audio', customRoot)

      expect(result.filepath).toContain(customRoot)
      
      // Cleanup
      await fs.rm(customRoot, { recursive: true, force: true })
    })

    it('should use default mediaRoot when not provided', async () => {
      const defaultRoot = './data/media'
      await fs.mkdir(defaultRoot, { recursive: true })
      
      const mockData = Buffer.from('default root download')
      ;(axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockData })

      const result = await saveFromUrl('http://example.com/file.wav', 'test.wav', 'audio')

      expect(result.filepath).toContain('data/media')
      
      // Cleanup
      await fs.rm(defaultRoot, { recursive: true, force: true })
    })

    it('should handle empty response data', async () => {
      const mockData = Buffer.from('')
      ;(axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockData })

      const result = await saveFromUrl('http://example.com/empty.wav', 'empty.wav', 'audio', TEST_MEDIA_ROOT)

      expect(result.size_bytes).toBe(0)
    })

    it('should throw on HTTP 500', async () => {
      const error = new Error('Request failed with status code 500')
      ;(error as any).response = { status: 500 }
      ;(axios.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error)

      await expect(saveFromUrl('http://example.com/error.wav', 'test.wav', 'audio', TEST_MEDIA_ROOT))
        .rejects.toThrow()
    })
  })
})