import { describe, expect, it } from 'vitest'
import { buildMediaDownloadPlan, buildStreamingDownloadPlan } from '../media/media-download-helpers'

describe('media-download-helpers', () => {
  it('builds a full download plan when range header is absent', () => {
    const file = Buffer.from('abcdef')

    const plan = buildMediaDownloadPlan({
      file,
      filename: 'stored.bin',
      originalName: '原始.bin',
      mimeType: 'application/test',
    })

    expect(plan).toEqual({
      statusCode: 200,
      body: file,
      headers: {
        'Content-Type': 'application/test',
        'Content-Disposition': 'inline; filename="原始.bin"',
        'Accept-Ranges': 'bytes',
        'Content-Length': 6,
      },
    })
  })

  it('builds a partial download plan for bounded byte ranges', () => {
    const file = Buffer.from('abcdef')

    const plan = buildMediaDownloadPlan({
      file,
      filename: 'stored.bin',
      originalName: null,
      mimeType: null,
      rangeHeader: 'bytes=1-3',
    })

    expect(plan).toEqual({
      statusCode: 206,
      body: Buffer.from('bcd'),
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'inline; filename="stored.bin"',
        'Accept-Ranges': 'bytes',
        'Content-Range': 'bytes 1-3/6',
        'Content-Length': 3,
      },
    })
  })

  it('uses file end when range omits the end byte', () => {
    const file = Buffer.from('abcdef')

    const plan = buildMediaDownloadPlan({
      file,
      filename: 'stored.bin',
      originalName: undefined,
      mimeType: undefined,
      rangeHeader: 'bytes=4-',
    })

    expect(plan.statusCode).toBe(206)
    expect(plan.body).toEqual(Buffer.from('ef'))
    expect(plan.headers['Content-Range']).toBe('bytes 4-5/6')
    expect(plan.headers['Content-Length']).toBe(2)
  })
})

describe('buildStreamingDownloadPlan', () => {
  it('builds a full streaming plan with null range when range header is absent', () => {
    const plan = buildStreamingDownloadPlan({
      fileSize: 1024,
      filename: 'stored.bin',
      originalName: '展示视频.mp4',
      mimeType: 'video/mp4',
    })

    expect(plan.statusCode).toBe(200)
    expect(plan.range).toBeNull()
    expect(plan.headers).toEqual({
      'Content-Type': 'video/mp4',
      'Content-Disposition': 'inline; filename="展示视频.mp4"',
      'Accept-Ranges': 'bytes',
      'Content-Length': 1024,
    })
  })

  it('does not attach a body (caller must pipe the stream)', () => {
    const plan = buildStreamingDownloadPlan({
      fileSize: 64,
      filename: 'stored.bin',
    })

    expect(plan).not.toHaveProperty('body')
  })

  it('builds a partial streaming plan for bounded byte ranges', () => {
    const plan = buildStreamingDownloadPlan({
      fileSize: 1024,
      filename: 'stored.bin',
      originalName: null,
      mimeType: null,
      rangeHeader: 'bytes=100-199',
    })

    expect(plan.statusCode).toBe(206)
    expect(plan.range).toEqual({ start: 100, end: 199, length: 100 })
    expect(plan.headers['Content-Range']).toBe('bytes 100-199/1024')
    expect(plan.headers['Content-Length']).toBe(100)
    expect(plan.headers['Content-Type']).toBe('application/octet-stream')
    expect(plan.headers['Accept-Ranges']).toBe('bytes')
  })

  it('clamps the range end when it exceeds fileSize - 1', () => {
    const plan = buildStreamingDownloadPlan({
      fileSize: 100,
      filename: 'stored.bin',
      rangeHeader: 'bytes=50-9999',
    })

    expect(plan.statusCode).toBe(206)
    expect(plan.range).toEqual({ start: 50, end: 99, length: 50 })
    expect(plan.headers['Content-Range']).toBe('bytes 50-99/100')
    expect(plan.headers['Content-Length']).toBe(50)
  })

  it('uses file end when range omits the end byte', () => {
    const plan = buildStreamingDownloadPlan({
      fileSize: 1024,
      filename: 'stored.bin',
      rangeHeader: 'bytes=512-',
    })

    expect(plan.statusCode).toBe(206)
    expect(plan.range).toEqual({ start: 512, end: 1023, length: 512 })
    expect(plan.headers['Content-Range']).toBe('bytes 512-1023/1024')
  })

  it('falls back to a 200 plan when the range header is malformed', () => {
    const plan = buildStreamingDownloadPlan({
      fileSize: 1024,
      filename: 'stored.bin',
      rangeHeader: 'bytes=not-a-number',
    })

    expect(plan.statusCode).toBe(200)
    expect(plan.range).toBeNull()
    expect(plan.headers['Content-Length']).toBe(1024)
    expect(plan.headers['Content-Range']).toBeUndefined()
  })

  it('falls back to a 200 plan when the range starts beyond fileSize', () => {
    const plan = buildStreamingDownloadPlan({
      fileSize: 100,
      filename: 'stored.bin',
      rangeHeader: 'bytes=200-300',
    })

    expect(plan.statusCode).toBe(200)
    expect(plan.range).toBeNull()
  })

  it('falls back to a 200 plan for a reversed range (end < start)', () => {
    const plan = buildStreamingDownloadPlan({
      fileSize: 100,
      filename: 'stored.bin',
      rangeHeader: 'bytes=80-10',
    })

    expect(plan.statusCode).toBe(200)
    expect(plan.range).toBeNull()
  })

  it('prefers originalName over filename in Content-Disposition', () => {
    const plan = buildStreamingDownloadPlan({
      fileSize: 16,
      filename: '2026-01-01/uuid.bin',
      originalName: '用户上传.zip',
      mimeType: 'application/zip',
    })

    expect(plan.headers['Content-Disposition']).toBe('inline; filename="用户上传.zip"')
  })

  it('uses filename when originalName is absent', () => {
    const plan = buildStreamingDownloadPlan({
      fileSize: 16,
      filename: 'stored.bin',
    })

    expect(plan.headers['Content-Disposition']).toBe('inline; filename="stored.bin"')
  })

  it('uses application/octet-stream when mimeType is null', () => {
    const plan = buildStreamingDownloadPlan({
      fileSize: 16,
      filename: 'stored.bin',
      mimeType: null,
    })

    expect(plan.headers['Content-Type']).toBe('application/octet-stream')
  })
})

