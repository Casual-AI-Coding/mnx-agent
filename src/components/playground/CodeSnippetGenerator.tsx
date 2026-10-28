import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { CopyButton } from '@/components/ui/CopyButton'
import { cn } from '@/lib/utils'

interface CodeSnippetGeneratorProps {
  method: string
  path: string
  body?: string
  /** 是否已通过浏览器登录态认证（生成代码需自行携带令牌） */
  className?: string
}

type SnippetLang = 'python' | 'js' | 'curl'

function buildSnippet(lang: SnippetLang, method: string, path: string, body?: string): string {
  const base = 'http://localhost:3000'
  const url = `${base}${path}`
  const hasBody = method === 'POST' && body && body.trim() !== ''

  if (lang === 'python') {
    const lines = [
      'import requests',
      '',
      'resp = requests.',
    ]
    const fn = method.toLowerCase()
    lines[2] = `resp = requests.${fn}(`
    lines.push(`    "${url}",`)
    lines.push('    headers={"Authorization": "Bearer <YOUR_TOKEN>"},')
    if (hasBody) {
      lines.push(`    json=${body}`)
    }
    lines.push(')')
    lines.push('print(resp.json())')
    return lines.join('\n')
  }

  if (lang === 'js') {
    const lines = [
      `const resp = await fetch("${url}", {`,
      `  method: "${method}",`,
      '  headers: {',
      '    "Content-Type": "application/json",',
      '    Authorization: "Bearer <YOUR_TOKEN>",',
      '  },',
    ]
    if (hasBody) {
      lines.push(`  body: JSON.stringify(${body}),`)
    }
    lines.push('})')
    lines.push('console.log(await resp.json())')
    return lines.join('\n')
  }

  const curlLines = [`curl -X ${method} "${url}"`, `  -H "Authorization: Bearer <YOUR_TOKEN>"`]
  if (hasBody) {
    curlLines.push(`  -H "Content-Type: application/json"`)
    curlLines.push(`  -d '${body.replace(/'/g, `'\\''`)}'`)
  }
  return curlLines.join(' \\\n')
}

/**
 * 代码片段生成器（R-018）：一键生成 Python / JavaScript / cURL 调用代码。
 */
export function CodeSnippetGenerator({ method, path, body, className }: CodeSnippetGeneratorProps) {
  const [lang, setLang] = useState<SnippetLang>('python')

  const snippet = useMemo(() => buildSnippet(lang, method, path, body), [lang, method, path, body])

  const tabs: { value: SnippetLang; label: string }[] = [
    { value: 'python', label: 'Python' },
    { value: 'js', label: 'JavaScript' },
    { value: 'curl', label: 'cURL' },
  ]

  return (
    <Card className={className} data-testid="code-snippet-generator">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-sm font-semibold">调用代码</CardTitle>
          <div className="flex items-center gap-1" role="tablist" aria-label="代码语言">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                role="tab"
                aria-selected={lang === tab.value}
                onClick={() => setLang(tab.value)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs transition-colors',
                  lang === tab.value ? 'bg-primary-400/10 text-primary-400 font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                )}
              >
                {tab.label}
              </button>
            ))}
            <CopyButton text={snippet} label="复制代码" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <pre
          className="text-xs bg-secondary/50 rounded-lg p-3 overflow-x-auto max-h-64 text-foreground/90 font-mono"
          data-testid="snippet-content"
        >
          {snippet}
        </pre>
        <p className="text-xs text-muted-foreground/60 mt-2">
          令牌请从登录响应或设置弹窗获取，切勿提交到公共仓库。
        </p>
      </CardContent>
    </Card>
  )
}
