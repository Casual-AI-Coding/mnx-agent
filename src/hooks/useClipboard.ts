import { useState, useCallback, useRef, useEffect } from 'react'

interface UseClipboardReturn {
  copied: boolean
  copy: (text: string) => Promise<void>
  reset: () => void
}

const COPY_DURATION = 2000 // 2 seconds

export function useClipboard(): UseClipboardReturn {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const reset = useCallback(() => {
    setCopied(false)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const copy = useCallback(async (text: string): Promise<void> => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)

      // Auto-reset after 2 seconds
      timeoutRef.current = setTimeout(() => {
        setCopied(false)
        timeoutRef.current = null
      }, COPY_DURATION)
    } catch (error) {
      // Handle clipboard API errors gracefully
      console.error('Failed to copy to clipboard:', error)
      setCopied(false)

      // Fallback for browsers that don't support clipboard API
      try {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        const success = document.execCommand('copy')
        document.body.removeChild(textarea)

        if (success) {
          setCopied(true)
          timeoutRef.current = setTimeout(() => {
            setCopied(false)
            timeoutRef.current = null
          }, COPY_DURATION)
        }
      } catch (fallbackError) {
        console.error('Fallback copy method failed:', fallbackError)
      }
    }
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { copied, copy, reset }
}
