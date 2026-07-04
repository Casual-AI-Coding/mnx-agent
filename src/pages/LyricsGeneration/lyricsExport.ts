import type { LyricsGenerationResponse } from '@/types/lyrics'

export function downloadLyricsFile(result: LyricsGenerationResponse) {
  const blob = new Blob([result.lyrics], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${result.song_title || 'lyrics'}.txt`
  anchor.click()
  URL.revokeObjectURL(url)
}
