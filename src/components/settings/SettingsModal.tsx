import { createPortal } from 'react-dom'
import { X, Settings, Sparkles, Monitor, Moon, Sun } from 'lucide-react'
import { ThemePicker } from './ThemePicker'
import { useEffect, useState } from 'react'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setIsClosing(false)
      setTimeout(() => setIsVisible(true), 10)
    } else {
      setIsVisible(false)
      setIsClosing(true)
    }
  }, [open])

  useEffect(() => {
    if (isClosing && !open) {
      const timer = setTimeout(() => setIsClosing(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isClosing, open])

  if (!open && !isClosing) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return createPortal(
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center p-4
        transition-all duration-300 ease-out
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
      onClick={handleBackdropClick}
    >
      <div 
        className={`
          absolute inset-0 bg-black/60 backdrop-blur-md
          transition-opacity duration-300
          ${isVisible ? 'opacity-100' : 'opacity-0'}
        `}
      />

      <div 
        className={`
          relative w-full max-w-2xl max-h-[85vh] overflow-hidden
          bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950
          border border-white/10 rounded-2xl shadow-2xl
          transition-all duration-300 ease-out
          ${isVisible 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-95 translate-y-4'
          }
        `}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-500/5 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-primary-400/60" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Settings</h2>
              <p className="text-sm text-dark-400">Customize your experience</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="group p-2 rounded-xl text-dark-400 hover:text-white hover:bg-white/10 transition-all duration-200"
          >
            <X className="w-5 h-5 transition-transform duration-200 group-hover:rotate-90" />
          </button>
        </div>

        <div className="relative p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          <section>
            <div className="flex items-center gap-2 mb-5">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20">
                <Monitor className="w-4 h-4 text-primary-400" />
                <Moon className="w-4 h-4 text-primary-400" />
                <Sun className="w-4 h-4 text-primary-400" />
              </div>
              <h3 className="text-base font-medium text-white">Appearance</h3>
              <span className="text-xs text-dark-500">Choose your preferred theme</span>
            </div>
            <ThemePicker />
          </section>
        </div>

        <div className="relative p-4 border-t border-white/5 bg-dark-950/50">
          <p className="text-xs text-dark-500 text-center flex items-center justify-center gap-2">
            <span>Press</span>
            <kbd className="px-2 py-0.5 rounded bg-dark-800 border border-dark-700 text-dark-300 text-xs font-mono">
              Esc
            </kbd>
            <span>or click outside to close</span>
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}