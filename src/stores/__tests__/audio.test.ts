import { describe, it, expect, beforeEach } from 'vitest'
import { useAudioStore } from '../audio'
import type { MediaRecord } from '@/types/media'

const createMockRecord = (id: string): MediaRecord => ({
  id,
  filename: `${id}.mp3`,
  mimeType: 'audio/mpeg',
  size: 1024,
  url: `https://example.com/${id}.mp3`,
  createdAt: '2024-01-01',
  type: 'audio' as const,
})

describe('audio store', () => {
  beforeEach(() => {
    useAudioStore.setState({
      currentRecord: null,
      playlist: [],
      currentIndex: undefined,
      signedUrls: {},
      signedUrl: null,
      directUrl: null,
    })
  })

  describe('setCurrentRecord', () => {
    it('should set current record', () => {
      const record = createMockRecord('track-1')
      useAudioStore.getState().setCurrentRecord(record)

      expect(useAudioStore.getState().currentRecord).toEqual(record)
    })

    it('should find index in playlist', () => {
      const playlist = [createMockRecord('a'), createMockRecord('b'), createMockRecord('c')]
      useAudioStore.setState({ playlist })
      useAudioStore.getState().setCurrentRecord(playlist[1])

      expect(useAudioStore.getState().currentIndex).toBe(1)
    })

    it('should clear directUrl when setting record', () => {
      useAudioStore.setState({ directUrl: 'https://example.com/direct.mp3' })
      useAudioStore.getState().setCurrentRecord(createMockRecord('track-1'))

      expect(useAudioStore.getState().directUrl).toBeNull()
    })

    it('should handle null record', () => {
      useAudioStore.setState({ currentRecord: createMockRecord('track-1') })
      useAudioStore.getState().setCurrentRecord(null)

      expect(useAudioStore.getState().currentRecord).toBeNull()
      expect(useAudioStore.getState().currentIndex).toBeUndefined()
    })
  })

  describe('setPlaylist', () => {
    it('should set playlist', () => {
      const playlist = [createMockRecord('a'), createMockRecord('b')]
      useAudioStore.getState().setPlaylist(playlist)

      expect(useAudioStore.getState().playlist).toEqual(playlist)
    })

    it('should update currentIndex when current record is in new playlist', () => {
      const playlist = [createMockRecord('a'), createMockRecord('b'), createMockRecord('c')]
      useAudioStore.setState({ playlist, currentRecord: playlist[1] })

      const newPlaylist = [createMockRecord('x'), createMockRecord('b'), createMockRecord('y')]
      useAudioStore.getState().setPlaylist(newPlaylist)

      expect(useAudioStore.getState().currentIndex).toBe(1)
    })
  })

  describe('setSignedUrls', () => {
    it('should set signed URLs', () => {
      const urls = { 'track-1': 'https://signed.example.com/track-1' }
      useAudioStore.getState().setSignedUrls(urls)

      expect(useAudioStore.getState().signedUrls).toEqual(urls)
    })
  })

  describe('setSignedUrl', () => {
    it('should set single signed URL', () => {
      useAudioStore.getState().setSignedUrl('https://signed.example.com/track-1')

      expect(useAudioStore.getState().signedUrl).toBe('https://signed.example.com/track-1')
    })

    it('should allow null', () => {
      useAudioStore.setState({ signedUrl: 'https://example.com/old' })
      useAudioStore.getState().setSignedUrl(null)

      expect(useAudioStore.getState().signedUrl).toBeNull()
    })
  })

  describe('playDirectUrl', () => {
    it('should set direct URL and clear playlist', () => {
      useAudioStore.setState({
        playlist: [createMockRecord('a'), createMockRecord('b')],
        currentRecord: createMockRecord('a'),
      })

      useAudioStore.getState().playDirectUrl('https://example.com/direct.mp3')

      const state = useAudioStore.getState()
      expect(state.directUrl).toBe('https://example.com/direct.mp3')
      expect(state.currentRecord).toBeNull()
      expect(state.playlist).toEqual([])
      expect(state.signedUrl).toBe('https://example.com/direct.mp3')
    })
  })

  describe('playPrev', () => {
    it('should go to previous track', () => {
      const playlist = [createMockRecord('a'), createMockRecord('b'), createMockRecord('c')]
      const urls = { 'a': 'url-a', 'b': 'url-b', 'c': 'url-c' }
      useAudioStore.setState({
        playlist,
        currentRecord: playlist[1],
        currentIndex: 1,
        signedUrls: urls,
      })

      useAudioStore.getState().playPrev()

      const state = useAudioStore.getState()
      expect(state.currentRecord).toEqual(playlist[0])
      expect(state.currentIndex).toBe(0)
      expect(state.signedUrl).toBe('url-a')
    })

    it('should not go prev from first track', () => {
      const playlist = [createMockRecord('a'), createMockRecord('b')]
      useAudioStore.setState({
        playlist,
        currentRecord: playlist[0],
        currentIndex: 0,
      })

      useAudioStore.getState().playPrev()

      expect(useAudioStore.getState().currentRecord).toEqual(playlist[0])
    })

    it('should not go prev when no current index', () => {
      useAudioStore.setState({
        playlist: [createMockRecord('a')],
        currentIndex: undefined,
      })

      useAudioStore.getState().playPrev()

      expect(useAudioStore.getState().currentRecord).toBeNull()
    })
  })

  describe('playNext', () => {
    it('should go to next track', () => {
      const playlist = [createMockRecord('a'), createMockRecord('b'), createMockRecord('c')]
      const urls = { 'a': 'url-a', 'b': 'url-b', 'c': 'url-c' }
      useAudioStore.setState({
        playlist,
        currentRecord: playlist[1],
        currentIndex: 1,
        signedUrls: urls,
      })

      useAudioStore.getState().playNext()

      const state = useAudioStore.getState()
      expect(state.currentRecord).toEqual(playlist[2])
      expect(state.currentIndex).toBe(2)
      expect(state.signedUrl).toBe('url-c')
    })

    it('should not go next from last track', () => {
      const playlist = [createMockRecord('a'), createMockRecord('b')]
      useAudioStore.setState({
        playlist,
        currentRecord: playlist[1],
        currentIndex: 1,
      })

      useAudioStore.getState().playNext()

      expect(useAudioStore.getState().currentRecord).toEqual(playlist[1])
    })

    it('should not go next when no current index', () => {
      useAudioStore.setState({
        playlist: [createMockRecord('a')],
        currentIndex: undefined,
      })

      useAudioStore.getState().playNext()

      expect(useAudioStore.getState().currentRecord).toBeNull()
    })
  })

  describe('close', () => {
    it('should clear all playback state', () => {
      useAudioStore.setState({
        currentRecord: createMockRecord('track-1'),
        currentIndex: 5,
        signedUrl: 'https://signed.example.com/track-1',
        directUrl: 'https://example.com/direct.mp3',
      })

      useAudioStore.getState().close()

      const state = useAudioStore.getState()
      expect(state.currentRecord).toBeNull()
      expect(state.currentIndex).toBeUndefined()
      expect(state.signedUrl).toBeNull()
      expect(state.directUrl).toBeNull()
    })
  })
})