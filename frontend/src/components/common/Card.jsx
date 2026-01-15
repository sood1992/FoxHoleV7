export default function Card({
  children,
  className = '',
  hover = false,
  padding = true,
  ...props
}) {
  return (
    <div
      className={`bg-surface rounded-card shadow-card ${
        hover ? 'hover:shadow-card-hover transition-shadow duration-200' : ''
      } ${padding ? 'p-6' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '', action }) {
  return (
    <div
      className={`flex items-center justify-between mb-4 ${className}`}
    >
      <div>{children}</div>
      {action && <div>{action}</div>}
    </div>
  )
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-lg font-semibold text-text-primary ${className}`}>
      {children}
    </h3>
  )
}

export function CardDescription({ children, className = '' }) {
  return (
    <p className={`text-sm text-text-secondary mt-1 ${className}`}>
      {children}
    </p>
  )
}
