import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'soft'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  /** 부모 너비를 가득 채운다 */
  block?: boolean
  leading?: ReactNode
  trailing?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  leading,
  trailing,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'tf-btn',
        `tf-btn--${variant}`,
        `tf-btn--${size}`,
        block && 'tf-btn--block',
        className,
      )}
      {...rest}
    >
      {leading && <span className="tf-btn__affix">{leading}</span>}
      <span className="tf-btn__label">{children}</span>
      {trailing && <span className="tf-btn__affix">{trailing}</span>}
    </button>
  )
}
