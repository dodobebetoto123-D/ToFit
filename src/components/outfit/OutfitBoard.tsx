/**
 * 추천 코디 한 벌을 펼쳐 보여주는 보드.
 * 상의/하의는 크게, 소품은 우측에 작게 — 시안의 배치를 그대로 따른다.
 */
import { GarmentGlyph } from '@/components/closet/GarmentGlyph'
import { majorCategoryLabel } from '@/lib/labels'
import { formatPrice } from '@/lib/utils'
import type { Coordinate, CoordinateSlot } from '@/types'

const HERO_CATEGORIES = new Set(['TOP', 'BOTTOM', 'OUTER'])

function SlotBadge({ slot }: { slot: CoordinateSlot }) {
  return slot.source === 'CLOSET' ? (
    <span className="tf-slot__badge tf-slot__badge--closet">내 옷장</span>
  ) : (
    <span className="tf-slot__badge tf-slot__badge--brand">추천</span>
  )
}

function SlotArt({ slot }: { slot: CoordinateSlot }) {
  return slot.photoUrl ? (
    <img src={slot.photoUrl} alt={slot.name} className="tf-slot__photo" />
  ) : (
    <GarmentGlyph category={slot.minorCategory} color={slot.color} />
  )
}

function HeroSlot({ slot }: { slot: CoordinateSlot }) {
  return (
    <figure className="tf-slot tf-slot--hero">
      <div className="tf-slot__art">
        <SlotArt slot={slot} />
      </div>
      <figcaption className="tf-slot__caption">
        <span className="tf-slot__name tf-truncate">{slot.name}</span>
        <SlotBadge slot={slot} />
      </figcaption>
    </figure>
  )
}

function SideSlot({ slot }: { slot: CoordinateSlot }) {
  return (
    <figure className="tf-slot tf-slot--side">
      <div className="tf-slot__art">
        <SlotArt slot={slot} />
      </div>
      <figcaption className="tf-slot__caption tf-slot__caption--stack">
        <span className="tf-slot__brand tf-truncate">{slot.brand}</span>
        <span className="tf-slot__name tf-truncate">{slot.name}</span>
        {slot.price !== undefined ? (
          <span className="tf-slot__price">{formatPrice(slot.price)}</span>
        ) : (
          <span className="tf-micro">{majorCategoryLabel[slot.majorCategory]}</span>
        )}
        <SlotBadge slot={slot} />
      </figcaption>
    </figure>
  )
}

export function OutfitBoard({ coordinate }: { coordinate: Coordinate }) {
  const heroSlots = coordinate.slots.filter((slot) => HERO_CATEGORIES.has(slot.majorCategory))
  const sideSlots = coordinate.slots.filter((slot) => !HERO_CATEGORIES.has(slot.majorCategory))

  return (
    <div className="tf-outfitboard">
      <div className="tf-outfitboard__hero tf-stagger">
        {heroSlots.map((slot) => (
          <HeroSlot key={slot.id} slot={slot} />
        ))}
      </div>
      {sideSlots.length > 0 && (
        <div className="tf-outfitboard__side tf-stagger">
          {sideSlots.map((slot) => (
            <SideSlot key={slot.id} slot={slot} />
          ))}
        </div>
      )}
    </div>
  )
}
