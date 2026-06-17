import { useState, type FormEvent } from 'react'
import { usePinLock } from '../../context/PinLockContext'
import {
  disableAutoLock,
  hasPinConfigured,
  isAutoLockEnabled,
  removePin,
  setAutoLockEnabled,
  setPin,
} from '../../utils/pinStorage'
import {
  areMessageNotificationsEnabled,
  requestBrowserNotificationPermission,
  setMessageNotificationsEnabled,
} from '../../utils/notifications'
import { ProfileSettings } from './ProfileSettings'
import './SettingsModal.css'

interface SettingsModalProps {
  onClose: () => void
}

type SettingsTab = 'profile' | 'privacy'

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { refreshLockState } = usePinLock()
  const [tab, setTab] = useState<SettingsTab>('profile')
  const [autoLockOn, setAutoLockOn] = useState(isAutoLockEnabled())
  const [showPinForm, setShowPinForm] = useState(false)
  const [changePinOpen, setChangePinOpen] = useState(false)
  const [messageNotificationsOn, setMessageNotificationsOn] = useState(areMessageNotificationsEnabled())
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const pinConfigured = hasPinConfigured()

  function handleAutoLockToggle() {
    setError('')
    setSuccess('')

    if (autoLockOn) {
      disableAutoLock()
      setAutoLockOn(false)
      setShowPinForm(false)
      setChangePinOpen(false)
      setSuccess('Auto-lock disabled.')
      refreshLockState()
      return
    }

    if (pinConfigured) {
      setAutoLockEnabled(true)
      setAutoLockOn(true)
      setSuccess('Auto-lock enabled.')
      refreshLockState()
      return
    }

    setShowPinForm(true)
    setAutoLockOn(true)
  }

  async function handleMessageNotificationsToggle() {
    setError('')
    setSuccess('')

    if (messageNotificationsOn) {
      setMessageNotificationsEnabled(false)
      setMessageNotificationsOn(false)
      setSuccess('Message notifications disabled.')
      return
    }

    const permission = await requestBrowserNotificationPermission()
    if (permission === 'granted') {
      setMessageNotificationsEnabled(true)
      setMessageNotificationsOn(true)
      setSuccess('Message notifications enabled.')
      return
    }

    setMessageNotificationsEnabled(false)
    setMessageNotificationsOn(false)
    setError(
      permission === 'denied'
        ? 'Browser notifications are blocked. Allow notifications in your browser settings.'
        : 'Notification permission was dismissed.',
    )
  }

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
      setAutoLockOn(true)
      setShowPinForm(false)
      setChangePinOpen(false)
      setNewPin('')
      setConfirmPin('')
      setSuccess('4-digit PIN saved. Auto-lock is now enabled.')
      refreshLockState()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save PIN')
      if (!pinConfigured) {
        setAutoLockOn(false)
        setShowPinForm(false)
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleRemovePin() {
    removePin()
    setAutoLockOn(false)
    setShowPinForm(false)
    setChangePinOpen(false)
    setNewPin('')
    setConfirmPin('')
    setSuccess('PIN removed. Auto-lock is off.')
    refreshLockState()
  }

  const showPinFields = showPinForm || changePinOpen

  return (
    <div className="settings-modal" onClick={onClose}>
      <div className="settings-modal__content settings-modal__content--wide" onClick={(e) => e.stopPropagation()}>
        <header className="settings-modal__header">
          <h2>Settings</h2>
          <button type="button" className="settings-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="settings-modal__tabs">
          <button
            type="button"
            className={`settings-modal__tab ${tab === 'profile' ? 'settings-modal__tab--active' : ''}`}
            onClick={() => setTab('profile')}
          >
            Profile
          </button>
          <button
            type="button"
            className={`settings-modal__tab ${tab === 'privacy' ? 'settings-modal__tab--active' : ''}`}
            onClick={() => setTab('privacy')}
          >
            Privacy
          </button>
        </div>

        {tab === 'profile' ? (
          <ProfileSettings />
        ) : (
          <>
            <div className="settings-toggle-row">
              <div className="settings-toggle-row__text">
                <span className="settings-toggle-row__label">Auto-lock with 4-digit PIN</span>
                <p className="settings-modal__desc settings-modal__desc--inline">
                  Lock when you switch tabs, close the browser, or put your device to sleep.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoLockOn}
                aria-label="Enable auto-lock with PIN"
                className={`settings-switch ${autoLockOn ? 'settings-switch--on' : ''}`}
                onClick={handleAutoLockToggle}
              >
                <span className="settings-switch__thumb" />
              </button>
            </div>

            <div className="settings-toggle-row">
              <div className="settings-toggle-row__text">
                <span className="settings-toggle-row__label">Message notifications</span>
                <p className="settings-modal__desc settings-modal__desc--inline">
                  Show browser notifications for new incoming messages.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={messageNotificationsOn}
                aria-label="Enable message notifications"
                className={`settings-switch ${messageNotificationsOn ? 'settings-switch--on' : ''}`}
                onClick={() => {
                  void handleMessageNotificationsToggle()
                }}
              >
                <span className="settings-switch__thumb" />
              </button>
            </div>

            {autoLockOn && !pinConfigured && showPinForm && (
              <p className="settings-modal__hint">Create a 4-digit PIN to turn on auto-lock.</p>
            )}

            {autoLockOn && pinConfigured && !showPinFields && (
              <p className="settings-modal__hint">4-digit PIN is active.</p>
            )}

            {autoLockOn && pinConfigured && !showPinFields && (
              <button
                type="button"
                className="settings-link-btn"
                onClick={() => setChangePinOpen(true)}
              >
                Change PIN
              </button>
            )}

            {showPinFields && (
              <form onSubmit={handleSetPin} className="settings-modal__form">
                <div className="settings-field">
                  <label htmlFor="newPin">{pinConfigured ? 'New PIN (4 digits)' : 'PIN (4 digits)'}</label>
                  <input
                    id="newPin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
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
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    autoComplete="off"
                  />
                </div>

                <button
                  type="submit"
                  className="settings-save"
                  disabled={submitting || newPin.length !== 4 || confirmPin.length !== 4}
                >
                  {pinConfigured ? 'Update PIN' : 'Save PIN'}
                </button>
              </form>
            )}

            {error && <p className="settings-error">{error}</p>}
            {success && <p className="settings-success">{success}</p>}

            {pinConfigured && (
              <button type="button" className="settings-remove" onClick={handleRemovePin}>
                Remove PIN
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
