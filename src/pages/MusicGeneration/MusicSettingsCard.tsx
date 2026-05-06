import type { Ref } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Settings2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Input } from '@/components/ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { cn } from '@/lib/utils'
import { MUSIC_MODELS, type MusicModel } from '@/types'
import { MusicCoverSettings } from './MusicCoverSettings.js'

interface MusicSettingsCardProps {
  model: MusicModel
  parallelCount: number
  instrumental: boolean
  optimizeLyrics: boolean
  isGenerating: boolean
  isInstrumentalAvailable: boolean
  isOptimizeLyricsAvailable: boolean
  isCoverModel: boolean
  advancedOpen: boolean
  advancedRef: Ref<HTMLDivElement>
  sampleRate: 16000 | 24000 | 32000 | 44100
  bitrate: 32000 | 64000 | 128000 | 256000
  format: 'mp3' | 'wav' | 'flac'
  outputFormat: 'url' | 'hex'
  seed: string
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
  generateLabel: string
  composingLabel: string
  paramsTitle: string
  modelLabel: string
  onUpdateModel: (value: MusicModel) => void
  onUpdateParallelCount: (value: number) => void
  onUpdateInstrumental: (value: boolean) => void
  onUpdateOptimizeLyrics: (value: boolean) => void
  onToggleAdvanced: () => void
  onUpdateSampleRate: (value: 16000 | 24000 | 32000 | 44100) => void
  onUpdateBitrate: (value: 32000 | 64000 | 128000 | 256000) => void
  onUpdateFormat: (value: 'mp3' | 'wav' | 'flac') => void
  onUpdateOutputFormat: (value: 'url' | 'hex') => void
  onUpdateSeed: (value: string) => void
  onGenerate: () => void
  isSubmitDisabled: boolean
  onUpdateCoverMode: (value: 'one-step' | 'two-step') => void
  onUpdateReferenceAudioUrl: (value: string) => void
  onUpdateStylePrompt: (value: string) => void
  onUpdateUseOriginalLyrics: (value: boolean) => void
  onUpdateLyrics: (value: string) => void
  onPreprocessFileChange: (file: File) => void
}

