export type LyricsMode = 'write_full_song' | 'edit'

export interface LyricsGenerationRequest {
  mode?: LyricsMode
  prompt?: string       // max 2000 chars, for write_full_song
  lyrics?: string       // required for edit mode
  title?: string        // optional
}

export interface LyricsGenerationResponse {
  song_title: string
  style_tags: string | string[]
  lyrics: string
  base_resp: {
    status_code: number
    status_msg: string
  }
}

// Lyrics section structure for parsing
export interface LyricsSection {
  type: 'verse' | 'chorus' | 'bridge' | 'outro' | 'hook' | 'intro' | 'custom'
  number?: number       // Verse 1, Verse 2
  content: string
  startIndex: number    // position in full lyrics
  rawTag?: string       // original tag text for custom types, e.g., "Pre-Chorus"
}

// Task state for generation progress
export type LyricsTaskStatus = 'idle' | 'generating' | 'completed' | 'failed'

export interface LyricsTask {
  id: string
  status: LyricsTaskStatus
  result?: LyricsGenerationResponse
  error?: string
  request?: LyricsGenerationRequest
  createdAt: string
  mediaId?: string
  mediaTitle?: string
  isFavorite?: boolean
  isPublic?: boolean
}