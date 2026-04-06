import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { cn } from '@/lib/utils'

import 'highlight.js/styles/github-dark.css'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        'prose prose-invert prose-sm max-w-none',
        'prose-headings:font-semibold prose-headings:text-foreground',
        'prose-p:text-foreground prose-p:leading-relaxed',
        'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
        'prose-strong:text-foreground prose-strong:font-semibold',
        'prose-code:text-foreground prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono',
        'prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0',
        'prose-ol:text-foreground prose-ul:text-foreground',
        'prose-li:marker:text-muted-foreground',
        'prose-blockquote:border-l-2 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground',
        'prose-hr:border-border',
        'prose-table:w-full prose-table:border-collapse',
        'prose-th:border prose-th:border-border prose-th:bg-muted prose-th:p-2 prose-th:text-left prose-th:text-sm prose-th:font-semibold',
        'prose-td:border prose-td:border-border prose-td:p-2 prose-td:text-sm',
        'prose-tr:border-b prose-tr:border-border',
        'prose-img:rounded-lg prose-img:max-w-full',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true }]]}
        components={{
          code({ className, children, ...props }: React.ComponentProps<'code'>) {
            const match = /language-(\w+)/.exec(className || '')
            const isInline = !match && !className?.includes('language-')

            if (isInline) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              )
            }

            return (
              <div className="relative group">
                <div className="absolute top-0 right-0 px-2 py-1 text-xs text-muted-foreground bg-muted rounded-bl opacity-0 group-hover:opacity-100 transition-opacity">
                  {match?.[1] || 'text'}
                </div>
                <pre className="bg-card rounded-lg p-4 overflow-x-auto border border-border">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            )
          },
          pre({ children }: React.ComponentProps<'pre'>) {
            return <>{children}</>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
