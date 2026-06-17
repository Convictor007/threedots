import { db } from '../db/client.js'
import { isAdminRole } from '../config/admin.js'
import { toPublicUser } from './auth.service.js'

type AdminUserRow = {
  id: string
  username: string
  display_name: string
  avatar_color: string
  avatar_url: string | null
  password_hash: string
  last_seen_at: Date | null
  role: string | null
  created_at: Date
  updated_at: Date
  session_count: number
  message_count: number
  conversation_count: number
}

function toAdminUser(row: AdminUserRow) {
  return {
    ...toPublicUser(row),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    sessionCount: row.session_count,
    messageCount: row.message_count,
    conversationCount: row.conversation_count,
  }
}

export async function getDashboardStats() {
  const result = await db.query<{
    total_users: number
    admin_users: number
    active_sessions: number
    total_messages: number
    total_conversations: number
  }>(`
    select
      (select count(*)::int from users) as total_users,
      (select count(*)::int from users where role = 'admin') as admin_users,
      (select count(*)::int from sessions) as active_sessions,
      (select count(*)::int from messages) as total_messages,
      (select count(*)::int from conversations) as total_conversations
  `)

  return result.rows[0] ?? {
    total_users: 0,
    admin_users: 0,
    active_sessions: 0,
    total_messages: 0,
    total_conversations: 0,
  }
}

export async function listAllUsers() {
  const result = await db.query<AdminUserRow>(`
    select
      u.id,
      u.username,
      u.display_name,
      u.avatar_color,
      u.avatar_url,
      u.password_hash,
      u.last_seen_at,
      u.role,
      u.created_at,
      u.updated_at,
      (select count(*)::int from sessions s where s.user_id = u.id) as session_count,
      (select count(*)::int from messages m where m.sender_id = u.id) as message_count,
      (
        select count(*)::int
        from conversation_participants cp
        where cp.user_id = u.id
      ) as conversation_count
    from users u
    order by u.created_at desc
  `)

  return {
    users: result.rows.map((row) => toAdminUser(row)),
  }
}

export async function revokeUserSessions(userId: string, actorUserId: string) {
  if (userId === actorUserId) {
    return { error: 'Cannot revoke your own active session from the admin dashboard' as const }
  }

  const userResult = await db.query<{ username: string; role: string | null }>(
    'select username, role from users where id = $1 limit 1',
    [userId],
  )
  const target = userResult.rows[0]
  if (!target) {
    return { error: 'User not found' as const }
  }

  if (isAdminRole(target.role)) {
    return { error: 'Cannot revoke sessions for another admin' as const }
  }

  const deleted = await db.query('delete from sessions where user_id = $1', [userId])
  return { revokedSessions: deleted.rowCount ?? 0 }
}

export async function updateUserRole(
  userId: string,
  role: 'user' | 'admin',
  actorUserId: string,
) {
  if (userId === actorUserId && role !== 'admin') {
    return { error: 'Cannot remove your own admin access' as const }
  }

  const userResult = await db.query<{ id: string }>(
    'select id from users where id = $1 limit 1',
    [userId],
  )
  if (!userResult.rows[0]) {
    return { error: 'User not found' as const }
  }

  await db.query('update users set role = $2, updated_at = now() where id = $1', [userId, role])

  const updated = await db.query<AdminUserRow>(`
    select
      u.id,
      u.username,
      u.display_name,
      u.avatar_color,
      u.avatar_url,
      u.password_hash,
      u.last_seen_at,
      u.role,
      u.created_at,
      u.updated_at,
      (select count(*)::int from sessions s where s.user_id = u.id) as session_count,
      (select count(*)::int from messages m where m.sender_id = u.id) as message_count,
      (
        select count(*)::int
        from conversation_participants cp
        where cp.user_id = u.id
      ) as conversation_count
    from users u
    where u.id = $1
    limit 1
  `, [userId])

  const row = updated.rows[0]
  if (!row) return { error: 'User not found' as const }

  return { user: toAdminUser(row) }
}
