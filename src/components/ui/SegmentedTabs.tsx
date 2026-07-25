import { cn } from '@/lib/utils'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  /** 라벨 앞 이모지/아이콘 */
  icon?: string
}

interface SegmentedTabsProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  /** pill: 알약형 낱개 버튼 / track: 회색 트랙 안의 세그먼트 */
  variant?: 'pill' | 'track'
  ariaLabel: string
  className?: string
}

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  variant = 'pill',
  ariaLabel,
  className,
}: SegmentedTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('tf-segmented', `tf-segmented--${variant}`, `tf-segmented--${size}`, className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          className={cn('tf-segmented__item', option.value === value && 'is-selected')}
          onClick={() => onChange(option.value)}
        >
          {option.icon && <span className="tf-segmented__icon">{option.icon}</span>}
          {option.label}
        </button>
      ))}
    </div>
  )
}
