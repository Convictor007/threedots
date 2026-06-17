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

  function handleKeyPress(digit: string) {
    if (submitting) return
    setPin((prev) => {
      if (prev.length >= 4) return prev
      const next = (prev + digit).slice(0, 4)
      setError('')
      return next
    })
  }

  function handleBackspace() {
    if (submitting) return
    setPin((prev) => prev.slice(0, -1))
    setError('')
  }

  function handleClear() {
    if (submitting) return
    setPin('')
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

          <div className="pin-lock__keypad" aria-label="PIN keypad">
            <div className="pin-lock__keypad-row">
              <button
                type="button"
                className="pin-lock__key"
                onClick={() => handleKeyPress('1')}
                disabled={submitting || pin.length >= 4}
              >
                1
              </button>
              <button
                type="button"
                className="pin-lock__key"
                onClick={() => handleKeyPress('2')}
                disabled={submitting || pin.length >= 4}
              >
                2
              </button>
              <button
                type="button"
                className="pin-lock__key"
                onClick={() => handleKeyPress('3')}
                disabled={submitting || pin.length >= 4}
              >
                3
              </button>
            </div>
            <div className="pin-lock__keypad-row">
              <button
                type="button"
                className="pin-lock__key"
                onClick={() => handleKeyPress('4')}
                disabled={submitting || pin.length >= 4}
              >
                4
              </button>
              <button
                type="button"
                className="pin-lock__key"
                onClick={() => handleKeyPress('5')}
                disabled={submitting || pin.length >= 4}
              >
                5
              </button>
              <button
                type="button"
                className="pin-lock__key"
                onClick={() => handleKeyPress('6')}
                disabled={submitting || pin.length >= 4}
              >
                6
              </button>
            </div>
            <div className="pin-lock__keypad-row">
              <button
                type="button"
                className="pin-lock__key"
                onClick={() => handleKeyPress('7')}
                disabled={submitting || pin.length >= 4}
              >
                7
              </button>
              <button
                type="button"
                className="pin-lock__key"
                onClick={() => handleKeyPress('8')}
                disabled={submitting || pin.length >= 4}
              >
                8
              </button>
              <button
                type="button"
                className="pin-lock__key"
                onClick={() => handleKeyPress('9')}
                disabled={submitting || pin.length >= 4}
              >
                9
              </button>
            </div>
            <div className="pin-lock__keypad-row">
              <button
                type="button"
                className="pin-lock__key pin-lock__key--secondary"
                onClick={handleClear}
                disabled={submitting || pin.length === 0}
              >
                Clear
              </button>
              <button
                type="button"
                className="pin-lock__key"
                onClick={() => handleKeyPress('0')}
                disabled={submitting || pin.length >= 4}
              >
                0
              </button>
              <button
                type="button"
                className="pin-lock__key pin-lock__key--secondary"
                onClick={handleBackspace}
                disabled={submitting || pin.length === 0}
                aria-label="Delete digit"
              >
                ⌫
              </button>
            </div>
          </div>

          {error && <p className="pin-lock__error">{error}</p>}

          <button type="submit" disabled={pin.length !== 4 || submitting}>
            {submitting ? 'Verifying…' : 'Resume Session'}
          </button>
        </form>

        <p className="pin-lock__hint">Your wellness data is kept private and secure.</p>
      </div>
    </div>
  )
}
