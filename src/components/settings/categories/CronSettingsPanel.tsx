import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SelectSetting, NumberSetting } from '../fields'
import { useCategory } from '@/settings/store/hooks'
import { useSettingsStore } from '@/settings/store'
import { Save, RotateCcw, Clock } from 'lucide-react'

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

const retryBackoffOptions = [
  { value: 'exponential', label: '指数退避' },
  { value: 'linear', label: '线性退避' },
  { value: 'fixed', label: '固定间隔' },
]

const misfirePolicyOptions = [
  { value: 'fire_once', label: '触发一次' },
  { value: 'ignore', label: '忽略' },
  { value: 'fire_all', label: '触发所有' },
]

export function CronSettingsPanel() {
  const [settings] = useCategory('cron')
  const saveSettings = useSettingsStore(s => s.saveSettings)
  const isSaving = useSettingsStore(s => s.isSaving)

  const handleSave = async () => {
    await saveSettings('cron')
  }

  const handleReset = () => {
    useSettingsStore.getState().resetCategory('cron')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>调度配置</CardTitle>
          </div>
          <CardDescription>配置定时任务的默认调度参数</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SelectSetting
            category="cron"
            settingKey="defaultTimezone"
            label="默认时区"
            description="Cron 表达式的默认时区"
            options={timezoneOptions}
          />
          <NumberSetting
            category="cron"
            settingKey="timeoutSeconds"
            label="任务超时"
            description="单个任务执行超时时间（秒）"
            min={30}
            max={3600}
            step={30}
          />
          <NumberSetting
            category="cron"
            settingKey="concurrency"
            label="并发数"
            description="同时运行的最大任务数"
            min={1}
            max={20}
            step={1}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>重试策略</CardTitle>
          <CardDescription>配置任务失败时的重试行为</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <NumberSetting
            category="cron"
            settingKey="maxRetries"
            label="最大重试次数"
            description="任务失败后的最大重试次数"
            min={0}
            max={10}
            step={1}
          />
          <SelectSetting
            category="cron"
            settingKey="retryBackoff"
            label="退避策略"
            description="重试间隔的计算方式"
            options={retryBackoffOptions}
          />
          <SelectSetting
            category="cron"
            settingKey="misfirePolicy"
            label="错过策略"
            description="任务错过执行时间时的处理方式"
            options={misfirePolicyOptions}
          />
        </CardContent>
      </Card>

      <div className="sticky bottom-0 flex justify-end gap-2 pt-6 pb-2 mt-6 bg-card">
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
