import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../api/admin.api'
import { useAuth } from '../context/AuthContext'
import { formatLastSeen, usePresence } from '../context/PresenceContext'
import { Avatar } from '../components/chat/Avatar'
import { ConfirmModal } from '../components/common/ConfirmModal'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import type { AdminDashboardStats, AdminUser } from '../types'
import './AdminPage.css'

interface AdminPageProps {
  onBack: () => void
}

type PendingAction =
  | { kind: 'revoke'; user: AdminUser }
  | { kind: 'role'; user: AdminUser; role: 'user' | 'admin' }
  | null

export function AdminPage({ onBack }: AdminPageProps) {
  const { user: currentUser } = useAuth()
  const { isOnline } = usePresence()
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [acting, setActing] = useState(false)

  const loadDashboard = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const [{ stats: nextStats }, { users: nextUsers }] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsers(),
      ])
      setStats(nextStats)
      setUsers(nextUsers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin dashboard')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  async function handleConfirmAction() {
    if (!pendingAction) return

    setActing(true)
    setError(null)

    try {
      if (pendingAction.kind === 'revoke') {
        await adminApi.revokeSessions(pendingAction.user.id)
      } else {
        const { user } = await adminApi.updateRole(pendingAction.user.id, pendingAction.role)
        setUsers((prev) => prev.map((item) => (item.id === user.id ? user : item)))
      }
      await loadDashboard(true)
      setPendingAction(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActing(false)
    }
  }

  const onlineCount = users.filter((user) => isOnline(user.id)).length

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div className="admin-page__header-start">
          <button type="button" className="admin-page__back-btn" onClick={onBack}>
            Back to chat
          </button>
          <div>
            <h1>Admin dashboard</h1>
            <p>Monitor users, sessions, and activity across the platform.</p>
          </div>
        </div>
        <button
          type="button"
          className="admin-page__refresh-btn"
          onClick={() => void loadDashboard(true)}
          disabled={refreshing}
        >
          {refreshing ? <LoadingSpinner size="sm" /> : 'Refresh'}
        </button>
      </header>

      {loading ? (
        <div className="admin-page__loading">
          <LoadingSpinner size="lg" label="Loading dashboard…" />
        </div>
      ) : (
        <>
          {error && <div className="admin-page__error">{error}</div>}

          {stats && (
            <section className="admin-page__stats" aria-label="Platform statistics">
              <article className="admin-page__stat-card">
                <span className="admin-page__stat-label">Total users</span>
                <strong>{stats.totalUsers}</strong>
              </article>
              <article className="admin-page__stat-card">
                <span className="admin-page__stat-label">Online now</span>
                <strong>{onlineCount}</strong>
              </article>
              <article className="admin-page__stat-card">
                <span className="admin-page__stat-label">Active sessions</span>
                <strong>{stats.activeSessions}</strong>
              </article>
              <article className="admin-page__stat-card">
                <span className="admin-page__stat-label">Messages</span>
                <strong>{stats.totalMessages}</strong>
              </article>
              <article className="admin-page__stat-card">
                <span className="admin-page__stat-label">Conversations</span>
                <strong>{stats.totalConversations}</strong>
              </article>
              <article className="admin-page__stat-card">
                <span className="admin-page__stat-label">Admins</span>
                <strong>{stats.adminUsers}</strong>
              </article>
            </section>
          )}

          <section className="admin-page__panel">
            <div className="admin-page__panel-header">
              <h2>All users</h2>
              <span>{users.length} accounts</span>
            </div>

            <div className="admin-page__table-wrap">
              <table className="admin-page__table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Status</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Sessions</th>
                    <th>Messages</th>
                    <th>Chats</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const online = isOnline(user.id)
                    const isSelf = user.id === currentUser?.id

                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="admin-page__user-cell">
                            <Avatar user={user} size="sm" online={online} />
                            <div>
                              <strong>{user.displayName}</strong>
                              <span>@{user.username}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className={
                              online
                                ? 'admin-page__status admin-page__status--online'
                                : 'admin-page__status'
                            }
                          >
                            {online ? 'Online' : formatLastSeen(user.lastSeenAt)}
                          </span>
                        </td>
                        <td>
                          <span
                            className={
                              user.role === 'admin'
                                ? 'admin-page__role admin-page__role--admin'
                                : 'admin-page__role'
                            }
                          >
                            {user.role ?? 'user'}
                          </span>
                        </td>
                        <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                        <td>{user.sessionCount}</td>
                        <td>{user.messageCount}</td>
                        <td>{user.conversationCount}</td>
                        <td>
                          <div className="admin-page__actions">
                            <button
                              type="button"
                              className="admin-page__action-btn"
                              disabled={isSelf || user.sessionCount === 0}
                              onClick={() => setPendingAction({ kind: 'revoke', user })}
                            >
                              Sign out
                            </button>
                            <button
                              type="button"
                              className="admin-page__action-btn admin-page__action-btn--secondary"
                              disabled={isSelf}
                              onClick={() =>
                                setPendingAction({
                                  kind: 'role',
                                  user,
                                  role: user.role === 'admin' ? 'user' : 'admin',
                                })
                              }
                            >
                              {user.role === 'admin' ? 'Make user' : 'Make admin'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {pendingAction && (
        <ConfirmModal
          title={
            pendingAction.kind === 'revoke'
              ? `Sign out ${pendingAction.user.displayName}?`
              : pendingAction.role === 'admin'
                ? `Make ${pendingAction.user.displayName} an admin?`
                : `Remove admin access for ${pendingAction.user.displayName}?`
          }
          message={
            pendingAction.kind === 'revoke'
              ? 'This will revoke all active sessions for this user.'
              : pendingAction.role === 'admin'
                ? 'They will be able to access this admin dashboard.'
                : 'They will lose access to the admin dashboard.'
          }
          confirmLabel={pendingAction.kind === 'revoke' ? 'Sign out user' : 'Confirm'}
          loading={acting}
          onCancel={() => setPendingAction(null)}
          onConfirm={() => void handleConfirmAction()}
        />
      )}
    </div>
  )
}
