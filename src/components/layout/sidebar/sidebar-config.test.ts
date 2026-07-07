import i18next from 'i18next'
import { describe, expect, it } from 'vitest'
import type { FeatureFlags } from '../../../lib/frontend-environment'
import { getDebugItems, getMenuSections } from './sidebar-config'

const enabledFlags: FeatureFlags = {
  lyricsGeneration: true,
  resourcePinning: true,
  openAIImage2Debug: true,
}

const disabledFlags: FeatureFlags = {
  lyricsGeneration: false,
  resourcePinning: false,
  openAIImage2Debug: false,
}

describe('sidebar-config feature flags', () => {
  const t = i18next.t.bind(i18next)

  it('隐藏歌词生成入口 when lyricsGeneration 关闭 then debug 菜单不包含 lyrics 路由', () => {
    const debugItems = getDebugItems(t, disabledFlags)

    expect(debugItems.some(item => item.path === '/lyrics')).toBe(false)
  })

  it('保留歌词生成入口 when lyricsGeneration 开启 then debug 菜单包含 lyrics 路由', () => {
    const debugItems = getDebugItems(t, enabledFlags)

    expect(debugItems.some(item => item.path === '/lyrics')).toBe(true)
  })

  it('隐藏 OpenAI Image-2 分组 when openAIImage2Debug 关闭 then 菜单不包含外部调试分组', () => {
    const sections = getMenuSections(t, disabledFlags)

    expect(sections.some(section => section.id === 'externalDebug')).toBe(false)
  })

  it('保留 OpenAI Image-2 分组 when openAIImage2Debug 开启 then 菜单包含外部调试路由', () => {
    const sections = getMenuSections(t, enabledFlags)
    const externalDebug = sections.find(section => section.id === 'externalDebug')

    expect(externalDebug?.items.some(item => item.path === '/external-debug/openai-image-2')).toBe(
      true
    )
  })
})
