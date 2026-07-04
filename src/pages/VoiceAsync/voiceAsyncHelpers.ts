import { uploadMedia, type MediaSource } from '@/lib/api/media'
import { useSettingsStore } from '@/settings/store'
import type { VoiceFormData } from './types'

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
}

export async function saveVoiceAsyncToMedia(
  audioUrl: string,
  filename: string,
  source: MediaSource,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    const response = await fetch(audioUrl)
    const blob = await response.blob()
    await uploadMedia(blob, filename, 'audio', source, metadata)
  } catch (error) {
    console.error('Failed to save media:', error)
  }
}

export function buildVoiceAsyncCurl(formData: VoiceFormData): string {
  const { settings } = useSettingsStore.getState()
  const apiKey = settings.api.minimaxKey || 'YOUR_API_KEY'
  const baseUrl = settings.api.region === 'intl'
    ? 'https://api.minimaxi.com'
    : 'https://api.minimax.chat'
  const payload = {
    model: formData.model,
    text: formData.activeTab === 'text' ? formData.text : undefined,
    file_id: formData.activeTab === 'file' ? formData.fileId : undefined,
    voice_setting: {
      voice_id: formData.voiceId,
      speed: formData.speed,
      vol: formData.volume,
      pitch: formData.pitch,
      emotion: formData.emotion,
    },
    audio_setting: {
      sample_rate: 24000,
      bitrate: 128000,
      format: 'mp3',
      channel: 1,
    },
  }

  return `curl -X POST "${baseUrl}/v1/t2a_async" \
  -H "Authorization: Bearer ${apiKey}" \
  -H "Content-Type: application/json" \
  -d '${JSON.stringify(JSON.parse(JSON.stringify(payload)), null, 2)}'`
}
