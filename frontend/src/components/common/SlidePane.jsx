import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function SlidePane({
  isOpen,
  onClose,
  title,
  children,
  width = '500px',
  showClose = true,
  footer,
}) {
  const paneRef = useRef(null)

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 animate-fade-in"
        onClick={onClose}
      />

      {/* Pane */}
      <div
        ref={paneRef}
        style={{ width }}
        className="relative bg-surface h-full shadow-modal animate-slide-in-right flex flex-col"
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            {title && (
              <h2 className="text-lg font-semibold text-text-primary">
                {title}
              </h2>
            )}
            {showClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-secondary shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
