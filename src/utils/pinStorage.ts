const PIN_HASH_KEY = 'verdant_pin_hash'
const PIN_ENABLED_KEY = 'verdant_pin_enabled'
const UNLOCK_KEY = 'verdant_unlocked'

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function hasPinConfigured(): boolean {
  return !!localStorage.getItem(PIN_HASH_KEY)
}

export function isAutoLockEnabled(): boolean {
  return localStorage.getItem(PIN_ENABLED_KEY) === 'true' && hasPinConfigured()
}

/** @deprecated Use isAutoLockEnabled */
export function isPinEnabled(): boolean {
  return isAutoLockEnabled()
}

export function isSessionUnlocked(): boolean {
  return sessionStorage.getItem(UNLOCK_KEY) === '1'
}

export function markSessionUnlocked(): void {
  sessionStorage.setItem(UNLOCK_KEY, '1')
}

export function clearSessionUnlock(): void {
  sessionStorage.removeItem(UNLOCK_KEY)
}

export function setAutoLockEnabled(enabled: boolean): void {
  if (enabled && !hasPinConfigured()) {
    throw new Error('Set a PIN first')
  }
  localStorage.setItem(PIN_ENABLED_KEY, enabled ? 'true' : 'false')
  if (!enabled) {
    clearSessionUnlock()
  }
}

export function disableAutoLock(): void {
  setAutoLockEnabled(false)
}

export async function setPin(pin: string): Promise<void> {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error('PIN must be exactly 4 digits')
  }
  const hash = await hashPin(pin)
  localStorage.setItem(PIN_HASH_KEY, hash)
  localStorage.setItem(PIN_ENABLED_KEY, 'true')
  markSessionUnlocked()
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = localStorage.getItem(PIN_HASH_KEY)
  if (!stored) return false
  const hash = await hashPin(pin)
  return hash === stored
}

export function removePin(): void {
  localStorage.removeItem(PIN_HASH_KEY)
  localStorage.removeItem(PIN_ENABLED_KEY)
  clearSessionUnlock()
}

export function shouldShowPinLock(): boolean {
  return isAutoLockEnabled() && !isSessionUnlocked()
}
