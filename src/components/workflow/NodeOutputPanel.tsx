import * as React from 'react'
import { X, Copy, ChevronDown, ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NodeOutputPanelProps {
  nodeId: string
  nodeName: string
  input?: unknown
  output?: unknown
  error?: string
  duration?: number
  onClose: () => void
  onUseAsInput?: (data: unknown) => void
}

export function NodeOutputPanel({
  nodeId,
  nodeName,
  input,
  output,
  error,
  duration,
  onClose,
  onUseAsInput,
}: NodeOutputPanelProps) {
  const [showInput, setShowInput] = React.useState(true)
  const [showOutput, setShowOutput] = React.useState(true)
  const [copied, setCopied] = React.useState<string | null>(null)

  const copyToClipboard = async (data: unknown, label: string) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      setCopied(label)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Ignore copy errors
    }
  }

  const formatValue = (value: unknown, indent = 0): React.ReactNode => {
    const indentClass = `pl-${indent * 2}`

    if (value === null) {
      return <span className="text-muted-foreground">null</span>
    }
    if (value === undefined) {
      return <span className="text-muted-foreground">undefined</span>
    }
    if (typeof value === 'string') {
      if (value.length > 200) {
        return (
          <span className="text-green-400">
            "{value.slice(0, 200)}..."
            <span className="text-muted-foreground"> ({value.length} 字符)</span>
          </span>
        )
      }
      return <span className="text-green-400">"{value}"</span>
    }
    if (typeof value === 'number') {
      return <span className="text-blue-400">{value}</span>
    }
    if (typeof value === 'boolean') {
      return <span className="text-purple-400">{value.toString()}</span>
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-muted-foreground">[]</span>
      }
      return (
        <span>
          <span className="text-muted-foreground">[</span>
          <div className={indentClass}>
            {value.map((item, i) => (
              <div key={i} className="pl-4">
                {formatValue(item, indent + 1)}
                {i < value.length - 1 && <span className="text-muted-foreground">,</span>}
              </div>
            ))}
          </div>
          <span className="text-muted-foreground">]</span>
        </span>
      )
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
      if (entries.length === 0) {
        return <span className="text-muted-foreground">{'{}'}</span>
      }
      return (
        <span>
          <span className="text-muted-foreground">{'{'}</span>
          <div className={indentClass}>
            {entries.map(([key, val], i) => (
              <div key={key} className="pl-4">
                <span className="text-foreground">{key}</span>
                <span className="text-muted-foreground">: </span>
                {formatValue(val, indent + 1)}
                {i < entries.length - 1 && <span className="text-muted-foreground">,</span>}
              </div>
            ))}
          </div>
          <span className="text-muted-foreground">{'}'}</span>
        </span>
      )
    }
    return <span>{String(value)}</span>
  }

  const formatDuration = (ms?: number) => {
    if (ms === undefined) return null
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  return (
    <div className="w-80 bg-background border-l border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground truncate">{nodeName}</h3>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground font-mono">{nodeId}</p>
            {duration !== undefined && (
              <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                {formatDuration(duration)}
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-md flex-shrink-0">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Input section */}
        {input !== undefined && (
          <div className="border-b border-border">
            <button
              onClick={() => setShowInput(!showInput)}
              className="w-full px-4 py-2 flex items-center justify-between text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <span>输入</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    copyToClipboard(input, 'input')
                  }}
                  className="p-1 hover:bg-secondary rounded transition-colors"
                  title="复制"
                >
                  {copied === 'input' ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
                {showInput ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </div>
            </button>
            {showInput && (
              <div className="p-4 bg-muted/30 font-mono text-xs overflow-x-auto">
                {formatValue(input)}
              </div>
            )}
          </div>
        )}

        {/* Output section */}
        {output !== undefined && (
          <div className="border-b border-border">
            <button
              onClick={() => setShowOutput(!showOutput)}
              className="w-full px-4 py-2 flex items-center justify-between text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <span>输出</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    copyToClipboard(output, 'output')
                  }}
                  className="p-1 hover:bg-secondary rounded transition-colors"
                  title="复制"
                >
                  {copied === 'output' ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
                {onUseAsInput && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onUseAsInput(output)
                    }}
                    className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                    title="用作输入"
                  >
                    用作输入
                  </button>
                )}
                {showOutput ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </div>
            </button>
            {showOutput && (
              <div className="p-4 bg-muted/30 font-mono text-xs overflow-x-auto">
                {formatValue(output)}
              </div>
            )}
          </div>
        )}

        {/* Error section */}
        {error && (
          <div className="p-4 bg-red-500/10 border-b border-red-500/20">
            <div className="text-xs font-medium text-red-400 mb-1">错误</div>
            <div className="text-xs text-red-300 font-mono break-all">{error}</div>
          </div>
        )}

        {/* Empty state */}
        {input === undefined && output === undefined && !error && (
          <div className="p-8 text-center">
            <p className="text-xs text-muted-foreground">暂无数据</p>
            <p className="text-[10px] text-muted-foreground/70 mt-1">运行测试后查看输入输出</p>
          </div>
        )}
      </div>

      {/* Footer hints */}
      <div className="p-3 border-t border-border bg-muted/20">
        <p className="text-[10px] text-muted-foreground/70">
          提示: 点击复制按钮可将数据复制到剪贴板
        </p>
      </div>
    </div>
  )
}
