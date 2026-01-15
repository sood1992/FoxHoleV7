import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

export default function Dropdown({
  trigger,
  children,
  align = 'left',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const alignments = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  }

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      {isOpen && (
        <div
          className={`absolute z-50 mt-2 min-w-[200px] bg-surface rounded-lg shadow-dropdown border border-border py-1 animate-fade-in ${alignments[align]}`}
        >
          {typeof children === 'function'
            ? children({ close: () => setIsOpen(false) })
            : children}
        </div>
      )}
    </div>
  )
}

export function DropdownItem({
  children,
  onClick,
  icon,
  danger = false,
  disabled = false,
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${
        danger
          ? 'text-danger hover:bg-danger/10'
          : 'text-text-primary hover:bg-surface-secondary'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
    </button>
  )
}

export function DropdownDivider() {
  return <div className="my-1 border-t border-border" />
}
