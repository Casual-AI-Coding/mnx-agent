import * as React from 'react'
import ErrorBoundary from './ErrorBoundary'
import ErrorFallback from './ErrorFallback'

interface ComponentErrorBoundaryProps {
  children: React.ReactNode
  componentName?: string
  className?: string
}

/**
 * ComponentErrorBoundary - A specialized error boundary for individual components
 * 
 * Use this to wrap components that depend on React context (like Tabs, Select)
 * to provide graceful error handling when context is missing.
 */
export default function ComponentErrorBoundary({
  children,
  componentName = '组件',
  className,
}: ComponentErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        <ErrorFallback
          title={`${componentName} 加载失败`}
          message={`${componentName} 渲染时遇到错误。这可能是因为组件被放置在错误的位置或缺少必要的上下文。`}
          className={className}
        />
      }
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * withErrorBoundary HOC - Wraps a component with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => (
    <ComponentErrorBoundary componentName={componentName || Component.displayName || Component.name}>
      <Component {...props} />
    </ComponentErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}
