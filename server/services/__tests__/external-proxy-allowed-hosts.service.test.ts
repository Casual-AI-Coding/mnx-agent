import { afterEach, describe, expect, it } from 'vitest'

import {
  isExternalProxyUrlAllowed,
  resetExternalProxyAllowedHosts,
} from '../../routes/external-proxy/external-proxy-url-security-helpers.js'
import { refreshExternalProxyAllowedHostsFromConfig } from '../external-proxy-allowed-hosts.service.js'
import { validateProxyAllowedHostsConfig } from '../external-proxy-allowed-hosts.service.js'

describe('external-proxy-allowed-hosts.service', () => {
  afterEach(() => {
    resetExternalProxyAllowedHosts()
  })

  it('refreshes allowed hosts from proxy.allowed_hosts system config', async () => {
    const provider = {
      getSystemConfigByKey: async (key: string) => ({
        id: 'cfg-proxy-allowed-hosts',
        key,
        value: 'dynamic.example.com,api.sisyphusx.com',
        description: '代理白名单',
        value_type: 'string',
        updated_at: '2026-07-05 20:00:00',
        updated_by: null,
      }),
    }

    await refreshExternalProxyAllowedHostsFromConfig(provider)

    expect(isExternalProxyUrlAllowed('https://dynamic.example.com/api')).toBe(true)
    expect(isExternalProxyUrlAllowed('https://sub.dynamic.example.com/api')).toBe(true)
    expect(isExternalProxyUrlAllowed('https://lumin-ai.tiandi.run/api')).toBe(false)
  })

  it('validates proxy.allowed_hosts entries as domain names', () => {
    expect(validateProxyAllowedHostsConfig('dynamic.example.com,api.sisyphusx.com')).toBeNull()
    expect(validateProxyAllowedHostsConfig('https://dynamic.example.com')).toContain('域名')
    expect(validateProxyAllowedHostsConfig('localhost,api.sisyphusx.com')).toContain('内部地址')
  })
})
