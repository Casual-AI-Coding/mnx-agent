/** Checks if a property key is safe (blocks prototype pollution). */
function isSafePropertyKey(key: string): boolean {
  const dangerousKeys = ['__proto__', 'constructor', 'prototype']
  return !dangerousKeys.includes(key)
}

/** Safely checks if object has own property, avoiding prototype pollution. */
function hasOwnSafeProperty(obj: unknown, key: string): boolean {
  if (!obj || typeof obj !== 'object') return false
  if (!isSafePropertyKey(key)) return false
  return Object.prototype.hasOwnProperty.call(obj, key)
}

export function resolveNodeConfig(
  config: Record<string, unknown>,
  nodeOutputs: Map<string, unknown>
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {}
  const skipKeys = ['subNodes', 'subEdges']
  for (const [key, value] of Object.entries(config)) {
    if (skipKeys.includes(key)) {
      resolved[key] = value
    } else {
      resolved[key] = resolveValue(value, nodeOutputs)
    }
  }
  return resolved
}

export function resolveValue(value: unknown, nodeOutputs: Map<string, unknown>): unknown {
  if (typeof value === 'string') {
    return resolveTemplateString(value, nodeOutputs)
  }

  if (Array.isArray(value)) {
    return value.map((v) => resolveValue(v, nodeOutputs))
  }

  if (typeof value === 'object' && value !== null) {
    const resolvedObj: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      resolvedObj[k] = resolveValue(v, nodeOutputs)
    }
    return resolvedObj
  }

  return value
}

export function resolveTemplateString(
  template: string,
  nodeOutputs: Map<string, unknown>
): string {
  const pattern = /\{\{([^}]+)\}\}/g
  return template.replace(pattern, (match, path) => {
    const parts = path.trim().split('.')
    const nodeId = parts[0]

    if (nodeId === 'item') {
      const item = nodeOutputs.get('item')
      if (parts.length === 1) {
        return item !== undefined ? String(item) : match
      }
      return getValueAtPath(item, parts.slice(1).join('.'))
    }

    if (nodeId === 'index') {
      const index = nodeOutputs.get('index')
      return index !== undefined ? String(index) : match
    }

    if (parts[1] === 'output' && parts.length > 2) {
      const outputPath = parts.slice(2)
      let current = nodeOutputs.get(nodeId)

      for (const part of outputPath) {
        const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/)
        if (arrayMatch) {
          const arrayKey = arrayMatch[1]
          const index = parseInt(arrayMatch[2], 10)
          if (hasOwnSafeProperty(current, arrayKey)) {
            const arr = (current as Record<string, unknown>)[arrayKey]
            if (Array.isArray(arr)) {
              current = arr[index]
            } else {
              return match
            }
          } else {
            return match
          }
        } else {
          if (hasOwnSafeProperty(current, part)) {
            current = (current as Record<string, unknown>)[part]
          } else {
            return match
          }
        }
      }

      return current !== undefined ? String(current) : match
    } else if (parts.length === 2 && parts[1] === 'output') {
      const output = nodeOutputs.get(nodeId)
      return output !== undefined ? String(output) : match
    }

    return match
  })
}

export function getValueAtPath(data: unknown, path: string): string {
  const parts = path.split('.')
  let current = data

  for (const part of parts) {
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/)
    if (arrayMatch) {
      const key = arrayMatch[1]
      const index = parseInt(arrayMatch[2], 10)
      if (hasOwnSafeProperty(current, key)) {
        const arr = (current as Record<string, unknown>)[key]
        current = Array.isArray(arr) ? arr[index] : undefined
      } else {
        return ''
      }
    } else {
      if (hasOwnSafeProperty(current, part)) {
        current = (current as Record<string, unknown>)[part]
      } else {
        return ''
      }
    }
  }

  return current !== undefined ? String(current) : ''
}
