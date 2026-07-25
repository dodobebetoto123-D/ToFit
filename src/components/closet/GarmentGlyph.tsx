/**
 * 옷 일러스트 — 실제 상품 사진이 연결되기 전까지 쓰는 SVG 실루엣.
 * 소분류별 형태에 아이템의 실제 색을 입혀 옷장에서 색 조합을 눈으로 확인할 수 있게 한다.
 *
 * 사진(photoUrl)이 있으면 호출부에서 <img>를 쓰고, 없을 때만 이 컴포넌트를 쓴다.
 */
import type { MinorCategory } from '@/types'
import { outlineFor } from '@/lib/utils'

interface GarmentGlyphProps {
  category: MinorCategory
  color: string
  className?: string
}

/** 소분류별 path 정의. viewBox 는 전부 0 0 80 88 로 통일한다. */
const SHAPES: Record<MinorCategory, { fill: string; detail?: string }> = {
  T_SHIRT: {
    fill: 'M29 11 40 16 51 11 68 19 72 35 60 39 60 76a2 2 0 0 1-2 2H22a2 2 0 0 1-2-2V39L8 35l4-16Z',
    detail: 'M33 12q7 7 14 0',
  },
  SHIRT: {
    fill: 'M29 11 40 16 51 11 68 19 72 35 60 39 60 76a2 2 0 0 1-2 2H22a2 2 0 0 1-2-2V39L8 35l4-16Z',
    detail: 'M33 11 40 22 47 11M40 22v56M20 39v39M60 39v39',
  },
  BLOUSE: {
    fill: 'M29 11 40 16 51 11 68 19 72 35 60 39 58 76a2 2 0 0 1-2 2H24a2 2 0 0 1-2-2L20 39 8 35l4-16Z',
    detail: 'M34 12 40 21 46 12M40 21v57',
  },
  SWEATER: {
    fill: 'M27 12 40 18 53 12 70 21 74 51 63 54 63 76a2 2 0 0 1-2 2H19a2 2 0 0 1-2-2V54L6 51l4-30Z',
    detail: 'M28 13q12 8 24 0M17 70h46M40 24v54',
  },
  HOODIE: {
    fill: 'M27 12 40 18 53 12 70 21 74 51 63 54 63 76a2 2 0 0 1-2 2H19a2 2 0 0 1-2-2V54L6 51l4-30Z',
    detail: 'M28 14q12 16 24 0M40 30v10M17 68h46',
  },
  CARDIGAN: {
    fill: 'M27 12 40 17 53 12 70 21 74 51 63 54 63 76a2 2 0 0 1-2 2H19a2 2 0 0 1-2-2V54L6 51l4-30Z',
    detail: 'M40 17v61M34 30h.01M34 42h.01M34 54h.01M34 66h.01',
  },
  COAT: {
    fill: 'M27 12 40 19 53 12 70 21 75 48 66 51 66 82H14V51L5 48l5-27Z',
    detail: 'M33 13 40 27 47 13M40 27v55M14 58h52',
  },
  JACKET: {
    fill: 'M28 12 40 20 52 12 69 21 73 46 64 49 64 72a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2V49L7 46l5-25Z',
    detail: 'M32 13 40 28 48 13M40 28v46',
  },
  PADDING: {
    fill: 'M27 13 40 19 53 13 71 22 75 52 65 55 65 78a2 2 0 0 1-2 2H17a2 2 0 0 1-2-2V55L5 52l4-30Z',
    detail: 'M15 34h50M15 46h50M15 58h50M15 70h50',
  },
  SLACKS: {
    fill: 'M20 8h40l-2 22-4 52H42l-2-36-2 36H26l-4-52Z',
    detail: 'M20 16h40M40 30v52',
  },
  DENIM: {
    fill: 'M19 8h42l-2 22-4 52H42l-2-36-2 36H27l-4-52Z',
    detail: 'M19 17h42M40 30v52M26 20q4 4 8 1M54 20q-4 4-8 1',
  },
  SKIRT: {
    fill: 'M23 12h34l10 60q-27 8-54 0Z',
    detail: 'M23 22h34M34 24 30 74M46 24l4 50',
  },
  SHORTS: {
    fill: 'M20 12h40l-2 18-3 30H42l-2-22-2 22H25l-3-30Z',
    detail: 'M20 20h40M40 30v30',
  },
  SNEAKERS: {
    fill: 'M10 58q0-16 13-16h11l13 12 19 4q7 1 7 8v4a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2Z',
    detail: 'M10 64h61M26 44v12M34 46v10',
  },
  BOOTS: {
    fill: 'M24 12h26v42l14 13q4 4-1 5H27a3 3 0 0 1-3-3Z',
    detail: 'M24 54h26M24 64h39M30 20h14M30 30h14',
  },
  LOAFER: {
    fill: 'M12 56q0-12 12-12h12l14 8 16 3q6 1 6 6v3a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2Z',
    detail: 'M12 62h60M30 48h14',
  },
  TOTE_BAG: {
    fill: 'M18 30h44l5 46H13Z',
    detail: 'M29 30q0-16 11-16t11 16',
  },
  BACKPACK: {
    fill: 'M18 30a14 14 0 0 1 14-14h16a14 14 0 0 1 14 14v42a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4Z',
    detail: 'M18 48h44M34 16v-4h12v4M32 56h16',
  },
  CAP: {
    fill: 'M12 52q0-30 28-30t28 30q0 3-4 3H16q-4 0-4-3Z',
    detail: 'M40 22v33M22 40q18-10 36 0',
  },
  MUFFLER: {
    fill: 'M18 12h16v40q0 10-8 10t-8-10Zm28 0h16v52q0 10-8 10t-8-10Z',
    detail: 'M18 24h16M46 24h16M18 40h16M46 40h16',
  },
}

export function GarmentGlyph({ category, color, className }: GarmentGlyphProps) {
  const shape = SHAPES[category]
  const stroke = outlineFor(color)

  return (
    <svg
      viewBox="0 0 80 88"
      className={['tf-glyph', className].filter(Boolean).join(' ')}
      role="presentation"
      aria-hidden="true"
    >
      <path d={shape.fill} fill={color} stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
      {shape.detail && (
        <path
          d={shape.detail}
          fill="none"
          stroke={stroke}
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.55"
        />
      )}
    </svg>
  )
}