export function MusicSettingsCard({
  model,
  parallelCount,
  instrumental,
  optimizeLyrics,
  isGenerating,
  isInstrumentalAvailable,
  isOptimizeLyricsAvailable,
  isCoverModel,
  advancedOpen,
  advancedRef,
  sampleRate,
  bitrate,
  format,
  outputFormat,
  seed,
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
  generateLabel,
  composingLabel,
  paramsTitle,
  modelLabel,
  onUpdateModel,
  onUpdateParallelCount,
  onUpdateInstrumental,
  onUpdateOptimizeLyrics,
  onToggleAdvanced,
  onUpdateSampleRate,
  onUpdateBitrate,
  onUpdateFormat,
  onUpdateOutputFormat,
  onUpdateSeed,
  onGenerate,
  isSubmitDisabled,
  onUpdateCoverMode,
  onUpdateReferenceAudioUrl,
  onUpdateStylePrompt,
  onUpdateUseOriginalLyrics,
  onUpdateLyrics,
  onPreprocessFileChange,
}: MusicSettingsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.2 }}
      className="relative group z-20"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
      <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-visible">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <Settings2 className="w-5 h-5" />
          <span className="text-base font-semibold">{paramsTitle}</span>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex gap-6">
            <div className="space-y-2 flex-1 pr-6 border-r border-border">
              <label className="text-sm font-medium text-foreground">{modelLabel}</label>
              <Select value={model} onValueChange={value => onUpdateModel(value as MusicModel)}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MUSIC_MODELS.map(item => <SelectItem key={item.id} value={item.id}><span>{item.name}</span></SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium text-foreground">并发生成数量</label>
              <div className="flex items-center gap-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => !isGenerating && onUpdateParallelCount(n)}
                    disabled={isGenerating}
                    className={cn(
                      'w-8 h-8 rounded-md text-sm font-medium transition-all duration-200',
                      parallelCount === n ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {(isInstrumentalAvailable || isOptimizeLyricsAvailable) && !isCoverModel && (
            <div className="flex items-center justify-between gap-4">
              {isInstrumentalAvailable && (
                <div className="flex items-center space-x-2">
                  <Checkbox id="instrumental" checked={instrumental} onCheckedChange={checked => onUpdateInstrumental(checked as boolean)} />
                  <label htmlFor="instrumental" className="text-sm">纯音乐模式</label>
                </div>
              )}
              {isOptimizeLyricsAvailable && !instrumental && (
                <div className="flex items-center space-x-2">
                  <Checkbox id="optimize-lyrics" checked={optimizeLyrics} onCheckedChange={checked => onUpdateOptimizeLyrics(checked as boolean)} />
                  <label htmlFor="optimize-lyrics" className="text-sm">AI歌词优化</label>
                </div>
              )}
              <div className="relative z-20" ref={advancedRef}>
                <Button variant="ghost" size="sm" onClick={onToggleAdvanced} className="h-8 px-2.5 text-sm text-muted-foreground hover:text-foreground">
                  <Settings2 className="w-4 h-4 mr-1" />高级设置
                </Button>
                {advancedOpen && (
                  <div className="absolute top-full right-0 mt-2 w-[280px] bg-card/95 backdrop-blur-sm border border-border/60 rounded-xl shadow-xl z-50 animate-in fade-in-0 zoom-in-95">
                    <div className="p-2.5 grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">采样率</label>
                        <Select value={sampleRate.toString()} onValueChange={value => onUpdateSampleRate(Number(value) as 16000 | 24000 | 32000 | 44100)}>
                          <SelectTrigger className="h-7 w-full text-xs bg-background/50 border-border/50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="16000" className="text-xs">16000 Hz</SelectItem>
                            <SelectItem value="24000" className="text-xs">24000 Hz</SelectItem>
                            <SelectItem value="32000" className="text-xs">32000 Hz</SelectItem>
                            <SelectItem value="44100" className="text-xs">44100 Hz (推荐)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">比特率</label>
                        <Select value={bitrate.toString()} onValueChange={value => onUpdateBitrate(Number(value) as 32000 | 64000 | 128000 | 256000)}>
                          <SelectTrigger className="h-7 w-full text-xs bg-background/50 border-border/50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="32000" className="text-xs">32 kbps</SelectItem>
                            <SelectItem value="64000" className="text-xs">64 kbps</SelectItem>
                            <SelectItem value="128000" className="text-xs">128 kbps</SelectItem>
                            <SelectItem value="256000" className="text-xs">256 kbps (推荐)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">格式</label>
                        <Select value={format} onValueChange={value => onUpdateFormat(value as 'mp3' | 'wav' | 'flac')}>
                          <SelectTrigger className="h-7 w-full text-xs bg-background/50 border-border/50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mp3" className="text-xs">MP3</SelectItem>
                            <SelectItem value="wav" className="text-xs">WAV</SelectItem>
                            <SelectItem value="flac" className="text-xs">FLAC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">返回格式</label>
                        <Select value={outputFormat} onValueChange={value => onUpdateOutputFormat(value as 'url' | 'hex')}>
                          <SelectTrigger className="h-7 w-full text-xs bg-background/50 border-border/50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="url" className="text-xs">URL (推荐)</SelectItem>
                            <SelectItem value="hex" className="text-xs">Hex</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">随机种子</label>
                        <Input value={seed} onChange={e => onUpdateSeed(e.target.value)} placeholder="留空则随机" className="h-7 w-full text-xs bg-background/50 border-border/50" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {isCoverModel && (
            <MusicCoverSettings
              coverMode={coverMode}
              referenceAudioUrl={referenceAudioUrl}
              stylePrompt={stylePrompt}
              lyrics={lyrics}
              useOriginalLyrics={useOriginalLyrics}
              preprocessLoading={preprocessLoading}
              preprocessResult={preprocessResult}
              stylePromptMax={stylePromptMax}
              lyricsMax={lyricsMax}
              isStylePromptOverLimit={isStylePromptOverLimit}
              isLyricsOverLimit={isLyricsOverLimit}
              onCoverModeChange={onUpdateCoverMode}
              onReferenceAudioUrlChange={onUpdateReferenceAudioUrl}
              onStylePromptChange={onUpdateStylePrompt}
              onUseOriginalLyricsChange={onUpdateUseOriginalLyrics}
              onLyricsChange={onUpdateLyrics}
              onPreprocessFileChange={onPreprocessFileChange}
            />
          )}

          <Button onClick={onGenerate} disabled={isSubmitDisabled} className="w-full shadow-lg shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30" size="lg">
            {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{composingLabel}</> : <><Wand2 className="w-4 h-4 mr-2" />{generateLabel}</>}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
