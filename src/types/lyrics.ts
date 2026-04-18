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
  type: 'verse' | 'chorus' | 'bridge' | 'outro' | 'hook' | 'intro'
  number?: number       // Verse 1, Verse 2
  content: string
  startIndex: number    // position in full lyrics
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
}