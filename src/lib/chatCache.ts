interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const CACHE_PREFIX = 'chat_cache_v1'

function keyFor(scope: string) {
  return `${CACHE_PREFIX}:${scope}`
}

export function getCached<T>(scope: string): T | null {
  try {
    const raw = localStorage.getItem(keyFor(scope))
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEntry<T>
    if (!parsed || typeof parsed.expiresAt !== 'number') return null
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(keyFor(scope))
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}

export function setCached<T>(scope: string, data: T, ttlMs: number) {
  try {
    const payload: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + ttlMs,
    }
    localStorage.setItem(keyFor(scope), JSON.stringify(payload))
  } catch {
    // Ignore storage quota / serialization failures.
  }
}

export function clearChatCache() {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key?.startsWith(CACHE_PREFIX)) keys.push(key)
    }
    keys.forEach((key) => localStorage.removeItem(key))
  } catch {
    // Ignore storage access failures.
  }
}
