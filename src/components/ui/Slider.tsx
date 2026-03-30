import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const sliderTrackVariants = cva(
  'relative flex w-full touch-none select-none items-center'
)

const sliderRangeVariants = cva(
  'absolute h-full bg-primary'
)

const sliderThumbVariants = cva(
  'block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50'
)

export interface SliderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'value' | 'defaultValue'>,
    VariantProps<typeof sliderTrackVariants> {
  value?: number[]
  defaultValue?: number[]
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  onValueChange?: (value: number[]) => void
  onValueCommit?: (value: number[]) => void
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      className,
      value: controlledValue,
      defaultValue,
      min = 0,
      max = 100,
      step = 1,
      disabled = false,
      onValueChange,
      onValueCommit,
      ...props
    },
    ref
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(
      defaultValue || [min]
    )
    const isControlled = controlledValue !== undefined
    const values = isControlled ? controlledValue : uncontrolledValue

    const percentage = ((values[0] - min) / (max - min)) * 100

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value)
      const clampedValue = Math.min(Math.max(newValue, min), max)
      const snappedValue = Math.round(clampedValue / step) * step

      if (!isControlled) {
        setUncontrolledValue([snappedValue])
      }
      onValueChange?.([snappedValue])
    }

    const handleMouseUp = () => {
      onValueCommit?.(values)
    }

    return (
      <div
        ref={ref}
        className={cn(sliderTrackVariants({ className }))}
        {...props}
      >
        <div className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
          <div
            className={cn(sliderRangeVariants())}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={values[0]}
          disabled={disabled}
          onChange={handleChange}
          onMouseUp={handleMouseUp}
          onKeyUp={handleMouseUp}
          className={cn(
            'absolute h-full w-full cursor-pointer opacity-0',
            disabled && 'cursor-not-allowed'
          )}
        />
        <div
          className={cn(sliderThumbVariants())}
          style={{
            position: 'absolute',
            left: `calc(${percentage}% - 8px)`,
          }}
        />
      </div>
    )
  }
)
Slider.displayName = 'Slider'

export {
  Slider,
  sliderTrackVariants,
  sliderRangeVariants,
  sliderThumbVariants,
}
