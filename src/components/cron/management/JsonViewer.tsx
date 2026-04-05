import { memo, useMemo, useState } from 'react'
import { Minimize2, Maximize2, Copy, CheckCircle2 } from 'lucide-react'

interface JsonViewerProps {
  data: string | object | null
  maxHeight?: string
  initiallyExpanded?: boolean
}

export const JsonViewer = memo(function JsonViewer({
  data,
  maxHeight = '300px',
  initiallyExpanded = false,
}: JsonViewerProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded)
  const [copied, setCopied] = useState(false)

  const parsedData = useMemo(() => {
    if (!data) return null
    if (typeof data === 'string') {
      try {
        return JSON.parse(data)
      } catch {
        return data
      }
    }
    return data
  }, [data])

  const formattedJson = useMemo(() => {
    if (!parsedData) return ''
    try {
      return JSON.stringify(parsedData, null, 2)
    } catch {
      return String(parsedData)
    }
  }, [parsedData])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedJson)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  if (!data) return <span className="text-muted-foreground/50 italic">No data</span>

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-primary transition-colors"
        >
          {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre
        className={`bg-card/950 rounded-lg p-3 text-xs text-muted-foreground/70 font-mono overflow-auto transition-all ${
          isExpanded ? '' : `max-h-[${maxHeight}]`
        }`}
        style={{ maxHeight: isExpanded ? 'none' : maxHeight }}
      >
        {formattedJson}
      </pre>
    </div>
  )
})
