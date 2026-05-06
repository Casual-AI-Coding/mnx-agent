import React, { Suspense } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, RefreshCw, Send, Sparkles, User } from 'lucide-react'
import { RetryableError } from '@/components/shared/RetryableError'

const MarkdownRenderer = React.lazy(() =>
  import('@/components/ui/MarkdownRenderer').then(m => ({ default: m.MarkdownRenderer }))
)

export interface TextMessage {
  id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp: number
  error?: boolean
}

interface TextResultsProps {
  copiedId: string | null
  input: string
  isLoading: boolean
  isRetrying: boolean
  lastError: Error | null
  messages: TextMessage[]
  messageEndRef: (node: HTMLDivElement | null) => void
  messageCountLabel: string
  placeholder: string
  pressEnterToSendLabel: string
  retryCount: number
  startConversationLabel: string
  textareaRef: (node: HTMLTextAreaElement | null) => void
  thinkingLabel: string
  youLabel: string
  aiAssistantLabel: string
  enterToSendLabel: string
  onCopy: (text: string, id: string) => void
  onInputChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onRetry: () => void
  onSend: () => void
}

export function TextResults({
  copiedId,
  input,
  isLoading,
  isRetrying,
  lastError,
  messages,
  messageEndRef,
  messageCountLabel,
  placeholder,
  pressEnterToSendLabel,
  retryCount,
  startConversationLabel,
  textareaRef,
  thinkingLabel,
  youLabel,
  aiAssistantLabel,
  enterToSendLabel,
  onCopy,
  onInputChange,
  onKeyDown,
  onRetry,
  onSend,
}: TextResultsProps) {
  const visibleMessages = messages.filter((message) => message.role !== 'system')

  return (
    <>
      <div
        className="flex-1 overflow-y-auto space-y-4 pr-2 chat-scrollbar"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'hsl(var(--primary) / 0.3) transparent',
        }}
      >
        <style>{`
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
          {visibleMessages.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                <Sparkles className="w-16 h-16 relative text-primary/50" />
              </div>
              <p className="mt-6 text-lg font-medium text-muted-foreground">{startConversationLabel}</p>
              <p className="text-sm text-muted-foreground/70 mt-2">{pressEnterToSendLabel}</p>
            </motion.div>
          )}

          {visibleMessages.map((message) => (
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
                {message.role === 'user' && <div className="absolute inset-0 bg-primary/30 blur-xl rounded-2xl -z-10" />}
                {message.role === 'assistant' && <div className="absolute inset-0 bg-primary/5 blur-xl rounded-2xl -z-10" />}

                <div className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${message.role === 'user' ? 'bg-foreground/20' : 'bg-gradient-to-br from-primary to-accent'}`}>
                      {message.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />}
                    </div>
                    <span className={`text-xs font-medium ${message.role === 'user' ? 'text-foreground/80' : 'text-muted-foreground'}`}>
                      {message.role === 'user' ? youLabel : aiAssistantLabel}
                    </span>
                  </div>

                  {message.role === 'assistant' ? (
                    <Suspense fallback={<div className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</div>}>
                      <MarkdownRenderer content={message.content} className="text-[15px] leading-relaxed" />
                    </Suspense>
                  ) : (
                    <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</div>
                  )}

                  {message.content && !message.error && (
                    <button
                      onClick={() => onCopy(message.content, message.id)}
                      className={`absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
                        message.role === 'user'
                          ? 'hover:bg-foreground/20 text-foreground/70 hover:text-foreground'
                          : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {copiedId === message.id ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
            <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-muted-foreground text-sm">{thinkingLabel}</span>
              </div>
            </div>
          </motion.div>
        )}

        {lastError && !isRetrying && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 flex items-center gap-3">
              <RetryableError error={lastError} onRetry={onRetry} retryCount={retryCount} />
            </div>
          </motion.div>
        )}

        <div ref={messageEndRef} />
      </div>

      <div className="mt-4 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 blur-2xl rounded-2xl" />

        <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-2">
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none px-4 py-3 text-[15px] leading-relaxed min-h-[52px] max-h-[200px]"
              disabled={isLoading}
              rows={1}
            />
            <button
              onClick={onSend}
              disabled={!input.trim() || isLoading}
              className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
                input.trim() && !isLoading
                  ? 'bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg shadow-primary/25'
                  : 'bg-secondary/50 text-muted-foreground/50 cursor-not-allowed'
              }`}
            >
              {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground/50">
            <span>{enterToSendLabel}</span>
            <span>{visibleMessages.length} {messageCountLabel}</span>
          </div>
        </div>
      </div>
    </>
  )
}
