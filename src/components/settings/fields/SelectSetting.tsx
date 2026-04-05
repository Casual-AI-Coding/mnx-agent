import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { SettingsField } from './SettingsField'
import { useSetting } from '@/settings/store/hooks'
import type { SettingsCategory, AllSettings } from '@/settings/types'

interface SelectOption {
  value: string
  label: string
}

interface SelectSettingProps<C extends SettingsCategory> {
  category: C
  settingKey: keyof AllSettings[C] & string
  label: string
  description?: string
  options: SelectOption[]
  disabled?: boolean
}

export function SelectSetting<C extends SettingsCategory>({ category, settingKey, label, description, options }: SelectSettingProps<C>) {
  const [value, setValue] = useSetting(category, settingKey)

  return (
    <SettingsField label={label} description={description}>
      <Select value={value as string} onValueChange={(v) => setValue(v as AllSettings[C][keyof AllSettings[C] & string])}>
        <SelectTrigger>
          <SelectValue placeholder="Select option" />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SettingsField>
  )
}
