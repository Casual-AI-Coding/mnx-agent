export const EXPANDED_KEY = 'sidebar-expanded-sections'
export const COLLAPSED_KEY = 'sidebar-collapsed'
export const WIDTH_KEY = 'sidebar-width'
export const DEFAULT_WIDTH = 220
export const MIN_WIDTH = 140
export const MAX_WIDTH = 400

export function getStoredExpanded(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(EXPANDED_KEY)
    return stored ? JSON.parse(stored) : { debug: true }
  } catch {
    return { debug: true }
  }
}

export function setStoredExpanded(expanded: Record<string, boolean>) {
  localStorage.setItem(EXPANDED_KEY, JSON.stringify(expanded))
}

export function getStoredCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(COLLAPSED_KEY)
    return stored ? JSON.parse(stored) : false
  } catch {
    return false
  }
}

export function setStoredCollapsed(collapsed: boolean) {
  localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsed))
}

export function getStoredWidth(): number {
  try {
    const stored = localStorage.getItem(WIDTH_KEY)
    return stored ? Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Number(JSON.parse(stored)))) : DEFAULT_WIDTH
  } catch {
    return DEFAULT_WIDTH
  }
}

export function setStoredWidth(width: number) {
  localStorage.setItem(WIDTH_KEY, JSON.stringify(width))
}

export function getMainElement(): HTMLElement | null {
  return document.getElementById('app-main')
}
