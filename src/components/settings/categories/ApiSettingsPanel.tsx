import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { TextSetting, SelectSetting, NumberSetting } from '../fields'
import { useCategory } from '@/settings/store/hooks'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Key, Globe, Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { useState, useCallback } from 'react'
import type { ExternalEndpoint, ExternalProtocol } from '@/settings/types'

const regionOptions = [
  { value: 'cn', label: '中国大陆' },
  { value: 'intl', label: '国际' },
]

const modeOptions = [
  { value: 'direct', label: '直接连接' },
  { value: 'proxy', label: '代理模式' },
]

const protocolOptions = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
]

interface EndpointRowProps {
  endpoint: ExternalEndpoint
  onUpdate: (id: string, data: Partial<ExternalEndpoint>) => void
  onRemove: (id: string) => void
}

function EndpointRow({ endpoint, onUpdate, onRemove }: EndpointRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(endpoint)

  const startEdit = () => {
    setDraft(endpoint)
    setEditing(true)
  }

  const cancelEdit = () => {
    setDraft(endpoint)
    setEditing(false)
  }

  const saveEdit = () => {
    onUpdate(endpoint.id, draft)
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{endpoint.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {endpoint.protocol.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{endpoint.url}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-muted-foreground mr-2">
            {endpoint.apiKey ? '已配置' : '未配置'}
          </span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={startEdit}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => onRemove(endpoint.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="py-3 border-b border-border/50 last:border-0 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">名称</label>
          <Input
            value={draft.name}
            onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            placeholder="如 mikuapi.org"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">协议</label>
          <Select value={draft.protocol} onValueChange={(v: string) => setDraft(d => ({ ...d, protocol: v as ExternalProtocol }))}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {protocolOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Base URL</label>
        <Input
          value={draft.url}
          onChange={e => setDraft(d => ({ ...d, url: e.target.value }))}
          placeholder="https://api.example.com"
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">API Key</label>
        <Input
          type="password"
          value={draft.apiKey}
          onChange={e => setDraft(d => ({ ...d, apiKey: e.target.value }))}
          placeholder="sk-..."
          className="h-8 text-sm"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={cancelEdit}>
          <X className="w-3 h-3 mr-1" />
          取消
        </Button>
        <Button size="sm" className="h-7 text-xs" onClick={saveEdit}>
          <Check className="w-3 h-3 mr-1" />
          保存
        </Button>
      </div>
    </div>
  )
}

function ExternalApiSettings() {
  const [settings, setSettings] = useCategory('api')
  const endpoints = settings.externalEndpoints ?? []

  const addEndpoint = useCallback(() => {
    const newEndpoint: ExternalEndpoint = {
      id: `endpoint-${Date.now()}`,
      name: '',
      url: '',
      protocol: 'openai',
      apiKey: '',
    }
    setSettings({ externalEndpoints: [...endpoints, newEndpoint] })
  }, [endpoints, setSettings])

  const updateEndpoint = useCallback((id: string, data: Partial<ExternalEndpoint>) => {
    setSettings({
      externalEndpoints: endpoints.map(ep => ep.id === id ? { ...ep, ...data } : ep),
    })
  }, [endpoints, setSettings])

  const removeEndpoint = useCallback((id: string) => {
    setSettings({ externalEndpoints: endpoints.filter(ep => ep.id !== id) })
  }, [endpoints, setSettings])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle>外部 API 端点</CardTitle>
          </div>
          <CardDescription>管理外部 API 端点和密钥，用于调试页面自动填充</CardDescription>
        </CardHeader>
        <CardContent>
          {endpoints.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              暂无外部 API 端点，点击下方按钮添加
            </div>
          ) : (
            <div>
              {endpoints.map(ep => (
                <EndpointRow
                  key={ep.id}
                  endpoint={ep}
                  onUpdate={updateEndpoint}
                  onRemove={removeEndpoint}
                />
              ))}
            </div>
          )}
          <Button variant="outline" size="sm" className="mt-4" onClick={addEndpoint}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            添加端点
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function MiniMaxApiSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle>API 密钥配置</CardTitle>
          </div>
          <CardDescription>配置您的 MiniMax API 密钥和连接设置</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <TextSetting
            category="api"
            settingKey="minimaxKey"
            label="API 密钥"
            description="您的 MiniMax API 密钥，用于访问 MiniMax 服务"
            type="password"
          />
          <SelectSetting
            category="api"
            settingKey="region"
            label="API 区域"
            description="选择 MiniMax API 服务区域"
            options={regionOptions}
          />
          <SelectSetting
            category="api"
            settingKey="mode"
            label="连接模式"
            description="选择 API 连接模式"
            options={modeOptions}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>请求配置</CardTitle>
          <CardDescription>配置 API 请求超时和重试策略</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <NumberSetting
            category="api"
            settingKey="timeout"
            label="请求超时"
            description="API 请求超时时间（毫秒）"
            min={1000}
            max={60000}
            step={1000}
          />
          <NumberSetting
            category="api"
            settingKey="retryAttempts"
            label="重试次数"
            description="请求失败时的最大重试次数"
            min={0}
            max={10}
            step={1}
          />
          <NumberSetting
            category="api"
            settingKey="retryDelay"
            label="重试延迟"
            description="重试之间的延迟时间（毫秒）"
            min={100}
            max={10000}
            step={100}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export function ApiSettingsPanel() {
  return (
    <Tabs defaultValue="minimax">
      <TabsList className="mb-4">
        <TabsTrigger value="minimax">MiniMax API</TabsTrigger>
        <TabsTrigger value="external">外部 API 配置</TabsTrigger>
      </TabsList>
      <TabsContent value="minimax">
        <MiniMaxApiSettings />
      </TabsContent>
      <TabsContent value="external">
        <ExternalApiSettings />
      </TabsContent>
    </Tabs>
  )
}
