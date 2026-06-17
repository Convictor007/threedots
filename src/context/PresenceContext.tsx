import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Members } from 'pusher-js'
import { authApi } from '../api/auth.api'
import { presenceApi } from '../api/presence.api'
import { useAuth } from './AuthContext'
import { getPusherClient, PRESENCE_USERS_CHANNEL } from '../lib/realtime'
import type { User } from '../types'

interface PresenceContextValue {
  onlineUserIds: Set<string>
  isOnline: (userId: string) => boolean
  lastSeenMap: Record<string, string | undefined>
}

const PresenceContext = createContext<PresenceContextValue | null>(null)

function membersToSet(members: Members): Set<string> {
  const ids = new Set<string>()
  members.each((member: { id: string }) => ids.add(member.id))
  return ids
}

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string | undefined>>({})

  const isOnline = useCallback(
    (userId: string) => onlineUserIds.has(userId),
    [onlineUserIds],
  )

  useEffect(() => {
    if (!user) {
      setOnlineUserIds(new Set())
      return
    }

    const pusher = getPusherClient()
    if (!pusher) return

    const channel = pusher.subscribe(PRESENCE_USERS_CHANNEL)

    const onSucceeded = (members: Members) => {
      setOnlineUserIds(membersToSet(members))
    }

    const onAdded = (member: { id: string }) => {
      setOnlineUserIds((prev) => new Set([...prev, member.id]))
    }

    const onRemoved = (member: { id: string }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev)
        next.delete(member.id)
        return next
      })
    }

    const onUserUpdated = ({ user: updated }: { user: User }) => {
      setLastSeenMap((prev) => ({
        ...prev,
        [updated.id]: updated.lastSeenAt,
      }))
    }

    channel.bind('pusher:subscription_succeeded', onSucceeded)
    channel.bind('pusher:member_added', onAdded)
    channel.bind('pusher:member_removed', onRemoved)
    channel.bind('user:updated', onUserUpdated)

    const heartbeat = () => {
      void authApi.heartbeat().catch(() => {})
      void presenceApi.heartbeat().catch(() => {})
    }

    heartbeat()
    const heartbeatInterval = setInterval(heartbeat, 60000)

    return () => {
      clearInterval(heartbeatInterval)
      channel.unbind('pusher:subscription_succeeded', onSucceeded)
      channel.unbind('pusher:member_added', onAdded)
      channel.unbind('pusher:member_removed', onRemoved)
      channel.unbind('user:updated', onUserUpdated)
      pusher.unsubscribe(PRESENCE_USERS_CHANNEL)
    }
  }, [user])

  const value = useMemo(
    () => ({ onlineUserIds, isOnline, lastSeenMap }),
    [onlineUserIds, isOnline, lastSeenMap],
  )

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>
}

export function usePresence() {
  const ctx = useContext(PresenceContext)
  if (!ctx) throw new Error('usePresence must be used within PresenceProvider')
  return ctx
}

export function formatLastSeen(iso?: string) {
  if (!iso) return 'Offline'
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Last seen just now'
  if (diffMin < 60) return `Last seen ${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `Last seen ${diffHr}h ago`
  return `Last seen ${date.toLocaleDateString()}`
}
