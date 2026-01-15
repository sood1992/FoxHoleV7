import { forwardRef } from 'react'

const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  success: 'btn-success',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
}

const sizes = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
}

const Button = forwardRef(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      className = '',
      loading = false,
      disabled = false,
      type = 'button',
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={`${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        ) : leftIcon ? (
          <span className="-ml-1 mr-2">{leftIcon}</span>
        ) : null}
        {children}
        {rightIcon && !loading && <span className="ml-2 -mr-1">{rightIcon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
