import { Input } from '@/components/ui/Input'
import { SettingsField } from './SettingsField'
import { useSetting } from '@/settings/store/hooks'
import type { SettingsCategory, AllSettings } from '@/settings/types'

interface TextSettingProps<C extends SettingsCategory> {
  category: C
  settingKey: keyof AllSettings[C] & string
  label: string
  description?: string
  placeholder?: string
  type?: 'text' | 'password' | 'email' | 'url'
  disabled?: boolean
}

export function TextSetting<C extends SettingsCategory>({ category, settingKey, label, description, placeholder, type = 'text', disabled }: TextSettingProps<C>) {
  const [value, setValue] = useSetting(category, settingKey)

  return (
    <SettingsField label={label} description={description}>
      <Input
        value={value as string}
        onChange={(e) => setValue(e.target.value as AllSettings[C][keyof AllSettings[C] & string])}
        placeholder={placeholder}
        type={type}
        disabled={disabled}
      />
    </SettingsField>
  )
}
