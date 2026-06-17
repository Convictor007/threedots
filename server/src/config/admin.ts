export type UserRole = 'user' | 'admin'

export function normalizeRole(role?: string | null): UserRole {
  return role === 'admin' ? 'admin' : 'user'
}

export function isAdminRole(role?: string | null): boolean {
  return normalizeRole(role) === 'admin'
}
