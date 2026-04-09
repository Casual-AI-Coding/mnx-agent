import type { FieldDefinition } from './FieldBuilder'

/**
 * Action field definitions for workflow configuration
 * Each service/method combination has its own set of configurable fields
 */
export const ACTION_FIELDS: Record<string, Record<string, FieldDefinition[]>> = {
  'text': {
    'generate': [
      {
        name: 'model',
        label: '模型',
        type: 'select',
        required: true,
        options: [
          { value: 'abab6.5s', label: 'abab6.5s (推荐)' },
          { value: 'abab6.5g', label: 'abab6.5g' },
          { value: 'abab6', label: 'abab6' },
          { value: 'abab5.5s', label: 'abab5.5s' },
        ],
        description: '选择要使用的语言模型'
      },
      {
        name: 'prompt',
        label: '提示词',
        type: 'template',
        required: true,
        placeholder: '输入提示词，支持 {{input}} 变量',
        description: '输入给模型的提示词，支持使用 {{nodeId.output}} 语法引用其他节点输出'
      },
      {
        name: 'temperature',
        label: '温度',
        type: 'number',
        description: '控制输出的创造性，范围 0-2，越高越创造性',
        min: 0,
        max: 2,
        step: 0.1
      },
      {
        name: 'max_tokens',
        label: '最大令牌数',
        type: 'number',
        description: '生成文本的最大长度',
        min: 1,
        max: 8192,
        step: 1
      },
    ],
    'chat': [
      {
        name: 'model',
        label: '模型',
        type: 'select',
        required: true,
        options: [
          { value: 'abab6.5s', label: 'abab6.5s (推荐)' },
          { value: 'abab6.5g', label: 'abab6.5g' },
          { value: 'abab6', label: 'abab6' },
        ],
        description: '选择要使用的语言模型'
      },
      {
        name: 'messages',
        label: '对话消息',
        type: 'json',
        required: true,
        placeholder: '[{"role": "user", "content": "你好"}]',
        description: '对话历史，支持 {{nodeId.output}} 模板变量'
      },
      {
        name: 'temperature',
        label: '温度',
        type: 'number',
        description: '控制输出的创造性，范围 0-2',
        min: 0,
        max: 2,
        step: 0.1
      },
    ]
  },
  'image': {
    'generate': [
      {
        name: 'prompt',
        label: '图像描述',
        type: 'template',
        required: true,
        placeholder: '描述你想要生成的图像',
        description: '详细的图像描述，支持模板变量'
      },
      {
        name: 'aspect_ratio',
        label: '宽高比',
        type: 'select',
        options: [
          { value: '1:1', label: '1:1 方形' },
          { value: '16:9', label: '16:9 宽屏' },
          { value: '9:16', label: '9:16 竖屏' },
          { value: '4:3', label: '4:3 标准' },
          { value: '3:4', label: '3:4 人像' },
        ],
        description: '生成图像的宽高比例'
      },
      {
        name: 'n',
        label: '生成数量',
        type: 'number',
        description: '要生成的图像数量 (1-4)',
        min: 1,
        max: 4,
        step: 1
      },
    ]
  },
  'voice_sync': {
    'generate': [
      {
        name: 'text',
        label: '文本内容',
        type: 'template',
        required: true,
        placeholder: '要转换为语音的文本',
        description: '要合成的文本内容，支持模板变量'
      },
      {
        name: 'voice_id',
        label: '音色ID',
        type: 'select',
        required: true,
        options: [
          { value: 'female-shaonv', label: '少女 (female-shaonv)' },
          { value: 'female-yujie', label: '御姐 (female-yujie)' },
          { value: 'male-qingshuai', label: '青叔 (male-qingshuai)' },
          { value: 'male-qingnian', label: '青年 (male-qingnian)' },
        ],
        description: '选择语音音色'
      },
      {
        name: 'speed',
        label: '语速',
        type: 'number',
        description: '语音速度，范围 0.5-2',
        min: 0.5,
        max: 2,
        step: 0.1
      },
      {
        name: 'vol',
        label: '音量',
        type: 'number',
        description: '音量大小，范围 0.1-10',
        min: 0.1,
        max: 10,
        step: 0.1
      },
    ]
  },
  'voice_async': {
    'generate': [
      {
        name: 'text',
        label: '文本内容',
        type: 'template',
        required: true,
        placeholder: '要转换为语音的文本',
        description: '要合成的长文本内容，支持模板变量'
      },
      {
        name: 'voice_id',
        label: '音色ID',
        type: 'select',
        required: true,
        options: [
          { value: 'female-shaonv', label: '少女 (female-shaonv)' },
          { value: 'female-yujie', label: '御姐 (female-yujie)' },
          { value: 'male-qingshuai', label: '青叔 (male-qingshuai)' },
          { value: 'male-qingnian', label: '青年 (male-qingnian)' },
        ],
        description: '选择语音音色'
      },
      {
        name: 'speed',
        label: '语速',
        type: 'number',
        description: '语音速度，范围 0.5-2',
        min: 0.5,
        max: 2,
        step: 0.1
      },
    ]
  },
  'music': {
    'generate': [
      {
        name: 'prompt',
        label: '音乐描述',
        type: 'template',
        required: true,
        placeholder: '描述你想要生成的音乐风格和内容',
        description: '详细的音乐描述，如"轻快的中文流行歌曲，关于春天"'
      },
      {
        name: 'duration',
        label: '时长(秒)',
        type: 'number',
        description: '生成音乐的时长，建议 10-60 秒',
        min: 5,
        max: 300,
        step: 5
      },
      {
        name: 'with_lyrics',
        label: '是否带歌词',
        type: 'select',
        options: [
          { value: 'true', label: '是' },
          { value: 'false', label: '否' },
        ],
        description: '是否生成带歌词的音乐'
      },
    ]
  },
  'video': {
    'generate': [
      {
        name: 'prompt',
        label: '视频描述',
        type: 'template',
        required: true,
        placeholder: '描述你想要生成的视频内容',
        description: '详细的视频场景描述'
      },
      {
        name: 'duration',
        label: '时长(秒)',
        type: 'number',
        description: '生成视频的时长',
        min: 5,
        max: 10,
        step: 1
      },
      {
        name: 'aspect_ratio',
        label: '宽高比',
        type: 'select',
        options: [
          { value: '16:9', label: '16:9 宽屏' },
          { value: '9:16', label: '9:16 竖屏' },
          { value: '1:1', label: '1:1 方形' },
        ],
        description: '生成视频的宽高比例'
      },
    ]
  },
}