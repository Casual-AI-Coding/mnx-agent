import { motion } from 'framer-motion'
import { Music2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { cn } from '@/lib/utils'

interface LyricsEditorCardProps {
  title: string
  songTitle: string
  lyrics: string
  lyricsPlaceholder: string
  useTagsLabel: string
  songTitlePlaceholder: string
  structureTags: readonly string[]
  lyricsMax: number
  isLyricsOverLimit: boolean
  onSongTitleChange: (value: string) => void
  onLyricsChange: (value: string) => void
  onInsertTag: (tag: string) => void
}

export function LyricsEditorCard({
  title,
  songTitle,
  lyrics,
  lyricsPlaceholder,
  useTagsLabel,
  songTitlePlaceholder,
  structureTags,
  lyricsMax,
  isLyricsOverLimit,
  onSongTitleChange,
  onLyricsChange,
  onInsertTag,
}: LyricsEditorCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative group"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
      <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <Music2 className="w-5 h-5" />
          <span className="text-base font-semibold">{title}</span>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium shrink-0">歌曲标题</label>
            <Input value={songTitle} onChange={e => onSongTitleChange(e.target.value)} placeholder={songTitlePlaceholder} />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {structureTags.map(tag => (
              <Button key={tag} variant="outline" size="sm" onClick={() => onInsertTag(tag)} className="h-7 px-2 text-xs shrink-0">
                {tag}
              </Button>
            ))}
          </div>
          <div className="relative">
            <Textarea
              id="lyrics-editor"
              value={lyrics}
              onChange={e => onLyricsChange(e.target.value)}
              placeholder={lyricsPlaceholder}
              className={cn('min-h-[300px] resize-none font-mono text-sm pb-6', isLyricsOverLimit && 'border-red-500')}
            />
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{useTagsLabel}</span>
              <span className={cn(isLyricsOverLimit ? 'text-red-500' : 'text-muted-foreground')}>
                {lyrics.length} / {lyricsMax}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
