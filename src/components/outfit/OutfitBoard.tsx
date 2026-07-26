/**
 * 추천 코디 한 벌을 펼쳐 보여주는 보드.
 * 상의/하의는 크게, 소품은 우측에 작게 — 시안의 배치를 그대로 따른다.
 *
 * 슬롯을 누르면 출처에 따라 다른 곳으로 간다.
 *  - 내 옷장 아이템: 그 옷의 옷장 상세화면
 *  - 브랜드 추천 아이템: 무신사 검색결과 (새 탭)
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GarmentGlyph } from '@/components/closet/GarmentGlyph'
import { Icon } from '@/components/ui/Icon'
import { ImageViewer, type ViewerImage } from '@/components/ui/ImageViewer'
import { useAuth } from '@/hooks/useAuth'
import { majorCategoryLabel } from '@/lib/labels'
import { formatPrice } from '@/lib/utils'
import { trackRecentlyViewed } from '@/services/firestoreRecentlyViewed'
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

/** 브랜드 추천 아이템을 눌렀을 때 "최근 본 상품"에도 남긴다 */
function useTrackBrandClick() {
  const { user } = useAuth()
  return (slot: CoordinateSlot) => {
    if (!user || !slot.searchUrl || slot.price === undefined) return
    void trackRecentlyViewed(user.id, {
      name: slot.name,
      brand: slot.brand,
      color: slot.color,
      colorName: slot.colorName,
      majorCategory: slot.majorCategory,
      minorCategory: slot.minorCategory,
      price: slot.price,
      discountRate: slot.discountRate,
      searchUrl: slot.searchUrl,
    })
  }
}

/**
 * 출처에 맞는 이동 경로를 가진 버튼/링크로 감싼다. 갈 곳이 없으면 그냥 div.
 * 실제 사진이 있는 슬롯에는 확대 보기 버튼을 따로 겹쳐 올린다 — 기본 클릭은
 * 이동(옷장 상세 / 무신사)이라 확대는 별도 진입점이 있어야 한다.
 */
function SlotArtBox({ slot, onZoom }: { slot: CoordinateSlot; onZoom?: () => void }) {
  const navigate = useNavigate()
  const trackBrandClick = useTrackBrandClick()

  const zoomButton = onZoom ? (
    <button
      type="button"
      className="tf-zoombtn"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onZoom()
      }}
      aria-label={`${slot.name} 큰 이미지 보기`}
    >
      <Icon name="search" size={15} />
    </button>
  ) : null

  if (slot.clothingItemId) {
    return (
      <div className="tf-slot__artwrap">
        <button
          type="button"
          className="tf-slot__art tf-slot__art--clickable"
          onClick={() => navigate(`/closet?item=${slot.clothingItemId}`)}
          aria-label={`${slot.name} 옷장 상세보기`}
        >
          <SlotArt slot={slot} />
        </button>
        {zoomButton}
      </div>
    )
  }

  if (slot.searchUrl) {
    return (
      <div className="tf-slot__artwrap">
        <a
          className="tf-slot__art tf-slot__art--clickable tf-slot__art--external"
          href={slot.searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackBrandClick(slot)}
          aria-label={`${slot.name} 무신사에서 보기 (새 창)`}
        >
          <SlotArt slot={slot} />
          <span className="tf-slot__shoplabel">
            <Icon name="search" size={12} />
            무신사
          </span>
        </a>
        {zoomButton}
      </div>
    )
  }

  return (
    <div className="tf-slot__artwrap">
      <div className="tf-slot__art">
        <SlotArt slot={slot} />
      </div>
      {zoomButton}
    </div>
  )
}

/** 이름 줄도 같은 곳으로 이동할 수 있게 — 이미지만 눌리면 링크가 있는 줄 모른다 */
function SlotName({ slot, className }: { slot: CoordinateSlot; className: string }) {
  const trackBrandClick = useTrackBrandClick()

  if (!slot.searchUrl || slot.clothingItemId) {
    return <span className={className}>{slot.name}</span>
  }

  return (
    <a
      className={`${className} tf-slot__namelink`}
      href={slot.searchUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackBrandClick(slot)}
    >
      {slot.name}
    </a>
  )
}

function HeroSlot({ slot, onZoom }: { slot: CoordinateSlot; onZoom?: () => void }) {
  return (
    <figure className="tf-slot tf-slot--hero">
      <SlotArtBox slot={slot} onZoom={onZoom} />
      <figcaption className="tf-slot__caption">
        <SlotName slot={slot} className="tf-slot__name tf-truncate" />
        <SlotBadge slot={slot} />
      </figcaption>
    </figure>
  )
}

function SideSlot({ slot, onZoom }: { slot: CoordinateSlot; onZoom?: () => void }) {
  return (
    <figure className="tf-slot tf-slot--side">
      <SlotArtBox slot={slot} onZoom={onZoom} />
      <figcaption className="tf-slot__caption tf-slot__caption--stack">
        <span className="tf-slot__brand tf-truncate">{slot.brand}</span>
        <SlotName slot={slot} className="tf-slot__name tf-truncate" />
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

  // 실제 사진이 있는 슬롯만 확대 보기 대상 — 일러스트는 확대해도 의미가 없다.
  const photoSlots = coordinate.slots.filter((slot) => slot.photoUrl)
  const viewerImages: ViewerImage[] = photoSlots.map((slot) => ({
    src: slot.photoUrl as string,
    alt: slot.name,
    caption: `${slot.brand} · ${slot.name}`,
  }))
  const [zoomIndex, setZoomIndex] = useState<number | null>(null)

  const zoomHandlerFor = (slot: CoordinateSlot) => {
    if (!slot.photoUrl) return undefined
    const position = photoSlots.findIndex((candidate) => candidate.id === slot.id)
    return () => setZoomIndex(position < 0 ? 0 : position)
  }

  return (
    <div className="tf-outfitboard">
      <div className="tf-outfitboard__hero tf-stagger">
        {heroSlots.map((slot) => (
          <HeroSlot key={slot.id} slot={slot} onZoom={zoomHandlerFor(slot)} />
        ))}
      </div>
      {sideSlots.length > 0 && (
        <div className="tf-outfitboard__side tf-stagger">
          {sideSlots.map((slot) => (
            <SideSlot key={slot.id} slot={slot} onZoom={zoomHandlerFor(slot)} />
          ))}
        </div>
      )}

      <ImageViewer
        open={zoomIndex !== null}
        startIndex={zoomIndex ?? 0}
        images={viewerImages}
        onClose={() => setZoomIndex(null)}
      />
    </div>
  )
}
