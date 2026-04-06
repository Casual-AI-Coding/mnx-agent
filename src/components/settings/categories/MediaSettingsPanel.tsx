import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { TextSetting, BooleanSetting, NumberSetting } from '../fields'
import { useCategory } from '@/settings/store/hooks'
import { Image } from 'lucide-react'

export function MediaSettingsPanel() {
  const [settings] = useCategory('media')

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            <CardTitle>存储配置</CardTitle>
          </div>
          <CardDescription>配置媒体文件的存储位置和命名规则</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <TextSetting
            category="media"
            settingKey="storagePath"
            label="存储路径"
            description="媒体文件的本地存储目录"
            placeholder="./data/media"
          />
          <BooleanSetting
            category="media"
            settingKey="autoSave"
            label="自动保存"
            description="生成内容后自动保存到媒体库"
          />
          <TextSetting
            category="media"
            settingKey="namingPattern"
            label="命名规则"
            description="文件命名模板，支持 {timestamp} {type} 等变量"
            placeholder="{timestamp}_{type}"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>文件限制</CardTitle>
          <CardDescription>配置媒体文件的尺寸和类型限制</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <NumberSetting
            category="media"
            settingKey="maxFileSize"
            label="最大文件大小"
            description="单个文件的最大大小（MB）"
            min={1}
            max={1000}
            step={10}
          />
          <NumberSetting
            category="media"
            settingKey="retentionDays"
            label="保留天数"
            description="媒体文件的自动清理周期（0 表示不清理）"
            min={0}
            max={365}
            step={1}
          />
          <NumberSetting
            category="media"
            settingKey="thumbnailSize"
            label="缩略图大小"
            description="缩略图的最大边长（像素）"
            min={50}
            max={500}
            step={10}
          />
        </CardContent>
      </Card>
    </div>
  )
}
