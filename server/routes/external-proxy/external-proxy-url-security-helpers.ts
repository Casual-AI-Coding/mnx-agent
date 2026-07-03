export const EXTERNAL_PROXY_ALLOWED_HOSTS = [
  'mikuapi.org',
  'api.pptoken.org',
  'code.azsheen.top',
  'api.tokenfty.net',
  'gpt.hslife.fun',
  'lumin-ai.tiandi.run',
  'api.sisyphusx.com',
]

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

export function isExternalProxyUrlAllowed(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    const hostname = url.hostname.toLowerCase()

    if (isBlockedInternalHostname(hostname)) {
      return false
    }

    const wrappedHostname = `.${hostname}`
    return EXTERNAL_PROXY_ALLOWED_HOSTS.some(host => wrappedHostname.endsWith(`.${host}`))
  } catch (error) {
    if (error instanceof Error) {
      return false
    }
    return false
  }
}
