import type { LyricsSection } from '@/types/lyrics'

const SECTION_PATTERN = /\[(Verse|Chorus|Bridge|Outro|Hook|Intro)(?:\s+(\d+))?\]/gi

/**
 * Parse lyrics text into structured sections
 * Example: "[Verse 1]\nHello world\n[Chorus]\nSing it loud"
 */
export function parseLyricsSections(lyrics: string): LyricsSection[] {
  const sections: LyricsSection[] = []

  // Reset regex
  SECTION_PATTERN.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = SECTION_PATTERN.exec(lyrics)) !== null) {
    const type = match[1].toLowerCase() as LyricsSection['type']
    const number = match[2] ? parseInt(match[2], 10) : undefined
    const startIndex = match.index

    // Get content between this tag and next tag (or end)
    const contentStart = startIndex + match[0].length
    let contentEnd = lyrics.length

    // Find next tag position
    const nextMatch = SECTION_PATTERN.exec(lyrics)
    if (nextMatch) {
      contentEnd = nextMatch.index
      // Reset regex position for next iteration
      SECTION_PATTERN.lastIndex = match.index + match[0].length
    }

    const content = lyrics.slice(contentStart, contentEnd).trim()

    if (content) {
      sections.push({
        type,
        number,
        content,
        startIndex,
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
 * Returns HTML-ready string with highlighted tags
 */
export function highlightSectionTags(lyrics: string): string {
  return lyrics.replace(
    SECTION_PATTERN,
    '<span class="lyrics-section-tag">$&</span>'
  )
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
  
  const baseName = typeNames[section.type] || section.type
  return section.number ? `${baseName} ${section.number}` : baseName
}