import type { WorkflowTemplate } from './types'

export const BUILTIN_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'template-ai-content-assistant',
    name: 'AI内容创作助手',
    description: '自动根据主题生成文章大纲、正文内容和配图，一站式内容创作工作流',
    category: 'text',
    tags: ['内容创作', '自动写作', '图文生成', '营销'],
    difficulty: 'intermediate',
    estimatedTime: '3-5分钟',
    nodes: [
      {
        id: 'input-1',
        type: 'input',
        data: {
          label: '输入主题',
          config: {
            description: '输入要创作的主题',
            inputType: 'textarea',
          },
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'action-gen-outline',
        type: 'action',
        data: {
          label: '生成大纲',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '你是一个专业的内容策划师，请根据主题生成详细的大纲。',
                },
              ],
              temperature: 0.7,
            },
          },
        },
        position: { x: 300, y: 0 },
      },
      {
        id: 'action-write-content',
        type: 'action',
        data: {
          label: '撰写正文',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '你是一个专业的内容写手，请根据大纲撰写详细内容。',
                },
              ],
              temperature: 0.8,
            },
          },
        },
        position: { x: 600, y: 0 },
      },
      {
        id: 'action-gen-image',
        type: 'action',
        data: {
          label: '生成配图',
          config: {
            service: 'minimaxClient',
            method: 'imageGeneration',
            params: {
              prompt: '根据文章主题生成配图',
              model: 'image-01',
              n: 1,
            },
          },
        },
        position: { x: 900, y: 0 },
      },
      {
        id: 'output-1',
        type: 'output',
        data: {
          label: '输出结果',
        },
        position: { x: 1200, y: 0 },
      },
    ],
    edges: [
      { id: 'e-input-gen', source: 'input-1', target: 'action-gen-outline' },
      { id: 'e-outline-write', source: 'action-gen-outline', target: 'action-write-content' },
      { id: 'e-write-image', source: 'action-write-content', target: 'action-gen-image' },
      { id: 'e-gen-output', source: 'action-gen-image', target: 'output-1' },
    ],
  },
  {
    id: 'template-customer-service-bot',
    name: '智能客服机器人',
    description: '自动分析用户问题，查询知识库，生成专业回复的客服工作流',
    category: 'text',
    tags: ['客服', '知识库', '自动回复', '企业'],
    difficulty: 'advanced',
    estimatedTime: '5-10分钟',
    nodes: [
      {
        id: 'input-2',
        type: 'input',
        data: {
          label: '用户问题',
          config: {
            description: '输入用户咨询的问题',
            inputType: 'textarea',
          },
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'action-analyze',
        type: 'action',
        data: {
          label: '意图分析',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '你是一个专业的客服分析师，请分析用户问题的意图和关键信息。',
                },
              ],
              temperature: 0.3,
            },
          },
        },
        position: { x: 300, y: 0 },
      },
      {
        id: 'action-knowledge',
        type: 'action',
        data: {
          label: '知识库检索',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '根据分析结果，从知识库中检索相关答案。',
                },
              ],
              temperature: 0.5,
            },
          },
        },
        position: { x: 600, y: 0 },
      },
      {
        id: 'action-reply',
        type: 'action',
        data: {
          label: '生成回复',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '基于知识库检索结果，生成专业、友好的客服回复。',
                },
              ],
              temperature: 0.7,
            },
          },
        },
        position: { x: 900, y: 0 },
      },
      {
        id: 'output-2',
        type: 'output',
        data: {
          label: '客服回复',
        },
        position: { x: 1200, y: 0 },
      },
    ],
    edges: [
      { id: 'e-input-analyze', source: 'input-2', target: 'action-analyze' },
      { id: 'e-analyze-knowledge', source: 'action-analyze', target: 'action-knowledge' },
      { id: 'e-knowledge-reply', source: 'action-knowledge', target: 'action-reply' },
      { id: 'e-reply-output', source: 'action-reply', target: 'output-2' },
    ],
  },
  {
    id: 'template-product-description',
    name: '产品描述生成器',
    description: '根据产品特性自动生成多风格营销文案，适配不同平台',
    category: 'text',
    tags: ['电商', '文案', '多平台', 'SEO'],
    difficulty: 'beginner',
    estimatedTime: '1-3分钟',
    nodes: [
      {
        id: 'input-3',
        type: 'input',
        data: {
          label: '产品信息',
          config: {
            description: '输入产品特性、规格、目标受众',
            inputType: 'textarea',
          },
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'action-seo',
        type: 'action',
        data: {
          label: 'SEO优化',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '你是一个SEO专家，请为产品描述生成优化关键词。',
                },
              ],
              temperature: 0.5,
            },
          },
        },
        position: { x: 300, y: 0 },
      },
      {
        id: 'action-description',
        type: 'action',
        data: {
          label: '生成描述',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '基于产品信息和SEO关键词，生成多个平台的营销文案。',
                },
              ],
              temperature: 0.8,
            },
          },
        },
        position: { x: 600, y: 0 },
      },
      {
        id: 'output-3',
        type: 'output',
        data: {
          label: '营销文案',
        },
        position: { x: 900, y: 0 },
      },
    ],
    edges: [
      { id: 'e-input-seo', source: 'input-3', target: 'action-seo' },
      { id: 'e-seo-desc', source: 'action-seo', target: 'action-description' },
      { id: 'e-desc-output', source: 'action-description', target: 'output-3' },
    ],
  },
  {
    id: 'template-image-style-transfer',
    name: 'AI风格迁移',
    description: '上传图片并指定目标风格，AI自动进行风格转换和多版本输出',
    category: 'image',
    tags: ['图片处理', '风格转换', '创意设计', '艺术'],
    difficulty: 'intermediate',
    estimatedTime: '2-4分钟',
    nodes: [
      {
        id: 'input-4',
        type: 'input',
        data: {
          label: '上传图片',
          config: {
            description: '上传要转换风格的图片URL',
            inputType: 'text',
          },
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'action-gen-image',
        type: 'action',
        data: {
          label: '生成风格化图片',
          config: {
            service: 'minimaxClient',
            method: 'imageGeneration',
            params: {
              prompt: '将上传的图片转换为指定艺术风格',
              model: 'image-01',
              n: 4,
            },
          },
        },
        position: { x: 300, y: 0 },
      },
      {
        id: 'output-4',
        type: 'output',
        data: {
          label: '风格化结果',
        },
        position: { x: 600, y: 0 },
      },
    ],
    edges: [
      { id: 'e-input-gen', source: 'input-4', target: 'action-gen-image' },
      { id: 'e-gen-output', source: 'action-gen-image', target: 'output-4' },
    ],
  },
  {
    id: 'template-image-pipeline',
    name: '图片分析流水线',
    description: '上传图片 → AI分析内容 → 生成描述标签 → 根据分析结果优化配图',
    category: 'image',
    tags: ['图片分析', '内容识别', '自动化', '标签生成'],
    difficulty: 'advanced',
    estimatedTime: '3-6分钟',
    nodes: [
      {
        id: 'input-5',
        type: 'input',
        data: {
          label: '上传图片',
          config: {
            description: '输入要分析的图片URL',
            inputType: 'text',
          },
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'action-analyze',
        type: 'action',
        data: {
          label: '内容分析',
          config: {
            service: 'minimaxClient',
            method: 'imageGeneration',
            params: {
              prompt: '分析图片内容，提取关键元素、色彩、构图信息',
              model: 'image-01',
              n: 1,
            },
          },
        },
        position: { x: 300, y: 0 },
      },
      {
        id: 'action-describe',
        type: 'action',
        data: {
          label: '生成描述标签',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '根据图片分析结果，提供5-8个关键词标签和一段描述文本。',
                },
              ],
              temperature: 0.5,
            },
          },
        },
        position: { x: 600, y: 0 },
      },
      {
        id: 'action-enhance',
        type: 'action',
        data: {
          label: '增强优化',
          config: {
            service: 'minimaxClient',
            method: 'imageGeneration',
            params: {
              prompt: '基于描述标签，对图片进行增强优化',
              model: 'image-01',
              n: 1,
            },
          },
        },
        position: { x: 900, y: 0 },
      },
      {
        id: 'output-5',
        type: 'output',
        data: {
          label: '分析结果&优化图片',
        },
        position: { x: 1200, y: 0 },
      },
    ],
    edges: [
      { id: 'e-input-analyze', source: 'input-5', target: 'action-analyze' },
      { id: 'e-analyze-label', source: 'action-analyze', target: 'action-describe' },
      { id: 'e-label-enhance', source: 'action-describe', target: 'action-enhance' },
      { id: 'e-enhance-output', source: 'action-enhance', target: 'output-5' },
    ],
  },
  {
    id: 'template-video-production',
    name: '短视频自动制作',
    description: '输入脚本或主题，AI自动生成分镜、配音、配乐、字幕的完整视频',
    category: 'video',
    tags: ['视频制作', '短视频', '自动剪辑', '多模态'],
    difficulty: 'advanced',
    estimatedTime: '10-60分钟',
    nodes: [
      {
        id: 'input-6',
        type: 'input',
        data: {
          label: '视频脚本',
          config: {
            description: '输入视频脚本或主题',
            inputType: 'textarea',
          },
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'action-storyboard',
        type: 'action',
        data: {
          label: '分镜设计',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '根据脚本设计视频分镜脚本，包含每个镜头的画面描述、时长、转场。',
                },
              ],
              temperature: 0.7,
            },
          },
        },
        position: { x: 300, y: 0 },
      },
      {
        id: 'action-image',
        type: 'action',
        data: {
          label: '生成分镜图',
          config: {
            service: 'minimaxClient',
            method: 'imageGeneration',
            params: {
              prompt: '根据分镜描述生成对应画面',
              model: 'image-01',
              n: 5,
            },
          },
        },
        position: { x: 600, y: 0 },
      },
      {
        id: 'action-voice',
        type: 'action',
        data: {
          label: '配音生成',
          config: {
            service: 'minimaxClient',
            method: 'textToAudioSync',
            params: {
              text: '根据脚本生成配音',
              model: 'speech-01',
              voice_id: 'female-voice-1',
            },
          },
        },
        position: { x: 900, y: 0 },
      },
      {
        id: 'output-6',
        type: 'output',
        data: {
          label: '视频素材包',
        },
        position: { x: 1200, y: 0 },
      },
    ],
    edges: [
      { id: 'e-input-storyboard', source: 'input-6', target: 'action-storyboard' },
      { id: 'e-storyboard-image', source: 'action-storyboard', target: 'action-image' },
      { id: 'e-image-voice', source: 'action-image', target: 'action-voice' },
      { id: 'e-voice-output', source: 'action-voice', target: 'output-6' },
    ],
  },
  {
    id: 'template-video-script',
    name: '视频脚本生成器',
    description: '根据主题自动生成多种风格视频脚本，包含画面描述和配音文本',
    category: 'video',
    tags: ['脚本写作', '视频创意', '多风格', '内容策划'],
    difficulty: 'beginner',
    estimatedTime: '2-5分钟',
    nodes: [
      {
        id: 'input-7',
        type: 'input',
        data: {
          label: '视频主题',
          config: {
            description: '输入视频主题和风格偏好',
            inputType: 'textarea',
          },
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'action-script',
        type: 'action',
        data: {
          label: '生成脚本',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '你是专业的视频脚本撰写人，根据不同平台风格生成脚本。',
                },
              ],
              temperature: 0.8,
            },
          },
        },
        position: { x: 300, y: 0 },
      },
      {
        id: 'action-optimize',
        type: 'action',
        data: {
          label: '脚本优化',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '优化脚本的节奏、句式、关键词密度，提升完播率。',
                },
              ],
              temperature: 0.6,
            },
          },
        },
        position: { x: 600, y: 0 },
      },
      {
        id: 'output-7',
        type: 'output',
        data: {
          label: '完整脚本',
        },
        position: { x: 900, y: 0 },
      },
    ],
    edges: [
      { id: 'e-input-script', source: 'input-7', target: 'action-script' },
      { id: 'e-script-optimize', source: 'action-script', target: 'action-optimize' },
      { id: 'e-optimize-output', source: 'action-optimize', target: 'output-7' },
    ],
  },
  {
    id: 'template-audio-podcast',
    name: '播客自动制作',
    description: '输入文本或RSS源，AI自动生成播客音频、片头片尾和背景音乐',
    category: 'audio',
    tags: ['播客', '音频制作', '多角色', '背景音乐'],
    difficulty: 'intermediate',
    estimatedTime: '5-15分钟',
    nodes: [
      {
        id: 'input-8',
        type: 'input',
        data: {
          label: '播客内容',
          config: {
            description: '输入播客文本或RSS链接',
            inputType: 'textarea',
          },
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'action-parse',
        type: 'action',
        data: {
          label: '内容解析',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '解析内容，分段标注角色和情绪。',
                },
              ],
              temperature: 0.3,
            },
          },
        },
        position: { x: 300, y: 0 },
      },
      {
        id: 'action-speech',
        type: 'action',
        data: {
          label: '语音合成',
          config: {
            service: 'minimaxClient',
            method: 'textToAudioSync',
            params: {
              text: '分段生成对应角色的语音',
              model: 'speech-01',
              voice_id: 'male-voice-1',
            },
          },
        },
        position: { x: 600, y: 0 },
      },
      {
        id: 'action-music',
        type: 'action',
        data: {
          label: '背景音乐',
          config: {
            service: 'minimaxClient',
            method: 'musicGeneration',
            params: {
              prompt: '生成播客背景音乐',
              model: 'music-01',
            },
          },
        },
        position: { x: 900, y: 0 },
      },
      {
        id: 'output-8',
        type: 'output',
        data: {
          label: '播客音频',
        },
        position: { x: 1200, y: 0 },
      },
    ],
    edges: [
      { id: 'e-input-parse', source: 'input-8', target: 'action-parse' },
      { id: 'e-parse-speech', source: 'action-parse', target: 'action-speech' },
      { id: 'e-speech-music', source: 'action-speech', target: 'action-music' },
      { id: 'e-music-output', source: 'action-music', target: 'output-8' },
    ],
  },
  {
    id: 'template-audio-voiceover',
    name: '多角色配音工作流',
    description: '自动分析剧本角色，为每个角色选择合适的音色，生成多角色对话音频',
    category: 'audio',
    tags: ['配音', '多角色', '音色选择', '剧本'],
    difficulty: 'advanced',
    estimatedTime: '5-20分钟',
    nodes: [
      {
        id: 'input-9',
        type: 'input',
        data: {
          label: '配音剧本',
          config: {
            description: '输入包含多角色的配音剧本',
            inputType: 'textarea',
          },
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'action-cast',
        type: 'action',
        data: {
          label: '角色分析',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '分析剧本中的角色特征，为每个角色推荐合适的音色。',
                },
              ],
              temperature: 0.5,
            },
          },
        },
        position: { x: 300, y: 0 },
      },
      {
        id: 'action-voices',
        type: 'action',
        data: {
          label: '多角色配音',
          config: {
            service: 'minimaxClient',
            method: 'textToAudioSync',
            params: {
              text: '根据角色分析结果，分别合成每个角色的音频',
              model: 'speech-01',
              voice_id: 'female-voice-1',
            },
          },
        },
        position: { x: 600, y: 0 },
      },
      {
        id: 'output-9',
        type: 'output',
        data: {
          label: '配音作品',
        },
        position: { x: 900, y: 0 },
      },
    ],
    edges: [
      { id: 'e-input-cast', source: 'input-9', target: 'action-cast' },
      { id: 'e-cast-voices', source: 'action-cast', target: 'action-voices' },
      { id: 'e-voices-output', source: 'action-voices', target: 'output-9' },
    ],
  },
  {
    id: 'template-workflow-social-media',
    name: '社媒全平台发布',
    description: '统一内容源自动转换为各社交平台格式的文案+配图，一键分发',
    category: 'workflow',
    tags: ['社交媒体', '多平台', '自动化', '营销'],
    difficulty: 'intermediate',
    estimatedTime: '5-10分钟',
    nodes: [
      {
        id: 'input-10',
        type: 'input',
        data: {
          label: '文章/内容',
          config: {
            description: '输入要发布的文章或内容',
            inputType: 'textarea',
          },
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'action-summary',
        type: 'action',
        data: {
          label: '内容摘要',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '根据文章提取核心观点和关键信息，生成摘要。',
                },
              ],
              temperature: 0.5,
            },
          },
        },
        position: { x: 300, y: 0 },
      },
      {
        id: 'action-twitter',
        type: 'action',
        data: {
          label: 'Twitter适配',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '将内容适配为Twitter格式，280字符限制，添加相关hashtags。',
                },
              ],
              temperature: 0.7,
            },
          },
        },
        position: { x: 600, y: -100 },
      },
      {
        id: 'action-linkedin',
        type: 'action',
        data: {
          label: 'LinkedIn适配',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '将内容适配为LinkedIn专业风格，包含行业见解。',
                },
              ],
              temperature: 0.7,
            },
          },
        },
        position: { x: 600, y: 100 },
      },
      {
        id: 'action-image',
        type: 'action',
        data: {
          label: '配图生成',
          config: {
            service: 'minimaxClient',
            method: 'imageGeneration',
            params: {
              prompt: '根据内容生成社媒配图',
              model: 'image-01',
              n: 3,
            },
          },
        },
        position: { x: 900, y: 0 },
      },
      {
        id: 'output-10',
        type: 'output',
        data: {
          label: '多平台内容包',
        },
        position: { x: 1200, y: 0 },
      },
    ],
    edges: [
      { id: 'e-input-summary', source: 'input-10', target: 'action-summary' },
      { id: 'e-summary-twitter', source: 'action-summary', target: 'action-twitter' },
      { id: 'e-summary-linkedin', source: 'action-summary', target: 'action-linkedin' },
      { id: 'e-twitter-image', source: 'action-twitter', target: 'action-image' },
      { id: 'e-linkedin-image', source: 'action-linkedin', target: 'action-image' },
      { id: 'e-image-output', source: 'action-image', target: 'output-10' },
    ],
  },
  {
    id: 'template-workflow-data-pipeline',
    name: '数据分析管道',
    description: '数据输入 → 清洗 → AI分析 → 可视化报告 → 邮件发送的全自动数据处理',
    category: 'workflow',
    tags: ['数据分析', '自动化', '报告生成', '可视化'],
    difficulty: 'advanced',
    estimatedTime: '5-15分钟',
    nodes: [
      {
        id: 'input-11',
        type: 'input',
        data: {
          label: '原始数据',
          config: {
            description: '输入CSV数据或文本数据',
            inputType: 'textarea',
          },
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'action-clean',
        type: 'action',
        data: {
          label: '数据清洗',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '检测并修复数据中的异常值、缺失值、重复值。',
                },
              ],
              temperature: 0.2,
            },
          },
        },
        position: { x: 300, y: 0 },
      },
      {
        id: 'action-analyze',
        type: 'action',
        data: {
          label: '数据分析',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '进行统计分析，识别趋势、相关性、异常模式。',
                },
              ],
              temperature: 0.4,
            },
          },
        },
        position: { x: 600, y: 0 },
      },
      {
        id: 'action-report',
        type: 'action',
        data: {
          label: '生成报告',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '生成专业数据分析报告，包含图表建议和行动建议。',
                },
              ],
              temperature: 0.6,
            },
          },
        },
        position: { x: 900, y: 0 },
      },
      {
        id: 'output-11',
        type: 'output',
        data: {
          label: '分析报告',
        },
        position: { x: 1200, y: 0 },
      },
    ],
    edges: [
      { id: 'e-input-clean', source: 'input-11', target: 'action-clean' },
      { id: 'e-clean-analyze', source: 'action-clean', target: 'action-analyze' },
      { id: 'e-analyze-report', source: 'action-analyze', target: 'action-report' },
      { id: 'e-report-output', source: 'action-report', target: 'output-11' },
    ],
  },
  {
    id: 'template-code-review-bot',
    name: 'AI代码审查助手',
    description: '提交代码→自动审查→生成改进建议→安全漏洞检测→输出审查报告',
    category: 'code',
    tags: ['代码审查', '安全检测', '自动化', 'CI/CD'],
    difficulty: 'advanced',
    estimatedTime: '3-10分钟',
    nodes: [
      {
        id: 'input-12',
        type: 'input',
        data: {
          label: '代码片段',
          config: {
            description: '输入要审查的代码或git diff',
            inputType: 'textarea',
          },
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'action-review',
        type: 'action',
        data: {
          label: '代码审查',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '你是一个资深代码审查专家，分析代码质量、可读性、性能优化空间。',
                },
              ],
              temperature: 0.3,
            },
          },
        },
        position: { x: 300, y: 0 },
      },
      {
        id: 'action-security',
        type: 'action',
        data: {
          label: '安全检查',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '检查代码中的安全漏洞，包括注入、XSS、权限问题等。',
                },
              ],
              temperature: 0.2,
            },
          },
        },
        position: { x: 600, y: 0 },
      },
      {
        id: 'action-suggest',
        type: 'action',
        data: {
          label: '改进建议',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '基于审查和安全检查结果，生成具体的代码改进建议。',
                },
              ],
              temperature: 0.5,
            },
          },
        },
        position: { x: 900, y: 0 },
      },
      {
        id: 'output-12',
        type: 'output',
        data: {
          label: '审查报告',
        },
        position: { x: 1200, y: 0 },
      },
    ],
    edges: [
      { id: 'e-input-review', source: 'input-12', target: 'action-review' },
      { id: 'e-review-security', source: 'action-review', target: 'action-security' },
      { id: 'e-security-suggest', source: 'action-security', target: 'action-suggest' },
      { id: 'e-suggest-output', source: 'action-suggest', target: 'output-12' },
    ],
  },
  {
    id: 'template-api-doc-generator',
    name: 'API文档自动生成',
    description: '读取代码中的接口定义→生成OpenAPI规范→输出多格式API文档',
    category: 'code',
    tags: ['API文档', 'OpenAPI', '自动化', '开发工具'],
    difficulty: 'beginner',
    estimatedTime: '1-3分钟',
    nodes: [
      {
        id: 'input-13',
        type: 'input',
        data: {
          label: 'API代码',
          config: {
            description: '输入包含接口定义的代码',
            inputType: 'textarea',
          },
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'action-parse',
        type: 'action',
        data: {
          label: '接口解析',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '解析代码中的API接口定义，提取路由、参数、返回值类型。',
                },
              ],
              temperature: 0.2,
            },
          },
        },
        position: { x: 300, y: 0 },
      },
      {
        id: 'action-openapi',
        type: 'action',
        data: {
          label: '生成OpenAPI',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '根据解析结果生成OpenAPI 3.0规范文档。',
                },
              ],
              temperature: 0.3,
            },
          },
        },
        position: { x: 600, y: 0 },
      },
      {
        id: 'action-docs',
        type: 'action',
        data: {
          label: '生成文档',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '基于OpenAPI规范生成可读性强的API文档，包含示例代码。',
                },
              ],
              temperature: 0.5,
            },
          },
        },
        position: { x: 900, y: 0 },
      },
      {
        id: 'output-13',
        type: 'output',
        data: {
          label: 'API文档',
        },
        position: { x: 1200, y: 0 },
      },
    ],
    edges: [
      { id: 'e-input-parse', source: 'input-13', target: 'action-parse' },
      { id: 'e-parse-openapi', source: 'action-parse', target: 'action-openapi' },
      { id: 'e-openapi-docs', source: 'action-openapi', target: 'action-docs' },
      { id: 'e-docs-output', source: 'action-docs', target: 'output-13' },
    ],
  },
  {
    id: 'template-lyrics-generation',
    name: '歌词创作',
    description: '根据主题和风格生成歌词及音乐',
    category: 'voice',
    tags: ['lyrics', 'music'],
    difficulty: 'beginner',
    estimatedTime: '1-2m',
    nodes: [
      { id: 'input-14', type: 'input', data: { label: '主题/关键词', config: { description: '输入创作主题', inputType: 'text' } }, position: { x: 0, y: 0 } },
      { id: 'action-gen-lyrics', type: 'action', data: { label: '生成歌词', config: { service: 'minimaxClient', method: 'chatCompletion', params: { model: 'abab7.5-chat', messages: [{ role: 'system', content: '你是一个专业歌词创作人，根据主题生成歌词。' }], temperature: 0.9 } } }, position: { x: 300, y: 0 } },
      { id: 'action-gen-music', type: 'action', data: { label: '生成音乐', config: { service: 'minimaxClient', method: 'musicGeneration', params: { prompt: '为歌词生成配乐', model: 'music-01' } } }, position: { x: 600, y: 0 } },
      { id: 'output-14', type: 'output', data: { label: '输出' }, position: { x: 900, y: 0 } },
    ],
    edges: [
      { id: 'e-input-14a', source: 'input-14', target: 'action-gen-lyrics' },
      { id: 'e-input-14b', source: 'action-gen-lyrics', target: 'action-gen-music' },
      { id: 'e-input-14c', source: 'action-gen-music', target: 'output-14' },
    ],
  },
  {
    id: 'template-excel-formula-helper',
    name: 'Excel公式助手',
    description: '描述需求→生成Excel公式→优化验证→输出使用说明',
    category: 'productivity',
    tags: ['Excel', '公式', '办公自动化', '数据处理'],
    difficulty: 'beginner',
    estimatedTime: '1-2分钟',
    nodes: [
      {
        id: 'input-15',
        type: 'input',
        data: {
          label: '公式需求',
          config: {
            description: '描述需要实现的Excel功能需求',
            inputType: 'textarea',
          },
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'action-formula',
        type: 'action',
        data: {
          label: '生成公式',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '你是一个Excel专家，根据需求生成准确的Excel公式，包括VLOOKUP、SUMIFS、INDEX-MATCH等。',
                },
              ],
              temperature: 0.3,
            },
          },
        },
        position: { x: 300, y: 0 },
      },
      {
        id: 'action-validate',
        type: 'action',
        data: {
          label: '公式验证',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '验证公式的正确性，检查引用关系、边界条件，提供优化建议。',
                },
              ],
              temperature: 0.2,
            },
          },
        },
        position: { x: 600, y: 0 },
      },
      {
        id: 'output-15',
        type: 'output',
        data: {
          label: '公式&说明',
        },
        position: { x: 900, y: 0 },
      },
    ],
    edges: [
      { id: 'e-input-formula', source: 'input-15', target: 'action-formula' },
      { id: 'e-formula-validate', source: 'action-formula', target: 'action-validate' },
      { id: 'e-validate-output', source: 'action-validate', target: 'output-15' },
    ],
  },
  {
    id: 'template-automated-reporting',
    name: '自动化报表系统',
    description: '定时获取数据→清洗聚合→AI分析洞察→生成可视化报表→邮件分发',
    category: 'productivity',
    tags: ['报表', '自动化', '数据可视化', '定时任务'],
    difficulty: 'advanced',
    estimatedTime: '5-20分钟',
    nodes: [
      {
        id: 'input-16',
        type: 'input',
        data: {
          label: '数据源/需求',
          config: {
            description: '输入数据源信息或报表需求描述',
            inputType: 'textarea',
          },
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'action-aggregate',
        type: 'action',
        data: {
          label: '数据聚合',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '清洗并聚合数据，按维度计算关键指标。',
                },
              ],
              temperature: 0.3,
            },
          },
        },
        position: { x: 300, y: 0 },
      },
      {
        id: 'action-insight',
        type: 'action',
        data: {
          label: '洞察分析',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '分析数据趋势，发现业务洞察和可执行建议。',
                },
              ],
              temperature: 0.5,
            },
          },
        },
        position: { x: 600, y: 0 },
      },
      {
        id: 'action-visualize',
        type: 'action',
        data: {
          label: '可视化',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '生成Markdown格式的可视化报表，包含图表描述和关键发现。',
                },
              ],
              temperature: 0.5,
            },
          },
        },
        position: { x: 900, y: 0 },
      },
      {
        id: 'output-16',
        type: 'output',
        data: {
          label: '报表',
        },
        position: { x: 1200, y: 0 },
      },
    ],
    edges: [
      { id: 'e-input-agg', source: 'input-16', target: 'action-aggregate' },
      { id: 'e-agg-insight', source: 'action-aggregate', target: 'action-insight' },
      { id: 'e-insight-viz', source: 'action-insight', target: 'action-visualize' },
      { id: 'e-viz-output', source: 'action-visualize', target: 'output-16' },
    ],
  },
  {
    id: 'template-learning-content-creator',
    name: '教育内容生成器',
    description: '根据教学大纲自动生成课程内容、练习题、答案解析',
    category: 'education',
    tags: ['教育', '课程', '自动出题', '题库'],
    difficulty: 'intermediate',
    estimatedTime: '3-8分钟',
    nodes: [
      {
        id: 'input-17',
        type: 'input',
        data: {
          label: '教学大纲',
          config: {
            description: '输入教学大纲或知识点列表',
            inputType: 'textarea',
          },
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'action-lesson',
        type: 'action',
        data: {
          label: '生成教案',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '根据大纲生成详细的课程教案，包含教学目标、重点难点、教学步骤。',
                },
              ],
              temperature: 0.6,
            },
          },
        },
        position: { x: 300, y: 0 },
      },
      {
        id: 'action-exercise',
        type: 'action',
        data: {
          label: '生成练习题',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '根据教案内容，生成不同难度级别的练习题和答案解析。',
                },
              ],
              temperature: 0.7,
            },
          },
        },
        position: { x: 600, y: 0 },
      },
      {
        id: 'output-17',
        type: 'output',
        data: {
          label: '课程&题库',
        },
        position: { x: 900, y: 0 },
      },
    ],
    edges: [
      { id: 'e-input-lesson', source: 'input-17', target: 'action-lesson' },
      { id: 'e-lesson-exercise', source: 'action-lesson', target: 'action-exercise' },
      { id: 'e-exercise-output', source: 'action-exercise', target: 'output-17' },
    ],
  },
  {
    id: 'template-translation-pipeline',
    name: '多语言翻译管道',
    description: '输入源文本→AI翻译→母语者校对→文化适配→多语言输出',
    category: 'text',
    tags: ['翻译', '多语言', '本地化', '国际化'],
    difficulty: 'intermediate',
    estimatedTime: '3-8分钟',
    nodes: [
      {
        id: 'input-18',
        type: 'input',
        data: {
          label: '源文本',
          config: {
            description: '输入需要翻译的文本',
            inputType: 'textarea',
          },
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'action-translate',
        type: 'action',
        data: {
          label: 'AI翻译',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '将输入文本翻译为指定目标语言，保持原文风格和语气。',
                },
              ],
              temperature: 0.3,
            },
          },
        },
        position: { x: 300, y: -150 },
      },
      {
        id: 'action-review',
        type: 'action',
        data: {
          label: '校对润色',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '以目标语言母语者视角校对翻译，修正语法错误和不自然表达。',
                },
              ],
              temperature: 0.4,
            },
          },
        },
        position: { x: 600, y: -150 },
      },
      {
        id: 'action-adapt',
        type: 'action',
        data: {
          label: '文化适配',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '检查并调整文化特定内容（习语、比喻、引用），确保目标文化适宜。',
                },
              ],
              temperature: 0.5,
            },
          },
        },
        position: { x: 900, y: -150 },
      },
      {
        id: 'output-18',
        type: 'output',
        data: {
          label: '翻译结果',
        },
        position: { x: 1200, y: -150 },
      },
    ],
    edges: [
      { id: 'e-input-translate', source: 'input-18', target: 'action-translate' },
      { id: 'e-translate-review', source: 'action-translate', target: 'action-review' },
      { id: 'e-review-adapt', source: 'action-review', target: 'action-adapt' },
      { id: 'e-adapt-output', source: 'action-adapt', target: 'output-18' },
    ],
  },
  {
    id: 'template-game-npc-designer',
    name: '游戏NPC设计师',
    description: '输入角色需求→AI生成NPC背景、对话树、性格特征→输出完整角色档案',
    category: 'creative',
    tags: ['游戏设计', 'NPC', '角色创建', '世界观'],
    difficulty: 'intermediate',
    estimatedTime: '3-8分钟',
    nodes: [
      {
        id: 'input-19',
        type: 'input',
        data: {
          label: '角色需求',
          config: {
            description: '描述NPC的角色定位、功能、世界观',
            inputType: 'textarea',
          },
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'action-background',
        type: 'action',
        data: {
          label: '生成背景故事',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '你是资深游戏编剧，根据需求生成NPC的详细背景故事和性格档案。',
                },
              ],
              temperature: 0.8,
            },
          },
        },
        position: { x: 300, y: 0 },
      },
      {
        id: 'action-dialogue',
        type: 'action',
        data: {
          label: '生成对话树',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '根据角色性格生成多层分支对话树，包含不同玩家选择对应的回应。',
                },
              ],
              temperature: 0.8,
            },
          },
        },
        position: { x: 600, y: 0 },
      },
      {
        id: 'action-personality',
        type: 'action',
        data: {
          label: '性格细化',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '细化角色性格参数：MBTI类型、说话风格、行为模式、情感触发点。',
                },
              ],
              temperature: 0.6,
            },
          },
        },
        position: { x: 900, y: 0 },
      },
      {
        id: 'output-19',
        type: 'output',
        data: {
          label: 'NPC档案',
        },
        position: { x: 1200, y: 0 },
      },
    ],
    edges: [
      { id: 'e-input-bg', source: 'input-19', target: 'action-background' },
      { id: 'e-bg-dialogue', source: 'action-background', target: 'action-dialogue' },
      { id: 'e-dialogue-personality', source: 'action-dialogue', target: 'action-personality' },
      { id: 'e-personality-output', source: 'action-personality', target: 'output-19' },
    ],
  },
  {
    id: 'template-health-advice',
    name: '健康建议助手',
    description: '输入身体指标和症状→AI预筛查分析→个性化建议→就医指引',
    category: 'productivity',
    tags: ['健康', '症状分析', '健康建议', '生活'],
    difficulty: 'beginner',
    estimatedTime: '1-3分钟',
    nodes: [
      {
        id: 'input-20',
        type: 'input',
        data: {
          label: '身体指标/症状',
          config: {
            description: '输入身体指标数值或描述症状',
            inputType: 'textarea',
          },
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'action-screen',
        type: 'action',
        data: {
          label: '预筛查分析',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '根据输入的身体指标和症状进行预筛查分析。必须声明：本分析不能替代专业医疗诊断，如症状严重请立即就医。',
                },
              ],
              temperature: 0.3,
            },
          },
        },
        position: { x: 300, y: 0 },
      },
      {
        id: 'action-advice',
        type: 'action',
        data: {
          label: '健康建议',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '基于预筛查结果，提供个性化的生活方式调整建议和就医指引。必须声明：具体诊疗请咨询专业医生。',
                },
              ],
              temperature: 0.4,
            },
          },
        },
        position: { x: 600, y: 0 },
      },
      {
        id: 'output-20',
        type: 'output',
        data: {
          label: '健康报告',
        },
        position: { x: 900, y: 0 },
      },
    ],
    edges: [
      { id: 'e-input-screen', source: 'input-20', target: 'action-screen' },
      { id: 'e-screen-advice', source: 'action-screen', target: 'action-advice' },
      { id: 'e-advice-output', source: 'action-advice', target: 'output-20' },
    ],
  },
  {
    id: 'template-legal-contract-analyzer',
    name: '法律合同分析器',
    description: '上传合同文本→条款解析→风险识别→修改建议→输出分析报告',
    category: 'productivity',
    tags: ['法律', '合同', '风险分析', '合规'],
    difficulty: 'advanced',
    estimatedTime: '5-15分钟',
    nodes: [
      {
        id: 'input-21',
        type: 'input',
        data: {
          label: '合同文本',
          config: {
            description: '输入或粘贴合同全文',
            inputType: 'textarea',
          },
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'action-parse',
        type: 'action',
        data: {
          label: '条款解析',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '详解合同的各个条款，提取关键义务、权利、期限、金额等要素。必须声明：本分析仅供参考，不构成法律意见，正式签约前请咨询执业律师。',
                },
              ],
              temperature: 0.2,
            },
          },
        },
        position: { x: 300, y: 0 },
      },
      {
        id: 'action-risk',
        type: 'action',
        data: {
          label: '风险识别',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '识别合同中的风险条款、潜在陷阱、不平等条款，标注风险等级（高/中/低）。必须声明：本风险评估仅供参考，不构成法律意见。',
                },
              ],
              temperature: 0.3,
            },
          },
        },
        position: { x: 600, y: 0 },
      },
      {
        id: 'action-suggest',
        type: 'action',
        data: {
          label: '修改建议',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '针对风险条款提供具体修改建议和谈判策略。必须声明：修改建议仅供参考，请结合实际情况与法律顾问确认。',
                },
              ],
              temperature: 0.4,
            },
          },
        },
        position: { x: 900, y: 0 },
      },
      {
        id: 'output-21',
        type: 'output',
        data: {
          label: '分析报告',
        },
        position: { x: 1200, y: 0 },
      },
    ],
    edges: [
      { id: 'e-input-parse', source: 'input-21', target: 'action-parse' },
      { id: 'e-parse-risk', source: 'action-parse', target: 'action-risk' },
      { id: 'e-risk-suggest', source: 'action-risk', target: 'action-suggest' },
      { id: 'e-suggest-output', source: 'action-suggest', target: 'output-21' },
    ],
  },
  {
    id: 'template-prompt-chaining',
    name: 'Prompt链式处理',
    description: '串联多个Prompt步骤，逐步优化内容：生成→审查→改进→润色',
    category: 'workflow',
    tags: ['Prompt工程', '内容优化', '链式处理', '质量控制'],
    difficulty: 'intermediate',
    estimatedTime: '3-8分钟',
    nodes: [
      {
        id: 'input-22',
        type: 'input',
        data: {
          label: '初始输入',
          config: {
            description: '输入初始内容或创意',
            inputType: 'textarea',
          },
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'action-draft',
        type: 'action',
        data: {
          label: '初稿生成',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '根据输入内容生成初稿，充分发挥创意。',
                },
              ],
              temperature: 0.8,
            },
          },
        },
        position: { x: 300, y: 0 },
      },
      {
        id: 'action-review',
        type: 'action',
        data: {
          label: '质量审查',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '以严格标准审查初稿，检查逻辑一致性、事实准确性、表达清晰度。',
                },
              ],
              temperature: 0.3,
            },
          },
        },
        position: { x: 600, y: 0 },
      },
      {
        id: 'action-improve',
        type: 'action',
        data: {
          label: '改进优化',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '根据审查意见进行针对性改进，修复问题，提升质量。',
                },
              ],
              temperature: 0.5,
            },
          },
        },
        position: { x: 900, y: 0 },
      },
      {
        id: 'action-polish',
        type: 'action',
        data: {
          label: '最终润色',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '进行最终润色：优化语言流畅度、统一风格、增强可读性和文采。',
                },
              ],
              temperature: 0.6,
            },
          },
        },
        position: { x: 1200, y: 0 },
      },
      {
        id: 'output-22',
        type: 'output',
        data: {
          label: '精品内容',
        },
        position: { x: 1500, y: 0 },
      },
    ],
    edges: [
      { id: 'e-input-draft', source: 'input-22', target: 'action-draft' },
      { id: 'e-draft-review', source: 'action-draft', target: 'action-review' },
      { id: 'e-review-improve', source: 'action-review', target: 'action-improve' },
      { id: 'e-improve-polish', source: 'action-improve', target: 'action-polish' },
      { id: 'e-polish-output', source: 'action-polish', target: 'output-22' },
    ],
  },
  {
    id: 'template-newsletter-creator',
    name: '新闻简报生成器',
    description: '输入新闻源或主题→AI筛选聚合→生成多样化摘要→排版美化→输出简报',
    category: 'text',
    tags: ['新闻', '简报', '聚合', 'RSS'],
    difficulty: 'beginner',
    estimatedTime: '2-5分钟',
    nodes: [
      {
        id: 'input-23',
        type: 'input',
        data: {
          label: '新闻源/主题',
          config: {
            description: '输入新闻主题或RSS源链接',
            inputType: 'textarea',
          },
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'action-filter',
        type: 'action',
        data: {
          label: '内容筛选',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '筛选出最重要、最相关的新闻内容，过滤低质量信息。',
                },
              ],
              temperature: 0.3,
            },
          },
        },
        position: { x: 300, y: 0 },
      },
      {
        id: 'action-summarize',
        type: 'action',
        data: {
          label: '摘要生成',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '为每条新闻生成不同长度的摘要：一句话、一段、详细。',
                },
              ],
              temperature: 0.5,
            },
          },
        },
        position: { x: 600, y: 0 },
      },
      {
        id: 'action-layout',
        type: 'action',
        data: {
          label: '排版美化',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '将摘要按新闻重要性排序，添加标题、分隔线、重点标记，生成Markdown格式简报。',
                },
              ],
              temperature: 0.4,
            },
          },
        },
        position: { x: 900, y: 0 },
      },
      {
        id: 'output-23',
        type: 'output',
        data: {
          label: '新闻简报',
        },
        position: { x: 1200, y: 0 },
      },
    ],
    edges: [
      { id: 'e-input-filter', source: 'input-23', target: 'action-filter' },
      { id: 'e-filter-summarize', source: 'action-filter', target: 'action-summarize' },
      { id: 'e-summarize-layout', source: 'action-summarize', target: 'action-layout' },
      { id: 'e-layout-output', source: 'action-layout', target: 'output-23' },
    ],
  },
  {
    id: 'template-travel-planner',
    name: '旅行规划助手',
    description: '输入目的地→生成行程计划→景点推荐→美食攻略→预算估算→完整旅行手册',
    category: 'productivity',
    tags: ['旅行', '攻略', '行程规划', '生活'],
    difficulty: 'beginner',
    estimatedTime: '3-8分钟',
    nodes: [
      {
        id: 'input-24',
        type: 'input',
        data: {
          label: '旅行需求',
          config: {
            description: '输入目的地、天数、预算、偏好',
            inputType: 'textarea',
          },
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'action-itinerary',
        type: 'action',
        data: {
          label: '行程规划',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '根据旅行天数、预算和偏好，制定每日详细行程计划。',
                },
              ],
              temperature: 0.6,
            },
          },
        },
        position: { x: 300, y: 0 },
      },
      {
        id: 'action-spots',
        type: 'action',
        data: {
          label: '景点推荐',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '推荐必游景点，包含评分、最佳游览时间、交通方式、门票信息。',
                },
              ],
              temperature: 0.5,
            },
          },
        },
        position: { x: 600, y: 0 },
      },
      {
        id: 'action-food',
        type: 'action',
        data: {
          label: '美食攻略',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '推荐当地必吃美食、特色餐厅、小吃街，标注人均消费和推荐菜品。',
                },
              ],
              temperature: 0.6,
            },
          },
        },
        position: { x: 900, y: 0 },
      },
      {
        id: 'action-budget',
        type: 'action',
        data: {
          label: '预算估算',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '根据行程计划估算总费用，细分交通、住宿、餐饮、景点、购物等类别。',
                },
              ],
              temperature: 0.3,
            },
          },
        },
        position: { x: 1200, y: 0 },
      },
      {
        id: 'output-24',
        type: 'output',
        data: {
          label: '旅行手册',
        },
        position: { x: 1500, y: 0 },
      },
    ],
    edges: [
      { id: 'e-input-itinerary', source: 'input-24', target: 'action-itinerary' },
      { id: 'e-itinerary-spots', source: 'action-itinerary', target: 'action-spots' },
      { id: 'e-spots-food', source: 'action-spots', target: 'action-food' },
      { id: 'e-food-budget', source: 'action-food', target: 'action-budget' },
      { id: 'e-budget-output', source: 'action-budget', target: 'output-24' },
    ],
  },
  {
    id: 'template-email-marketing',
    name: '邮件营销自动化',
    description: '输入营销目标→生成多版本邮件→A/B测试方案→发送时间优化→效果追踪',
    category: 'text',
    tags: ['邮件', '营销', '自动化', 'A/B测试'],
    difficulty: 'intermediate',
    estimatedTime: '5-10分钟',
    nodes: [
      {
        id: 'input-25',
        type: 'input',
        data: {
          label: '营销目标',
          config: {
            description: '输入营销目标、受众群体、产品信息',
            inputType: 'textarea',
          },
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'action-email-a',
        type: 'action',
        data: {
          label: '邮件A版本',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '撰写以情感驱动为主的营销邮件，侧重故事叙述和用户共鸣。',
                },
              ],
              temperature: 0.8,
            },
          },
        },
        position: { x: 300, y: -100 },
      },
      {
        id: 'action-email-b',
        type: 'action',
        data: {
          label: '邮件B版本',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '撰写以数据驱动为主的营销邮件，侧重统计数据和理性说服。',
                },
              ],
              temperature: 0.7,
            },
          },
        },
        position: { x: 300, y: 100 },
      },
      {
        id: 'action-ab-plan',
        type: 'action',
        data: {
          label: 'A/B测试方案',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '制定A/B测试策略：分配比例、评估指标、统计显著性阈值、测试周期。',
                },
              ],
              temperature: 0.4,
            },
          },
        },
        position: { x: 600, y: 0 },
      },
      {
        id: 'action-optimize',
        type: 'action',
        data: {
          label: '发送优化',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '优化邮件发送时间和标题长度，提升打开率和点击率。',
                },
              ],
              temperature: 0.5,
            },
          },
        },
        position: { x: 900, y: 0 },
      },
      {
        id: 'output-25',
        type: 'output',
        data: {
          label: '邮件营销包',
        },
        position: { x: 1200, y: 0 },
      },
    ],
    edges: [
      { id: 'e-input-emaila', source: 'input-25', target: 'action-email-a' },
      { id: 'e-input-emailb', source: 'input-25', target: 'action-email-b' },
      { id: 'e-emaila-ab', source: 'action-email-a', target: 'action-ab-plan' },
      { id: 'e-emailb-ab', source: 'action-email-b', target: 'action-ab-plan' },
      { id: 'e-ab-optimize', source: 'action-ab-plan', target: 'action-optimize' },
      { id: 'e-optimize-output', source: 'action-optimize', target: 'output-25' },
    ],
  },
  {
    id: 'template-recipe-generator',
    name: '智能菜谱生成器',
    description: '输入食材→生成菜谱→营养分析→替代方案→购物清单',
    category: 'productivity',
    tags: ['美食', '菜谱', '营养', '生活'],
    difficulty: 'beginner',
    estimatedTime: '1-3分钟',
    nodes: [
      {
        id: 'input-26',
        type: 'input',
        data: {
          label: '食材清单',
          config: {
            description: '输入现有食材、饮食偏好、忌口',
            inputType: 'textarea',
          },
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'action-recipe',
        type: 'action',
        data: {
          label: '生成菜谱',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '根据现有食材和饮食偏好，生成详细的烹饪菜谱，包含步骤、火候、时间。',
                },
              ],
              temperature: 0.7,
            },
          },
        },
        position: { x: 300, y: 0 },
      },
      {
        id: 'action-nutrition',
        type: 'action',
        data: {
          label: '营养分析',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '分析菜谱的营养成分：热量、蛋白质、碳水、脂肪、维生素，提供健康建议。',
                },
              ],
              temperature: 0.3,
            },
          },
        },
        position: { x: 600, y: 0 },
      },
      {
        id: 'action-shopping',
        type: 'action',
        data: {
          label: '购物清单',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            params: {
              model: 'abab7.5-chat',
              messages: [
                {
                  role: 'system',
                  content: '生成所需采购的食材清单，标注数量和替代选项，按超市区域分类。',
                },
              ],
              temperature: 0.2,
            },
          },
        },
        position: { x: 900, y: 0 },
      },
      {
        id: 'output-26',
        type: 'output',
        data: {
          label: '菜谱&清单',
        },
        position: { x: 1200, y: 0 },
      },
    ],
    edges: [
      { id: 'e-input-recipe', source: 'input-26', target: 'action-recipe' },
      { id: 'e-recipe-nutrition', source: 'action-recipe', target: 'action-nutrition' },
      { id: 'e-nutrition-shopping', source: 'action-nutrition', target: 'action-shopping' },
      { id: 'e-shopping-output', source: 'action-shopping', target: 'output-26' },
    ],
  },
]
