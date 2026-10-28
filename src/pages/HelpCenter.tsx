import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { BookOpen, Code2, HelpCircle, LifeBuoy, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible'
import { Input } from '@/components/ui/Input'
import { API_DOC_LINKS, FAQ_CATEGORIES } from '@/lib/help-content'
import { ERROR_CODE_GROUPS, errorCodeAnchor } from '@/lib/error-codes'
import { cn } from '@/lib/utils'

/**
 * 帮助中心（R-011 + R-020 合并交付）：
 * FAQ 分区手风琴、API 文档链接、错误码速查表（搜索 / 分类 / 锚点）。
 * 失败通知与文档可经 /help#error-… 直达对应条目。
 */

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-secondary/50">
        <span className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-primary-400 shrink-0" />
          {question}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p className="px-3 pb-3 pt-1 text-sm text-muted-foreground leading-relaxed">{answer}</p>
      </CollapsibleContent>
    </Collapsible>
  )
}

export default function HelpCenter() {
  const { hash } = useLocation()
  const [query, setQuery] = useState('')

  // /help#error-… 直达错误码条目
  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [hash])

  const normalizedQuery = query.trim().toLowerCase()

  const filteredFaqCategories = useMemo(() => {
    if (!normalizedQuery) return FAQ_CATEGORIES
    return FAQ_CATEGORIES
      .map((category) => ({
        ...category,
        faqs: category.faqs.filter(
          (faq) => faq.question.toLowerCase().includes(normalizedQuery) || faq.answer.toLowerCase().includes(normalizedQuery)
        ),
      }))
      .filter((category) => category.faqs.length > 0)
  }, [normalizedQuery])

  const filteredErrorGroups = useMemo(() => {
    if (!normalizedQuery) return ERROR_CODE_GROUPS
    return ERROR_CODE_GROUPS.map((group) => ({
      ...group,
      entries: group.entries.filter(
        (entry) =>
          entry.code.includes(normalizedQuery)
          || entry.title.toLowerCase().includes(normalizedQuery)
          || entry.cause.toLowerCase().includes(normalizedQuery)
          || entry.fix.toLowerCase().includes(normalizedQuery)
      ),
    })).filter((group) => group.entries.length > 0)
  }, [normalizedQuery])

  return (
    <div className="space-y-6" data-testid="help-center">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-primary-400" />
            帮助中心
          </h1>
          <p className="text-muted-foreground text-sm mt-1">常见问题、官方文档与错误码速查</p>
        </div>
        <div className="relative sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索问题或错误码…"
            className="pl-9"
            aria-label="搜索帮助内容"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {API_DOC_LINKS.map((link) => (
          <Card key={link.title}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-primary-400 mt-0.5 shrink-0" />
                <div>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-foreground hover:text-primary-400 hover:underline"
                  >
                    {link.title}
                  </a>
                  <p className="text-xs text-muted-foreground/70 mt-1">{link.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredFaqCategories.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            没有匹配「{query}」的常见问题
          </CardContent>
        </Card>
      ) : (
        filteredFaqCategories.map((category) => (
          <Card key={category.id}>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">{category.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {category.faqs.map((faq) => (
                <FaqItem key={faq.id} question={faq.question} answer={faq.answer} />
              ))}
            </CardContent>
          </Card>
        ))
      )}

      <Card id="error-codes" data-testid="error-codes">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Code2 className="w-4 h-4 text-primary-400" />
            错误码速查表
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {filteredErrorGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">没有匹配「{query}」的错误码</p>
          ) : (
            filteredErrorGroups.map((group) => (
              <div key={group.category}>
                <h3 className="text-sm font-medium text-foreground mb-1">{group.label}</h3>
                <p className="text-xs text-muted-foreground/70 mb-2">{group.description}</p>
                <div className="space-y-2">
                  {group.entries.map((entry) => (
                    <div
                      key={entry.code}
                      id={errorCodeAnchor(group.category, entry.code)}
                      className="rounded-lg border border-border/50 p-3 scroll-mt-24"
                      data-testid={`error-entry-${group.category}-${entry.code}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-secondary text-foreground">
                          {entry.code}
                        </span>
                        <span className="text-sm font-medium text-foreground">{entry.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        <span className="text-muted-foreground/60">常见原因：</span>
                        {entry.cause}
                      </p>
                      <p className={cn('text-xs mt-1', 'text-muted-foreground')}>
                        <span className="text-muted-foreground/60">处理建议：</span>
                        {entry.fix}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
