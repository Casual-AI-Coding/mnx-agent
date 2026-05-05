import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { SettingsModal } from '@/components/settings/SettingsModal'
import { DebugSection } from './sidebar/DebugSection.js'
import { NavGroup } from './sidebar/NavGroup.js'
import { UserSection } from './sidebar/UserSection.js'
import { getDebugItems, getMenuSections, roleHierarchy } from './sidebar/sidebar-config.js'
import { DEFAULT_WIDTH, getMainElement, getStoredCollapsed, getStoredExpanded, getStoredWidth, MAX_WIDTH, MIN_WIDTH, setStoredCollapsed, setStoredExpanded, setStoredWidth } from './sidebar/sidebar-storage.js'

interface SidebarProps {
  onCollapseChange?: (collapsed: boolean) => void
  onWidthChange?: (width: number) => void
}

export default function Sidebar({ onCollapseChange, onWidthChange }: SidebarProps) {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(getStoredExpanded)
  const [isCollapsed, setIsCollapsed] = useState(getStoredCollapsed)
  const [sidebarWidth, setSidebarWidth] = useState(getStoredWidth)
  const [isResizing, setIsResizing] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const asideRef = useRef<HTMLElement>(null)
  const resizeStartX = useRef(0)
  const resizeStartWidth = useRef(DEFAULT_WIDTH)
  const currentWidthRef = useRef(DEFAULT_WIDTH)

  const userRoleLevel = user ? roleHierarchy[user.role] : 0

  useEffect(() => {
    setStoredExpanded(expandedSections)
  }, [expandedSections])

  useEffect(() => {
    setStoredCollapsed(isCollapsed)
    onCollapseChange?.(isCollapsed)
  }, [isCollapsed, onCollapseChange])

  useEffect(() => {
    onWidthChange?.(isCollapsed ? 60 : sidebarWidth)
  }, [sidebarWidth, isCollapsed, onWidthChange])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const delta = e.clientX - resizeStartX.current
    const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeStartWidth.current + delta))
    currentWidthRef.current = newWidth

    if (asideRef.current) {
      asideRef.current.style.width = `${newWidth}px`
    }
    const mainEl = getMainElement()
    if (mainEl) {
      mainEl.style.marginLeft = `${newWidth}px`
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
    const finalWidth = currentWidthRef.current
    setSidebarWidth(finalWidth)
    setStoredWidth(finalWidth)
    onWidthChange?.(finalWidth)

    document.body.style.userSelect = ''
    document.body.style.cursor = ''

    if (asideRef.current) {
      asideRef.current.style.transition = ''
    }
    const mainEl = getMainElement()
    if (mainEl) {
      mainEl.style.transition = ''
    }

    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.removeEventListener('mouseleave', handleMouseUp)
  }, [handleMouseMove, onWidthChange])

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (isCollapsed) return
    e.preventDefault()
    setIsResizing(true)
    resizeStartX.current = e.clientX
    resizeStartWidth.current = sidebarWidth
    currentWidthRef.current = sidebarWidth
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'

    if (asideRef.current) {
      asideRef.current.style.transition = 'none'
    }
    const mainEl = getMainElement()
    if (mainEl) {
      mainEl.style.transition = 'none'
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mouseleave', handleMouseUp)
  }, [isCollapsed, sidebarWidth, handleMouseMove, handleMouseUp])

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mouseleave', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  const toggleSection = (sectionId: string) => {
    if (isCollapsed) {
      setIsCollapsed(false)
    }
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }

  const toggleCollapse = () => {
    setIsCollapsed(prev => !prev)
  }

  const debugItems = getDebugItems(t)
  const menuSections = getMenuSections(t)

  const visibleSections = menuSections
    .filter(section => userRoleLevel >= roleHierarchy[section.minRole])
    .map(section => ({
      ...section,
      items: section.items,
    }))

  const debugExpanded = expandedSections['debug']
  return (
    <aside
      ref={asideRef}
      className={cn(
        'fixed left-0 top-[60px] bottom-0 bg-card/50 backdrop-blur-xl border-r border-border/50 flex flex-col transition-all duration-200',
        isCollapsed ? 'w-[60px]' : ''
      )}
      style={isCollapsed ? undefined : { width: sidebarWidth }}
    >
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {!isCollapsed && (
        <div
          onMouseDown={handleResizeStart}
          className={cn(
            'absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-20 transition-colors',
            isResizing ? 'bg-primary-500/50' : 'bg-transparent hover:bg-primary-500/30'
          )}
        />
      )}

      <button
        onClick={toggleCollapse}
        className={cn(
          'absolute -right-3 top-4 w-6 h-6 bg-card border border-border/50 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200 z-10 group',
          'hover:bg-primary-600 hover:border-primary-600'
        )}
        title={isCollapsed ? '展开侧边栏' : '收起侧边栏'}
      >
        {isCollapsed ? (
          <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
        )}
      </button>

      <nav className={cn(
        'flex-1 overflow-y-auto scrollbar-hide',
        isCollapsed ? 'px-1 py-2' : 'px-2 py-2'
      )}>
        <DebugSection
          collapsed={isCollapsed}
          expanded={Boolean(debugExpanded)}
          items={debugItems}
          label={t('sidebar.debugConsole', '调试台')}
          onToggle={() => toggleSection('debug')}
        />

        {visibleSections.map((section) => (
          <NavGroup
            key={section.id}
            collapsed={isCollapsed}
            expanded={Boolean(expandedSections[section.id])}
            icon={section.icon}
            id={section.id}
            items={section.items}
            label={section.label}
            onToggle={toggleSection}
          />
        ))}
      </nav>

      <div className={cn(
        'flex-shrink-0 border-t border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-200',
        isCollapsed ? 'p-2' : 'p-4'
      )}>
        <UserSection collapsed={isCollapsed} onOpenSettings={() => setShowSettingsModal(true)} />
      </div>

      <SettingsModal open={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    </aside>
  )
}
