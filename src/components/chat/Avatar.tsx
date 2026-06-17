import type { User } from '../../types'
import './Avatar.css'

interface AvatarProps {
  user: Pick<User, 'displayName' | 'avatarColor' | 'avatarUrl'>
  size?: 'sm' | 'md' | 'lg'
  online?: boolean
}

export function Avatar({ user, size = 'md', online }: AvatarProps) {
  const initials = user.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className={`avatar-wrap avatar-wrap--${size}`}>
      <div
        className={`avatar avatar--${size}`}
        style={{ backgroundColor: user.avatarColor }}
        aria-hidden
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="avatar__image" />
        ) : (
          initials
        )}
      </div>
      {online !== undefined && (
        <span
          className={`avatar-status ${online ? 'avatar-status--online' : 'avatar-status--offline'}`}
          aria-hidden
        />
      )}
    </div>
  )
}
