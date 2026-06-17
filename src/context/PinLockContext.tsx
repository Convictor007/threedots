import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  clearSessionUnlock,
  isAutoLockEnabled,
  markSessionUnlocked,
  shouldShowPinLock,
  verifyPin,
} from '../utils/pinStorage'

interface PinLockContextValue {
  locked: boolean
  pinEnabled: boolean
  unlock: (pin: string) => Promise<boolean>
  refreshLockState: () => void
}

const PinLockContext = createContext<PinLockContextValue | null>(null)

export function PinLockProvider({ children, active }: { children: ReactNode; active: boolean }) {
  const [locked, setLocked] = useState(false)
  const [pinEnabled, setPinEnabled] = useState(isAutoLockEnabled)

  const refreshLockState = useCallback(() => {
    const enabled = isAutoLockEnabled()
    setPinEnabled(enabled)
    if (active && enabled) {
      setLocked(shouldShowPinLock())
    } else {
      setLocked(false)
    }
  }, [active])

  useEffect(() => {
    refreshLockState()
  }, [active, refreshLockState])

  useEffect(() => {
    if (!active) return

    function lockOnHide() {
      if (document.hidden && isAutoLockEnabled()) {
        clearSessionUnlock()
        setLocked(true)
      }
    }

    function lockOnPageHide() {
      if (isAutoLockEnabled()) {
        clearSessionUnlock()
      }
    }

    document.addEventListener('visibilitychange', lockOnHide)
    window.addEventListener('pagehide', lockOnPageHide)

    return () => {
      document.removeEventListener('visibilitychange', lockOnHide)
      window.removeEventListener('pagehide', lockOnPageHide)
    }
  }, [active])

  const unlock = useCallback(async (pin: string) => {
    const valid = await verifyPin(pin)
    if (valid) {
      markSessionUnlocked()
      setLocked(false)
    }
    return valid
  }, [])

  const value = useMemo(
    () => ({ locked, pinEnabled, unlock, refreshLockState }),
    [locked, pinEnabled, unlock, refreshLockState],
  )

  return <PinLockContext.Provider value={value}>{children}</PinLockContext.Provider>
}

export function usePinLock() {
  const ctx = useContext(PinLockContext)
  if (!ctx) throw new Error('usePinLock must be used within PinLockProvider')
  return ctx
}

export function usePinLockOptional() {
  return useContext(PinLockContext)
}
