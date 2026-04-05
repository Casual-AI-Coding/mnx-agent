import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TextSetting, SelectSetting, NumberSetting } from '../fields'
import { useCategory } from '@/settings/store/hooks'
import { useSettingsStore } from '@/settings/store'
import { Save, RotateCcw, Key } from 'lucide-react'

const regionOptions = [
  { value: 'cn', label: '中国大陆' },
  { value: 'intl', label: '国际' },
]

const modeOptions = [
  { value: 'direct', label: '直接连接' },
  { value: 'proxy', label: '代理模式' },
]

export function ApiSettingsPanel() {
  const [settings] = useCategory('api')
  const saveSettings = useSettingsStore(s => s.saveSettings)
  const isSaving = useSettingsStore(s => s.isSaving)

  const handleSave = async () => {
    await saveSettings('api')
  }

  const handleReset = () => {
    useSettingsStore.getState().resetCategory('api')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle>API 密钥配置</CardTitle>
          </div>
          <CardDescription>配置您的 MiniMax API 密钥和连接设置</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <TextSetting
            category="api"
            settingKey="minimaxKey"
            label="API 密钥"
            description="您的 MiniMax API 密钥，用于访问 MiniMax 服务"
            type="password"
          />
          <SelectSetting
            category="api"
            settingKey="region"
            label="API 区域"
            description="选择 MiniMax API 服务区域"
            options={regionOptions}
          />
          <SelectSetting
            category="api"
            settingKey="mode"
            label="连接模式"
            description="选择 API 连接模式"
            options={modeOptions}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>请求配置</CardTitle>
          <CardDescription>配置 API 请求超时和重试策略</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <NumberSetting
            category="api"
            settingKey="timeout"
            label="请求超时"
            description="API 请求超时时间（毫秒）"
            min={1000}
            max={60000}
            step={1000}
          />
          <NumberSetting
            category="api"
            settingKey="retryAttempts"
            label="重试次数"
            description="请求失败时的最大重试次数"
            min={0}
            max={10}
            step={1}
          />
          <NumberSetting
            category="api"
            settingKey="retryDelay"
            label="重试延迟"
            description="重试之间的延迟时间（毫秒）"
            min={100}
            max={10000}
            step={100}
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
