import { createHash, randomUUID } from 'node:crypto'
import { db } from '../db/client.js'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

type UserRow = {
  id: string
  username: string
  display_name: string
  avatar_color: string
  password_hash: string
}

function toPublicUser(row: UserRow) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarColor: row.avatar_color,
  }
}

export async function login(username: string, password: string) {
  const result = await db.query<UserRow>(
    'select id, username, display_name, avatar_color, password_hash from users where username = $1 limit 1',
    [username.toLowerCase()],
  )
  const user = result.rows[0]
  if (!user || user.password_hash !== hashPassword(password)) {
    return { error: 'Invalid username or password' as const }
  }

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

  const exists = await db.query('select 1 from users where username = $1 limit 1', [
    username.toLowerCase(),
  ])
  if (exists.rowCount) {
    return { error: 'Username already taken' as const }
  }

  const id = randomUUID()
  const colors = ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2', '#1b4332']
  const avatarColor = colors[Math.floor(Math.random() * colors.length)]

  await db.query(
    `insert into users (id, username, display_name, avatar_color, password_hash)
     values ($1, $2, $3, $4, $5)`,
    [id, username.toLowerCase(), displayName, avatarColor, hashPassword(password)],
  )

  const token = randomUUID()
  await db.query('insert into sessions (token, user_id) values ($1, $2)', [token, id])
  return {
    user: { id, username: username.toLowerCase(), displayName, avatarColor },
    token,
  }
}

export async function getMe(userId: string) {
  const result = await db.query<UserRow>(
    'select id, username, display_name, avatar_color, password_hash from users where id = $1 limit 1',
    [userId],
  )
  const user = result.rows[0]
  if (!user) return { error: 'User not found' as const }
  return { user: toPublicUser(user) }
}

export async function logout(token: string) {
  await db.query('delete from sessions where token = $1', [token])
}
