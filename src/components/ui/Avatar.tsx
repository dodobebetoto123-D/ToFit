import { cn } from '@/lib/utils'

interface AvatarProps {
  nickname: string
  color?: string
  size?: number
  className?: string
}

export function Avatar({ nickname, color = '#a0b1f5', size = 32, className }: AvatarProps) {
  const initial = (nickname ?? '').trim().charAt(0).toUpperCase() || '?'

  return (
    <span
      className={cn('tf-avatar', className)}
      style={{ width: size, height: size, background: color, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {initial}
    </span>
  )
}
