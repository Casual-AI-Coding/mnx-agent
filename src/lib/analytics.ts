/**
 * Lightweight analytics/telemetry infrastructure
 * No external dependencies - uses localStorage for persistence + console for dev
 */

export interface AnalyticsEvent {
  type: 'error' | 'performance' | 'usage' | 'pageview'
  name: string
  timestamp: number
  metadata?: Record<string, unknown>
}

export interface AnalyticsConfig {
  enabled: boolean
  maxEvents: number // default 1000, auto-cleanup oldest
  debug: boolean // log to console in dev
}

export interface AnalyticsSummary {
  totalEvents: number
  errorCount: number
  errorEvents: AnalyticsEvent[]
  performanceEvents: AnalyticsEvent[]
  usageEvents: AnalyticsEvent[]
  pageviewEvents: AnalyticsEvent[]
  avgPerformanceByName: Record<string, number>
  usageCountByAction: Record<string, number>
}

const STORAGE_KEY = 'app_analytics_events'

const defaultConfig: AnalyticsConfig = {
  enabled: true,
  maxEvents: 1000,
  debug: import.meta.env.DEV,
}

let config: AnalyticsConfig = { ...defaultConfig }
let events: AnalyticsEvent[] = []

/**
 * Load events from localStorage
 */
function loadEvents(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      events = JSON.parse(stored)
    }
  } catch {
    events = []
  }
}

/**
 * Save events to localStorage
 */
function saveEvents(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
  } catch {
    // localStorage might be unavailable
  }
}

/**
 * Cleanup oldest events if over maxEvents
 */
function cleanupEvents(): void {
  if (events.length > config.maxEvents) {
    // Sort by timestamp and keep newest maxEvents
    events.sort((a, b) => b.timestamp - a.timestamp)
    events = events.slice(0, config.maxEvents)
    saveEvents()
  }
}

/**
 * Log to console if debug mode is enabled
 */
function debugLog(...args: unknown[]): void {
  if (config.debug) {
    console.log('[Analytics]', ...args)
  }
}

/**
 * Initialize analytics with optional configuration
 */
export function init(customConfig?: Partial<AnalyticsConfig>): void {
  config = { ...defaultConfig, ...customConfig }
  loadEvents()
  debugLog('Initialized with config:', config, 'Loaded events:', events.length)
}

/**
 * Record an analytics event
 */
export function track(event: AnalyticsEvent): void {
  if (!config.enabled) {
    return
  }

  const enrichedEvent: AnalyticsEvent = {
    ...event,
    timestamp: event.timestamp || Date.now(),
  }

  events.push(enrichedEvent)
  cleanupEvents()
  saveEvents()
  debugLog('Event tracked:', enrichedEvent)
}

/**
 * Shorthand for tracking error events
 */
export function trackError(name: string, metadata?: Record<string, unknown>): void {
  track({
    type: 'error',
    name,
    timestamp: Date.now(),
    metadata,
  })
}

/**
 * Shorthand for tracking performance events
 */
export function trackPerformance(
  name: string,
  duration: number,
  metadata?: Record<string, unknown>
): void {
  track({
    type: 'performance',
    name,
    timestamp: Date.now(),
    metadata: { duration, ...metadata },
  })
}

/**
 * Shorthand for tracking usage events
 */
export function trackUsage(action: string, metadata?: Record<string, unknown>): void {
  track({
    type: 'usage',
    name: action,
    timestamp: Date.now(),
    metadata,
  })
}

/**
 * Shorthand for tracking pageview events
 */
export function trackPageview(pageName: string, metadata?: Record<string, unknown>): void {
  track({
    type: 'pageview',
    name: pageName,
    timestamp: Date.now(),
    metadata,
  })
}

/**
 * Retrieve stored events, optionally filtered by type
 */
export function getEvents(type?: AnalyticsEvent['type']): AnalyticsEvent[] {
  if (!type) {
    return [...events]
  }
  return events.filter((e) => e.type === type)
}

/**
 * Wipe all stored events
 */
export function clearEvents(): void {
  events = []
  saveEvents()
  debugLog('All events cleared')
}

/**
 * Get aggregated stats
 */
export function getSummary(): AnalyticsSummary {
  const errorEvents = events.filter((e) => e.type === 'error')
  const performanceEvents = events.filter((e) => e.type === 'performance')
  const usageEvents = events.filter((e) => e.type === 'usage')
  const pageviewEvents = events.filter((e) => e.type === 'pageview')

  // Calculate average performance by name
  const perfByName: Record<string, number[]> = {}
  performanceEvents.forEach((e) => {
    if (!perfByName[e.name]) {
      perfByName[e.name] = []
    }
    const duration = typeof e.metadata?.duration === 'number' ? e.metadata.duration : 0
    perfByName[e.name].push(duration)
  })

  const avgPerformanceByName: Record<string, number> = {}
  Object.entries(perfByName).forEach(([name, durations]) => {
    avgPerformanceByName[name] = durations.reduce((a, b) => a + b, 0) / durations.length
  })

  // Count usage by action
  const usageCountByAction: Record<string, number> = {}
  usageEvents.forEach((e) => {
    usageCountByAction[e.name] = (usageCountByAction[e.name] || 0) + 1
  })

  return {
    totalEvents: events.length,
    errorCount: errorEvents.length,
    errorEvents: errorEvents.slice(-10).reverse(), // Last 10 errors, newest first
    performanceEvents: performanceEvents.slice(-10).reverse(),
    usageEvents: usageEvents.slice(-10).reverse(),
    pageviewEvents: pageviewEvents.slice(-10).reverse(),
    avgPerformanceByName,
    usageCountByAction,
  }
}

// Default export with all functions
const analytics = {
  init,
  track,
  trackError,
  trackPerformance,
  trackUsage,
  trackPageview,
  getEvents,
  clearEvents,
  getSummary,
}

export default analytics