export interface ServiceInput {
  name: string
  type: string
  description: string
  required: boolean
}

export interface ServiceOutput {
  name: string
  type: string
  description: string
}

export interface ServiceExample {
  title: string
  config: Record<string, unknown>
}

export interface ServiceDoc {
  service: string
  method: string
  category: string
  description: string
  inputs: ServiceInput[]
  outputs: ServiceOutput[]
  examples: ServiceExample[]
  notes?: string[]
}

export const SERVICE_DOCUMENTATION: ServiceDoc[] = [
  {
    service: 'text',
    method: 'generate',
    category: '文本生成',
    description: '使用 MiniMax 大语言模型生成文本内容。支持自定义模型参数、温度、最大令牌数等。',
    inputs: [
      { name: 'model', type: 'string', description: '模型标识符，如 abab6.5s', required: true },
      { name: 'prompt', type: 'string', description: '输入提示词，支持模板变量如 {{input.text}}', required: true },
      { name: 'temperature', type: 'number', description: '采样温度，0-2，越高越创造性', required: false },
      { name: 'max_tokens', type: 'number', description: '生成文本的最大长度', required: false },
    ],
    outputs: [
      { name: 'text', type: 'string', description: '生成的文本内容' },
      { name: 'usage', type: 'object', description: '令牌使用统计，包含 prompt_tokens 和 completion_tokens' },
      { name: 'model', type: 'string', description: '实际使用的模型' },
    ],
    examples: [
      {
        title: '简单问答',
        config: {
          model: 'abab6.5s',
          prompt: '请回答: {{input.question}}',
          temperature: 0.7
        }
      },
      {
        title: '翻译助手',
        config: {
          model: 'abab6.5s',
          prompt: '将以下内容翻译成英文:\n\n{{input.text}}',
          temperature: 0.3
        }
      },
    ],
    notes: [
      'temperature 建议值：创意写作 0.8-1.2，问答 0.3-0.7',
      'max_tokens 默认根据模型不同而变化',
      '支持流式输出（需在高级设置中配置）',
    ]
  },
  {
    service: 'text',
    method: 'chat',
    category: '文本生成',
    description: '使用 MiniMax 大语言模型进行多轮对话。支持对话历史上下文。',
    inputs: [
      { name: 'model', type: 'string', description: '模型标识符', required: true },
      { name: 'messages', type: 'array', description: '对话消息数组，格式 [{role, content}]', required: true },
      { name: 'temperature', type: 'number', description: '采样温度，0-2', required: false },
    ],
    outputs: [
      { name: 'choices', type: 'array', description: '模型响应选择列表' },
      { name: 'usage', type: 'object', description: '令牌使用统计' },
    ],
    examples: [
      {
        title: '多轮对话',
        config: {
          model: 'abab6.5s',
          messages: [
            { role: 'system', content: '你是一个有帮助的助手' },
            { role: 'user', content: '{{input.question}}' }
          ]
        }
      },
    ],
  },
  {
    service: 'image',
    method: 'generate',
    category: '图像生成',
    description: '根据文本描述生成图像。支持多种宽高比和生成数量。',
    inputs: [
      { name: 'prompt', type: 'string', description: '图像描述，越详细效果越好', required: true },
      { name: 'aspect_ratio', type: 'string', description: '宽高比: 1:1, 16:9, 9:16, 4:3, 3:4', required: false },
      { name: 'n', type: 'number', description: '生成数量 1-4', required: false },
    ],
    outputs: [
      { name: 'images', type: 'array', description: '生成的图像URL列表' },
      { name: 'seed', type: 'number', description: '生成种子，可用于复现' },
    ],
    examples: [
      {
        title: '生成风景图',
        config: {
          prompt: '一片宁静的湖面，远处有雪山，日落时分，金色光芒',
          aspect_ratio: '16:9',
          n: 1
        }
      },
    ],
    notes: [
      'prompt 建议包含：主体、场景、光线、风格、色彩',
      '生成时间约 5-15 秒',
      '支持中文和英文描述',
    ]
  },
  {
    service: 'voice_sync',
    method: 'generate',
    category: '语音合成',
    description: '同步语音合成，适用于短文本（< 2000字），即时返回音频。',
    inputs: [
      { name: 'text', type: 'string', description: '要合成的文本内容', required: true },
      { name: 'voice_id', type: 'string', description: '音色ID，如 female-shaonv', required: true },
      { name: 'speed', type: 'number', description: '语速 0.5-2，默认 1', required: false },
      { name: 'vol', type: 'number', description: '音量 0.1-10，默认 1', required: false },
    ],
    outputs: [
      { name: 'audio_url', type: 'string', description: '生成的音频文件URL' },
      { name: 'duration', type: 'number', description: '音频时长（秒）' },
    ],
    examples: [
      {
        title: '简单配音',
        config: {
          text: '{{input.content}}',
          voice_id: 'female-shaonv',
          speed: 1.0,
          vol: 1.0
        }
      },
    ],
    notes: [
      '文本长度建议 < 2000 字符',
      '支持 SSML 标签进行精细控制',
      '同步接口超时时间为 60 秒',
    ]
  },
  {
    service: 'voice_async',
    method: 'generate',
    category: '语音合成',
    description: '异步语音合成，适用于长文本，通过任务队列处理。',
    inputs: [
      { name: 'text', type: 'string', description: '要合成的长文本内容', required: true },
      { name: 'voice_id', type: 'string', description: '音色ID', required: true },
      { name: 'speed', type: 'number', description: '语速 0.5-2', required: false },
    ],
    outputs: [
      { name: 'task_id', type: 'string', description: '任务ID，用于查询结果' },
      { name: 'status', type: 'string', description: '任务状态' },
    ],
    examples: [
      {
        title: '长文本配音',
        config: {
          text: '{{input.article}}',
          voice_id: 'male-qingshuai',
          speed: 1.2
        }
      },
    ],
    notes: [
      '适合长文章、电子书等场景',
      '任务完成后通过 webhook 通知',
      '可在任务队列中查看进度',
    ]
  },
  {
    service: 'music',
    method: 'generate',
    category: '音乐生成',
    description: '根据描述生成音乐。支持纯音乐和带歌词的歌曲。',
    inputs: [
      { name: 'prompt', type: 'string', description: '音乐描述，包含风格、情绪、主题', required: true },
      { name: 'duration', type: 'number', description: '时长秒数，建议 10-60', required: false },
      { name: 'with_lyrics', type: 'boolean', description: '是否生成带歌词的音乐', required: false },
    ],
    outputs: [
      { name: 'audio_url', type: 'string', description: '生成的音乐文件URL' },
      { name: 'lyrics', type: 'string', description: '生成的歌词（如带歌词）' },
      { name: 'duration', type: 'number', description: '实际生成时长' },
    ],
    examples: [
      {
        title: '轻快背景音乐',
        config: {
          prompt: '轻快的背景音乐，适合瑜伽冥想，有自然声音',
          duration: 30,
          with_lyrics: false
        }
      },
      {
        title: '流行歌曲',
        config: {
          prompt: '一首关于爱情的流行歌曲，中文，温柔抒情',
          duration: 60,
          with_lyrics: true
        }
      },
    ],
    notes: [
      '描述越详细，生成效果越好',
      '可指定乐器、节奏、风格',
      '带歌词生成时间更长',
    ]
  },
  {
    service: 'video',
    method: 'generate',
    category: '视频生成',
    description: '根据文本描述生成视频。支持文生视频。',
    inputs: [
      { name: 'prompt', type: 'string', description: '视频场景描述', required: true },
      { name: 'duration', type: 'number', description: '时长秒数 5-10', required: false },
      { name: 'aspect_ratio', type: 'string', description: '宽高比 16:9, 9:16, 1:1', required: false },
    ],
    outputs: [
      { name: 'video_url', type: 'string', description: '生成的视频文件URL' },
      { name: 'cover_url', type: 'string', description: '视频封面图URL' },
      { name: 'duration', type: 'number', description: '实际生成时长' },
    ],
    examples: [
      {
        title: '动态场景',
        config: {
          prompt: '一只金毛犬在草地上奔跑，阳光明媚，镜头跟随',
          duration: 5,
          aspect_ratio: '16:9'
        }
      },
    ],
    notes: [
      '生成时间较长，约 1-5 分钟',
      '支持动作描述和镜头语言',
      '建议描述包含主体、动作、场景',
    ]
  },
]

export function getServiceDoc(service: string, method: string): ServiceDoc | undefined {
  return SERVICE_DOCUMENTATION.find(d => d.service === service && d.method === method)
}

export function getServiceDocsByCategory(category: string): ServiceDoc[] {
  return SERVICE_DOCUMENTATION.filter(d => d.category === category)
}

export function getAllCategories(): string[] {
  const categories = new Set(SERVICE_DOCUMENTATION.map(d => d.category))
  return Array.from(categories)
}

export function getAllServices(): string[] {
  const services = new Set(SERVICE_DOCUMENTATION.map(d => d.service))
  return Array.from(services)
}

export function getMethodsByService(service: string): string[] {
  return SERVICE_DOCUMENTATION
    .filter(d => d.service === service)
    .map(d => d.method)
}
