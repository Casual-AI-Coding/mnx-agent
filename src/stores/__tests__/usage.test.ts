import { renderHook, waitFor } from '@testing-library/react'
import { useUsageStore } from '../usage'

describe('useUsageStore', () => {
  beforeEach(() => {
    localStorage.removeItem('minimax-usage-storage')
    useUsageStore.setState({
      usage: {
        textTokens: 0,
        voiceCharacters: 0,
        imageRequests: 0,
        musicRequests: 0,
        videoRequests: 0,
        lastUpdated: new Date().toISOString(),
      },
      history: [],
    })
  })

  describe('initial state', () => {
    it('should have correct initial usage values', async () => {
      const { result } = renderHook(() => useUsageStore())
      await waitFor(() => {
        expect(result.current.usage.textTokens).toBe(0)
        expect(result.current.usage.voiceCharacters).toBe(0)
        expect(result.current.usage.imageRequests).toBe(0)
        expect(result.current.usage.musicRequests).toBe(0)
        expect(result.current.usage.videoRequests).toBe(0)
      })
      expect(result.current.usage.lastUpdated).toBeDefined()
    })

    it('should have empty history', async () => {
      const { result } = renderHook(() => useUsageStore())
      await waitFor(() => {
        expect(result.current.history).toEqual([])
      })
    })

    it('should not have manualBalance by default', async () => {
      const { result } = renderHook(() => useUsageStore())
      await waitFor(() => {
        expect(result.current.usage.manualBalance).toBeUndefined()
      })
    })
  })

  describe('addUsage', () => {
    it('should add text tokens', async () => {
      const { result } = renderHook(() => useUsageStore())
      await waitFor(() => expect(result.current.usage.textTokens).toBe(0))
      result.current.addUsage('textTokens', 100)
      await waitFor(() => expect(result.current.usage.textTokens).toBe(100))
      await waitFor(() => {
        expect(result.current.history.length).toBe(1)
        expect(result.current.history[0].textTokens).toBe(100)
      })
    })

    it('should add voice characters', async () => {
      const { result } = renderHook(() => useUsageStore())
      await waitFor(() => expect(result.current.usage.voiceCharacters).toBe(0))
      result.current.addUsage('voiceCharacters', 500)
      await waitFor(() => {
        expect(result.current.usage.voiceCharacters).toBe(500)
        expect(result.current.history[0].voiceCharacters).toBe(500)
      })
    })

    it('should add image requests', async () => {
      const { result } = renderHook(() => useUsageStore())
      await waitFor(() => expect(result.current.usage.imageRequests).toBe(0))
      result.current.addUsage('imageRequests', 10)
      await waitFor(() => {
        expect(result.current.usage.imageRequests).toBe(10)
        expect(result.current.history[0].imageRequests).toBe(10)
      })
    })

    it('should add music requests', async () => {
      const { result } = renderHook(() => useUsageStore())
      await waitFor(() => expect(result.current.usage.musicRequests).toBe(0))
      result.current.addUsage('musicRequests', 5)
      await waitFor(() => {
        expect(result.current.usage.musicRequests).toBe(5)
        expect(result.current.history[0].musicRequests).toBe(5)
      })
    })

    it('should add video requests', async () => {
      const { result } = renderHook(() => useUsageStore())
      await waitFor(() => expect(result.current.usage.videoRequests).toBe(0))
      result.current.addUsage('videoRequests', 3)
      await waitFor(() => {
        expect(result.current.usage.videoRequests).toBe(3)
        expect(result.current.history[0].videoRequests).toBe(3)
      })
    })

    it('should accumulate usage for same type on same day', async () => {
      const { result } = renderHook(() => useUsageStore())
      await waitFor(() => expect(result.current.usage.textTokens).toBe(0))
      result.current.addUsage('textTokens', 100)
      await waitFor(() => expect(result.current.usage.textTokens).toBe(100))
      result.current.addUsage('textTokens', 50)
      await waitFor(() => {
        expect(result.current.usage.textTokens).toBe(150)
        expect(result.current.history.length).toBe(1)
        expect(result.current.history[0].textTokens).toBe(150)
      })
    })

    it('should update lastUpdated timestamp', async () => {
      const before = new Date().toISOString()
      const { result } = renderHook(() => useUsageStore())
      await waitFor(() => expect(result.current.usage.textTokens).toBe(0))
      result.current.addUsage('textTokens', 100)
      await waitFor(() => {
        expect(new Date(result.current.usage.lastUpdated).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime())
      })
    })

    it('should create new history entry for new day', async () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      useUsageStore.setState({
        history: [
          {
            date: yesterday,
            textTokens: 200,
            voiceCharacters: 0,
            imageRequests: 0,
            musicRequests: 0,
            videoRequests: 0,
          },
        ],
      })
      const { result } = renderHook(() => useUsageStore())
      await waitFor(() => expect(result.current.history.length).toBe(1))
      result.current.addUsage('textTokens', 50)
      await waitFor(() => {
        expect(result.current.history.length).toBe(2)
        expect(result.current.history[0].textTokens).toBe(50)
        expect(result.current.history[1].textTokens).toBe(200)
      })
    })

    it('should limit history to 365 entries', async () => {
      const baseHistory = Array.from({ length: 365 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        textTokens: i * 10,
        voiceCharacters: 0,
        imageRequests: 0,
        musicRequests: 0,
        videoRequests: 0,
      }))
      useUsageStore.setState({ history: baseHistory })
      const { result } = renderHook(() => useUsageStore())
      await waitFor(() => expect(result.current.history.length).toBe(365))
      result.current.addUsage('textTokens', 100)
      await waitFor(() => {
        expect(result.current.history.length).toBe(365)
      })
    })

    it('should only initialize the used type in new history entry', async () => {
      const { result } = renderHook(() => useUsageStore())
      await waitFor(() => expect(result.current.history.length).toBe(0))
      result.current.addUsage('textTokens', 100)
      await waitFor(() => {
        const todayEntry = result.current.history[0]
        expect(todayEntry.textTokens).toBe(100)
        expect(todayEntry.voiceCharacters).toBe(0)
        expect(todayEntry.imageRequests).toBe(0)
        expect(todayEntry.musicRequests).toBe(0)
        expect(todayEntry.videoRequests).toBe(0)
      })
    })
  })

  describe('setManualBalance', () => {
    it('should set manualBalance', async () => {
      const { result } = renderHook(() => useUsageStore())
      await waitFor(() => expect(result.current.usage.manualBalance).toBeUndefined())
      result.current.setManualBalance(1000)
      await waitFor(() => {
        expect(result.current.usage.manualBalance).toBe(1000)
      })
    })

    it('should update existing manualBalance', async () => {
      const { result } = renderHook(() => useUsageStore())
      await waitFor(() => expect(result.current.usage.manualBalance).toBeUndefined())
      result.current.setManualBalance(1000)
      await waitFor(() => expect(result.current.usage.manualBalance).toBe(1000))
      result.current.setManualBalance(2000)
      await waitFor(() => {
        expect(result.current.usage.manualBalance).toBe(2000)
      })
    })

    it('should not affect other usage values', async () => {
      const { result } = renderHook(() => useUsageStore())
      await waitFor(() => expect(result.current.usage.textTokens).toBe(0))
      result.current.addUsage('textTokens', 500)
      await waitFor(() => expect(result.current.usage.textTokens).toBe(500))
      result.current.setManualBalance(1000)
      await waitFor(() => {
        expect(result.current.usage.textTokens).toBe(500)
        expect(result.current.usage.manualBalance).toBe(1000)
      })
    })
  })

  describe('resetUsage', () => {
    it('should reset usage to initial values', async () => {
      const { result } = renderHook(() => useUsageStore())
      await waitFor(() => expect(result.current.usage.textTokens).toBe(0))
      result.current.addUsage('textTokens', 500)
      result.current.addUsage('voiceCharacters', 200)
      await waitFor(() => expect(result.current.usage.textTokens).toBe(500))
      result.current.setManualBalance(1000)
      await waitFor(() => expect(result.current.usage.manualBalance).toBe(1000))
      result.current.resetUsage()
      await waitFor(() => {
        expect(result.current.usage.textTokens).toBe(0)
        expect(result.current.usage.voiceCharacters).toBe(0)
        expect(result.current.usage.imageRequests).toBe(0)
        expect(result.current.usage.musicRequests).toBe(0)
        expect(result.current.usage.videoRequests).toBe(0)
      })
    })

    it('should clear history', async () => {
      const { result } = renderHook(() => useUsageStore())
      await waitFor(() => expect(result.current.usage.textTokens).toBe(0))
      result.current.addUsage('textTokens', 100)
      result.current.addUsage('imageRequests', 50)
      await waitFor(() => expect(result.current.history.length).toBe(1))
      result.current.resetUsage()
      await waitFor(() => {
        expect(result.current.history).toEqual([])
      })
    })

    it('should remove manualBalance', async () => {
      const { result } = renderHook(() => useUsageStore())
      await waitFor(() => expect(result.current.usage.manualBalance).toBeUndefined())
      result.current.setManualBalance(1000)
      await waitFor(() => expect(result.current.usage.manualBalance).toBe(1000))
      result.current.resetUsage()
      await waitFor(() => {
        expect(result.current.usage.manualBalance).toBeUndefined()
      })
    })
  })

  describe('getHistoryByDate', () => {
    it('should return history entry for given date', async () => {
      const today = new Date().toISOString().split('T')[0]
      const { result } = renderHook(() => useUsageStore())
      await waitFor(() => expect(result.current.usage.textTokens).toBe(0))
      result.current.addUsage('textTokens', 100)
      await waitFor(() => expect(result.current.history.length).toBe(1))
      const entry = result.current.getHistoryByDate(today)
      expect(entry).toBeDefined()
      expect(entry?.date).toBe(today)
      expect(entry?.textTokens).toBe(100)
    })

    it('should return undefined for date with no history', async () => {
      const { result } = renderHook(() => useUsageStore())
      await waitFor(() => expect(result.current.history.length).toBe(0))
      const entry = result.current.getHistoryByDate('2020-01-01')
      expect(entry).toBeUndefined()
    })

    it('should find specific date among multiple entries', async () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      useUsageStore.setState({
        history: [
          { date: yesterday, textTokens: 200, voiceCharacters: 0, imageRequests: 0, musicRequests: 0, videoRequests: 0 },
          { date: '2020-01-01', textTokens: 50, voiceCharacters: 0, imageRequests: 0, musicRequests: 0, videoRequests: 0 },
        ],
      })
      const { result } = renderHook(() => useUsageStore())
      await waitFor(() => expect(result.current.history.length).toBe(2))
      const entry = result.current.getHistoryByDate(yesterday)
      expect(entry).toBeDefined()
      expect(entry?.textTokens).toBe(200)
    })
  })
})
