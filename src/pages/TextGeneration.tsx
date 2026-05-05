import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bot, MessageSquare, Sparkle, Terminal, Zap } from 'lucide-react'
import { WorkbenchActions } from '@/components/shared/WorkbenchActions'
import { PageHeader } from '@/components/shared/PageHeader'
import { streamChatCompletion } from '@/lib/api/text'
import { useHistoryStore } from '@/stores/history'
import { useUsageStore } from '@/stores/usage'
import { useSettingsStore } from '@/settings/store'
import { SYSTEM_PROMPT_TEMPLATES, type ChatMessage } from '@/types'
import { useRetry } from '@/hooks/useRetry'
import { useFormPersistence, DEBUG_FORM_KEYS } from '@/hooks/useFormPersistence'
import { PromptInput } from './text-generation/PromptInput.js'
import { TextResults, type TextMessage } from './text-generation/TextResults.js'

interface TextGenerationFormData {
  selectedModel: string
  selectedTemplate: string
  promptCaching: boolean
}

export default function TextGeneration() {
  const { t } = useTranslation()
  const textSettings = useSettingsStore(s => s.settings.generation.text)
  
  const [formData, setFormData] = useFormPersistence<TextGenerationFormData>({
    storageKey: DEBUG_FORM_KEYS.TEXT_GENERATION,
    defaultValue: {
      selectedModel: textSettings.model,
      selectedTemplate: 'general',
      promptCaching: textSettings.promptCaching,
    },
  })
  
  const { selectedModel, selectedTemplate, promptCaching } = formData
  
  const updateForm = (updates: Partial<TextGenerationFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }
  
  const [messages, setMessages] = useState<TextMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastUserMessage, setLastUserMessage] = useState<string>('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [messagesEndElement, setMessagesEndElement] = useState<HTMLDivElement | null>(null)
  const [textareaElement, setTextareaElement] = useState<HTMLTextAreaElement | null>(null)
  const { addItem } = useHistoryStore()
  const { addUsage } = useUsageStore()
  const { execute, isRetrying, lastError, retryCount } = useRetry()

  const scrollToBottom = () => {
    messagesEndElement?.scrollIntoView({ behavior: 'smooth' })
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

    const userMessage: TextMessage = {
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
    const textarea = textareaElement
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }

  const generateCurl = () => {
    const chatMessages: ChatMessage[] = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }))

    const systemPrompt = SYSTEM_PROMPT_TEMPLATES.find(t => t.id === selectedTemplate)?.prompt || ''
    if (systemPrompt) {
      chatMessages.unshift({ role: 'system', content: systemPrompt })
    }

    const payload = {
      model: selectedModel,
      messages: chatMessages.length > 0 ? chatMessages : [{ role: 'user', content: 'Hello' }],
      stream: true,
      ...(promptCaching && { caching: { mode: 'speed' } }),
    }

    return `curl -X POST "https://api.minimaxi.com/v1/text/chatcompletion_v2" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '${JSON.stringify(payload, null, 2)}'`
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
        actions={
          <WorkbenchActions
            helpTitle="文本生成使用指南"
            helpTips={
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Sparkle className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  <span><strong>提示词工程：</strong>提供清晰、具体的上下文和指令，模型输出质量更高</span>
                </li>
                <li className="flex items-start gap-2">
                  <Bot className="w-4 h-4 mt-0.5 text-accent shrink-0" />
                  <span><strong>模型选择：</strong>MiniMax-M2.7 适合复杂任务，M2.5 适合一般对话</span>
                </li>
                <li className="flex items-start gap-2">
                  <Terminal className="w-4 h-4 mt-0.5 text-secondary shrink-0" />
                  <span><strong>系统提示：</strong>使用场景模板快速设置角色和风格</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="w-4 h-4 mt-0.5 text-warning shrink-0" />
                  <span><strong>Prompt 缓存：</strong>开启缓存可加速重复内容的生成</span>
                </li>
              </ul>
            }
            generateCurl={generateCurl}
            onClear={clearChat}
            clearLabel={t('textGeneration.clearChat')}
          />
        }
      />

      <PromptInput
        clearLabel={t('textGeneration.clearChat')}
        promptCaching={promptCaching}
        selectedModel={selectedModel}
        selectedTemplate={selectedTemplate}
        onClear={clearChat}
        onPromptCachingChange={(value) => updateForm({ promptCaching: value })}
        onSelectedModelChange={(value) => updateForm({ selectedModel: value })}
        onSelectedTemplateChange={(value) => updateForm({ selectedTemplate: value })}
      />

      <TextResults
        copiedId={copiedId}
        input={input}
        isLoading={isLoading}
        isRetrying={isRetrying}
        lastError={lastError}
        messageCountLabel={t('textGeneration.messages')}
        messages={messages}
        messageEndRef={setMessagesEndElement}
        placeholder={t('textGeneration.placeholder')}
        pressEnterToSendLabel={t('textGeneration.pressEnterToSend')}
        retryCount={retryCount}
        startConversationLabel={t('textGeneration.startConversation')}
        textareaRef={setTextareaElement}
        thinkingLabel={t('textGeneration.thinking')}
        youLabel={t('textGeneration.you')}
        aiAssistantLabel={t('textGeneration.aiAssistant')}
        enterToSendLabel={t('textGeneration.enterToSend')}
        onCopy={copyToClipboard}
        onInputChange={setInput}
        onKeyDown={handleKeyDown}
        onRetry={() => {
          if (lastUserMessage) {
            setInput(lastUserMessage)
            handleSend()
          }
        }}
        onSend={handleSend}
      />
    </div>
  )
}
