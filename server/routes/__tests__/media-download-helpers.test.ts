import { describe, expect, it } from 'vitest'
import { buildMediaDownloadPlan } from '../media/media-download-helpers'

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
