import { useTranslation } from 'react-i18next'
import { Bot, MessageSquare, Sparkle, Terminal, Zap } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { WorkbenchActions } from '@/components/shared/WorkbenchActions'

interface TextGenerationHeaderProps {
  readonly generateCurl: () => string
  readonly onClear: () => void
}

export function TextGenerationHeader({ generateCurl, onClear }: TextGenerationHeaderProps) {
  const { t } = useTranslation()

  return (
    <PageHeader
      icon={<MessageSquare className="w-5 h-5" />}
      title="文本生成"
      description="使用 MiniMax API 进行智能文本生成"
      gradient="indigo-violet"
      actions={
        <WorkbenchActions
          helpTitle="文本生成使用指南"
          helpTips={<TextHelpTips />}
          generateCurl={generateCurl}
          onClear={onClear}
          clearLabel={t('textGeneration.clearChat')}
        />
      }
    />
  )
}

function TextHelpTips() {
  return (
    <ul className="space-y-2 text-sm">
      <li className="flex items-start gap-2">
        <Sparkle className="w-4 h-4 mt-0.5 text-primary shrink-0" />
        <span><strong>提示词工程：</strong>提供清晰、具体的上下文和指令，模型输出质量更高</span>
      </li>
      <li className="flex items-start gap-2">
        <Bot className="w-4 h-4 mt-0.5 text-accent shrink-0" />
        <span><strong>模型选择：</strong>MiniMax-M2.7 适合复杂任务，M2.5 适合一般对话</span>
      </li>
      <li className="flex items-start gap-2">
        <Terminal className="w-4 h-4 mt-0.5 text-secondary shrink-0" />
        <span><strong>系统提示：</strong>使用场景模板快速设置角色和风格</span>
      </li>
      <li className="flex items-start gap-2">
        <Zap className="w-4 h-4 mt-0.5 text-warning shrink-0" />
        <span><strong>Prompt 缓存：</strong>开启缓存可加速重复内容的生成</span>
      </li>
    </ul>
  )
}
