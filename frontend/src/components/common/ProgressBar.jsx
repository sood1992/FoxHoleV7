const colors = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
}

export default function ProgressBar({
  value = 0,
  max = 100,
  color = 'primary',
  size = 'md',
  showValue = false,
  className = '',
}) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100))

  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
    xl: 'h-4',
  }

  return (
    <div className={className}>
      <div
        className={`w-full bg-surface-tertiary rounded-full overflow-hidden ${sizes[size]}`}
      >
        <div
          className={`${colors[color]} ${sizes[size]} rounded-full transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showValue && (
        <div className="flex justify-between mt-1 text-xs text-text-secondary">
          <span>{value}</span>
          <span>{Math.round(percent)}%</span>
        </div>
      )}
    </div>
  )
}
