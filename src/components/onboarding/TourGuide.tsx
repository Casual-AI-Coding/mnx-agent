import { useCallback, useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TOUR_STEPS, markTourCompleted } from '@/lib/tour-steps'
import { cn } from '@/lib/utils'

interface SpotlightRect {
  top: number
  left: number
  width: number
  height: number
}

const CARD_WIDTH = 320
const CARD_GAP = 12

function locateTarget(target: string): SpotlightRect | null {
  if (typeof document === 'undefined') return null
  const el = document.querySelector(`[data-tour="${target}"]`)
  if (!el) return null
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return null
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
}

function cardPosition(rect: SpotlightRect): { top: number; left: number } {
  const below = rect.top + rect.height + CARD_GAP
  if (below + 180 <= window.innerHeight) {
    return { top: below, left: Math.max(12, Math.min(rect.left, window.innerWidth - CARD_WIDTH - 12)) }
  }
  const above = rect.top - CARD_GAP - 180
  if (above >= 12) {
    return { top: above, left: Math.max(12, Math.min(rect.left, window.innerWidth - CARD_WIDTH - 12)) }
  }
  return { top: window.innerHeight / 2 - 120, left: window.innerWidth / 2 - CARD_WIDTH / 2 }
}

interface TourGuideProps {
  open: boolean
  onClose: () => void
}

/**
 * 新手引导 Tour（R-010）：首次登录后的分步漫游。
 * 聚焦目标元素（box-shadow 聚光灯），卡片就近展示，支持跳过/逐步完成；
 * 完成或跳过后写入 localStorage（tour-completed）不再自动弹出。
 */
export function TourGuide({ open, onClose }: TourGuideProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState<SpotlightRect | null>(null)

  const step = TOUR_STEPS[stepIndex]
  const isLast = stepIndex === TOUR_STEPS.length - 1

  const updateRect = useCallback(() => {
    if (!open || !step) return
    const next = step.target ? locateTarget(step.target) : null
    setRect(next)
  }, [open, step])

  useEffect(() => {
    if (!open) return
    updateRect()
    window.addEventListener('resize', updateRect)
    return () => window.removeEventListener('resize', updateRect)
  }, [open, updateRect, stepIndex])

  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        markTourCompleted()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const finish = useCallback(() => {
    markTourCompleted()
    onClose()
  }, [onClose])

  const handleNext = () => {
    if (isLast) {
      finish()
    } else {
      setStepIndex((prev) => prev + 1)
    }
  }

  const cardPos = useMemo(
    () => (rect && typeof window !== 'undefined' ? cardPosition(rect) : null),
    [rect]
  )

  if (!open || !step) return null

  const cardStyle = cardPos
    ? { position: 'fixed' as const, top: cardPos.top, left: cardPos.left, width: CARD_WIDTH }
    : { position: 'fixed' as const, top: '50%', left: '50%', width: CARD_WIDTH, transform: 'translate(-50%, -50%)' }

  return (
    <div className="fixed inset-0 z-[70]" data-testid="tour-guide" role="dialog" aria-label="新手引导">
      {/* 聚光灯：目标元素挖洞，四周压暗 */}
      {rect && (
        <div
          className="fixed rounded-lg transition-all duration-300"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
            pointerEvents: 'none',
          }}
          data-testid="tour-spotlight"
        />
      )}
      {rect && <div className="fixed inset-0" aria-hidden />}

      <div
        className="bg-card border border-border/60 rounded-xl shadow-xl p-4"
        style={cardStyle}
        data-testid="tour-card"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
          <button
            onClick={finish}
            className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary/50 transition-colors"
            aria-label="跳过引导"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{step.description}</p>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-1.5" aria-label={`第 ${stepIndex + 1} 步，共 ${TOUR_STEPS.length} 步`}>
            {TOUR_STEPS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-colors',
                  i === stepIndex ? 'bg-primary-400' : i < stepIndex ? 'bg-primary-400/50' : 'bg-secondary'
                )}
              />
            ))}
            <span className="ml-1.5 text-xs text-muted-foreground/60 tabular-nums">
              {stepIndex + 1} / {TOUR_STEPS.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setStepIndex((prev) => prev - 1)}>
                上一步
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              {isLast ? '完成' : '下一步'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
