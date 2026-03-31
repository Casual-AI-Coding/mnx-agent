import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import { join } from 'path'
import { saveMediaFile, deleteMediaFile, readMediaFile } from '../media-storage'

const TEST_MEDIA_ROOT = 'test-media-storage'

describe('media-storage', () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_MEDIA_ROOT, { recursive: true })
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
  })

  describe('readMediaFile', () => {
    it('should read saved file', async () => {
      const buffer = Buffer.from('test content for reading')
      const { filepath } = await saveMediaFile(buffer, 'test.wav', 'audio', TEST_MEDIA_ROOT)
      
      const readBuffer = await readMediaFile(filepath)
      expect(readBuffer.toString()).toBe('test content for reading')
    })

    it('should throw for non-existent file', async () => {
      await expect(readMediaFile('/nonexistent/file.wav')).rejects.toThrow()
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
})