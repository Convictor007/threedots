import { hashPassword, store } from '../store/memory.store.js'

export function login(username: string, password: string) {
  const user = store.findUserByUsername(username)
  if (!user || user.passwordHash !== hashPassword(password)) {
    return { error: 'Invalid username or password' as const }
  }

  const session = store.createSession(user.id)
  return { user: store.toPublicUser(user), token: session.token }
}

export function register(username: string, displayName: string, password: string) {
  if (!username.trim() || !displayName.trim() || !password.trim()) {
    return { error: 'All fields are required' as const }
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters' as const }
  }

  if (store.findUserByUsername(username)) {
    return { error: 'Username already taken' as const }
  }

  const user = store.createUser(username, displayName, password)
  const session = store.createSession(user.id)
  return { user: store.toPublicUser(user), token: session.token }
}

export function getMe(userId: string) {
  const user = store.findUserById(userId)
  if (!user) return { error: 'User not found' as const }
  return { user: store.toPublicUser(user) }
}

export function logout(token: string) {
  store.deleteSession(token)
}
