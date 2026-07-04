import { Video } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { WorkbenchActions } from '@/components/shared/WorkbenchActions'

interface VideoGenerationHeaderProps {
  generateCurl: () => string
  onClear: () => void
}

export function VideoGenerationHeader({ generateCurl, onClear }: VideoGenerationHeaderProps) {
  return (
    <PageHeader
      icon={<Video className="w-5 h-5" />}
      title="视频生成"
      description="AI 视频内容生成"
      gradient="orange-amber"
      actions={
        <WorkbenchActions
          helpTitle="视频生成帮助"
          helpTips={<VideoHelpTips />}
          generateCurl={generateCurl}
          onClear={onClear}
          clearLabel="清空表单"
        />
      }
    />
  )
}

function VideoHelpTips() {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">视频生成使用技巧：</p>
      <ul className="text-sm text-muted-foreground space-y-1.5">
        <li>• <strong>提示词质量</strong>：提供详细、清晰的场景描述，包括主体、动作、环境、光照等要素</li>
        <li>• <strong>分辨率选择</strong>：标准模型适合大多数场景，实时模型提供更快速响应</li>
        <li>• <strong>时长限制</strong>：生成视频通常为 5-10 秒，适合短视频和动态演示</li>
        <li>• <strong>镜头控制</strong>：使用镜头运动指令（推近、拉远、平移等）增强视觉表现力</li>
        <li>• <strong>模型选择</strong>：video-01 为标准模型，video-01-live 为实时生成模型</li>
      </ul>
    </div>
  )
}
