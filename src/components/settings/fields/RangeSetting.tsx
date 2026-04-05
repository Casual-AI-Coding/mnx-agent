import { Slider } from '@/components/ui/Slider'
import { SettingsField } from './SettingsField'
import { useSetting } from '@/settings/store/hooks'
import type { SettingsCategory, AllSettings } from '@/settings/types'

interface RangeSettingProps<C extends SettingsCategory> {
  category: C
  settingKey: keyof AllSettings[C] & string
  label: string
  description?: string
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}

export function RangeSetting<C extends SettingsCategory>({ category, settingKey, label, description, min = 0, max = 100, step = 1, disabled }: RangeSettingProps<C>) {
  const [value, setValue] = useSetting(category, settingKey)

  return (
    <SettingsField label={label} description={description}>
      <div className="flex items-center gap-4">
        <Slider
          value={[value as number]}
          onValueChange={([v]) => setValue(v as AllSettings[C][keyof AllSettings[C] & string])}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="flex-1"
        />
        <span className="w-12 text-sm text-muted-foreground text-right">{value as number}</span>
      </div>
    </SettingsField>
  )
}
