import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SelectSetting, BooleanSetting, NumberSetting } from '../fields'
import { ThemePicker } from '../ThemePicker'
import { useCategory } from '@/settings/store/hooks'
import { useSettingsStore } from '@/settings/store'
import { Save, RotateCcw, Palette } from 'lucide-react'

const toastPositionOptions = [
  { value: 'top-left', label: '左上' },
  { value: 'top-right', label: '右上' },
  { value: 'bottom-left', label: '左下' },
  { value: 'bottom-right', label: '右下' },
]

const densityOptions = [
  { value: 'compact', label: '紧凑' },
  { value: 'comfortable', label: '舒适' },
  { value: 'spacious', label: '宽松' },
]

const fontSizeOptions = [
  { value: 'small', label: '小' },
  { value: 'medium', label: '中' },
  { value: 'large', label: '大' },
]

export function UISettingsPanel() {
  const [settings] = useCategory('ui')
  const saveSettings = useSettingsStore(s => s.saveSettings)
  const isSaving = useSettingsStore(s => s.isSaving)

  const handleSave = async () => {
    await saveSettings('ui')
  }

  const handleReset = () => {
    useSettingsStore.getState().resetCategory('ui')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <CardTitle>主题设置</CardTitle>
          </div>
          <CardDescription>选择您喜欢的界面主题</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">主题</label>
              <ThemePicker />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>侧边栏</CardTitle>
          <CardDescription>配置侧边栏的显示方式</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <BooleanSetting
            category="ui"
            settingKey="sidebarCollapsed"
            label="默认折叠"
            description="启动时默认折叠侧边栏"
          />
          <NumberSetting
            category="ui"
            settingKey="sidebarWidth"
            label="侧边栏宽度"
            description="侧边栏的默认宽度（像素）"
            min={180}
            max={400}
            step={10}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>动画与交互</CardTitle>
          <CardDescription>配置界面动画和交互效果</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <BooleanSetting
            category="ui"
            settingKey="showAnimations"
            label="启用动画"
            description="显示界面过渡动画"
          />
          <BooleanSetting
            category="ui"
            settingKey="reducedMotion"
            label="减少动画"
            description="减少动画效果以提高可访问性"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>显示设置</CardTitle>
          <CardDescription>配置界面显示选项</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SelectSetting
            category="ui"
            settingKey="toastPosition"
            label="通知位置"
            description="选择通知弹窗显示的位置"
            options={toastPositionOptions}
          />
          <SelectSetting
            category="ui"
            settingKey="density"
            label="界面密度"
            description="选择界面元素的紧凑程度"
            options={densityOptions}
          />
          <SelectSetting
            category="ui"
            settingKey="fontSize"
            label="字体大小"
            description="选择界面字体大小"
            options={fontSizeOptions}
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
