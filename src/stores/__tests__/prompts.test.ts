import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePromptsStore } from '../prompts'

describe('usePromptsStore', () => {
  beforeEach(() => {
    localStorage.removeItem('minimax-prompts')
    usePromptsStore.setState({ prompts: [] })
  })

  describe('addPrompt', () => {
    it('should add prompt with generated id and createdAt', () => {
      const { result } = renderHook(() => usePromptsStore())

      act(() => {
        result.current.addPrompt({
          title: 'Test Prompt',
          content: 'This is a test',
          category: 'text',
        })
      })

      expect(result.current.prompts.length).toBe(1)
      expect(result.current.prompts[0].title).toBe('Test Prompt')
      expect(result.current.prompts[0].content).toBe('This is a test')
      expect(result.current.prompts[0].category).toBe('text')
      expect(result.current.prompts[0].id).toBeDefined()
      expect(result.current.prompts[0].createdAt).toBeDefined()
    })

    it('should prepend prompt to beginning of list', () => {
      const { result } = renderHook(() => usePromptsStore())

      act(() => {
        result.current.addPrompt({
          title: 'First',
          content: 'First content',
          category: 'text',
        })
      })

      act(() => {
        result.current.addPrompt({
          title: 'Second',
          content: 'Second content',
          category: 'text',
        })
      })

      expect(result.current.prompts.length).toBe(2)
      expect(result.current.prompts[0].title).toBe('Second')
      expect(result.current.prompts[1].title).toBe('First')
    })
  })

  describe('deletePrompt', () => {
    it('should remove prompt by id', () => {
      const { result } = renderHook(() => usePromptsStore())

      act(() => {
        result.current.addPrompt({
          title: 'To Delete',
          content: 'Will be deleted',
          category: 'text',
        })
      })

      const promptId = result.current.prompts[0].id
      expect(result.current.prompts.length).toBe(1)

      act(() => {
        result.current.deletePrompt(promptId)
      })

      expect(result.current.prompts.length).toBe(0)
    })

    it('should not affect other prompts when deleting', () => {
      const { result } = renderHook(() => usePromptsStore())

      act(() => {
        result.current.addPrompt({ title: 'Keep 1', content: 'c1', category: 'text' })
        result.current.addPrompt({ title: 'Delete Me', content: 'c2', category: 'text' })
        result.current.addPrompt({ title: 'Keep 2', content: 'c3', category: 'text' })
      })

      const deleteId = result.current.prompts[1].id

      act(() => {
        result.current.deletePrompt(deleteId)
      })

      expect(result.current.prompts.length).toBe(2)
      expect(result.current.prompts.find((p) => p.title === 'Delete Me')).toBeUndefined()
      expect(result.current.prompts.find((p) => p.title === 'Keep 1')).toBeDefined()
      expect(result.current.prompts.find((p) => p.title === 'Keep 2')).toBeDefined()
    })
  })

  describe('getPromptsByCategory', () => {
    it('should filter prompts by category', () => {
      const { result } = renderHook(() => usePromptsStore())

      act(() => {
        result.current.addPrompt({ title: 'Text 1', content: 'c1', category: 'text' })
        result.current.addPrompt({ title: 'Image 1', content: 'c2', category: 'image' })
        result.current.addPrompt({ title: 'Text 2', content: 'c3', category: 'text' })
        result.current.addPrompt({ title: 'Music 1', content: 'c4', category: 'music' })
      })

      const textPrompts = result.current.getPromptsByCategory('text')
      expect(textPrompts.length).toBe(2)
      expect(textPrompts.every((p) => p.category === 'text')).toBe(true)

      const imagePrompts = result.current.getPromptsByCategory('image')
      expect(imagePrompts.length).toBe(1)

      const musicPrompts = result.current.getPromptsByCategory('music')
      expect(musicPrompts.length).toBe(1)
    })

    it('should return empty array for category with no prompts', () => {
      const { result } = renderHook(() => usePromptsStore())

      act(() => {
        result.current.addPrompt({ title: 'Text 1', content: 'c1', category: 'text' })
      })

      const videoPrompts = result.current.getPromptsByCategory('video')
      expect(videoPrompts).toEqual([])
    })
  })
})
