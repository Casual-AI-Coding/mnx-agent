import { useTranslation } from 'react-i18next'
import { FileText } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { WorkbenchActions } from '@/components/shared/WorkbenchActions'

interface LyricsGenerationHeaderProps {
  readonly generateCurl: () => string
  readonly onClear: () => void
}

export function LyricsGenerationHeader({ generateCurl, onClear }: LyricsGenerationHeaderProps) {
  const { t } = useTranslation()

  return (
    <PageHeader
      title={t('lyrics.title')}
      description="AI 辅助歌词创作与优化"
      icon={<FileText className="w-5 h-5" />}
      gradient="violet-purple"
      actions={
        <WorkbenchActions
          helpTitle={t('lyrics.creationTipsTitle') || '歌词创作提示'}
          helpTips={<LyricsHelpTips />}
          generateCurl={generateCurl}
          onClear={onClear}
          clearLabel={t('common.clear')}
        />
      }
    />
  )
}

function LyricsHelpTips() {
  return (
    <ul className="text-xs text-muted-foreground space-y-2">
      <li className="whitespace-normal">• 写整首歌：提供主题和风格描述；编辑模式：优化已有歌词</li>
      <li className="whitespace-normal">• 提示词越具体，生成结果越符合预期</li>
    </ul>
  )
}
