import { MicOff } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { WorkbenchActions } from '@/components/shared/WorkbenchActions'

interface VoiceAsyncHeaderProps {
  readonly generateCurl: () => string
  readonly onClear: () => void
}

export function VoiceAsyncHeader({ generateCurl, onClear }: VoiceAsyncHeaderProps) {
  return (
    <PageHeader
      icon={<MicOff className="w-5 h-5" />}
      title="语音异步合成"
      description="批量语音合成与长文本处理"
      gradient="sky-blue"
      actions={(
        <WorkbenchActions
          helpTitle="异步语音合成帮助"
          helpTips={<VoiceAsyncHelpTips />}
          generateCurl={generateCurl}
          onClear={onClear}
          clearLabel="清空"
        />
      )}
    />
  )
}

function VoiceAsyncHelpTips() {
  return (
    <div className="space-y-3 text-sm">
      <VoiceAsyncHelpItem title="异步工作流程">
        提交任务后系统会立即返回任务ID，您可以在任务历史中查看进度。任务完成后可下载生成的音频文件。
      </VoiceAsyncHelpItem>
      <VoiceAsyncHelpItem title="长文本处理">
        支持最长 50,000 字符的文本输入。对于超长文本，建议使用文件上传方式（支持 .txt 和 .zip 格式）。
      </VoiceAsyncHelpItem>
      <VoiceAsyncHelpItem title="语音选择">
        提供多种预设音色，支持调整语速、音量、音高和情绪。选择合适的语音和参数可获得最佳效果。
      </VoiceAsyncHelpItem>
    </div>
  )
}

interface VoiceAsyncHelpItemProps {
  readonly title: string
  readonly children: string
}

function VoiceAsyncHelpItem({ title, children }: VoiceAsyncHelpItemProps) {
  return (
    <div>
      <p className="font-medium text-foreground mb-1">{title}</p>
      <p className="text-muted-foreground">{children}</p>
    </div>
  )
}
