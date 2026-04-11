import { create } from 'zustand'
import type { MediaRecord } from '@/types/media'

interface AudioState {
  currentRecord: MediaRecord | null
  playlist: MediaRecord[]
  currentIndex: number | undefined
  signedUrls: Record<string, string>
  signedUrl: string | null
  directUrl: string | null

  setCurrentRecord: (record: MediaRecord | null) => void
  setPlaylist: (records: MediaRecord[]) => void
  setSignedUrls: (urls: Record<string, string>) => void
  setSignedUrl: (url: string | null) => void
  playDirectUrl: (url: string) => void
  playPrev: () => void
  playNext: () => void
  close: () => void
}

export const useAudioStore = create<AudioState>((set, get) => ({
  currentRecord: null,
  playlist: [],
  currentIndex: undefined,
  signedUrls: {},
  signedUrl: null,
  directUrl: null,

  setCurrentRecord: (record) => {
    const { playlist } = get()
    const index = record ? playlist.findIndex(r => r.id === record.id) : undefined
    set({ currentRecord: record, currentIndex: index, directUrl: null })
  },

  setPlaylist: (records) => {
    set({ playlist: records })
    const { currentRecord } = get()
    if (currentRecord) {
      const index = records.findIndex(r => r.id === currentRecord.id)
      set({ currentIndex: index })
    }
  },

  setSignedUrls: (urls) => set({ signedUrls: urls }),

  setSignedUrl: (url) => set({ signedUrl: url }),

  playDirectUrl: (url) => {
    set({
      currentRecord: null,
      currentIndex: undefined,
      playlist: [],
      signedUrl: url,
      directUrl: url,
    })
  },

  playPrev: () => {
    const { currentIndex, playlist, signedUrls } = get()
    if (currentIndex === undefined || currentIndex <= 0) return
    const prevRecord = playlist[currentIndex - 1]
    const prevUrl = signedUrls[prevRecord.id] || null
    set({
      currentRecord: prevRecord,
      currentIndex: currentIndex - 1,
      signedUrl: prevUrl,
    })
  },

  playNext: () => {
    const { currentIndex, playlist, signedUrls } = get()
    if (currentIndex === undefined || currentIndex >= playlist.length - 1) return
    const nextRecord = playlist[currentIndex + 1]
    const nextUrl = signedUrls[nextRecord.id] || null
    set({
      currentRecord: nextRecord,
      currentIndex: currentIndex + 1,
      signedUrl: nextUrl,
    })
  },

  close: () => set({
    currentRecord: null,
    currentIndex: undefined,
    signedUrl: null,
    directUrl: null,
  }),
}))