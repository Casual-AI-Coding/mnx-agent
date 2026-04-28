import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { TextSetting, SelectSetting, NumberSetting } from '../fields'
import { useCategory } from '@/settings/store/hooks'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Key, Globe, Plus, Trash2, Pencil, Check, X, Copy, Eye, EyeOff, GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { ExternalEndpoint, ExternalProtocol } from '@/settings/types'
import { useClipboard } from '@/hooks/useClipboard'

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

const protocolStyles: Record<string, { bg: string; text: string; icon: ReactNode }> = {
  openai: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
      </svg>
    ),
  },
  anthropic: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.808 21.216l-2.03-4.368h-.064l-2.03 4.368h-1.984l2.896-5.648L8.624 9.2h2.064l1.76 3.824h.08l1.76-3.824h2.064l-2.048 6.368 2.896 5.648h-1.984zM4.496 9.2h1.888v9.168H4.496V9.2zm14.176 0h1.888v9.168h-1.888V9.2z" />
      </svg>
    ),
  },
}

function ProtocolBadge({ protocol }: { protocol: string }) {
  const style = protocolStyles[protocol]
  if (style) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>
        {style.icon}
        {protocol.charAt(0).toUpperCase() + protocol.slice(1)}
      </span>
    )
  }
  return (
    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
      {protocol.toUpperCase()}
    </span>
  )
}

interface EndpointRowProps {
  endpoint: ExternalEndpoint
  onUpdate: (id: string, data: Partial<ExternalEndpoint>) => void
  onRemove: (id: string) => void
  onClone: (id: string) => void
}

function EndpointRow({ endpoint, onUpdate, onRemove, onClone }: EndpointRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(endpoint)
  const [showApiKey, setShowApiKey] = useState(false)
  const { copied, copy } = useClipboard()

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

  const toggleApiKeyVisibility = () => {
    setShowApiKey(!showApiKey)
  }

  const copyApiKey = async () => {
    if (endpoint.apiKey) {
      await copy(endpoint.apiKey)
    }
  }

  const getApiKeyDisplay = () => {
    if (!endpoint.apiKey) return '未配置'
    if (showApiKey) return endpoint.apiKey
    return '••••••••••••••••'
  }

  const sharedTransition = { duration: 0.2, ease: [0.25, 1, 0.5, 1] }

  return (
    <div className="py-3 border-b border-border/50 last:border-0">
      <AnimatePresence mode="wait">
        {!editing ? (
          <motion.div
            key="display"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={sharedTransition}
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{endpoint.name}</span>
                  <ProtocolBadge protocol={endpoint.protocol} />
                  <span className="text-xs text-muted-foreground truncate">{endpoint.url}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span className="shrink-0">Secret Key:</span>
                  <code className="font-mono text-foreground/80 truncate">{getApiKeyDisplay()}</code>
                  <button
                    type="button"
                    onClick={toggleApiKeyVisibility}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    title={showApiKey ? '隐藏' : '显示'}
                  >
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  {endpoint.apiKey && (
                    <button
                      type="button"
                      onClick={copyApiKey}
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      title={copied ? '已复制' : '复制 Secret Key'}
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onClone(endpoint.id)} title="克隆配置">
                  <GitBranch className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={startEdit}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => onRemove(endpoint.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={sharedTransition}
            className="space-y-3"
          >
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
              <div className="relative">
                <Input
                  type="password"
                  value={draft.apiKey}
                  onChange={e => setDraft(d => ({ ...d, apiKey: e.target.value }))}
                  placeholder="sk-..."
                  className="h-8 text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setDraft(d => ({ ...d, apiKey: '' }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ExternalApiSettings() {
  const [settings, setSettings] = useCategory('api')
  const endpoints = [...(settings.externalEndpoints ?? [])].sort((a, b) => a.name.localeCompare(b.name))

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

  const cloneEndpoint = useCallback((id: string) => {
    const original = endpoints.find(ep => ep.id === id)
    if (original) {
      const newEndpoint: ExternalEndpoint = {
        ...original,
        id: `endpoint-${Date.now()}`,
        name: `${original.name} (副本)`,
      }
      setSettings({ externalEndpoints: [...endpoints, newEndpoint] })
    }
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
                  onClone={cloneEndpoint}
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
