import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns'

// Date formatters
export const formatDate = (date, formatStr = 'MMM d, yyyy') => {
  if (!date) return ''
  const parsed = typeof date === 'string' ? parseISO(date) : date
  return isValid(parsed) ? format(parsed, formatStr) : ''
}

export const formatDateTime = (date) => {
  return formatDate(date, 'MMM d, yyyy h:mm a')
}

export const formatTime = (date) => {
  return formatDate(date, 'h:mm a')
}

export const formatRelative = (date) => {
  if (!date) return ''
  const parsed = typeof date === 'string' ? parseISO(date) : date
  return isValid(parsed) ? formatDistanceToNow(parsed, { addSuffix: true }) : ''
}

export const formatDateShort = (date) => {
  return formatDate(date, 'MMM d')
}

// Currency formatter (Indian Rupee)
export const formatCurrency = (amount, options = {}) => {
  const { compact = false, decimals = 0 } = options

  if (compact && amount >= 100000) {
    // Convert to Lakhs
    const lakhs = amount / 100000
    return `₹${lakhs.toFixed(1)}L`
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)
}

// Hours formatter
export const formatHours = (hours, options = {}) => {
  const { showMinutes = true, compact = false } = options

  if (!hours && hours !== 0) return ''

  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)

  if (compact) {
    return `${hours.toFixed(1)}h`
  }

  if (showMinutes && m > 0) {
    return `${h}h ${m}m`
  }

  return `${h}h`
}

// Timer formatter (HH:MM:SS)
export const formatTimer = (seconds) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  return [h, m, s].map((v) => v.toString().padStart(2, '0')).join(':')
}

// Percentage formatter
export const formatPercent = (value, decimals = 0) => {
  if (value === null || value === undefined) return ''
  return `${value.toFixed(decimals)}%`
}

// Number formatter with commas
export const formatNumber = (num) => {
  if (!num && num !== 0) return ''
  return new Intl.NumberFormat('en-IN').format(num)
}

// File size formatter
export const formatFileSize = (bytes) => {
  if (!bytes) return ''

  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}

// Truncate text
export const truncate = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// Initials from name
export const getInitials = (name) => {
  if (!name) return ''
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Capitalize first letter
export const capitalize = (str) => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

// Snake to title case
export const snakeToTitle = (str) => {
  if (!str) return ''
  return str
    .split('_')
    .map((word) => capitalize(word))
    .join(' ')
}
