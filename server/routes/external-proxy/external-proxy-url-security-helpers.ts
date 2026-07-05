export const DEFAULT_EXTERNAL_PROXY_ALLOWED_HOSTS = [
  'mikuapi.org',
  'api.pptoken.org',
  'code.azsheen.top',
  'api.tokenfty.net',
  'gpt.hslife.fun',
  'lumin-ai.tiandi.run',
  'api.sisyphusx.com',
]

export const EXTERNAL_PROXY_ALLOWED_HOSTS = DEFAULT_EXTERNAL_PROXY_ALLOWED_HOSTS

let activeExternalProxyAllowedHosts: readonly string[] = DEFAULT_EXTERNAL_PROXY_ALLOWED_HOSTS

const BLOCKED_INTERNAL_HOST_PATTERNS = [
  { pattern: 'localhost', exact: true },
  { pattern: '127.', exact: false },
  { pattern: '0.0.0.0', exact: true },
  { pattern: '[::1]', exact: true },
  { pattern: '::1', exact: true },
]

function isBlockedInternalHostname(hostname: string): boolean {
  return BLOCKED_INTERNAL_HOST_PATTERNS.some(({ pattern, exact }) => (
    exact ? hostname === pattern : hostname.startsWith(pattern)
  ))
}

export function parseExternalProxyAllowedHosts(value: string): readonly string[] {
  return [...new Set(
    value
      .split(',')
      .map(host => host.trim().toLowerCase())
      .filter(Boolean)
  )]
}

export function configureExternalProxyAllowedHosts(value: string): void {
  activeExternalProxyAllowedHosts = parseExternalProxyAllowedHosts(value)
}

export function resetExternalProxyAllowedHosts(): void {
  activeExternalProxyAllowedHosts = DEFAULT_EXTERNAL_PROXY_ALLOWED_HOSTS
}

export function isExternalProxyUrlAllowed(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    const hostname = url.hostname.toLowerCase()

    if (isBlockedInternalHostname(hostname)) {
      return false
    }

    const wrappedHostname = `.${hostname}`
    return activeExternalProxyAllowedHosts.some(host => wrappedHostname.endsWith(`.${host}`))
  } catch {
    return false
  }
}
