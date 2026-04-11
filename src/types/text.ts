// Re-export from centralized models
export {
  TEXT_MODELS,
  SYSTEM_PROMPT_TEMPLATES,
  TEXT_MODELS as textModelOptions,
} from '../models'

// Text API types (not in centralized models)
export type Region = 'cn' | 'intl'

export interface MiniMaxConfig {
  apiKey: string
  region: Region
}

export const API_HOSTS: Record<Region, string> = {
  cn: 'https://api.minimaxi.com',
  intl: 'https://api.minimax.io',
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ChatContent[]
}

export interface ChatContent {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

export interface ChatCompletionRequest {
  model: string
  messages: ChatMessage[]
  stream?: boolean
  temperature?: number
  top_p?: number
  max_completion_tokens?: number
  tools?: Tool[]
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } }
  caching?: {
    mode: 'speed' | 'quality'
  }
}

export interface Tool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface ChatCompletionResponse {
  id: string
  choices: {
    index: number
    message: {
      role: string
      content: string
      tool_calls?: ToolCall[]
    }
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  created: number
  model: string
  object: string
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface ChatCompletionStreamChunk {
  id: string
  choices: {
    index: number
    delta: {
      role?: string
      content?: string
      tool_calls?: Partial<ToolCall>[]
    }
    finish_reason: string | null
  }[]
  created: number
  model: string
  object: string
}
