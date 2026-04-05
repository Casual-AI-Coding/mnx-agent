import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TextSetting, BooleanSetting } from '../fields'
import { useCategory } from '@/settings/store/hooks'
import { useSettingsStore } from '@/settings/store'
import { Save, RotateCcw, Bell } from 'lucide-react'

export function NotificationSettingsPanel() {
  const [settings] = useCategory('notification')
  const saveSettings = useSettingsStore(s => s.saveSettings)
  const isSaving = useSettingsStore(s => s.isSaving)

  const handleSave = async () => {
    await saveSettings('notification')
  }

  const handleReset = () => {
    useSettingsStore.getState().resetCategory('notification')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Webhook 通知</CardTitle>
          </div>
          <CardDescription>配置任务事件的 Webhook 回调</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <BooleanSetting
            category="notification"
            settingKey="webhookEnabled"
            label="启用 Webhook"
            description="任务事件发生时发送 HTTP 请求"
          />
          <TextSetting
            category="notification"
            settingKey="webhookUrl"
            label="Webhook URL"
            description="接收通知的 HTTP 端点地址"
            type="url"
            placeholder="https://example.com/webhook"
          />
          <TextSetting
            category="notification"
            settingKey="webhookSecret"
            label="Webhook 密钥"
            description="用于验证请求的 HMAC 密钥"
            type="password"
            placeholder="可选"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>通知渠道</CardTitle>
          <CardDescription>选择接收通知的方式</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <BooleanSetting
            category="notification"
            settingKey="emailEnabled"
            label="邮件通知"
            description="发送通知邮件到注册邮箱"
          />
          <BooleanSetting
            category="notification"
            settingKey="desktopEnabled"
            label="桌面通知"
            description="显示浏览器桌面通知"
          />
          <BooleanSetting
            category="notification"
            settingKey="soundEnabled"
            label="声音提示"
            description="重要事件播放提示音"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          重置
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? '保存中...' : '保存'}
        </Button>
      </div>
    </div>
  )
}
