import './LoadingSpinner.css'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

export function LoadingSpinner({ size = 'md', label, className = '' }: LoadingSpinnerProps) {
  return (
    <span
      className={`loading-spinner loading-spinner--${size} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={label ?? 'Loading'}
    >
      <span className="loading-spinner__ring" aria-hidden />
      {label && <span className="loading-spinner__label">{label}</span>}
    </span>
  )
}
