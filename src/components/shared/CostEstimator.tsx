import { useMemo } from 'react'
import { Badge } from '@/components/ui/Badge'
import { estimateTextCost, estimateImageCost, estimateMusicCost, estimateVideoCost, estimateTokens, formatCost, getCostColor } from '@/lib/costs'

interface CostEstimatorProps {
  model: string
  inputLength: number
  type: 'text' | 'image' | 'music' | 'video'
  outputLength?: number
}

export function CostEstimator({ model, inputLength, type, outputLength = 0 }: CostEstimatorProps) {
  const costInfo = useMemo(() => {
    if (!inputLength) return null

    switch (type) {
      case 'text': {
        const inputTokens = estimateTokens(inputLength)
        const outputTokens = estimateTokens(outputLength)
        const result = estimateTextCost(model, inputTokens, outputTokens)
        return {
          total: result.total,
          formatted: formatCost(result.total),
          breakdown: outputLength > 0 ? `输入: ${formatCost(result.input)}, 输出: ${formatCost(result.output)}` : null,
        }
      }
      case 'image': {
        const cost = estimateImageCost(model, inputLength)
        return {
          total: cost,
          formatted: formatCost(cost),
          breakdown: null,
        }
      }
      case 'music': {
        const cost = estimateMusicCost(model, inputLength)
        return {
          total: cost,
          formatted: formatCost(cost),
          breakdown: null,
        }
      }
      case 'video': {
        const cost = estimateVideoCost(inputLength)
        return {
          total: cost,
          formatted: formatCost(cost),
          breakdown: null,
        }
      }
      default:
        return null
    }
  }, [model, inputLength, type, outputLength])

  if (!costInfo) return null

  const colorVariant = getCostColor(costInfo.total)

  const badgeVariant = colorVariant === 'green' ? 'secondary' : colorVariant === 'yellow' ? 'outline' : 'destructive'

  return (
    <div className="flex items-center gap-2">
      <Badge variant={badgeVariant} className="text-xs">
        预估费用: {costInfo.formatted}
      </Badge>
      {costInfo.breakdown && (
        <span className="text-xs text-muted-foreground">{costInfo.breakdown}</span>
      )}
    </div>
  )
}