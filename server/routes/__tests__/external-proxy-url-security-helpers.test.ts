import { afterEach, describe, expect, it } from 'vitest'

import {
  EXTERNAL_PROXY_ALLOWED_HOSTS,
  configureExternalProxyAllowedHosts,
  isExternalProxyUrlAllowed,
  resetExternalProxyAllowedHosts,
} from '../external-proxy/external-proxy-url-security-helpers.js'

describe('external-proxy-url-security-helpers', () => {
  afterEach(() => {
    resetExternalProxyAllowedHosts()
  })

  describe('isExternalProxyUrlAllowed', () => {
    it('rejects localhost and loopback addresses', () => {
      expect(isExternalProxyUrlAllowed('http://localhost/api')).toBe(false)
      expect(isExternalProxyUrlAllowed('http://127.0.0.1/api')).toBe(false)
      expect(isExternalProxyUrlAllowed('http://127.1.2.3/api')).toBe(false)
      expect(isExternalProxyUrlAllowed('http://0.0.0.0/api')).toBe(false)
      expect(isExternalProxyUrlAllowed('http://[::1]/api')).toBe(false)
      expect(isExternalProxyUrlAllowed('http://::1')).toBe(false)
    })

    it('allows configured hosts and their real subdomains', () => {
      expect(isExternalProxyUrlAllowed('https://api.sisyphusx.com/v1/chat')).toBe(true)
      expect(isExternalProxyUrlAllowed('https://lumin-ai.tiandi.run/api')).toBe(true)
      expect(isExternalProxyUrlAllowed('https://sub.api.sisyphusx.com/test')).toBe(true)
    })

    it('rejects wrapped-dot subdomain spoofing and malformed URLs', () => {
      expect(isExternalProxyUrlAllowed('https://api.sisyphusx.com.evil.com/test')).toBe(false)
      expect(isExternalProxyUrlAllowed('not-a-url')).toBe(false)
    })

    it('allows hosts loaded from proxy.allowed_hosts system config', () => {
      configureExternalProxyAllowedHosts('dynamic.example.com, api.sisyphusx.com')

      expect(isExternalProxyUrlAllowed('https://dynamic.example.com/api')).toBe(true)
      expect(isExternalProxyUrlAllowed('https://sub.dynamic.example.com/api')).toBe(true)
      expect(isExternalProxyUrlAllowed('https://api.sisyphusx.com/v1/chat')).toBe(true)
      expect(isExternalProxyUrlAllowed('https://lumin-ai.tiandi.run/api')).toBe(false)
    })

    it('keeps internal hosts blocked even when proxy.allowed_hosts includes them', () => {
      configureExternalProxyAllowedHosts('localhost, 127.0.0.1, ::1, api.sisyphusx.com')

      expect(isExternalProxyUrlAllowed('http://localhost/api')).toBe(false)
      expect(isExternalProxyUrlAllowed('http://127.0.0.1/api')).toBe(false)
      expect(isExternalProxyUrlAllowed('http://[::1]/api')).toBe(false)
      expect(isExternalProxyUrlAllowed('https://api.sisyphusx.com/v1/chat')).toBe(true)
    })
  })

  it('exports the configured allowed host list', () => {
    expect(EXTERNAL_PROXY_ALLOWED_HOSTS).toContain('api.sisyphusx.com')
  })
})
