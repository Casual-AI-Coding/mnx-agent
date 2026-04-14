import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  calculateBackoffDelay,
  isRetryableError,
  sleep,
  retryWithBackoff,
} from '../retry'

describe('calculateBackoffDelay', () => {
  it('applies exponential backoff formula (baseDelay * 2^attempt)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    const baseDelay = 1000
    const maxDelay = 30000

    expect(calculateBackoffDelay(0, baseDelay, maxDelay)).toBe(baseDelay * Math.pow(2, 0))
    expect(calculateBackoffDelay(1, baseDelay, maxDelay)).toBe(baseDelay * Math.pow(2, 1))
    expect(calculateBackoffDelay(2, baseDelay, maxDelay)).toBe(baseDelay * Math.pow(2, 2))
    expect(calculateBackoffDelay(3, baseDelay, maxDelay)).toBe(baseDelay * Math.pow(2, 3))
  })

  it('adds jitter within ±25% range', () => {
    const baseDelay = 1000
    const maxDelay = 30000

    vi.spyOn(Math, 'random').mockReturnValue(0)
    const minDelay = calculateBackoffDelay(0, baseDelay, maxDelay)
    expect(minDelay).toBe(baseDelay * 0.75)

    vi.spyOn(Math, 'random').mockReturnValue(1)
    const maxDelayResult = calculateBackoffDelay(0, baseDelay, maxDelay)
    expect(maxDelayResult).toBe(baseDelay * 1.25)
  })

  it('caps delay at maxDelayMs', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    const baseDelay = 10000
    const maxDelay = 15000

    const result = calculateBackoffDelay(4, baseDelay, maxDelay)
    expect(result).toBeLessThanOrEqual(maxDelay)
  })
})

describe('isRetryableError', () => {
  it('returns true for error with retryable code', () => {
    const error = { code: 500 }
    const retryableCodes = [429, 500, 502, 503, 504, 408]
    expect(isRetryableError(error, retryableCodes)).toBe(true)
  })

  it('returns false for error with non-retryable code', () => {
    const error = { code: 404 }
    const retryableCodes = [429, 500, 502, 503, 504, 408]
    expect(isRetryableError(error, retryableCodes)).toBe(false)
  })

  it('checks response.status for axios-like errors', () => {
    const error = { response: { status: 503 } }
    const retryableCodes = [429, 500, 502, 503, 504, 408]
    expect(isRetryableError(error, retryableCodes)).toBe(true)
  })

  it('returns false for axios error with non-retryable status', () => {
    const error = { response: { status: 403 } }
    const retryableCodes = [429, 500, 502, 503, 504, 408]
    expect(isRetryableError(error, retryableCodes)).toBe(false)
  })

  it('returns false for error without status code or response', () => {
    const error = { message: 'some error' }
    const retryableCodes = [429, 500, 502, 503, 504, 408]
    expect(isRetryableError(error, retryableCodes)).toBe(false)
  })

  it('supports custom retryable status codes', () => {
    const error = { code: 418 }
    const customCodes = [418, 419, 420]
    expect(isRetryableError(error, customCodes)).toBe(true)
  })
})

describe('sleep', () => {
  it('resolves after the specified duration', async () => {
    vi.useFakeTimers()
    const promise = sleep(1000)
    vi.advanceTimersByTime(1000)
    await promise
    vi.useRealTimers()
  })
})

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns result on first try when fn succeeds', async () => {
    const fn = vi.fn().mockResolvedValue('success')

    const resultPromise = retryWithBackoff(fn)
    vi.advanceTimersByTime(0)
    await resultPromise.catch(e => e)

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on 500/502/503 errors and eventually succeeds', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    const fn = vi
      .fn()
      .mockRejectedValueOnce({ code: 500 })
      .mockRejectedValueOnce({ code: 502 })
      .mockResolvedValueOnce('success')

    const resultPromise = retryWithBackoff(fn)

    await vi.runAllTimersAsync()

    await resultPromise.catch(e => e)

    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('does not retry on 404 error', async () => {
    const fn = vi.fn().mockRejectedValue({ code: 404 })

    const resultPromise = retryWithBackoff(fn)
    vi.advanceTimersByTime(0)
    await resultPromise.catch(e => e)

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('does not retry on 403 error', async () => {
    const fn = vi.fn().mockRejectedValue({ response: { status: 403 } })

    const resultPromise = retryWithBackoff(fn)
    vi.advanceTimersByTime(0)
    await resultPromise.catch(e => e)

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('throws when max retries are exhausted', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const fn = vi.fn().mockRejectedValue({ code: 500 })
    const maxRetries = 2

    const resultPromise = retryWithBackoff(fn, { maxRetries })

    await vi.runAllTimersAsync()

    await resultPromise.catch(e => e)

    expect(fn).toHaveBeenCalledTimes(maxRetries + 1)
  })

  it('uses custom options (maxRetries, baseDelayMs, maxDelayMs)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    const fn = vi
      .fn()
      .mockRejectedValueOnce({ code: 500 })
      .mockResolvedValueOnce('success')

    const resultPromise = retryWithBackoff(fn, {
      maxRetries: 5,
      baseDelayMs: 500,
      maxDelayMs: 5000,
    })

    await vi.runAllTimersAsync()

    await resultPromise.catch(e => e)

    expect(fn).toHaveBeenCalledTimes(2)
  })
})
