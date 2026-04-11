/**
 * Cost estimation utilities based on MiniMax pricing
 * Pricing is in Chinese Yuan (¥)
 */

// Model pricing per unit
export const MODEL_PRICING = {
  // Text models (per 1K tokens)
  'MiniMax-M2.7': {
    input: 0.1,
    output: 0.4,
  },
  'MiniMax-Text-01': {
    input: 0.05,
    output: 0.2,
  },
  // Image models (per image)
  'image-01': 0.05,
  'image-01-live': 0.08,
  // Music model (per generation)
  'music-2.6': 0.5,
  'music-cover': 0.5,
  // Voice models (per 1000 characters)
  'voice-sync': 0.1,
  'voice-async': 0.15,
  // Video model (per generation)
  'video-01': 0.2,
} as const

export type TextModel = 'MiniMax-M2.7' | 'MiniMax-Text-01'
export type ImageModel = 'image-01' | 'image-01-live'
export type MusicModel = 'music-2.6' | 'music-cover' | 'music-2.5' | 'music-2.5+'
export type VoiceModel = 'voice-sync' | 'voice-async'
export type VideoModel = 'video-01'

// Token conversion: ~0.75 tokens per Chinese character
const CHINESE_CHARS_PER_TOKEN = 0.75

/**
 * Estimate text generation cost
 * @param model - Text model ID
 * @param inputTokens - Number of input tokens (approximated from characters)
 * @param outputTokens - Number of output tokens (approximated from characters)
 */
export function estimateTextCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): { input: number; output: number; total: number } {
  const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING]
  if (!pricing || typeof pricing === 'number') {
    return { input: 0, output: 0, total: 0 }
  }

  const inputCost = (inputTokens / 1000) * pricing.input
  const outputCost = (outputTokens / 1000) * pricing.output

  return {
    input: inputCost,
    output: outputCost,
    total: inputCost + outputCost,
  }
}

/**
 * Estimate image generation cost
 * @param model - Image model ID
 * @param count - Number of images
 */
export function estimateImageCost(model: string, count: number): number {
  const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING]
  if (typeof pricing !== 'number') {
    return 0
  }
  return pricing * count
}

/**
 * Estimate music generation cost
 * @param count - Number of generations
 */
export function estimateMusicCost(model: string, count: number): number {
  const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING]
  if (typeof pricing !== 'number') {
    return 0
  }
  return pricing * count
}

/**
 * Estimate voice generation cost
 * @param model - Voice model ID
 * @param characters - Number of characters
 */
export function estimateVoiceCost(model: string, characters: number): number {
  const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING]
  if (typeof pricing !== 'number') {
    return 0
  }
  return (characters / 1000) * pricing
}

/**
 * Estimate video generation cost
 * @param count - Number of generations
 */
export function estimateVideoCost(count: number): number {
  return MODEL_PRICING['video-01'] * count
}

/**
 * Estimate tokens from character count (for Chinese text)
 * @param chars - Number of characters
 */
export function estimateTokens(chars: number): number {
  return Math.ceil(chars / CHINESE_CHARS_PER_TOKEN)
}

/**
 * Format cost in Chinese Yuan with proper decimal places
 * @param yuan - Cost in yuan
 */
export function formatCost(yuan: number): string {
  if (yuan === 0) return '¥0.00'
  if (yuan < 0.01) return '¥<0.01'
  return `¥${yuan.toFixed(2)}`
}

/**
 * Get cost color based on amount
 * 'green' for low (< ¥0.1), 'yellow' for medium (< ¥1), 'red' for high (>= ¥1)
 */
export function getCostColor(cost: number): 'green' | 'yellow' | 'red' {
  if (cost < 0.1) return 'green'
  if (cost < 1) return 'yellow'
  return 'red'
}

/**
 * Get cost level label
 */
export function getCostLevel(cost: number): string {
  if (cost < 0.1) return '低'
  if (cost < 1) return '中'
  return '高'
}