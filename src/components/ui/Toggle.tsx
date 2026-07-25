import { cn } from '@/lib/utils'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  /** 라벨을 눈에만 숨기고 스크린리더에는 남긴다 */
  hideLabel?: boolean
  className?: string
}

export function Toggle({ checked, onChange, label, hideLabel = false, className }: ToggleProps) {
  return (
    <label className={cn('tf-toggle', className)}>
      <span className={hideLabel ? 'tf-sr-only' : 'tf-toggle__label'}>{label}</span>
      <input
        type="checkbox"
        className="tf-sr-only"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className={cn('tf-toggle__track', checked && 'is-on')} aria-hidden="true">
        <span className="tf-toggle__thumb" />
      </span>
    </label>
  )
}
