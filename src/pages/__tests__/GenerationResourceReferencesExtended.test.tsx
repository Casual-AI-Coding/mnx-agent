import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import VoiceSync from '../VoiceSync'
import VoiceAsync from '../VoiceAsync'
import LyricsGeneration from '../LyricsGeneration'
import VideoAgent from '../VideoAgent'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('framer-motion', () => {
  const React = require('react') as typeof import('react')
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop: string) {
      return ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
        const { initial, animate, transition, whileHover, whileTap, exit, variants, layout, ...domProps } = props
        return React.createElement(prop, domProps, children)
      }
    },
  }
  return {
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
    motion: new Proxy({}, handler),
  }
})

vi.mock('@/components/resources/ResourceReferenceCard', () => ({
  ResourceReferenceCard: ({ generationType, onApplyTemplate, onApplyMaterialItem }: {
    generationType: string
    onApplyTemplate?: (payload: { content: string; reference: { source: 'prompt_template'; id: string; name: string; category: string } }) => void
    onApplyMaterialItem?: (payload: { lyrics: string; reference: { source: 'material_item'; id: string; name: string } }) => void
  }) => (
    <div>
      <span>资源引用</span>
      {onApplyTemplate && (
        <button
          type="button"
          onClick={() => onApplyTemplate({
            content: `${generationType} resource template`,
            reference: {
              source: 'prompt_template',
              id: `${generationType}-template`,
              name: `${generationType} template`,
              category: generationType,
            },
          })}
        >
          应用{generationType}模板
        </button>
      )}
      {onApplyMaterialItem && (
        <button
          type="button"
          onClick={() => onApplyMaterialItem({
            lyrics: `${generationType} material lyrics`,
            reference: { source: 'material_item', id: `${generationType}-song`, name: '测试歌曲' },
          })}
        >
          应用{generationType}素材
        </button>
      )}
    </div>
  ),
}))

vi.mock('@/components/shared/PageHeader', () => ({
  PageHeader: ({ title, actions }: { title: string; actions?: React.ReactNode }) => <header><h1>{title}</h1>{actions}</header>,
}))

vi.mock('@/components/shared/WorkbenchActions', () => ({
  WorkbenchActions: () => <div>actions</div>,
}))

vi.mock('../VoiceSync/VoiceSyncForm', () => ({
  VoiceSyncForm: ({ text, onTextChange }: { text: string; onTextChange: (value: string) => void }) => (
    <textarea aria-label="voice-sync-text" value={text} onChange={(event) => onTextChange(event.target.value)} />
  ),
}))

vi.mock('../VoiceSync/VoiceResult', () => ({
  VoiceResult: () => <div>voice result</div>,
}))

vi.mock('../VoiceSync/VoiceSettings', () => ({
  VoiceSettings: () => <div>voice settings</div>,
}))

vi.mock('../VoiceSync/VoiceConfigSummary', () => ({
  VoiceConfigSummary: () => <div>voice summary</div>,
}))

vi.mock('../VoiceAsync/VoiceAsyncForm', () => ({
  VoiceAsyncForm: ({ formData, onFormChange }: {
    formData: { text: string }
    onFormChange: (data: { text?: string; activeTab?: 'text' }) => void
  }) => (
    <textarea aria-label="voice-async-text" value={formData.text} onChange={(event) => onFormChange({ text: event.target.value })} />
  ),
}))

vi.mock('../VoiceAsync/VoiceHistory', () => ({
  VoiceHistory: () => <div>voice async history</div>,
}))

vi.mock('../LyricsGeneration/LyricsGenerationForm', () => ({
  LyricsGenerationForm: ({ prompt, lyrics, resourceReferenceSlot }: {
    prompt: string
    lyrics: string
    resourceReferenceSlot?: React.ReactNode
  }) => (
    <div>
      {resourceReferenceSlot}
      <textarea aria-label="lyrics-prompt" value={prompt} readOnly />
      <textarea aria-label="lyrics-source" value={lyrics} readOnly />
    </div>
  ),
}))

vi.mock('../LyricsGeneration/LyricsGenerationResults', () => ({
  LyricsGenerationResults: () => <div>lyrics results</div>,
}))

