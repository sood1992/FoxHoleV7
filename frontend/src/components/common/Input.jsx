import { forwardRef } from 'react'

const Input = forwardRef(
  (
    {
      label,
      error,
      helperText,
      className = '',
      containerClassName = '',
      leftIcon,
      rightIcon,
      type = 'text',
      ...props
    },
    ref
  ) => {
    return (
      <div className={containerClassName}>
        {label && (
          <label className="label">
            {label}
            {props.required && <span className="text-danger ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            className={`input ${error ? 'input-error' : ''} ${
              leftIcon ? 'pl-10' : ''
            } ${rightIcon ? 'pr-10' : ''} ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm text-text-secondary">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
