import { createMedia } from '@/lib/api/media'
import { mergeResourceUsageMetadata, type ResourceReference } from '@/lib/resource-references'
import type { LyricsGenerationResponse, LyricsMode } from '@/types/lyrics'

interface SaveLyricsParams {
  readonly mode: LyricsMode
  readonly references: readonly ResourceReference[]
  readonly result: LyricsGenerationResponse
  readonly taskTitle?: string
  readonly index?: number
}

export async function saveLyricsToMedia({
  mode,
  references,
  result,
  taskTitle,
  index,
}: SaveLyricsParams): Promise<{ id: string; title: string } | null> {
  try {
    const songTitle = result.song_title || taskTitle || 'Unnamed'
    const styleTags = Array.isArray(result.style_tags)
      ? result.style_tags
      : (result.style_tags ? result.style_tags.split(',').map(s => s.trim()) : [])
    const mediaResult = await createMedia({
      filename: buildLyricsFilename(songTitle, index),
      filepath: `lyrics://virtual/${Date.now()}`,
      type: 'lyrics',
      source: 'lyrics_generation',
      size_bytes: new TextEncoder().encode(result.lyrics).length,
      metadata: mergeResourceUsageMetadata({
        title: songTitle,
        style_tags: styleTags,
        lyrics: result.lyrics,
        mode,
        generated_at: new Date().toISOString(),
      }, references),
    })

    if (!mediaResult.success || !mediaResult.data) return null
    return {
      id: mediaResult.data.id,
      title: mediaResult.data.original_name || mediaResult.data.filename,
    }
  } catch (error) {
    console.error('Failed to save lyrics:', error)
    return null
  }
}

function buildLyricsFilename(songTitle: string, index?: number): string {
  if (!songTitle.trim()) return `lyrics_${Date.now()}.txt`
  const sanitizedTitle = songTitle.trim().replace(/[^\w\u4e00-\u9fa5-]/g, '_')
  return index === undefined ? `${sanitizedTitle}.txt` : `${sanitizedTitle} (${index + 1}).txt`
}
