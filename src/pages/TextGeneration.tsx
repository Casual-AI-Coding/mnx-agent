import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, Trash2, Sparkles, User, Copy, Check, RefreshCw, Zap, ZapOff, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/shared/PageHeader'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { Label } from '@/components/ui/Label'
import { streamChatCompletion } from '@/lib/api/text'
import { useHistoryStore } from '@/stores/history'
import { useUsageStore } from '@/stores/usage'
import { useSettingsStore } from '@/settings/store'
import { TEXT_MODELS, SYSTEM_PROMPT_TEMPLATES, type ChatMessage } from '@/types'
import { RetryableError } from '@/components/shared/RetryableError'
import { useRetry } from '@/hooks/useRetry'
import { motion, AnimatePresence } from 'framer-motion'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'
import { services, status } from '@/themes/tokens'

interface Message {
  id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp: number
  error?: boolean
}

export default function TextGeneration() {
  const { t } = useTranslation()
  const textSettings = useSettingsStore(s => s.settings.generation.text)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>(textSettings.model)
  const [selectedTemplate, setSelectedTemplate] = useState('general')
  const [promptCaching, setPromptCaching] = useState(textSettings.promptCaching)
  const [lastUserMessage, setLastUserMessage] = useState<string>('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { addItem } = useHistoryStore()
  const { addUsage } = useUsageStore()
  const { execute, isRetrying, lastError, retryCount } = useRetry()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const template = SYSTEM_PROMPT_TEMPLATES.find(t => t.id === selectedTemplate)
    if (template && messages.length === 0) {
      setMessages([{
        id: 'system-1',
        role: 'system',
        content: template.prompt,
        timestamp: Date.now(),
      }])
    }
  }, [selectedTemplate])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessageContent = input.trim()
    setLastUserMessage(userMessageContent)

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessageContent,
      timestamp: Date.now(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    const chatMessages: ChatMessage[] = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }))

    const systemPrompt = SYSTEM_PROMPT_TEMPLATES.find(t => t.id === selectedTemplate)?.prompt || ''
    if (systemPrompt) {
      chatMessages.unshift({ role: 'system', content: systemPrompt })
    }

    chatMessages.push({ role: 'user', content: userMessageContent })

    const assistantMessageId = `assistant-${Date.now()}`
    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    }])

    let fullContent = ''

    const success = await execute(async () => {
      fullContent = ''

      for await (const chunk of streamChatCompletion({
        model: selectedModel,
        messages: chatMessages,
        stream: true,
        ...(promptCaching && { caching: { mode: 'speed' } }),
      })) {
        const content = chunk.choices[0]?.delta?.content || ''
        if (content) {
          fullContent += content
          setMessages(prev => prev.map(m =>
            m.id === assistantMessageId
              ? { ...m, content: fullContent }
              : m
          ))
        }
      }

      return fullContent
    })

    if (success !== null) {
      const usageEstimate = Math.ceil(userMessageContent.length / 4) + Math.ceil(fullContent.length / 4)
      addUsage('textTokens', usageEstimate)

      addItem({
        type: 'text',
        input: userMessageContent,
        output: fullContent,
        metadata: { model: selectedModel },
      })
    } else {
      setMessages(prev => prev.map(m =>
        m.id === assistantMessageId
          ? { ...m, content: '', error: true }
          : m
      ))
    }

    setIsLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const clearChat = () => {
    const template = SYSTEM_PROMPT_TEMPLATES.find(t => t.id === selectedTemplate)
    setMessages(template ? [{
      id: 'system-1',
      role: 'system',
      content: template.prompt,
      timestamp: Date.now(),
    }] : [])
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }

  useEffect(() => {
    adjustTextareaHeight()
  }, [input])

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader
        icon={<MessageSquare className="w-5 h-5" />}
        title="文本生成"
        description="使用 MiniMax API 进行智能文本生成"
        gradient="indigo-violet"
      />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v as typeof TEXT_MODELS[number]['id'])}>
            <SelectTrigger className="w-48 bg-card/50 border-border text-foreground hover:border-primary/50 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {TEXT_MODELS.map(model => (
                <SelectItem key={model.id} value={model.id} className="text-foreground focus:bg-secondary">
                  <div className="flex flex-col">
                    <span>{model.name}</span>
                    <span className="text-xs text-muted-foreground">{model.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger className="w-36 bg-card/50 border-border text-foreground hover:border-primary/50 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {SYSTEM_PROMPT_TEMPLATES.map(template => (
                <SelectItem key={template.id} value={template.id} className="text-foreground focus:bg-secondary">
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 px-3 py-2 bg-card/50 border border-border rounded-lg">
            {promptCaching ? (
              <Zap className="w-4 h-4 text-warning" />
            ) : (
              <ZapOff className="w-4 h-4 text-muted-foreground" />
            )}
            <Switch
              checked={promptCaching}
              onCheckedChange={setPromptCaching}
              className="data-[state=checked]:bg-warning"
            />
            <Label className="text-sm text-muted-foreground cursor-pointer" onClick={() => setPromptCaching(!promptCaching)}>
              {t('textGeneration.promptCaching') || '缓存'}
            </Label>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearChat}
            className="text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {t('textGeneration.clearChat')}
          </Button>
        </div>
      </div>

      <div 
        className="flex-1 overflow-y-auto space-y-4 pr-2 chat-scrollbar"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'hsl(var(--primary) / 0.3) transparent',
        }}
      >
        <style>{`
          /* Custom scrollbar for chat messages - glassmorphic dark theme */
          .chat-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .chat-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .chat-scrollbar::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, hsl(var(--primary) / 0.4), hsl(var(--accent) / 0.3));
            border-radius: 3px;
          }
          .chat-scrollbar::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, hsl(var(--primary) / 0.6), hsl(var(--accent) / 0.5));
          }
        `}</style>
        <AnimatePresence mode="popLayout">
          {messages.filter(m => m.role !== 'system').length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full text-muted-foreground"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                <Sparkles className="w-16 h-16 relative text-primary/50" />
              </div>
              <p className="mt-6 text-lg font-medium text-muted-foreground">{t('textGeneration.startConversation')}</p>
              <p className="text-sm text-muted-foreground/70 mt-2">{t('textGeneration.pressEnterToSend')}</p>
            </motion.div>
          )}

          {messages.filter(m => m.role !== 'system').map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`relative group max-w-[85%] ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-primary to-accent text-primary-foreground'
                    : 'bg-card/80 backdrop-blur-xl border border-border/50 text-foreground'
                } rounded-2xl ${message.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'} shadow-lg`}
              >
                {message.role === 'user' && (
                  <div className="absolute inset-0 bg-primary/30 blur-xl rounded-2xl -z-10" />
                )}
                
                {message.role === 'assistant' && (
                  <div className="absolute inset-0 bg-primary/5 blur-xl rounded-2xl -z-10" />
                )}

                <div className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      message.role === 'user'
                        ? 'bg-foreground/20'
                        : 'bg-gradient-to-br from-primary to-accent'
                    }`}>
                      {message.role === 'user' ? (
                        <User className="w-3.5 h-3.5" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
                      )}
                    </div>
                    <span className={`text-xs font-medium ${
                      message.role === 'user' ? 'text-foreground/80' : 'text-muted-foreground'
                    }`}>
                      {message.role === 'user' ? t('textGeneration.you') : t('textGeneration.aiAssistant')}
                    </span>
                  </div>
                  {message.role === 'assistant' ? (
                    <MarkdownRenderer 
                      content={message.content} 
                      className="text-[15px] leading-relaxed"
                    />
                  ) : (
                    <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</div>
                  )}
                  
                  {message.content && !message.error && (
                    <button
                      onClick={() => copyToClipboard(message.content, message.id)}
                      className={`absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
                        message.role === 'user'
                          ? 'hover:bg-foreground/20 text-foreground/70 hover:text-foreground'
                          : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {copiedId === message.id ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-muted-foreground text-sm">{t('textGeneration.thinking')}</span>
              </div>
            </div>
          </motion.div>
        )}

        {lastError && !isRetrying && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center"
          >
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 flex items-center gap-3">
              <RetryableError
                error={lastError}
                onRetry={() => {
                  if (lastUserMessage) {
                    setInput(lastUserMessage)
                    handleSend()
                  }
                }}
                retryCount={retryCount}
              />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="mt-4 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 blur-2xl rounded-2xl" />
        
        <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-2">
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('textGeneration.placeholder')}
              className="flex-1 bg-transparent text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none px-4 py-3 text-[15px] leading-relaxed min-h-[52px] max-h-[200px]"
              disabled={isLoading}
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
                input.trim() && !isLoading
                  ? 'bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg shadow-primary/25'
                  : 'bg-secondary/50 text-muted-foreground/50 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground/50">
            <span>{t('textGeneration.enterToSend')}</span>
            <span>{messages.filter(m => m.role !== 'system').length} {t('textGeneration.messages')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}