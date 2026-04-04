import { useState, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { FieldBuilder, type FieldDefinition } from './FieldBuilder'
import { ActionNodeConfig, GroupedActionNodes } from '@/types/cron'

interface ActionConfigPanelProps {
  config: ActionNodeConfig
  onChange: (config: ActionNodeConfig) => void
}

const actionsCache: {
  data: GroupedActionNodes | null
  timestamp: number
  promise: Promise<GroupedActionNodes> | null
} = {
  data: null,
  timestamp: 0,
  promise: null,
}

const CACHE_TTL = 5 * 60 * 1000

async function fetchAvailableActions(): Promise<GroupedActionNodes> {
  const now = Date.now()

  if (actionsCache.data && (now - actionsCache.timestamp) < CACHE_TTL) {
    return actionsCache.data
  }

  if (actionsCache.promise) {
    return actionsCache.promise
  }

  actionsCache.promise = fetch('/api/workflows/available-actions')
    .then(r => r.json())
    .then(data => {
      if (data.success && data.data) {
        actionsCache.data = data.data
        actionsCache.timestamp = now
        return data.data
      }
      throw new Error('Failed to load available actions')
    })
    .finally(() => {
      actionsCache.promise = null
    })

  return actionsCache.promise
}

const ACTION_FIELDS: Record<string, Record<string, FieldDefinition[]>> = {
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

export function ActionConfigPanel({ config, onChange }: ActionConfigPanelProps) {
  const [availableNodes, setAvailableNodes] = useState<GroupedActionNodes>({})
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchAvailableActions()
      .then(setAvailableNodes)
      .catch(err => {
        console.error('Failed to load available actions:', err)
        setError('Failed to load available actions')
      })
      .finally(() => setLoading(false))
  }, [])

  const fieldDefinitions = useMemo(() => {
    const { service, method } = config
    if (!service || !method) return []
    return ACTION_FIELDS[service]?.[method] || []
  }, [config])

  const paramValues = useMemo(() => {
    const args = config.args || []
    return (args[0] as Record<string, unknown>) || {}
  }, [config.args])

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return Object.keys(availableNodes)
    }
    return Object.keys(availableNodes).filter(category => {
      const nodes = availableNodes[category]
      return nodes.some(
        node =>
          node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.method.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })
  }, [availableNodes, searchQuery])

  const filteredNodes = useMemo(() => {
    if (!selectedCategory || !availableNodes[selectedCategory]) {
      return []
    }
    if (!searchQuery.trim()) {
      return availableNodes[selectedCategory]
    }
    return availableNodes[selectedCategory].filter(
      node =>
        node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.method.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [availableNodes, selectedCategory, searchQuery])

  const handleFieldChange = (name: string, value: unknown) => {
    const newParams = { ...paramValues, [name]: value }
    onChange({
      ...config,
      args: [newParams]
    })
  }

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading...</div>
  }

  if (error) {
    return (
      <div className="p-4 space-y-2">
        <div className="text-sm text-destructive">{error}</div>
        <button onClick={() => window.location.reload()} className="text-sm text-primary hover:underline">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Category</Label>
        <Select value={selectedCategory} onValueChange={(category) => {
          setSelectedCategory(category)
          onChange({ service: '', method: '', args: [] })
        }}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {filteredCategories.map(category => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCategory && (
        <>
          <div>
            <Label>Search Actions</Label>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, service, or method..."
              className="text-sm"
            />
          </div>

          <div>
            <Label>Action</Label>
            <Select
              value={config.service && config.method ? `${config.service}.${config.method}` : ''}
              onValueChange={(value) => {
                const [service, method] = value.split('.')
                const node = availableNodes[selectedCategory]?.find(n => n.service === service && n.method === method)
                onChange({
                  service,
                  method,
                  args: [],
                  label: node?.label
                })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select action" />
              </SelectTrigger>
              <SelectContent>
                {filteredNodes.map(node => (
                  <SelectItem key={`${node.service}.${node.method}`} value={`${node.service}.${node.method}`}>
                    {node.label} ({node.service}.{node.method})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {fieldDefinitions.length > 0 && (
        <div className="border-t border-border pt-4 mt-4">
          <Label className="text-sm font-medium mb-3 block">Configuration</Label>
          <FieldBuilder
            fields={fieldDefinitions}
            values={paramValues}
            onChange={handleFieldChange}
          />
        </div>
      )}

      {config.service && config.method && fieldDefinitions.length === 0 && (
        <div>
          <Label>Arguments (JSON)</Label>
          <Input
            value={JSON.stringify(config.args || [])}
            onChange={(e) => {
              try {
                const args = JSON.parse(e.target.value)
                onChange({ ...config, args })
              } catch {
                onChange({ ...config })
              }
            }}
            placeholder="[]"
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground mt-1">
            此服务/方法组合暂无表单配置，请使用 JSON 格式
          </p>
        </div>
      )}
    </div>
  )
}
