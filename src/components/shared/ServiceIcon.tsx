import { memo } from 'react'
import {
  FileText,
  Mic,
  Image as ImageIcon,
  Music,
  Video,
} from 'lucide-react'
import type { ServiceType } from '@/types/cron'
import { services } from '@/themes/tokens'
import { cn } from '@/lib/utils'

interface ServiceIconProps {
  type: ServiceType
}

export const ServiceIcon = memo(function ServiceIcon({ type }: ServiceIconProps) {
  const icons: Record<ServiceType, React.ReactNode> = {
    text: <FileText className="w-5 h-5" />,
    voice_sync: <Mic className="w-5 h-5" />,
    voice_async: <Mic className="w-5 h-5" />,
    image: <ImageIcon className="w-5 h-5" />,
    music: <Music className="w-5 h-5" />,
    video: <Video className="w-5 h-5" />,
  }

  const colors: Record<ServiceType, { bg: string; text: string }> = {
    text: { bg: services.text.bg, text: services.text.icon },
    voice_sync: { bg: services.voice.bg, text: services.voice.icon },
    voice_async: { bg: services.voice.bg, text: services.voice.icon },
    image: { bg: services.image.bg, text: services.image.icon },
    music: { bg: services.music.bg, text: services.music.icon },
    video: { bg: services.video.bg, text: services.video.icon },
  }

  return (
    <div className={cn('p-2 rounded-lg', colors[type].bg, colors[type].text)}>
      {icons[type]}
    </div>
  )
})
