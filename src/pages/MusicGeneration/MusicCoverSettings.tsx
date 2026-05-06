import { Music, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { Input } from '@/components/ui/Input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Textarea } from '@/components/ui/Textarea'
import { cn } from '@/lib/utils'

interface MusicCoverSettingsProps {
  coverMode: 'one-step' | 'two-step'
  referenceAudioUrl: string
  stylePrompt: string
  lyrics: string
  useOriginalLyrics: boolean
  preprocessLoading: boolean
  preprocessResult: { lyrics: string; audio_url: string } | null
  stylePromptMax: number
  lyricsMax: number
  isStylePromptOverLimit: boolean
  isLyricsOverLimit: boolean
  onCoverModeChange: (value: 'one-step' | 'two-step') => void
  onReferenceAudioUrlChange: (value: string) => void
  onStylePromptChange: (value: string) => void
  onUseOriginalLyricsChange: (value: boolean) => void
  onLyricsChange: (value: string) => void
  onPreprocessFileChange: (file: File) => void
}

export function MusicCoverSettings({
  coverMode,
  referenceAudioUrl,
  stylePrompt,
  lyrics,
  useOriginalLyrics,
  preprocessLoading,
  preprocessResult,
  stylePromptMax,
  lyricsMax,
  isStylePromptOverLimit,
  isLyricsOverLimit,
  onCoverModeChange,
  onReferenceAudioUrlChange,
  onStylePromptChange,
  onUseOriginalLyricsChange,
  onLyricsChange,
  onPreprocessFileChange,
}: MusicCoverSettingsProps) {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="w-5 h-5" />
          翻唱设置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={coverMode} onValueChange={value => onCoverModeChange(value as 'one-step' | 'two-step')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="one-step">一步模式</TabsTrigger>
            <TabsTrigger value="two-step">两步模式</TabsTrigger>
          </TabsList>

          <TabsContent value="one-step" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">参考音频 URL *</label>
              <Input value={referenceAudioUrl} onChange={e => onReferenceAudioUrlChange(e.target.value)} placeholder="https://example.com/song.mp3" type="url" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">翻唱风格描述</label>
              <Textarea value={stylePrompt} onChange={e => onStylePromptChange(e.target.value)} placeholder="描述翻唱风格，如更悲伤、更激昂..." className="min-h-[60px] resize-none" />
              <div className={cn('text-xs', isStylePromptOverLimit ? 'text-red-500' : 'text-muted-foreground')}>
                {stylePrompt.length} / {stylePromptMax}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="use-original" checked={useOriginalLyrics} onCheckedChange={checked => onUseOriginalLyricsChange(checked as boolean)} />
              <label htmlFor="use-original" className="text-sm">使用原歌词（自动提取）</label>
            </div>

            {!useOriginalLyrics && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">自定义歌词</label>
                <Textarea
                  value={lyrics}
                  onChange={e => onLyricsChange(e.target.value)}
                  placeholder="输入自定义翻唱歌词..."
                  className={cn('min-h-[150px] resize-none font-mono text-sm', isLyricsOverLimit && 'border-red-500')}
                />
                <div className={cn('text-xs', isLyricsOverLimit ? 'text-red-500' : 'text-muted-foreground')}>
                  {lyrics.length} / {lyricsMax}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="two-step" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">上传参考音频</label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".mp3,.wav,.flac"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) onPreprocessFileChange(file)
                  }}
                  className="flex-1"
                />
                {preprocessLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              </div>
              <p className="text-xs text-muted-foreground">支持 mp3/wav/flac 格式</p>
            </div>

            {preprocessResult && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">提取的歌词（可修改）</label>
                <Textarea
                  value={lyrics}
                  onChange={e => onLyricsChange(e.target.value)}
                  defaultValue={preprocessResult.lyrics}
                  className={cn('min-h-[150px] resize-none font-mono text-sm', isLyricsOverLimit && 'border-red-500')}
                />
                <div className={cn('text-xs', isLyricsOverLimit ? 'text-red-500' : 'text-muted-foreground')}>
                  {lyrics.length} / {lyricsMax}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">翻唱风格描述</label>
              <Textarea value={stylePrompt} onChange={e => onStylePromptChange(e.target.value)} placeholder="描述翻唱风格..." className="min-h-[60px] resize-none" />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
