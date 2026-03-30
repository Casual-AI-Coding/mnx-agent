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

export const TEXT_MODELS = [
  { id: 'MiniMax-M2.7', name: 'MiniMax-M2.7', description: '最新旗舰模型，综合能力最强' },
  { id: 'MiniMax-M2.7-highspeed', name: 'MiniMax-M2.7-highspeed', description: '高速版本，更快响应速度' },
  { id: 'MiniMax-M2.5', name: 'MiniMax-M2.5', description: '旗舰模型，综合能力最强' },
  { id: 'MiniMax-M2.5-highspeed', name: 'MiniMax-M2.5-highspeed', description: '高速版本，更快响应速度' },
  { id: 'M2-her', name: 'M2-her', description: '角色扮演模型，支持丰富角色设定' },
  { id: 'MiniMax-M2.1', name: 'MiniMax-M2.1', description: '推理模型，深度思考能力' },
  { id: 'MiniMax-M2', name: 'MiniMax-M2', description: '推理模型，均衡性能' },
  { id: 'MiniMax-Text-01', name: 'MiniMax-Text-01', description: '经典文本模型' },
] as const

export const SYSTEM_PROMPT_TEMPLATES = [
  { id: 'general', name: '通用助手', prompt: '你是一个有帮助的 AI 助手，用简洁、准确的方式回答用户的问题。' },
  { id: 'code', name: '代码专家', prompt: '你是一个资深的编程专家，精通多种编程语言和框架。请用清晰、专业的方式回答编程相关问题，必要时提供代码示例。' },
  { id: 'writing', name: '写作助手', prompt: '你是一个专业的写作助手，擅长各类文体的创作和润色。请帮助用户提升文章的表达力和感染力。' },
  { id: 'translate', name: '翻译专家', prompt: '你是一个专业的翻译专家，精通多国语言。请准确、地道地翻译用户提供的内容，保持原文的风格和语气。' },
  { id: 'roleplay', name: '角色扮演', prompt: '你是一个善于角色扮演的 AI，能够根据用户设定的角色进行生动的对话和互动。' },
] as const