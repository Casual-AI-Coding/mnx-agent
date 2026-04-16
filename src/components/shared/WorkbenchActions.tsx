import { ReactNode } from 'react'
import { HelpButton } from './HelpButton'
import { APIRefButton } from './APIRefButton'
import { ClearButton } from './ClearButton'

interface WorkbenchActionsProps {
  helpTitle?: string
  helpTips?: ReactNode
  generateCurl?: () => string
  onClear?: () => void
  clearLabel?: string
}

export function WorkbenchActions({
  helpTitle,
  helpTips,
  generateCurl,
  onClear,
  clearLabel,
}: WorkbenchActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {helpTitle && helpTips && (
        <HelpButton title={helpTitle} tips={helpTips} />
      )}
      {generateCurl && (
        <APIRefButton generateCurl={generateCurl} />
      )}
      {onClear && (
        <ClearButton onClick={onClear} label={clearLabel} />
      )}
    </div>
  )
}