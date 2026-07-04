import { HelpCircle, Mic, Music } from 'lucide-react'
import type { ReactNode } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { WorkbenchActions } from '@/components/shared/WorkbenchActions'

interface VoiceSyncHeaderProps {
  readonly generateCurl: () => string
  readonly onClear: () => void
}

export function VoiceSyncHeader({ generateCurl, onClear }: VoiceSyncHeaderProps) {
  return (
    <PageHeader
      icon={<Mic className="w-5 h-5" />}
      title="语音同步合成"
      description="实时语音合成服务"
      gradient="sky-blue"
      actions={(
        <WorkbenchActions
          helpTitle="语音合成使用帮助"
          helpTips={<VoiceSyncHelpTips />}
          generateCurl={generateCurl}
          onClear={onClear}
          clearLabel="清空"
        />
      )}
    />
  )
}

function VoiceSyncHelpTips() {
  return (
    <div className="space-y-3 text-sm text-muted-foreground">
      <VoiceSyncHelpItem icon={<HelpCircle className="w-4 h-4 mt-0.5 text-primary shrink-0" />} title="文本质量">
        使用清晰、准确的文本，避免特殊字符。支持中文、英文等多种语言。
      </VoiceSyncHelpItem>
      <VoiceSyncHelpItem icon={<Music className="w-4 h-4 mt-0.5 text-primary shrink-0" />} title="音色选择">
        提供多种高质量音色，可根据场景选择男声、女声或特定情感风格。
      </VoiceSyncHelpItem>
      <VoiceSyncHelpItem icon={<Mic className="w-4 h-4 mt-0.5 text-primary shrink-0" />} title="音频设置">
        可调节语速、音量和音调。建议保持默认设置以获得最佳效果。
      </VoiceSyncHelpItem>
      <div className="pt-2 border-t border-border/60 text-xs">
        <p>API 端点: POST https://api.minimaxi.com/api/tts</p>
      </div>
    </div>
  )
}

interface VoiceSyncHelpItemProps {
  readonly icon: ReactNode
  readonly title: string
  readonly children: ReactNode
}

function VoiceSyncHelpItem({ icon, title, children }: VoiceSyncHelpItemProps) {
  return (
    <div className="flex items-start gap-2">
      {icon}
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p>{children}</p>
      </div>
    </div>
  )
}
