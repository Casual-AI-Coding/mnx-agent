import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { BooleanSetting } from '../fields'
import { useCategory } from '@/settings/store/hooks'
import { useSettingsStore } from '@/settings/store'
import { Save, RotateCcw, Eye } from 'lucide-react'

export function AccessibilitySettingsPanel() {
  const [settings] = useCategory('accessibility')
  const saveSettings = useSettingsStore(s => s.saveSettings)
  const isSaving = useSettingsStore(s => s.isSaving)

  const handleSave = async () => {
    await saveSettings('accessibility')
  }

  const handleReset = () => {
    useSettingsStore.getState().resetCategory('accessibility')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <CardTitle>视觉辅助</CardTitle>
          </div>
          <CardDescription>配置视觉辅助功能以提高可读性</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <BooleanSetting
            category="accessibility"
            settingKey="highContrast"
            label="高对比度"
            description="增强界面元素的对比度"
          />
          <BooleanSetting
            category="accessibility"
            settingKey="focusIndicators"
            label="焦点指示器"
            description="高亮显示当前聚焦的元素"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>辅助技术</CardTitle>
          <CardDescription>配置与屏幕阅读器等辅助技术的兼容性</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <BooleanSetting
            category="accessibility"
            settingKey="screenReader"
            label="屏幕阅读器优化"
            description="为屏幕阅读器提供额外的语义信息"
          />
          <BooleanSetting
            category="accessibility"
            settingKey="keyboardShortcuts"
            label="键盘快捷键"
            description="启用键盘导航和快捷键"
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
