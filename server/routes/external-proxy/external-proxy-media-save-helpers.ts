import type { ExternalProxyMediaType } from './external-proxy-media-helpers.js'
import type { ExtractedImagePayload } from './external-proxy-response-helpers.js'

export interface SavedExternalProxyFile {
  readonly filename: string
  readonly filepath: string
  readonly size_bytes: number
}

export interface ExternalProxyMediaRecordInput {
  readonly filename: string
  readonly original_name: string
  readonly filepath: string
  readonly type: ExternalProxyMediaType
  readonly mime_type: string
  readonly size_bytes: number
  readonly source: 'external_debug'
}

export interface ExternalProxyMediaRecordResult {
  readonly id: string
}

export interface ExternalProxyImageSaveInput {
  readonly logId: number
  readonly images: readonly ExtractedImagePayload[]
  readonly mediaType: ExternalProxyMediaType
  readonly userId?: string
  readonly isUrlAllowed: (url: string) => boolean
  readonly fetchImage: (url: string) => Promise<ArrayBuffer>
  readonly saveFile: (
    buffer: Buffer,
    filename: string,
    mediaType: ExternalProxyMediaType
  ) => Promise<SavedExternalProxyFile>
  readonly createMediaRecord: (
    record: ExternalProxyMediaRecordInput,
    userId?: string
  ) => Promise<ExternalProxyMediaRecordResult>
  readonly onRejectedUrl?: (event: { readonly index: number; readonly url: string }) => void
  readonly onFetchError?: (event: { readonly index: number; readonly url: string; readonly error: unknown }) => void
  readonly onSaveError?: (event: { readonly index: number; readonly error: unknown }) => void
}

export function detectImageExtension(buffer: Buffer): string {
  if (buffer.length >= 4) {
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return 'png'
    }

    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return 'jpeg'
    }

    if (
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer.length >= 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
    ) {
      return 'webp'
    }
  }

  return 'png'
}

async function resolveImageBuffer(
  imageInfo: ExtractedImagePayload,
  index: number,
  input: ExternalProxyImageSaveInput
): Promise<Buffer | null> {
  if (imageInfo.url) {
    if (!input.isUrlAllowed(imageInfo.url)) {
      input.onRejectedUrl?.({ index, url: imageInfo.url })
      return null
    }

    try {
      const arrayBuffer = await input.fetchImage(imageInfo.url)
      return Buffer.from(new Uint8Array(arrayBuffer))
    } catch (error) {
      input.onFetchError?.({ index, url: imageInfo.url, error })
      return null
    }
  }

  if (imageInfo.base64) {
    return Buffer.from(imageInfo.base64, 'base64')
  }

  return null
}

function buildImageFilename(logId: number, imageCount: number, index: number, extension: string): string {
  if (imageCount > 1) {
    return `openai-image-${logId}-${index + 1}.${extension}`
  }

  return `openai-image-${logId}.${extension}`
}

export async function saveExternalProxyImages(input: ExternalProxyImageSaveInput): Promise<string | null> {
  let firstMediaId: string | null = null

  for (const [index, imageInfo] of input.images.entries()) {
    const imageBuffer = await resolveImageBuffer(imageInfo, index, input)
    if (!imageBuffer) {
      continue
    }

    try {
      const extension = detectImageExtension(imageBuffer)
      const originalName = buildImageFilename(input.logId, input.images.length, index, extension)
      const savedFile = await input.saveFile(imageBuffer, originalName, input.mediaType)
      const mediaRecord = await input.createMediaRecord(
        {
          filename: savedFile.filename,
          original_name: originalName,
          filepath: savedFile.filepath,
          type: input.mediaType,
          mime_type: `image/${extension}`,
          size_bytes: savedFile.size_bytes,
          source: 'external_debug',
        },
        input.userId
      )

      if (firstMediaId === null) {
        firstMediaId = mediaRecord.id
      }
    } catch (error) {
      input.onSaveError?.({ index, error })
    }
  }

  return firstMediaId
}
