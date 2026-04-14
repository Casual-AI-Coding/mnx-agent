import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { promises as fs } from 'fs'
import { join } from 'path'
import axios from 'axios'
import { saveMediaFile, deleteMediaFile, readMediaFile, getMediaFilePath, saveFromUrl } from '../media-storage'

const TEST_MEDIA_ROOT = 'test-media-storage'

vi.mock('axios')

describe('media-storage', () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_MEDIA_ROOT, { recursive: true })
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await fs.rm(TEST_MEDIA_ROOT, { recursive: true, force: true })
  })

  describe('saveMediaFile', () => {
    it('should save file with date-based path', async () => {
      const buffer = Buffer.from('test audio content')
      const result = await saveMediaFile(buffer, 'test.wav', 'audio', TEST_MEDIA_ROOT)

      expect(result.filename).toMatch(/^\d{4}-\d{2}-\d{2}\/[a-f0-9-]+\.wav$/)
      expect(result.filepath).toContain(TEST_MEDIA_ROOT)
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

    it('should use default extension when none provided', async () => {
      const buffer = Buffer.from('test content')
      const result = await saveMediaFile(buffer, 'noextension', 'image', TEST_MEDIA_ROOT)

      expect(result.filename).toMatch(/\.png$/)
    })

    it('should handle empty buffer', async () => {
      const buffer = Buffer.from('')
      const result = await saveMediaFile(buffer, 'empty.bin', 'video', TEST_MEDIA_ROOT)

      expect(result.size_bytes).toBe(0)
    })
  })

  describe('readMediaFile', () => {
    it('should read saved file', async () => {
      const buffer = Buffer.from('test content for reading')
      const { filepath } = await saveMediaFile(buffer, 'test.wav', 'audio', TEST_MEDIA_ROOT)

      const readBuffer = await readMediaFile(filepath, TEST_MEDIA_ROOT)
      expect(readBuffer.toString()).toBe('test content for reading')
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
  })

  describe('deleteMediaFile', () => {
    it('should delete existing file', async () => {
      const buffer = Buffer.from('to be deleted')
      const { filepath } = await saveMediaFile(buffer, 'delete.wav', 'audio', TEST_MEDIA_ROOT)

      await deleteMediaFile(filepath)

      await expect(fs.access(filepath)).rejects.toThrow()
    })

    it('should not throw for non-existent file', async () => {
      await expect(deleteMediaFile('/nonexistent/file.wav')).resolves.not.toThrow()
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
  })
})