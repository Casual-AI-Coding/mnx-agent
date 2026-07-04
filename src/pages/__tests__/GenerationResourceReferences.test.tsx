import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TextGeneration from '../TextGeneration'
import ImageGeneration from '../ImageGeneration'
import MusicGeneration from '../MusicGeneration'

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
    generationType: 'text' | 'image' | 'music' | 'video'
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
            lyrics: 'music material lyrics',
            reference: { source: 'material_item', id: 'song-1', name: '测试歌曲' },
          })}
        >
          应用音乐素材
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

vi.mock('@/components/shared/APIReference', () => ({
  APIReference: () => <div>api reference</div>,
}))

vi.mock('@/components/shared/WarningBanner', () => ({
  default: ({ message }: { message: string }) => <div>{message}</div>,
}))

vi.mock('../ImageGeneration/ImageReferenceUpload.js', () => ({
  ImageReferenceUpload: () => <div>image reference upload</div>,
}))

vi.mock('../ImageGeneration/ImageParametersCard.js', () => ({
  ImageParametersCard: () => <div>image parameters</div>,
}))

vi.mock('../ImageGeneration/ImageResultsPanel.js', () => ({
  ImageResultsPanel: () => <div>image results</div>,
}))

vi.mock('@/lib/api/text', () => ({
  streamChatCompletion: vi.fn(),
}))

vi.mock('@/lib/api/image', () => ({
  generateImage: vi.fn(),
}))

vi.mock('@/lib/api/music', () => ({
  generateMusic: vi.fn(),
  preprocessMusic: vi.fn(),
}))

vi.mock('@/lib/api/media', () => ({
  uploadMediaFromUrl: vi.fn(),
  toggleFavorite: vi.fn(),
  togglePublic: vi.fn(),
  deleteMedia: vi.fn(),
}))

vi.mock('@/stores/history', () => ({
  useHistoryStore: () => ({
    addItem: vi.fn(),
  }),
}))

vi.mock('@/stores/usage', () => ({
  useUsageStore: () => ({
    addUsage: vi.fn(),
  }),
}))

const settingsState = {
  settings: {
    api: {
      minimaxKey: 'test-key',
    },
    generation: {
      text: {
        model: 'abab6.5s-chat',
        promptCaching: false,
      },
      image: {
        model: 'image-01',
        aspectRatio: '1:1',
        numImages: 1,
      },
      music: {
        model: 'music-2.6',
        optimizeLyrics: false,
      },
    },
  },
}

vi.mock('@/settings/store', () => ({
  useSettingsStore: (selector?: (state: typeof settingsState) => unknown) => selector ? selector(settingsState) : settingsState,
}))

vi.mock('@/hooks/useFormPersistence', () => ({
  FORM_PERSISTENCE_KEYS: {
    TEXT_GENERATION: 'text-generation',
    IMAGE_GENERATION: 'image-generation',
    MUSIC_GENERATION: 'music-generation',
  },
  useFormPersistence: <T,>({ defaultValue }: { defaultValue: T }) => {
    const React = require('react') as typeof import('react')
    return React.useState<T>(defaultValue)
  },
}))

vi.mock('@/hooks', () => ({
  FORM_PERSISTENCE_KEYS: {
    MUSIC_GENERATION: 'music-generation',
  },
  useFormPersistence: <T,>({ defaultValue }: { defaultValue: T }) => {
    const React = require('react') as typeof import('react')
    return React.useState<T>(defaultValue)
  },
}))

describe('generation page resource references', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('文本生成页应用 Prompt 资源后写入聊天输入框', async () => {
    const user = userEvent.setup()
    render(<TextGeneration />)

    await user.click(screen.getByRole('button', { name: '应用text模板' }))

    expect(screen.getByPlaceholderText('textGeneration.placeholder')).toHaveProperty('value', 'text resource template')
  })

  it('图像生成页应用 Prompt 资源后写入提示词输入框', async () => {
    const user = userEvent.setup()
    render(<ImageGeneration />)

    await user.click(screen.getByRole('button', { name: '应用image模板' }))

    expect(screen.getByPlaceholderText('imageGeneration.placeholder')).toHaveProperty('value', 'image resource template')
  })

  it('音乐生成页应用模板和素材后写入风格与歌词字段', async () => {
    const user = userEvent.setup()
    render(<MusicGeneration />)

    await user.click(screen.getByRole('button', { name: '应用music模板' }))
    await user.click(screen.getByRole('button', { name: '应用音乐素材' }))

    expect(screen.getByPlaceholderText('musicGeneration.stylePlaceholder')).toHaveProperty('value', 'music resource template')
    expect(screen.getByPlaceholderText('musicGeneration.lyricsPlaceholder')).toHaveProperty('value', 'music material lyrics')
  })
})
