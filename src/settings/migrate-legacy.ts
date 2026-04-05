// src/settings/migrate-legacy.ts
/**
 * Legacy Store Migration
 *
 * Maps values from old AppStore/AuthStore to new unified settings system.
 * Only runs once, marked complete in localStorage.
 */

import type { AllSettings } from '@/settings/types'

const MIGRATION_FLAG_KEY = 'settings-migration-complete'
const LEGACY_APP_STORAGE_KEY = 'minimax-app-storage'
const LEGACY_AUTH_STORAGE_KEY = 'auth-storage'

interface LegacyAppState {
  apiKey: string
  region: 'cn' | 'intl'
  theme: 'system' | string
  apiMode: 'direct' | 'proxy'
}

interface LegacyAuthState {
  user: {
    username: string
    email: string | null
    role: 'super' | 'admin' | 'pro' | 'user'
  } | null
}

/**
 * Check if migration has already been completed
 */
export function isMigrationComplete(): boolean {
  return localStorage.getItem(MIGRATION_FLAG_KEY) === 'true'
}

/**
 * Mark migration as complete
 */
function markMigrationComplete(): void {
  localStorage.setItem(MIGRATION_FLAG_KEY, 'true')
}

/**
 * Read legacy AppStore state from localStorage
 */
function readLegacyAppState(): LegacyAppState | null {
  try {
    const stored = localStorage.getItem(LEGACY_APP_STORAGE_KEY)
    if (!stored) return null
    
    const parsed = JSON.parse(stored)
    return parsed?.state?.state ?? null
  } catch {
    return null
  }
}

/**
 * Read legacy AuthStore state from localStorage
 */
function readLegacyAuthState(): LegacyAuthState | null {
  try {
    const stored = localStorage.getItem(LEGACY_AUTH_STORAGE_KEY)
    if (!stored) return null
    
    const parsed = JSON.parse(stored)
    return parsed?.state?.state ?? null
  } catch {
    return null
  }
}

/**
 * Map legacy values to new settings structure
 */
export function mapLegacyToSettings(): Partial<AllSettings> {
  const legacyApp = readLegacyAppState()
  const legacyAuth = readLegacyAuthState()
  
  const migrated: Partial<AllSettings> = {}
  
  // Map AppStore values
  if (legacyApp) {
    // API settings
    migrated.api = {
      minimaxKey: legacyApp.apiKey || '',
      region: legacyApp.region || 'cn',
      mode: legacyApp.apiMode || 'direct',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
    }
    
    // UI settings
    migrated.ui = {
      theme: legacyApp.theme || 'system',
      sidebarCollapsed: false,
      sidebarWidth: 240,
      showAnimations: true,
      reducedMotion: false,
      toastPosition: 'top-right',
      density: 'comfortable',
      fontSize: 'medium',
    }
  }
  
  // Map AuthStore user values to account settings
  if (legacyAuth?.user) {
    migrated.account = {
      username: legacyAuth.user.username,
      email: legacyAuth.user.email || '',
      role: legacyAuth.user.role || 'user',
      locale: 'zh-CN',
      timezone: 'Asia/Shanghai',
      sessionTimeout: 30,
    }
  }
  
  return migrated
}

/**
 * Run legacy store migration
 * 
 * Returns migrated settings if migration needed, null if already complete
 */
export function runLegacyMigration(): Partial<AllSettings> | null {
  // Skip if already migrated
  if (isMigrationComplete()) {
    return null
  }
  
  const migrated = mapLegacyToSettings()
  
  // If we have migrated values, mark as complete
  if (Object.keys(migrated).length > 0) {
    markMigrationComplete()
    return migrated
  }
  
  return null
}

/**
 * Clear migration flag (for testing or re-migration)
 */
export function clearMigrationFlag(): void {
  localStorage.removeItem(MIGRATION_FLAG_KEY)
}