interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>()

  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }
    return entry.value
  }

  set(key: string, value: T, ttlMs: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    })
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }
}
