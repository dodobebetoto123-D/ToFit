import { Icon } from '@/components/ui/Icon'
import { minorCategoryLabel } from '@/lib/labels'
import { cn, isLightColor } from '@/lib/utils'
import type { ClothingItem } from '@/types'
import { GarmentGlyph } from './GarmentGlyph'

interface ClothingCardProps {
  item: ClothingItem
  onTogglePreferred?: (id: string) => void
  onSelect?: (item: ClothingItem) => void
  /** compact: 홈 화면 옷장 요약처럼 좁은 칸에 쓰는 형태 */
  size?: 'compact' | 'default'
}

export function ClothingCard({
  item,
  onTogglePreferred,
  onSelect,
  size = 'default',
}: ClothingCardProps) {
  return (
    <article className={cn('tf-clothcard', size === 'compact' && 'tf-clothcard--compact')}>
      <button
        type="button"
        className="tf-clothcard__thumb"
        onClick={() => onSelect?.(item)}
        aria-label={`${item.name} 자세히 보기`}
      >
        <GarmentGlyph category={item.minorCategory} color={item.color} />
        {item.wearCount > 0 && (
          <span className="tf-clothcard__wear">{item.wearCount}회</span>
        )}
      </button>

      {onTogglePreferred && (
        <button
          type="button"
          className={cn('tf-clothcard__fav', item.isPreferred && 'is-on')}
          onClick={() => onTogglePreferred(item.id)}
          aria-label={item.isPreferred ? '자주 입는 옷 해제' : '자주 입는 옷으로 표시'}
          aria-pressed={item.isPreferred}
        >
          <Icon name={item.isPreferred ? 'heart-filled' : 'heart'} size={15} />
        </button>
      )}

      <div className="tf-clothcard__info">
        <p className="tf-clothcard__name tf-truncate">{item.name}</p>
        <p className="tf-clothcard__meta tf-truncate">
          <span
            className={cn('tf-swatch', isLightColor(item.color) && 'tf-swatch--light')}
            style={{ background: item.color }}
            aria-hidden="true"
          />
          {item.colorName} · {minorCategoryLabel[item.minorCategory]}
        </p>
      </div>
    </article>
  )
}
