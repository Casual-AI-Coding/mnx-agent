import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const skeletonVariants = cva(
  'animate-pulse rounded-md bg-primary/10'
)

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(skeletonVariants({ className }))}
      {...props}
    />
  )
}

export { Skeleton, skeletonVariants }
