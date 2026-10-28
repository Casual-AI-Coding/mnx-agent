import { describe, it, expect } from 'vitest'
import { API_DOC_LINKS, FAQ_CATEGORIES } from '../help-content'
import { ERROR_CODE_GROUPS, errorCodeAnchor } from '../error-codes'

describe('帮助中心内容数据源', () => {
  it('FAQ 分类非空且字段完整、id 唯一', () => {
    const ids = new Set<string>()
    for (const category of FAQ_CATEGORIES) {
      expect(category.faqs.length).toBeGreaterThan(0)
      for (const faq of category.faqs) {
        expect(faq.id).toBeTruthy()
        expect(faq.question).toBeTruthy()
        expect(faq.answer.length).toBeGreaterThan(10)
        expect(ids.has(faq.id)).toBe(false)
        ids.add(faq.id)
      }
    }
  })

  it('API 文档链接字段完整', () => {
    expect(API_DOC_LINKS.length).toBeGreaterThan(0)
    for (const link of API_DOC_LINKS) {
      expect(link.url).toMatch(/^https?:\/\//)
      expect(link.title).toBeTruthy()
      expect(link.description).toBeTruthy()
    }
  })

  it('错误码三类分组、条目完整、锚点唯一', () => {
    const anchors = new Set<string>()
    for (const group of ERROR_CODE_GROUPS) {
      expect(group.entries.length).toBeGreaterThan(0)
      for (const entry of group.entries) {
        expect(entry.code).toBeTruthy()
        expect(entry.title).toBeTruthy()
        expect(entry.cause).toBeTruthy()
        expect(entry.fix).toBeTruthy()
        const anchor = errorCodeAnchor(group.category, entry.code)
        expect(anchors.has(anchor)).toBe(false)
        anchors.add(anchor)
      }
    }
    // 覆盖三类：minimax / internal / proxy
    expect(ERROR_CODE_GROUPS.map(g => g.category)).toEqual(['minimax', 'internal', 'proxy'])
  })

  it('关键错误码存在', () => {
    const minimax = ERROR_CODE_GROUPS.find(g => g.category === 'minimax')
    const codes = minimax?.entries.map(e => e.code) ?? []
    expect(codes).toContain('1004')
    expect(codes).toContain('1027')
    expect(codes).toContain('2013')
  })
})
