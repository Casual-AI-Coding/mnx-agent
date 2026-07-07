export type FrontendMode = 'development' | 'production' | 'test'

export interface FeatureFlags {
  readonly lyricsGeneration: boolean
  readonly resourcePinning: boolean
  readonly openAIImage2Debug: boolean
}

export interface FrontendEnvironment {
  readonly mode: FrontendMode
  readonly isDevelopment: boolean
  readonly isProduction: boolean
  readonly featureFlags: FeatureFlags
}

export interface ViteEnvironmentInput {
  readonly MODE?: string
  readonly DEV?: boolean
  readonly PROD?: boolean
  readonly VITE_FEATURE_LYRICS_GENERATION?: string
  readonly VITE_FEATURE_RESOURCE_PINNING?: string
  readonly VITE_FEATURE_OPENAI_IMAGE_2_DEBUG?: string
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  lyricsGeneration: true,
  resourcePinning: true,
  openAIImage2Debug: true,
}

function parseMode(mode: string | undefined): FrontendMode {
  if (mode === 'production' || mode === 'test') {
    return mode
  }
  return 'development'
}

function parseBooleanFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.length === 0) {
    return fallback
  }
  return value === 'true'
}

export function parseFeatureFlags(env: ViteEnvironmentInput): FeatureFlags {
  return {
    lyricsGeneration: parseBooleanFlag(
      env.VITE_FEATURE_LYRICS_GENERATION,
      DEFAULT_FEATURE_FLAGS.lyricsGeneration
    ),
    resourcePinning: parseBooleanFlag(
      env.VITE_FEATURE_RESOURCE_PINNING,
      DEFAULT_FEATURE_FLAGS.resourcePinning
    ),
    openAIImage2Debug: parseBooleanFlag(
      env.VITE_FEATURE_OPENAI_IMAGE_2_DEBUG,
      DEFAULT_FEATURE_FLAGS.openAIImage2Debug
    ),
  }
}

export function parseFrontendEnvironment(env: ViteEnvironmentInput): FrontendEnvironment {
  const mode = parseMode(env.MODE)
  return {
    mode,
    isDevelopment: env.DEV ?? (mode === 'development'),
    isProduction: env.PROD ?? (mode === 'production'),
    featureFlags: parseFeatureFlags(env),
  }
}

export function getFeatureFlag(flag: keyof FeatureFlags, env: ViteEnvironmentInput): boolean {
  return parseFeatureFlags(env)[flag]
}

export const frontendEnvironment = parseFrontendEnvironment(import.meta.env)
