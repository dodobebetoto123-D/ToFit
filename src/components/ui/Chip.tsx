import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ChipProps {
  children: ReactNode
  selected?: boolean
  onClick?: () => void
  leading?: ReactNode
  size?: 'sm' | 'md'
  /** 선택 UI가 아닌 단순 표시용 */
  readOnly?: boolean
  tone?: 'default' | 'warm' | 'cool' | 'like' | 'mint'
  className?: string
}

export function Chip({
  children,
  selected = false,
  onClick,
  leading,
  size = 'md',
  readOnly = false,
  tone = 'default',
  className,
}: ChipProps) {
  const classes = cn(
    'tf-chip',
    `tf-chip--${size}`,
    tone !== 'default' && `tf-chip--${tone}`,
    selected && 'is-selected',
    readOnly && 'tf-chip--readonly',
    className,
  )

  if (readOnly || !onClick) {
    return (
      <span className={classes}>
        {leading && <span className="tf-chip__leading">{leading}</span>}
        {children}
      </span>
    )
  }

  return (
    <button type="button" className={classes} onClick={onClick} aria-pressed={selected}>
      {leading && <span className="tf-chip__leading">{leading}</span>}
      {children}
    </button>
  )
}
