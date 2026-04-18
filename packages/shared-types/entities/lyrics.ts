import { z } from 'zod'

/**
 * Lyrics generation mode
 */
export type LyricsMode = 'write_full_song' | 'edit'

/**
 * Lyrics generation request body
 */
export interface LyricsGenerateBody {
  /** Generation mode: 'write_full_song' creates new lyrics, 'edit' modifies existing lyrics */
  mode?: LyricsMode
  /** Prompt for lyrics generation (max 2000 chars), used in write_full_song mode */
  prompt?: string
  /** Existing lyrics to edit, required for edit mode */
  lyrics?: string
  /** Optional title for the song */
  title?: string
}

/**
 * Lyrics generation response from MiniMax API
 */
export interface LyricsGenerationResponse {
  /** Generated song title */
  song_title?: string
  /** Style tags associated with the lyrics */
  style_tags?: string[]
  /** Generated lyrics text */
  lyrics?: string
  /** Audio duration in seconds (if audio generated) */
  audio_duration?: number
  /** Base response status */
  base_resp: {
    status_code: number
    status_msg: string
  }
}

/**
 * Zod schema for lyrics generation request validation
 */
export const lyricsGenerateSchema = z.object({
  mode: z.enum(['write_full_song', 'edit']).optional().default('write_full_song'),
  prompt: z.string().max(2000, 'prompt must be less than 2000 characters').optional(),
  lyrics: z.string().optional(),
  title: z.string().optional(),
}).refine(
  (data) => {
    // Edit mode requires lyrics
    if (data.mode === 'edit' && !data.lyrics) {
      return false
    }
    // Write_full_song mode requires prompt
    if (data.mode === 'write_full_song' && !data.prompt) {
      return false
    }
    return true
  },
  {
    message: 'lyrics is required for edit mode, prompt is required for write_full_song mode',
  }
)

/**
 * Type inferred from Zod schema
 */
export type LyricsGenerateInput = z.infer<typeof lyricsGenerateSchema>