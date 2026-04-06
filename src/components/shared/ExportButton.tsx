import { useState, useRef, useEffect } from 'react'
import { Download, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { exportToCSV, exportToJSON } from '@/lib/export'
import { cn } from '@/lib/utils'

interface ExportButtonProps {
  data: object | object[]
  filename: string
  disabled?: boolean
}

export function ExportButton({ data, filename, disabled }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleExportCSV = () => {
    const arrayData = Array.isArray(data) ? data : [data]
    exportToCSV(arrayData, filename)
    setIsOpen(false)
  }

  const handleExportJSON = () => {
    exportToJSON(Array.isArray(data) ? data : [data], filename)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <Download className="w-4 h-4 mr-2" />
        导出
        <ChevronDown className={cn('w-4 h-4 ml-2 transition-transform', isOpen && 'rotate-180')} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 rounded-md border border-border bg-muted shadow-lg z-50">
          <button
            onClick={handleExportCSV}
            className="w-full px-4 py-2 text-left text-sm hover:bg-secondary transition-colors"
          >
            导出为 CSV
          </button>
          <button
            onClick={handleExportJSON}
            className="w-full px-4 py-2 text-left text-sm hover:bg-secondary transition-colors border-t border-border"
          >
            导出为 JSON
          </button>
        </div>
      )}
    </div>
  )
}