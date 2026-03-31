import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, Trash2, Bot, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/Card'
import { streamChatCompletion } from '@/lib/api/text'
import { useHistoryStore } from '@/stores/history'
import { useUsageStore } from '@/stores/usage'
import { TEXT_MODELS, SYSTEM_PROMPT_TEMPLATES, type ChatMessage } from '@/types'
import { RetryableError } from '@/components/shared/RetryableError'
import { useRetry } from '@/hooks/useRetry'

interface Message {
  id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp: number
}

export default function TextGeneration() {
  const { t } = useTranslation()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>(TEXT_MODELS[0].id)
  const [selectedTemplate, setSelectedTemplate] = useState('general')
  const [lastUserMessage, setLastUserMessage] = useState<string>('')
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
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('textGeneration.title')}</h1>
          <p className="text-muted-foreground text-sm">
            {t('textGeneration.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={clearChat}>
            <Trash2 className="w-4 h-4 mr-2" />
            {t('textGeneration.clearChat')}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 pb-2 border-b">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('textGeneration.model')}:</span>
          <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v as typeof TEXT_MODELS[number]['id'])}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEXT_MODELS.map(model => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex flex-col">
                    <span>{model.name}</span>
                    <span className="text-xs text-muted-foreground">{model.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('textGeneration.role')}:</span>
          <Select value={selectedTemplate} onValueChange={(v) => setSelectedTemplate(v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SYSTEM_PROMPT_TEMPLATES.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.filter(m => m.role !== 'system').length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Bot className="w-12 h-12 mb-4 opacity-50" />
            <p>{t('textGeneration.startConversation')}</p>
            <p className="text-sm">{t('textGeneration.pressEnterToSend')}</p>
          </div>
        )}

        {messages.filter(m => m.role !== 'system').map((message) => (
          <Card
            key={message.id}
            className={`${
              message.role === 'user'
                ? 'ml-auto max-w-[80%] bg-primary text-primary-foreground'
                : 'mr-auto max-w-[80%]'
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user' ? 'bg-primary-foreground/20' : 'bg-muted'
                }`}>
                  {message.role === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium mb-1">
                    {message.role === 'user' ? t('textGeneration.you') : t('textGeneration.aiAssistant')}
                  </div>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {isLoading && (
          <Card className="mr-auto max-w-[80%]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </CardContent>
          </Card>
        )}

        {lastError && !isRetrying && (
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
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border rounded-lg p-4 bg-card">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('textGeneration.placeholder')}
            className="min-h-[60px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>{t('textGeneration.enterToSend')}</span>
          <span>{messages.filter(m => m.role !== 'system').length} {t('textGeneration.messages')}</span>
        </div>
      </div>
    </div>
  )
}
