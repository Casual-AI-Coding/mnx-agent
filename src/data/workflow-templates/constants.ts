import { services, status } from '@/themes/tokens'
import type { TemplateCategory, TemplateCategoryInfo } from './types'

export const TEMPLATE_CATEGORIES: Record<TemplateCategory, TemplateCategoryInfo> = {
  text: { label: '文本处理', icon: 'MessageSquare', color: services.text.icon },
  image: { label: '图像生成', icon: 'Image', color: services.image.icon },
  voice: { label: '语音合成', icon: 'Mic', color: services.voice.icon },
  video: { label: '视频制作', icon: 'Video', color: services.video.icon },
  music: { label: '音乐生成', icon: 'Music', color: services.music.icon },
  audio: { label: '音频', icon: 'Volume2', color: services.voice.icon },
  workflow: { label: '工作流', icon: 'GitBranch', color: status.info.icon },
  code: { label: '代码', icon: 'Code2', color: status.info.icon },
  productivity: { label: '生产力', icon: 'Rocket', color: status.success.icon },
  education: { label: '教育', icon: 'GraduationCap', color: status.warning.icon },
  creative: { label: '创意', icon: 'Palette', color: services.image.icon },
  analytics: { label: '数据分析', icon: 'BarChart3', color: status.info.icon },
  automation: { label: '自动化', icon: 'Zap', color: services.music.icon },
}
