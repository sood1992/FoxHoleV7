import { getInitials } from '../../utils/formatters'

const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-20 h-20 text-2xl',
}

const colors = [
  'bg-primary',
  'bg-success',
  'bg-warning',
  'bg-danger',
  'bg-info',
  'bg-primary-dark',
  'bg-success-dark',
]

export default function Avatar({
  src,
  name,
  size = 'md',
  className = '',
  showOnline = false,
  online = false,
}) {
  const initials = getInitials(name)

  // Generate consistent color based on name
  const colorIndex = name
    ? name.charCodeAt(0) % colors.length
    : 0
  const bgColor = colors[colorIndex]

  return (
    <div className={`relative inline-flex ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          className={`${sizes[size]} rounded-full object-cover`}
        />
      ) : (
        <div
          className={`${sizes[size]} ${bgColor} rounded-full flex items-center justify-center text-white font-medium`}
        >
          {initials}
        </div>
      )}

      {showOnline && (
        <span
          className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white ${
            online ? 'bg-success' : 'bg-text-muted'
          }`}
        />
      )}
    </div>
  )
}
