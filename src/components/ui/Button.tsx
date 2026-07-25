import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'soft'
type Size = 'sm' | 'md' | 'lg'

interface ButtonOwnProps {
  variant?: Variant
  size?: Size
  /** 부모 너비를 가득 채운다 */
  block?: boolean
  leading?: ReactNode
  trailing?: ReactNode
}

type ButtonAsButton = ButtonOwnProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { as?: 'button' }
type ButtonAsAnchor = ButtonOwnProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { as: 'a' }

type ButtonProps = ButtonAsButton | ButtonAsAnchor

export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  leading,
  trailing,
  className,
  children,
  as = 'button',
  ...rest
}: ButtonProps) {
  const classes = cn(
    'tf-btn',
    `tf-btn--${variant}`,
    `tf-btn--${size}`,
    block && 'tf-btn--block',
    className,
  )
  const content = (
    <>
      {leading && <span className="tf-btn__affix">{leading}</span>}
      <span className="tf-btn__label">{children}</span>
      {trailing && <span className="tf-btn__affix">{trailing}</span>}
    </>
  )

  if (as === 'a') {
    return (
      <a className={classes} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {content}
      </a>
    )
  }

  const { type = 'button', ...buttonRest } = rest as ButtonHTMLAttributes<HTMLButtonElement>
  return (
    <button type={type} className={classes} {...buttonRest}>
      {content}
    </button>
  )
}
