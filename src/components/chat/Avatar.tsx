import type { User } from '../../types'
import './Avatar.css'

interface AvatarProps {
  user: Pick<User, 'displayName' | 'avatarColor'>
  size?: 'sm' | 'md' | 'lg'
}

export function Avatar({ user, size = 'md' }: AvatarProps) {
  const initials = user.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      className={`avatar avatar--${size}`}
      style={{ backgroundColor: user.avatarColor }}
      aria-hidden
    >
      {initials}
    </div>
  )
}
