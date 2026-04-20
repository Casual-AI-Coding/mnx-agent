import type { LyricsSection } from '@/types/lyrics'

// Match any [xxxx] or [xxxx N] pattern for lyrics structure tags
// Examples: [Intro], [Verse 1], [Pre-Chorus], [Outro], [Hook 2], [CustomTag]
const SECTION_PATTERN = /\[([^\]]+)(?:\s+(\d+))?\]/gi

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const VALID_SECTION_TYPES = ['verse', 'chorus', 'bridge', 'outro', 'hook', 'intro']

/**
 * Parse lyrics text into structured sections
 * Example: "[Verse 1]\nHello world\n[Chorus]\nSing it loud"
 */
export function parseLyricsSections(lyrics: string): LyricsSection[] {
  const sections: LyricsSection[] = []

  const matches = lyrics.matchAll(SECTION_PATTERN)
  const matchArray = Array.from(matches)

  for (let i = 0; i < matchArray.length; i++) {
    const match = matchArray[i]
    const tagName = match[1].trim()
    const typeLower = tagName.toLowerCase()
    const number = match[2] ? parseInt(match[2], 10) : undefined
    const startIndex = match.index

    const type = (VALID_SECTION_TYPES.includes(typeLower) ? typeLower : 'custom') as LyricsSection['type']

    // Get content between this tag and next tag (or end)
    const contentStart = startIndex + match[0].length
    let contentEnd = lyrics.length

    // Find next tag position
    if (i + 1 < matchArray.length) {
      contentEnd = matchArray[i + 1].index
    }

    const content = lyrics.slice(contentStart, contentEnd).trim()

    if (content) {
      sections.push({
        type,
        number,
        content,
        startIndex,
        ...(type === 'custom' && { rawTag: tagName }),
      })
    }
  }

  return sections
}

/**
 * Extract lyrics snippet for preview (first section + chorus/hook)
 */
export function extractLyricsSnippet(lyrics: string, maxLines: number = 12): string {
  const sections = parseLyricsSections(lyrics)
  
  if (sections.length === 0) {
    // No structure tags, just return first N lines
    return lyrics.split('\n').slice(0, maxLines).join('\n')
  }

  // Get first section (Verse/Intro)
  const firstSection = sections[0]
  
  // Find first chorus/hook
  const chorusOrHook = sections.find(s => s.type === 'chorus' || s.type === 'hook')
  
  let snippet = firstSection.content
  if (chorusOrHook) {
    snippet += '\n\n' + chorusOrHook.content
  }

  // Limit to maxLines
  const lines = snippet.split('\n').slice(0, maxLines)
  return lines.join('\n')
}

/**
 * Highlight section tags in lyrics text
 * Returns HTML-ready string with highlighted tags (XSS-safe)
 */
export function highlightSectionTags(lyrics: string): string {
  // Escape HTML entities first to prevent XSS
  const escaped = escapeHtml(lyrics)
  // Then wrap section tags with styled spans
  return escaped.replace(SECTION_PATTERN, '<span class="lyrics-section-tag">$&</span>')
}

/**
 * Get display name for section type
 */
export function getSectionDisplayName(section: LyricsSection): string {
  const typeNames: Record<string, string> = {
    verse: 'Verse',
    chorus: 'Chorus',
    bridge: 'Bridge',
    outro: 'Outro',
    hook: 'Hook',
    intro: 'Intro',
  }
  
  const baseName = typeNames[section.type] || section.rawTag || section.type
  return section.number ? `${baseName} ${section.number}` : baseName
}