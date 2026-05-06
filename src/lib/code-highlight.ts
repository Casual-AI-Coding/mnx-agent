/**
 * 轻量级代码高亮 rehype 插件。
 * 替代 rehype-highlight，避免 highlight.js 全量引入（35 种→12 种语言）。
 */
import { createLowlight } from 'lowlight'
import { visit } from 'unist-util-visit'
import { toText } from 'hast-util-to-text'
import type { Root, Element } from 'hast'

import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import plaintext from 'highlight.js/lib/languages/plaintext'
import python from 'highlight.js/lib/languages/python'
import shell from 'highlight.js/lib/languages/shell'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'

const lowlight = createLowlight({
  bash,
  css,
  javascript,
  json,
  markdown,
  plaintext,
  python,
  shell,
  sql,
  typescript,
  xml,
  yaml,
})

lowlight.registerAlias({ js: 'javascript', ts: 'typescript', py: 'python', sh: 'bash' })

const prefix = 'hljs-'

export default function rehypeCodeHighlight() {
  return function (tree: Root) {
    visit(tree, 'element', function (node: Element, _index: number | undefined, parent: Element | Root | undefined) {
      if (
        node.tagName !== 'code' ||
        !parent ||
        parent.type !== 'element' ||
        (parent as Element).tagName !== 'pre'
      ) {
        return
      }

      if (Array.isArray(node.properties.className)) {
        const className = node.properties.className as string[]
        const langMatch = className.find((c) => c.startsWith('language-'))
        const language = langMatch ? langMatch.slice('language-'.length) : ''

        if (language) {
          try {
            const result = lowlight.highlight(language, toText(node))
            node.tagName = 'span'
            node.properties = { className: [prefix + 'code', prefix + 'language-' + language] }
            node.children = result.children as unknown as Element[]
          } catch {
            // Language not recognized — silently fall through
          }
        }
      }
    })
  }
}
