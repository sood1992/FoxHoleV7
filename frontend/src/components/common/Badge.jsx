const variants = {
  primary: 'badge-primary',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  muted: 'bg-text-muted/20 text-text-secondary',
}

const sizes = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-0.5 text-xs',
  lg: 'px-2.5 py-1 text-sm',
}

export default function Badge({
  children,
  variant = 'primary',
  size = 'md',
  dot = false,
  className = '',
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
            variant === 'muted' ? 'bg-text-secondary' : 'bg-current'
          }`}
        />
      )}
      {children}
    </span>
  )
}
