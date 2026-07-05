import {
  configureExternalProxyAllowedHosts,
  parseExternalProxyAllowedHosts,
  resetExternalProxyAllowedHosts,
} from '../routes/external-proxy/external-proxy-url-security-helpers.js'

export const PROXY_ALLOWED_HOSTS_CONFIG_KEY = 'proxy.allowed_hosts'

const EXTERNAL_PROXY_ALLOWED_HOSTS_REFRESH_INTERVAL_MS = 60_000

interface ExternalProxyAllowedHostsConfig {
  readonly value: string
}

interface ExternalProxyAllowedHostsConfigProvider {
  getSystemConfigByKey(key: string): Promise<ExternalProxyAllowedHostsConfig | null>
}

let lastRefreshAtMs = 0

function isInternalHostname(host: string): boolean {
  return host === 'localhost' || host === '0.0.0.0' || host === '::1' || host.startsWith('127.')
}

function isDomainName(host: string): boolean {
  return /^[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/.test(host)
}

export function validateProxyAllowedHostsConfig(value: string): string | null {
  const hosts = parseExternalProxyAllowedHosts(value)

  for (const host of hosts) {
    if (isInternalHostname(host)) {
      return `代理白名单不能包含内部地址: ${host}`
    }

    if (!isDomainName(host)) {
      return `代理白名单只能包含逗号分隔的域名: ${host}`
    }
  }

  return null
}

export async function refreshExternalProxyAllowedHostsFromConfig(
  provider: ExternalProxyAllowedHostsConfigProvider
): Promise<void> {
  const config = await provider.getSystemConfigByKey(PROXY_ALLOWED_HOSTS_CONFIG_KEY)
  if (config) {
    configureExternalProxyAllowedHosts(config.value)
  } else {
    resetExternalProxyAllowedHosts()
  }
  lastRefreshAtMs = Date.now()
}

export async function ensureExternalProxyAllowedHostsFresh(
  provider: ExternalProxyAllowedHostsConfigProvider
): Promise<void> {
  if (Date.now() - lastRefreshAtMs < EXTERNAL_PROXY_ALLOWED_HOSTS_REFRESH_INTERVAL_MS) {
    return
  }

  await refreshExternalProxyAllowedHostsFromConfig(provider)
}

export function markExternalProxyAllowedHostsStale(): void {
  lastRefreshAtMs = 0
}
