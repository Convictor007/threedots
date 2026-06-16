import './WellnessLogo.css'

interface WellnessLogoProps {
  size?: 'sm' | 'md' | 'lg'
}

export function WellnessLogo({ size = 'md' }: WellnessLogoProps) {
  return (
    <div className={`wellness-logo wellness-logo--${size}`} aria-hidden>
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="24" className="wellness-logo__bg" />
        <path
          d="M24 8C24 8 14 18 14 28C14 33.523 18.477 38 24 38C29.523 38 34 33.523 34 28C34 18 24 8 24 8Z"
          className="wellness-logo__leaf"
        />
        <path
          d="M24 14V32"
          className="wellness-logo__vein"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M24 20C20 22 17 26 17 28"
          className="wellness-logo__vein"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M24 24C28 26 31 30 31 32"
          className="wellness-logo__vein"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
