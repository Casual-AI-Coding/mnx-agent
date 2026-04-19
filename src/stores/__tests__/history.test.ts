import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useHistoryStore, type HistoryItem } from '../history'

// Mock persist middleware
vi.mock('zustand/middleware', () => ({
  persist: vi.fn((fn) => fn) as any,
}))

describe('history store', () => {
  beforeEach(() => {
    useHistoryStore.setState({
      items: [],
      maxItems: 50,
    })
    vi.clearAllMocks()
  })

  describe('addItem', () => {
    it('should add an item to the beginning of the list', () => {
      const item: Omit<HistoryItem, 'id' | 'timestamp'> = {
        type: 'text',
        input: 'Hello',
        output: 'World',
      }

      useHistoryStore.getState().addItem(item)

      const items = useHistoryStore.getState().items
      expect(items).toHaveLength(1)
      expect(items[0].input).toBe('Hello')
      expect(items[0].output).toBe('World')
      expect(items[0].type).toBe('text')
    })

    it('should generate unique id and timestamp', () => {
      const item: Omit<HistoryItem, 'id' | 'timestamp'> = {
        type: 'image',
        input: 'prompt',
      }

      useHistoryStore.getState().addItem(item)
      const items = useHistoryStore.getState().items

      expect(items[0].id).toBeDefined()
      expect(items[0].timestamp).toBeDefined()
      expect(typeof items[0].id).toBe('string')
      expect(items[0].id).toContain('-')
    })

    it('should add multiple items in order', () => {
      useHistoryStore.getState().addItem({ type: 'text', input: 'first' })
      useHistoryStore.getState().addItem({ type: 'text', input: 'second' })
      useHistoryStore.getState().addItem({ type: 'text', input: 'third' })

      const items = useHistoryStore.getState().items
      expect(items).toHaveLength(3)
      expect(items[0].input).toBe('third') // Most recent first
      expect(items[1].input).toBe('second')
      expect(items[2].input).toBe('first')
    })

    it('should respect maxItems limit', () => {
      useHistoryStore.setState({ maxItems: 3 })

      useHistoryStore.getState().addItem({ type: 'text', input: '1' })
      useHistoryStore.getState().addItem({ type: 'text', input: '2' })
      useHistoryStore.getState().addItem({ type: 'text', input: '3' })
      useHistoryStore.getState().addItem({ type: 'text', input: '4' })

      const items = useHistoryStore.getState().items
      expect(items).toHaveLength(3)
      expect(items[0].input).toBe('4')
      expect(items[2].input).toBe('2') // Oldest is removed
    })

    it('should handle item with optional fields', () => {
      const item: Omit<HistoryItem, 'id' | 'timestamp'> = {
        type: 'video',
        input: 'video prompt',
        outputUrl: 'https://example.com/video.mp4',
        metadata: { duration: 30 },
      }

      useHistoryStore.getState().addItem(item)

      const items = useHistoryStore.getState().items
      expect(items[0].outputUrl).toBe('https://example.com/video.mp4')
      expect(items[0].metadata).toEqual({ duration: 30 })
    })
  })

  describe('removeItem', () => {
    it('should remove item by id', () => {
      useHistoryStore.setState({
        items: [
          { id: 'item-1', type: 'text', input: 'a', timestamp: 1 },
          { id: 'item-2', type: 'text', input: 'b', timestamp: 2 },
          { id: 'item-3', type: 'text', input: 'c', timestamp: 3 },
        ],
      })

      useHistoryStore.getState().removeItem('item-2')

      const items = useHistoryStore.getState().items
      expect(items).toHaveLength(2)
      expect(items.find((i) => i.id === 'item-2')).toBeUndefined()
    })

    it('should not affect other items when removing', () => {
      useHistoryStore.setState({
        items: [
          { id: 'item-1', type: 'voice', input: 'a', timestamp: 1 },
          { id: 'item-2', type: 'voice', input: 'b', timestamp: 2 },
        ],
      })

      useHistoryStore.getState().removeItem('item-1')

      const items = useHistoryStore.getState().items
      expect(items).toHaveLength(1)
      expect(items[0].id).toBe('item-2')
    })

    it('should handle removing non-existent id', () => {
      useHistoryStore.setState({
        items: [{ id: 'item-1', type: 'text', input: 'a', timestamp: 1 }],
      })

      useHistoryStore.getState().removeItem('non-existent')

      expect(useHistoryStore.getState().items).toHaveLength(1)
    })
  })

  describe('clearItems', () => {
    it('should clear all items when no type specified', () => {
      useHistoryStore.setState({
        items: [
          { id: '1', type: 'text', input: 'a', timestamp: 1 },
          { id: '2', type: 'image', input: 'b', timestamp: 2 },
        ],
      })

      useHistoryStore.getState().clearItems()

      expect(useHistoryStore.getState().items).toHaveLength(0)
    })

    it('should clear only items of specified type', () => {
      useHistoryStore.setState({
        items: [
          { id: '1', type: 'text', input: 'a', timestamp: 1 },
          { id: '2', type: 'image', input: 'b', timestamp: 2 },
          { id: '3', type: 'text', input: 'c', timestamp: 3 },
        ],
      })

      useHistoryStore.getState().clearItems('text')

      const items = useHistoryStore.getState().items
      expect(items).toHaveLength(1)
      expect(items[0].type).toBe('image')
    })

    it('should handle clearing when no items exist', () => {
      expect(() => useHistoryStore.getState().clearItems()).not.toThrow()
      expect(useHistoryStore.getState().items).toHaveLength(0)
    })
  })

  describe('getItemsByType', () => {
    it('should return only items of specified type', () => {
      useHistoryStore.setState({
        items: [
          { id: '1', type: 'text', input: 'a', timestamp: 1 },
          { id: '2', type: 'image', input: 'b', timestamp: 2 },
          { id: '3', type: 'text', input: 'c', timestamp: 3 },
          { id: '4', type: 'voice', input: 'd', timestamp: 4 },
        ],
      })

      const textItems = useHistoryStore.getState().getItemsByType('text')

      expect(textItems).toHaveLength(2)
      expect(textItems.every((i) => i.type === 'text')).toBe(true)
    })

    it('should return empty array when no items of type exist', () => {
      useHistoryStore.setState({
        items: [
          { id: '1', type: 'text', input: 'a', timestamp: 1 },
          { id: '2', type: 'image', input: 'b', timestamp: 2 },
        ],
      })

      const musicItems = useHistoryStore.getState().getItemsByType('music')

      expect(musicItems).toHaveLength(0)
    })

    it('should return empty array when no items exist', () => {
      const items = useHistoryStore.getState().getItemsByType('video')
      expect(items).toHaveLength(0)
    })
  })

  describe('maxItems', () => {
    it('should use default maxItems of 50', () => {
      expect(useHistoryStore.getState().maxItems).toBe(50)
    })

    it('should allow setting custom maxItems', () => {
      useHistoryStore.setState({ maxItems: 10 })
      expect(useHistoryStore.getState().maxItems).toBe(10)
    })
  })
})