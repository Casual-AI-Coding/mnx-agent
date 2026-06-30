import { describe, expect, it } from 'vitest'
import { saveExternalProxyImages } from '../external-proxy/external-proxy-media-save-helpers.js'

const jpegBase64 = Buffer.from([0xFF, 0xD8, 0xFF, 0x00]).toString('base64')
const pngBase64 = Buffer.from([0x89, 0x50, 0x4E, 0x47]).toString('base64')

describe('external proxy media save helpers', () => {
  it('saves all image payloads with deterministic filenames and returns first media id', async () => {
    const savedFilenames: string[] = []
    const createdOriginalNames: string[] = []

    const result = await saveExternalProxyImages({
      logId: 99,
      images: [{ base64: jpegBase64 }, { base64: pngBase64 }],
      mediaType: 'image',
      isUrlAllowed: () => true,
      fetchImage: async () => new ArrayBuffer(0),
      saveFile: async (buffer, filename) => {
        savedFilenames.push(filename)
        return { filename: `stored-${filename}`, filepath: `/tmp/${filename}`, size_bytes: buffer.length }
      },
      createMediaRecord: async (record) => {
        createdOriginalNames.push(record.original_name)
        return { id: `media-${createdOriginalNames.length}` }
      },
    })

    expect(result).toBe('media-1')
    expect(savedFilenames).toEqual(['openai-image-99-1.jpeg', 'openai-image-99-2.png'])
    expect(createdOriginalNames).toEqual(['openai-image-99-1.jpeg', 'openai-image-99-2.png'])
  })

  it('skips failed saves and returns the first successful media id', async () => {
    const savedFilenames: string[] = []

    const result = await saveExternalProxyImages({
      logId: 7,
      images: [{ base64: jpegBase64 }, { base64: pngBase64 }],
      mediaType: 'image',
      isUrlAllowed: () => true,
      fetchImage: async () => new ArrayBuffer(0),
      saveFile: async (buffer, filename) => {
        savedFilenames.push(filename)
        if (filename.endsWith('-1.jpeg')) {
          throw new Error('disk full')
        }
        return { filename: `stored-${filename}`, filepath: `/tmp/${filename}`, size_bytes: buffer.length }
      },
      createMediaRecord: async () => ({ id: 'media-success' }),
    })

    expect(result).toBe('media-success')
    expect(savedFilenames).toEqual(['openai-image-7-1.jpeg', 'openai-image-7-2.png'])
  })

  it('does not fetch untrusted image urls and continues with trusted payloads', async () => {
    const fetchedUrls: string[] = []
    const savedFilenames: string[] = []

    const result = await saveExternalProxyImages({
      logId: 5,
      images: [{ url: 'https://evil.com/image.png' }, { base64: pngBase64 }],
      mediaType: 'image',
      isUrlAllowed: url => url.includes('trusted.example'),
      fetchImage: async (url) => {
        fetchedUrls.push(url)
        return new ArrayBuffer(0)
      },
      saveFile: async (buffer, filename) => {
        savedFilenames.push(filename)
        return { filename: `stored-${filename}`, filepath: `/tmp/${filename}`, size_bytes: buffer.length }
      },
      createMediaRecord: async () => ({ id: 'media-safe' }),
    })

    expect(result).toBe('media-safe')
    expect(fetchedUrls).toEqual([])
    expect(savedFilenames).toEqual(['openai-image-5-2.png'])
  })
})
