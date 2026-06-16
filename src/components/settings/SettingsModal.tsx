import { useState, type FormEvent } from 'react'
import { usePinLock } from '../../context/PinLockContext'
import { isPinEnabled, removePin, setPin } from '../../utils/pinStorage'
import './SettingsModal.css'

interface SettingsModalProps {
  onClose: () => void
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { refreshLockState } = usePinLock()
  const [pinEnabled, setPinEnabled] = useState(isPinEnabled())
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSetPin(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPin !== confirmPin) {
      setError('PINs do not match')
      return
    }

    setSubmitting(true)
    try {
      await setPin(newPin)
      setPinEnabled(true)
      setNewPin('')
      setConfirmPin('')
      setSuccess('Privacy PIN saved. App will lock when minimized or closed.')
      refreshLockState()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save PIN')
    } finally {
      setSubmitting(false)
    }
  }

  function handleRemovePin() {
    removePin()
    setPinEnabled(false)
    setSuccess('Privacy PIN removed.')
    refreshLockState()
  }

  return (
    <div className="settings-modal" onClick={onClose}>
      <div className="settings-modal__content" onClick={(e) => e.stopPropagation()}>
        <header className="settings-modal__header">
          <h2>Privacy Settings</h2>
          <button type="button" className="settings-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <p className="settings-modal__desc">
          Set a wellness PIN to protect your session when you close the browser, switch tabs, or
          put your device to sleep.
        </p>

        <form onSubmit={handleSetPin} className="settings-modal__form">
          <div className="settings-field">
            <label htmlFor="newPin">New PIN (4–6 digits)</label>
            <input
              id="newPin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              autoComplete="off"
            />
          </div>

          <div className="settings-field">
            <label htmlFor="confirmPin">Confirm PIN</label>
            <input
              id="confirmPin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              autoComplete="off"
            />
          </div>

          {error && <p className="settings-error">{error}</p>}
          {success && <p className="settings-success">{success}</p>}

          <button type="submit" className="settings-save" disabled={submitting || newPin.length < 4}>
            {pinEnabled ? 'Update PIN' : 'Set PIN'}
          </button>
        </form>

        {pinEnabled && (
          <button type="button" className="settings-remove" onClick={handleRemovePin}>
            Remove PIN
          </button>
        )}
      </div>
    </div>
  )
}
