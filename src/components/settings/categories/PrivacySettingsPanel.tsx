import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { BooleanSetting, NumberSetting } from '../fields'
import { useCategory } from '@/settings/store/hooks'
import { useSettingsStore } from '@/settings/store'
import { Save, RotateCcw, Shield } from 'lucide-react'

export function PrivacySettingsPanel() {
  const [settings] = useCategory('privacy')
  const saveSettings = useSettingsStore(s => s.saveSettings)
  const isSaving = useSettingsStore(s => s.isSaving)

  const handleSave = async () => {
    await saveSettings('privacy')
  }

  const handleReset = () => {
    useSettingsStore.getState().resetCategory('privacy')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>数据隐私</CardTitle>
          </div>
          <CardDescription>管理数据共享和隐私设置</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <BooleanSetting
            category="privacy"
            settingKey="shareUsageData"
            label="共享使用数据"
            description="允许匿名收集使用情况数据以改进产品"
          />
          <BooleanSetting
            category="privacy"
            settingKey="autoRefreshToken"
            label="自动刷新令牌"
            description="会话过期前自动刷新访问令牌"
          />
          <BooleanSetting
            category="privacy"
            settingKey="secureExport"
            label="安全导出"
            description="导出数据时加密敏感信息"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>审计日志</CardTitle>
          <CardDescription>配置操作日志的保留策略</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <NumberSetting
            category="privacy"
            settingKey="auditLogRetention"
            label="日志保留天数"
            description="审计日志的保留时间（天）"
            min={7}
            max={365}
            step={7}
          />
        </CardContent>
      </Card>

      <div className="sticky bottom-0 flex justify-end gap-2 pt-6 pb-2 mt-6 bg-gradient-to-t from-card via-card/95 to-transparent">
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
