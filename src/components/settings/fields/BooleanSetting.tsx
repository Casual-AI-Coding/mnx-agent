import { Switch } from '@/components/ui/Switch'
import { SettingsField } from './SettingsField'
import { useSetting } from '@/settings/store/hooks'
import type { SettingsCategory, AllSettings } from '@/settings/types'

interface BooleanSettingProps<C extends SettingsCategory> {
  category: C
  settingKey: keyof AllSettings[C] & string
  label: string
  description?: string
  disabled?: boolean
}

export function BooleanSetting<C extends SettingsCategory>({ category, settingKey, label, description, disabled }: BooleanSettingProps<C>) {
  const [value, setValue] = useSetting(category, settingKey)

  return (
    <SettingsField label={label} description={description}>
      <Switch
        checked={value as boolean}
        onCheckedChange={(checked) => setValue(checked as AllSettings[C][keyof AllSettings[C] & string])}
        disabled={disabled}
      />
    </SettingsField>
  )
}
