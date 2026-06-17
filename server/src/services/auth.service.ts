import { createHash, randomUUID } from 'node:crypto'
import { db } from '../db/client.js'
import { normalizeRole } from '../config/admin.js'
import { getPusherServer, PRESENCE_USERS_CHANNEL } from '../lib/realtime.js'

const AVATAR_COLORS = ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2', '#1b4332']

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

type UserRow = {
  id: string
  username: string
  display_name: string
  avatar_color: string
  avatar_url: string | null
  password_hash: string
  last_seen_at: Date | null
  role?: string | null
}

export function toPublicUser(row: UserRow) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarColor: row.avatar_color,
    avatarUrl: row.avatar_url ?? undefined,
    lastSeenAt: row.last_seen_at?.toISOString(),
    role: normalizeRole(row.role),
  }
}

async function getUserRow(userId: string) {
  const result = await db.query<UserRow>(
    `select id, username, display_name, avatar_color, avatar_url, password_hash, last_seen_at, role
     from users where id = $1 limit 1`,
    [userId],
  )
  const user = result.rows[0]
  return user
}

async function verifyPassword(userId: string, password: string) {
  const user = await getUserRow(userId)
  if (!user) return { error: 'User not found' as const }
  if (user.password_hash !== hashPassword(password)) {
    return { error: 'Current password is incorrect' as const }
  }
  return { user }
}

async function broadcastUserUpdated(user: ReturnType<typeof toPublicUser>) {
  const pusher = getPusherServer()
  if (pusher) {
    await pusher.trigger(PRESENCE_USERS_CHANNEL, 'user:updated', { user })
  }
}

export async function login(username: string, password: string) {
  const result = await db.query<UserRow>(
    `select id, username, display_name, avatar_color, avatar_url, password_hash, last_seen_at, role
     from users where username = $1 limit 1`,
    [username.toLowerCase()],
  )
  const user = result.rows[0]
  if (!user || user.password_hash !== hashPassword(password)) {
    return { error: 'Invalid username or password' as const }
  }

  await db.query('update users set last_seen_at = now() where id = $1', [user.id])

  const token = randomUUID()
  await db.query('insert into sessions (token, user_id) values ($1, $2)', [token, user.id])
  return { user: toPublicUser(user), token }
}

export async function register(username: string, displayName: string, password: string) {
  if (!username.trim() || !displayName.trim() || !password.trim()) {
    return { error: 'All fields are required' as const }
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters' as const }
  }

  if (username.toLowerCase() === 'admin') {
    return { error: 'This username is reserved' as const }
  }

  const exists = await db.query('select 1 from users where username = $1 limit 1', [
    username.toLowerCase(),
  ])
  if (exists.rowCount) {
    return { error: 'Username already taken' as const }
  }

  const id = randomUUID()
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]

  await db.query(
    `insert into users (id, username, display_name, avatar_color, password_hash, last_seen_at, role)
     values ($1, $2, $3, $4, $5, now(), 'user')`,
    [id, username.toLowerCase(), displayName.trim(), avatarColor, hashPassword(password)],
  )

  const token = randomUUID()
  await db.query('insert into sessions (token, user_id) values ($1, $2)', [token, id])
  return {
    user: {
      id,
      username: username.toLowerCase(),
      displayName: displayName.trim(),
      avatarColor,
      role: 'user' as const,
    },
    token,
  }
}

export async function getMe(userId: string) {
  const user = await getUserRow(userId)
  if (!user) return { error: 'User not found' as const }
  return { user: toPublicUser(user) }
}

export async function updateProfile(
  userId: string,
  input: { displayName?: string; avatarColor?: string; avatarUrl?: string | null },
) {
  const user = await getUserRow(userId)
  if (!user) return { error: 'User not found' as const }

  const displayName = input.displayName?.trim() ?? user.display_name
  if (!displayName) return { error: 'Display name is required' as const }

  const avatarColor = input.avatarColor ?? user.avatar_color
  if (!AVATAR_COLORS.includes(avatarColor)) {
    return { error: 'Invalid avatar color' as const }
  }

  let avatarUrl = user.avatar_url
  if (input.avatarUrl !== undefined) {
    avatarUrl = input.avatarUrl
  }

  await db.query(
    `update users
     set display_name = $2, avatar_color = $3, avatar_url = $4, updated_at = now()
     where id = $1`,
    [userId, displayName, avatarColor, avatarUrl],
  )

  const updated = await getUserRow(userId)
  if (!updated) return { error: 'User not found' as const }

  const publicUser = toPublicUser(updated)
  await broadcastUserUpdated(publicUser)
  return { user: publicUser }
}

export async function updateUsername(userId: string, username: string, currentPassword: string) {
  const trimmed = username.trim().toLowerCase()
  if (!trimmed || trimmed.length < 3) {
    return { error: 'Username must be at least 3 characters' as const }
  }

  const verified = await verifyPassword(userId, currentPassword)
  if ('error' in verified) return verified

  if (verified.user.username === trimmed) {
    return { user: toPublicUser(verified.user) }
  }

  const exists = await db.query('select 1 from users where username = $1 and id <> $2 limit 1', [
    trimmed,
    userId,
  ])
  if (exists.rowCount) {
    return { error: 'Username already taken' as const }
  }

  await db.query('update users set username = $2, updated_at = now() where id = $1', [
    userId,
    trimmed,
  ])

  const updated = await getUserRow(userId)
  if (!updated) return { error: 'User not found' as const }

  const publicUser = toPublicUser(updated)
  await broadcastUserUpdated(publicUser)
  return { user: publicUser }
}

export async function updatePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  if (newPassword.length < 6) {
    return { error: 'Password must be at least 6 characters' as const }
  }

  const verified = await verifyPassword(userId, currentPassword)
  if ('error' in verified) return verified

  await db.query('update users set password_hash = $2, updated_at = now() where id = $1', [
    userId,
    hashPassword(newPassword),
  ])

  const updated = await getUserRow(userId)
  if (!updated) return { error: 'User not found' as const }
  return { user: toPublicUser(updated) }
}

export async function touchLastSeen(userId: string) {
  await db.query('update users set last_seen_at = now() where id = $1', [userId])
  return { success: true as const }
}

export async function getPresenceInfo(userIds: string[]) {
  if (!userIds.length) return { users: [] as ReturnType<typeof toPublicUser>[] }

  const result = await db.query<UserRow>(
    `select id, username, display_name, avatar_color, avatar_url, password_hash, last_seen_at, role
     from users where id = any($1::text[])`,
    [userIds],
  )

  return {
    users: result.rows.map((row) => toPublicUser(row)),
  }
}

export async function logout(token: string) {
  await db.query('delete from sessions where token = $1', [token])
}

export { AVATAR_COLORS }
