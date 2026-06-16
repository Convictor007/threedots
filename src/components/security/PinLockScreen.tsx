import { useState, type FormEvent } from 'react'
import { BRAND } from '../../constants/brand'
import { WellnessLogo } from '../brand/WellnessLogo'
import './PinLockScreen.css'

interface PinLockScreenProps {
  onUnlock: (pin: string) => Promise<boolean>
}

export function PinLockScreen({ onUnlock }: PinLockScreenProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const valid = await onUnlock(pin)
      if (!valid) {
        setError('Incorrect PIN. Please try again.')
        setPin('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handlePinInput(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 6)
    setPin(digits)
    setError('')
  }

  return (
    <div className="pin-lock">
      <div className="pin-lock__card">
        <WellnessLogo size="lg" />
        <h1>{BRAND.pinLockTitle}</h1>
        <p>{BRAND.pinLockSubtitle}</p>

        <form onSubmit={handleSubmit}>
          <div className="pin-lock__dots">
            {Array.from({ length: pin.length || 0 }).map((_, i) => (
              <span key={i} className="pin-lock__dot pin-lock__dot--filled" />
            ))}
            {Array.from({ length: Math.max(4 - pin.length, 0) }).map((_, i) => (
              <span key={`e-${i}`} className="pin-lock__dot" />
            ))}
          </div>

          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pin}
            onChange={(e) => handlePinInput(e.target.value)}
            className="pin-lock__input"
            autoFocus
            autoComplete="off"
            aria-label="Wellness PIN"
          />

          {error && <p className="pin-lock__error">{error}</p>}

          <button type="submit" disabled={pin.length < 4 || submitting}>
            {submitting ? 'Verifying…' : 'Resume Session'}
          </button>
        </form>

        <p className="pin-lock__hint">Your wellness data is kept private and secure.</p>
      </div>
    </div>
  )
}
