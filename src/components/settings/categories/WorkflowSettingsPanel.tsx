import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { BooleanSetting, NumberSetting } from '../fields'
import { useCategory } from '@/settings/store/hooks'
import { useSettingsStore } from '@/settings/store'
import { Save, RotateCcw, Workflow } from 'lucide-react'

export function WorkflowSettingsPanel() {
  const [settings] = useCategory('workflow')
  const saveSettings = useSettingsStore(s => s.saveSettings)
  const isSaving = useSettingsStore(s => s.isSaving)

  const handleSave = async () => {
    await saveSettings('workflow')
  }

  const handleReset = () => {
    useSettingsStore.getState().resetCategory('workflow')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-primary" />
            <CardTitle>编辑器偏好</CardTitle>
          </div>
          <CardDescription>配置工作流编辑器的行为和外观</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <BooleanSetting
            category="workflow"
            settingKey="autoLayout"
            label="自动布局"
            description="添加节点时自动调整布局"
          />
          <BooleanSetting
            category="workflow"
            settingKey="snapToGrid"
            label="对齐网格"
            description="拖拽节点时自动吸附到网格"
          />
          <NumberSetting
            category="workflow"
            settingKey="gridSize"
            label="网格大小"
            description="网格单元的大小（像素）"
            min={5}
            max={50}
            step={5}
          />
          <BooleanSetting
            category="workflow"
            settingKey="showMinimap"
            label="显示缩略图"
            description="在画布角落显示导航缩略图"
          />
          <NumberSetting
            category="workflow"
            settingKey="defaultZoom"
            label="默认缩放"
            description="编辑器的初始缩放比例"
            min={0.5}
            max={2}
            step={0.1}
          />
          <BooleanSetting
            category="workflow"
            settingKey="confirmDelete"
            label="删除确认"
            description="删除节点前显示确认对话框"
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
