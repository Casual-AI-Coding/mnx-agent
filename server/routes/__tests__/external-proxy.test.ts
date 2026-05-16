import { describe, it, expect } from 'vitest'
import { isUrlAllowed } from '../external-proxy.js'

describe('isUrlAllowed', () => {
  // Blocked internal addresses
  it('should block localhost', () => {
    expect(isUrlAllowed('http://localhost')).toBe(false)
  })

  it('should block localhost with port/path', () => {
    expect(isUrlAllowed('http://localhost:3000/api')).toBe(false)
  })

  it('should block domain containing localhost as substring (default deny via whitelist)', () => {
    // blockedInternal uses exact match for 'localhost', so localhost.evil.com is NOT falsely blocked
    // as an internal address — but it IS blocked because it's not in the whitelist (default deny)
    expect(isUrlAllowed('http://localhost.evil.com')).toBe(false)
  })

  it('should block 127.x.x.x loopback range', () => {
    expect(isUrlAllowed('http://127.0.0.1')).toBe(false)
    expect(isUrlAllowed('http://127.0.0.2')).toBe(false)
    expect(isUrlAllowed('http://127.1.2.3')).toBe(false)
  })

  it('should block 0.0.0.0', () => {
    expect(isUrlAllowed('http://0.0.0.0')).toBe(false)
  })

  it('should block IPv6 loopback [::1]', () => {
    expect(isUrlAllowed('http://[::1]')).toBe(false)
  })

  it('should block IPv6 loopback ::1 (without brackets)', () => {
    expect(isUrlAllowed('http://::1')).toBe(false)
  })

  // Allowed hosts
  it('should allow whitelisted domains', () => {
    expect(isUrlAllowed('https://api.sisyphusx.com/v1/chat')).toBe(true)
    expect(isUrlAllowed('https://lumin-ai.tiandi.run/api')).toBe(true)
  })

  it('should allow subdomains of whitelisted domains', () => {
    expect(isUrlAllowed('https://sub.api.sisyphusx.com/test')).toBe(true)
  })

  // Wrapped-dot SSRF protection
  it('should NOT allow subdomain spoofing of whitelisted domains', () => {
    // .endsWith('.sisyphusx.com') on `.api.sisyphusx.com.evil.com` → false
    expect(isUrlAllowed('https://api.sisyphusx.com.evil.com')).toBe(false)
    expect(isUrlAllowed('https://api.sisyphusx.com.evil.com/test')).toBe(false)
  })

  it('should reject non-whitelisted domains', () => {
    expect(isUrlAllowed('https://evil.com')).toBe(false)
    expect(isUrlAllowed('https://google.com')).toBe(false)
  })

  // Edge cases
  it('should return false for invalid URLs', () => {
    expect(isUrlAllowed('not-a-url')).toBe(false)
    expect(isUrlAllowed('')).toBe(false)
  })
})