vi.mock('../VideoAgent/VideoInputForm.js', () => ({
  VideoInputForm: ({ promptPreview }: { promptPreview: string }) => (
    <div aria-label="video-agent-prompt-preview">{promptPreview}</div>
  ),
}))

vi.mock('../VideoAgent/VideoHistoryList.js', () => ({
  VideoHistoryList: () => <div>video agent history</div>,
}))

vi.mock('@/lib/api/voice', () => ({
  createSyncVoice: vi.fn(),
  createAsyncVoice: vi.fn(),
  getAsyncVoiceStatus: vi.fn(),
}))

vi.mock('@/lib/api/lyrics', () => ({
  generateLyrics: vi.fn(),
}))

vi.mock('@/lib/api/video', () => ({
  createVideo: vi.fn(),
  getVideoStatus: vi.fn(),
}))

vi.mock('@/lib/api/media', () => ({
  uploadMedia: vi.fn(),
  createMedia: vi.fn(),
}))

vi.mock('@/stores/history', () => ({
  useHistoryStore: () => ({ addItem: vi.fn() }),
}))

vi.mock('@/stores/usage', () => ({
  useUsageStore: () => ({ addUsage: vi.fn() }),
}))

const settingsState = {
  settings: {
    api: {
      minimaxKey: 'test-key',
      region: 'intl',
    },
    generation: {
      voice: {
        model: 'speech-2.6-hd',
        voiceId: 'male-qn-qingse',
        emotion: 'auto',
        speed: 1,
        volume: 1,
        pitch: 0,
      },
    },
  },
}

function useSettingsStore(selector?: (state: typeof settingsState) => unknown) {
  return selector ? selector(settingsState) : settingsState
}

useSettingsStore.getState = () => settingsState

vi.mock('@/settings/store', () => ({
  useSettingsStore,
}))

vi.mock('@/hooks/useFormPersistence', () => ({
  FORM_PERSISTENCE_KEYS: {
    LYRICS_GENERATION: 'lyrics-generation',
    VIDEO_AGENT: 'video-agent',
  },
  useFormPersistence: <T,>({ defaultValue }: { defaultValue: T }) => {
    const React = require('react') as typeof import('react')
    return React.useState<T>(defaultValue)
  },
}))

vi.mock('@/hooks', () => ({
  FORM_PERSISTENCE_KEYS: {
    LYRICS_GENERATION: 'lyrics-generation',
  },
  useFormPersistence: <T,>({ defaultValue }: { defaultValue: T }) => {
    const React = require('react') as typeof import('react')
    return React.useState<T>(defaultValue)
  },
}))

describe('extended generation page resource references', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('语音同步页面应用 Prompt 资源后写入文本字段', async () => {
    const user = userEvent.setup()
    render(<VoiceSync />)

    await user.click(screen.getByRole('button', { name: '应用voice模板' }))

    expect(screen.getByLabelText('voice-sync-text')).toHaveProperty('value', 'voice resource template')
  })

  it('语音异步页面应用 Prompt 资源后写入文本字段', async () => {
    const user = userEvent.setup()
    render(<VoiceAsync />)

    await user.click(screen.getByRole('button', { name: '应用voice模板' }))

    expect(screen.getByLabelText('voice-async-text')).toHaveProperty('value', 'voice resource template')
  })

  it('歌词生成页面应用模板和素材后写入提示词与歌词字段', async () => {
    const user = userEvent.setup()
    render(<LyricsGeneration />)

    await user.click(screen.getByRole('button', { name: '应用lyrics模板' }))
    await user.click(screen.getByRole('button', { name: '应用lyrics素材' }))

    expect(screen.getByLabelText('lyrics-prompt')).toHaveProperty('value', 'lyrics resource template')
    expect(screen.getByLabelText('lyrics-source')).toHaveProperty('value', 'lyrics material lyrics')
  })

  it('视频智能体页面应用 Prompt 资源后写入自定义提示词预览', async () => {
    const user = userEvent.setup()
    render(<VideoAgent />)

    await user.click(screen.getByRole('button', { name: '应用video-agent模板' }))

    expect(screen.getByLabelText('video-agent-prompt-preview')).toHaveProperty('textContent', 'video-agent resource template')
  })
})
