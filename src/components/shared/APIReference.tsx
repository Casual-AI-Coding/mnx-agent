import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

interface APIReferenceProps {
  endpoint: string
  method: 'GET' | 'POST'
  body?: object
  title?: string
}

export function APIReference({
  endpoint,
  method,
  body,
  title = 'API 参考',
}: APIReferenceProps) {
  const [copied, setCopied] = useState(false)

  const generateCurlCommand = () => {
    const baseUrl = 'https://api.minimaxi.com'
    let curlCommand = `curl --request ${method} \\\n  --url '${baseUrl}${endpoint}' \\\n  --header 'Authorization: Bearer YOUR_API_KEY' \\\n  --header 'Content-Type: application/json'`

    if (body && method === 'POST') {
      curlCommand += ` \\\n  --data '${JSON.stringify(body, null, 2)}'`
    }

    return curlCommand
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateCurlCommand())
      setCopied(true)
      toast.success('已复制')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('复制失败')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
          aria-label={copied ? '已复制' : '复制'}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              <span>已复制</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>复制</span>
            </>
          )}
        </button>
      </CardHeader>
      <CardContent>
        <pre className="text-xs text-dark-500 font-mono whitespace-pre-wrap bg-dark-800/50 p-3 rounded-lg overflow-x-auto">
          {generateCurlCommand()}
        </pre>
      </CardContent>
    </Card>
  )
}
