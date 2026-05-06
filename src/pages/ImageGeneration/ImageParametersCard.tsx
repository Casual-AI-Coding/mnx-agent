import { RefreshCw, Settings2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { AspectRatioPopup, type AspectRatioState } from '@/components/ui/AspectRatioPopup'
import { ASPECT_RATIOS, IMAGE_MODELS, type ImageModel } from '@/types'

interface ImageParametersCardProps {
  advancedLabel: string
  aigcWatermark: boolean
  aspectRatioState: AspectRatioState
  isGenerating: boolean
  model: ImageModel
  numImages: number
  onAigcWatermarkChange: (value: boolean) => void
  onAspectRatioChange: (value: AspectRatioState) => void
  onModelChange: (value: ImageModel) => void
  onNumImagesChange: (value: number) => void
  onParallelCountChange: (value: number) => void
  onPromptOptimizerChange: (value: boolean) => void
  onRandomSeed: () => void
  onSeedChange: (value: number | undefined) => void
  onShowAdvancedChange: (value: boolean) => void
  onShowAspectRatioPopupChange: (value: boolean) => void
  parallelCount: number
  promptOptimizer: boolean
  seed: number | undefined
  seedLabel: string
  seedPlaceholder: string
  seedTip: string
  settingsLabel: string
  showAdvanced: boolean
  showAspectRatioPopup: boolean
}

export function ImageParametersCard({
  advancedLabel,
  aigcWatermark,
  aspectRatioState,
  isGenerating,
  model,
  numImages,
  onAigcWatermarkChange,
  onAspectRatioChange,
  onModelChange,
  onNumImagesChange,
  onParallelCountChange,
  onPromptOptimizerChange,
  onRandomSeed,
  onSeedChange,
  onShowAdvancedChange,
  onShowAspectRatioPopupChange,
  parallelCount,
  promptOptimizer,
  seed,
  seedLabel,
  seedPlaceholder,
  seedTip,
  settingsLabel,
  showAdvanced,
  showAspectRatioPopup,
}: ImageParametersCardProps) {
  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/10 via-primary/10 to-secondary/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
      <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-secondary-foreground" />
            <span className="text-sm font-medium text-foreground">{settingsLabel}</span>
          </div>
        </div>
        <div className="p-4 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">模型选择</label>
              <Select value={model} onValueChange={v => onModelChange(v as ImageModel)}>
                <SelectTrigger className="w-full bg-background/50 border-border text-foreground hover:border-primary/50 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {IMAGE_MODELS.map(m => (
                    <SelectItem key={m.id} value={m.id} className="text-foreground focus:bg-secondary">
                      <div className="flex flex-col">
                        <span>{m.name}</span>
                        <span className="text-xs text-muted-foreground">{m.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">宽高比</label>
              <button
                onClick={() => onShowAspectRatioPopupChange(true)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-background/50 border border-border hover:border-primary/50 transition-colors"
              >
                <span className="text-sm font-medium text-foreground">
                  {aspectRatioState.type === 'custom'
                    ? `${aspectRatioState.width} × ${aspectRatioState.height}`
                    : ASPECT_RATIOS.find(r => r.id === aspectRatioState.preset)?.label ?? '1:1'}
                </span>
                <span className="text-muted-foreground">选择</span>
              </button>
              <AspectRatioPopup
                open={showAspectRatioPopup}
                onClose={() => onShowAspectRatioPopupChange(false)}
                value={aspectRatioState}
                onChange={onAspectRatioChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">生成数量</label>
              <div className="flex flex-wrap gap-1.5">
                {[4, 5, 6, 7, 8, 9].map(n => (
                  <button
                    key={n}
                    onClick={() => onNumImagesChange(n)}
                    className={`flex-1 min-w-[32px] py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                      numImages === n
                        ? 'bg-gradient-to-r from-primary to-accent border-primary/50 text-primary-foreground shadow-lg shadow-primary/20'
                        : 'bg-background/50 border-border text-muted-foreground/70 hover:border-border hover:text-foreground'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">并发数</label>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onParallelCountChange(n)}
                    disabled={isGenerating}
                    className={cn(
                      'w-8 h-8 rounded-md text-sm font-medium transition-all duration-200',
                      parallelCount === n
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground',
                      isGenerating && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">共 {numImages * parallelCount} 张</p>
            </div>
          </div>

          <button
            onClick={() => onShowAdvancedChange(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            {advancedLabel}
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">自动优化提示词</label>
                      <p className="text-xs text-muted-foreground/50 mt-0.5">AI 将优化你的提示词以获得更好效果</p>
                    </div>
                    <Switch checked={promptOptimizer} onCheckedChange={onPromptOptimizerChange} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">添加 AIGC 水印</label>
                      <p className="text-xs text-muted-foreground/50 mt-0.5">在生成的图片中添加 AI 生成标识水印</p>
                    </div>
                    <Switch checked={aigcWatermark} onCheckedChange={onAigcWatermarkChange} />
                  </div>
                </div>

                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{seedLabel}</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={seed || ''}
                    onChange={e => onSeedChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder={seedPlaceholder}
                    className="flex-1 bg-background/50 border-border text-foreground focus:border-primary/50"
                  />
                  <button
                    onClick={onRandomSeed}
                    className="px-3 py-2 rounded-lg bg-secondary text-muted-foreground/70 hover:text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground/50">{seedTip}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
