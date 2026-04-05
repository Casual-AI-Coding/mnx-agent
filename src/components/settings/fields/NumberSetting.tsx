import { Input } from '@/components/ui/Input'
import { SettingsField } from './SettingsField'
import { useSetting } from '@/settings/store/hooks'
import type { SettingsCategory, AllSettings } from '@/settings/types'

interface NumberSettingProps<C extends SettingsCategory> {
  category: C
  settingKey: keyof AllSettings[C] & string
  label: string
  description?: string
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}

export function NumberSetting<C extends SettingsCategory>({ category, settingKey, label, description, min, max, step = 1, disabled }: NumberSettingProps<C>) {
  const [value, setValue] = useSetting(category, settingKey)

  return (
    <SettingsField label={label} description={description}>
      <Input
        type="number"
        value={value as number}
        onChange={(e) => setValue(parseFloat(e.target.value) as AllSettings[C][keyof AllSettings[C] & string])}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
      />
    </SettingsField>
  )
}
