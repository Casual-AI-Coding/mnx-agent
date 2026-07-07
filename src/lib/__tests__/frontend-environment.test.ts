import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FEATURE_FLAGS,
  getFeatureFlag,
  parseFeatureFlags,
  parseFrontendEnvironment,
} from '../frontend-environment'

describe('frontend-environment', () => {
  it('parses production environment and explicit feature flags from Vite env', () => {
    const environment = parseFrontendEnvironment({
      MODE: 'production',
      DEV: false,
      PROD: true,
      VITE_FEATURE_LYRICS_GENERATION: 'false',
      VITE_FEATURE_RESOURCE_PINNING: 'true',
      VITE_FEATURE_OPENAI_IMAGE_2_DEBUG: 'true',
    })

    expect(environment).toEqual({
      mode: 'production',
      isDevelopment: false,
      isProduction: true,
      featureFlags: {
        lyricsGeneration: false,
        resourcePinning: true,
        openAIImage2Debug: true,
      },
    })
  })

  it('uses safe default feature flags when Vite env omits feature values', () => {
    const flags = parseFeatureFlags({
      MODE: 'development',
      DEV: true,
      PROD: false,
    })

    expect(flags).toEqual(DEFAULT_FEATURE_FLAGS)
  })

  it('treats malformed feature flag strings as disabled instead of truthy', () => {
    const enabled = getFeatureFlag('resourcePinning', {
      MODE: 'test',
      DEV: false,
      PROD: false,
      VITE_FEATURE_RESOURCE_PINNING: 'yes please',
    })

    expect(enabled).toBe(false)
  })
})
