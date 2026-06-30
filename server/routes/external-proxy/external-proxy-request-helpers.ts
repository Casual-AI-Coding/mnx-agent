export type ExternalProxyUrlParseResult =
  | { readonly ok: true; readonly url: URL }
  | { readonly ok: false; readonly error: string }

export function parseExternalProxyUrl(value: string): ExternalProxyUrlParseResult {
  try {
    return { ok: true, url: new URL(value) }
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, error: '无效的 URL' }
    }
    return { ok: false, error: '无效的 URL' }
  }
}

export function parseExternalProxyResponseText(text: string): unknown {
  try {
    const parsed: unknown = JSON.parse(text)
    return parsed
  } catch (error) {
    if (error instanceof Error) {
      return text
    }
    return text
  }
}

export function getProxyErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}
