import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** 헤더 좌측 제목 */
  title?: ReactNode
  /** 제목 앞 아이콘/이모지 */
  icon?: ReactNode
  /** 헤더 우측 영역 (탭·더보기 등) */
  action?: ReactNode
  /** 본문 패딩 제거 — 리스트를 카드 끝까지 붙일 때 */
  flush?: boolean
  as?: 'section' | 'article' | 'div'
}

export function Card({
  title,
  icon,
  action,
  flush = false,
  as: Tag = 'section',
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Tag className={cn('tf-card', className)} {...rest}>
      {(title || action) && (
        <header className="tf-card__head">
          <h2 className="tf-card__title">
            {icon && <span className="tf-card__icon">{icon}</span>}
            {title}
          </h2>
          {action && <div className="tf-card__action">{action}</div>}
        </header>
      )}
      <div className={cn('tf-card__body', flush && 'tf-card__body--flush')}>{children}</div>
    </Tag>
  )
}
