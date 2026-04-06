import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { TextSetting, SelectSetting, NumberSetting } from '../fields'
import { useCategory } from '@/settings/store/hooks'
import { User } from 'lucide-react'

const localeOptions = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'ja-JP', label: '日本語' },
  { value: 'ko-KR', label: '한국어' },
  { value: 'fr-FR', label: 'Français' },
  { value: 'de-DE', label: 'Deutsch' },
  { value: 'es-ES', label: 'Español' },
]

const timezoneOptions = [
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (UTC+9)' },
  { value: 'Asia/Seoul', label: 'Asia/Seoul (UTC+9)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (UTC+8)' },
  { value: 'Asia/Hong_Kong', label: 'Asia/Hong Kong (UTC+8)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'Europe/London (UTC+0/+1)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (UTC+1/+2)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (UTC+1/+2)' },
  { value: 'America/New_York', label: 'America/New_York (UTC-5/-4)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (UTC-8/-7)' },
  { value: 'America/Chicago', label: 'America/Chicago (UTC-6/-5)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (UTC+10/+11)' },
]

export function AccountSettingsPanel() {
  const [settings] = useCategory('account')

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>账户信息</CardTitle>
          </div>
          <CardDescription>管理您的账户基本信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <TextSetting
            category="account"
            settingKey="username"
            label="用户名"
            description="您的显示名称"
            disabled
          />
          <TextSetting
            category="account"
            settingKey="email"
            label="邮箱地址"
            description="用于接收通知的邮箱"
            type="email"
            disabled
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>区域与语言</CardTitle>
          <CardDescription>配置语言、时区等区域设置</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SelectSetting
            category="account"
            settingKey="locale"
            label="界面语言"
            description="选择您偏好的界面语言"
            options={localeOptions}
          />
          <SelectSetting
            category="account"
            settingKey="timezone"
            label="时区"
            description="选择您所在的时区"
            options={timezoneOptions}
          />
          <NumberSetting
            category="account"
            settingKey="sessionTimeout"
            label="会话超时"
            description="无操作后自动注销的时间（分钟）"
            min={5}
            max={1440}
            step={5}
          />
        </CardContent>
      </Card>
    </div>
  )
}
