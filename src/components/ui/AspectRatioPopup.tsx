import * as React from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import { ASPECT_RATIOS, type AspectRatio } from '@/models'

export interface AspectRatioState {
  type: 'preset' | 'custom'
  preset?: AspectRatio
  width?: number
  height?: number
}

interface AspectRatioPopupProps {
  open: boolean
  onClose: () => void
  value: AspectRatioState
  onChange: (value: AspectRatioState) => void
}

export function AspectRatioPopup({
  open,
  onClose,
  value,
  onChange,
}: AspectRatioPopupProps) {
  const [showCustom, setShowCustom] = React.useState(value.type === 'custom')
  const [customWidth, setCustomWidth] = React.useState(value.width ?? 512)
  const [customHeight, setCustomHeight] = React.useState(value.height ?? 512)

  // Sync custom values when value changes externally
  React.useEffect(() => {
    if (value.type === 'custom') {
      setShowCustom(true)
      setCustomWidth(value.width ?? 512)
      setCustomHeight(value.height ?? 512)
    } else {
      setShowCustom(false)
    }
  }, [value])

  const handlePresetClick = (preset: AspectRatio) => {
    onChange({ type: 'preset', preset })
    onClose()
  }

  const handleToggleCustom = () => {
    setShowCustom(!showCustom)
  }

  const handleConfirmCustom = () => {
    const width = Math.min(2048, Math.max(64, customWidth))
    const height = Math.min(2048, Math.max(64, customHeight))
    onChange({ type: 'custom', width, height })
    onClose()
  }

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10)
    if (!isNaN(val)) {
      setCustomWidth(val)
    }
  }

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10)
    if (!isNaN(val)) {
      setCustomHeight(val)
    }
  }

  const isPresetSelected = (preset: AspectRatio) =>
    value.type === 'preset' && value.preset === preset

  return (
    <Dialog open={open} onClose={onClose} title="选择宽高比">
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio.id}
              onClick={() => handlePresetClick(ratio.id)}
              className={cn(
                'flex flex-col items-center justify-center p-3 rounded-lg border transition-all',
                'hover:bg-accent hover:border-primary',
                isPresetSelected(ratio.id)
                  ? 'bg-accent border-primary ring-1 ring-primary'
                  : 'border-border bg-background'
              )}
            >
              <span className="text-xl mb-1">{ratio.icon}</span>
              <span className="text-sm font-medium">{ratio.label}</span>
            </button>
          ))}
        </div>

        <div className="border-t border-border" />

        <div className="space-y-3">
          <button
            onClick={handleToggleCustom}
            className={cn(
              'w-full flex items-center justify-between p-2 rounded-lg border transition-all',
              showCustom
                ? 'bg-accent border-primary'
                : 'border-border bg-background hover:bg-accent'
            )}
          >
            <span className="text-sm font-medium">自定义尺寸</span>
            <span className="text-xs text-muted-foreground">
              {showCustom ? `${customWidth} × ${customHeight}` : '点击展开'}
            </span>
          </button>

          {showCustom && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">
                    宽度 (64-2048)
                  </label>
                  <Input
                    type="number"
                    min={64}
                    max={2048}
                    value={customWidth}
                    onChange={handleWidthChange}
                    className="w-full"
                  />
                </div>
                <span className="text-muted-foreground">×</span>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">
                    高度 (64-2048)
                  </label>
                  <Input
                    type="number"
                    min={64}
                    max={2048}
                    value={customHeight}
                    onChange={handleHeightChange}
                    className="w-full"
                  />
                </div>
              </div>

              <button
                onClick={handleConfirmCustom}
                className={cn(
                  'w-full py-2 px-4 rounded-lg font-medium transition-all',
                  'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                确认
              </button>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  )
}