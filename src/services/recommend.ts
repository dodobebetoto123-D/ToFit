/**
 * 코디 추천 엔진.
 *
 * 기획서의 추천 우선순위를 그대로 구현한다.
 *   기상 데이터 → 계절/레이어링 조정
 *   TPO → 격식 수준 매칭
 *   내 옷장 아이템 우선 조합 + 부족 시 브랜드 상품 보완
 *
 * 서버 AI 모델이 붙기 전까지 쓰는 규칙 기반 스코어러다.
 * 인터페이스(`recommendCoordinate`)는 그대로 두고 내부만 교체하면 된다.
 */
import type {
  ClothingItem,
  Coordinate,
  CoordinateSlot,
  MajorCategory,
  MinorCategory,
  Season,
  Situation,
  StyleTag,
  UserProfile,
  WeatherSnapshot,
} from '@/types'
import { minorCategoryLabel, personalColorPalette, situationLabel } from '@/lib/labels'
import { hashString } from '@/lib/utils'

/**
 * 브랜드 + 카테고리로 실제 무신사 검색결과 페이지를 연결한다.
 * 상품명(name)은 실사용자가 지어낸 예시 이름이라 검색어에 넣으면 일치하는 실제 상품이 없다.
 * 브랜드명 + 카테고리(예: "COS 재킷")로만 검색해야 실제로 존재하는 상품이 나온다.
 */
export function buildBrandSearchUrl(brand: string, minorCategory: MinorCategory): string {
  const keyword = `${brand} ${minorCategoryLabel[minorCategory]}`.trim()
  return `https://www.musinsa.com/search/goods?keyword=${encodeURIComponent(keyword)}`
}

/**
 * 실시간 가격 API가 없어 할인율은 추정치다 — 아이템별로 안정적인 값이 나오도록
 * 이름을 해시해 5~30% 사이로 결정한다. UI에는 항상 "추정 할인율"로 표기한다.
 */
export function estimateDiscountRate(brand: string, name: string): number {
  const hash = Math.abs(hashString(`${brand}_${name}`))
  return 0.05 + (hash % 26) / 100
}

/** TPO별로 선호하는 스타일 태그와 격식 수준(0 캐주얼 ~ 1 포멀) */
const SITUATION_PROFILE: Record<Situation, { styles: StyleTag[]; formality: number }> = {
  DAILY: { styles: ['CASUAL', 'MINIMAL'], formality: 0.2 },
  CAMPUS: { styles: ['CASUAL', 'AMEKAJI', 'MINIMAL'], formality: 0.3 },
  OFFICE: { styles: ['MINIMAL', 'CLASSIC', 'CHIC'], formality: 0.75 },
  DATE: { styles: ['LOVELY', 'CHIC', 'MINIMAL'], formality: 0.55 },
  TRAVEL: { styles: ['CASUAL', 'SPORTY', 'AMEKAJI'], formality: 0.15 },
  WORKOUT: { styles: ['SPORTY'], formality: 0.05 },
  PARTY: { styles: ['CHIC', 'STREET', 'LOVELY'], formality: 0.7 },
  WEDDING: { styles: ['CLASSIC', 'CHIC', 'MINIMAL'], formality: 0.95 },
}

/** 소분류별 격식 수준 */
const FORMALITY_BY_MINOR: Partial<Record<string, number>> = {
  T_SHIRT: 0.15,
  HOODIE: 0.1,
  SHIRT: 0.8,
  BLOUSE: 0.8,
  SWEATER: 0.5,
  CARDIGAN: 0.55,
  SLACKS: 0.85,
  DENIM: 0.25,
  SHORTS: 0.1,
  SKIRT: 0.6,
  COAT: 0.8,
  JACKET: 0.5,
  PADDING: 0.2,
  SNEAKERS: 0.25,
  BOOTS: 0.6,
  LOAFER: 0.85,
  TOTE_BAG: 0.6,
  BACKPACK: 0.25,
  CAP: 0.1,
  MUFFLER: 0.5,
}

/** 기온 → 계절 */
export function seasonForTemperature(temperature: number): Season {
  if (temperature >= 23) return 'SUMMER'
  if (temperature >= 17) return 'SPRING'
  if (temperature >= 9) return 'AUTUMN'
  return 'WINTER'
}

/** 기온 → 권장 두께 점수 (THIN 0 · MEDIUM 0.5 · THICK 1) */
function idealThickness(temperature: number): number {
  if (temperature >= 24) return 0
  if (temperature >= 18) return 0.3
  if (temperature >= 12) return 0.55
  if (temperature >= 5) return 0.8
  return 1
}

const THICKNESS_VALUE = { THIN: 0, MEDIUM: 0.5, THICK: 1 } as const

/** 두 HEX 색의 거리(0~1). 퍼스널 컬러 팔레트와의 근접도 계산에 쓴다. */
function colorDistance(a: string, b: string): number {
  const parse = (hex: string) => {
    const h = hex.replace('#', '')
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ] as const
  }
  const [r1, g1, b1] = parse(a)
  const [r2, g2, b2] = parse(b)
  const d = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
  return Math.min(1, d / 441.67) // √(255²×3)
}

/** 퍼스널 컬러 팔레트와 가장 가까운 거리 → 점수(1이 가장 잘 맞음) */
function personalColorScore(itemColor: string, palette: string[]): number {
  const nearest = Math.min(...palette.map((p) => colorDistance(itemColor, p)))
  return 1 - nearest
}

/** 최근 착용일수록 감점 — "3일 전 착용" 중복 방지 */
function recencyPenalty(lastWornAt: string | undefined): number {
  if (!lastWornAt) return 0
  const days = (Date.now() - new Date(lastWornAt).getTime()) / (24 * 60 * 60 * 1000)
  if (days < 1) return 1.0
  if (days < 3) return 0.6
  if (days < 7) return 0.3
  if (days < 14) return 0.1
  return 0
}

export interface ScoreBreakdown {
  item: ClothingItem
  total: number
  weather: number
  formality: number
  style: number
  color: number
  penalty: number
}

/** 아이템 하나에 대한 점수를 계산한다. */
export function scoreItem(
  item: ClothingItem,
  options: {
    weather: WeatherSnapshot
    situation: Situation
    profile: UserProfile
    excludeItemIds?: Set<string>
  },
): ScoreBreakdown {
  const { weather, situation, profile } = options
  const season = seasonForTemperature(weather.feelsLike)
  const situationProfile = SITUATION_PROFILE[situation]

  // ① 기상 — 계절 적합 + 두께 적합
  const seasonMatch = item.seasons.includes(season) ? 1 : 0.25
  const thicknessGap = Math.abs(
    THICKNESS_VALUE[item.thickness] - idealThickness(weather.feelsLike),
  )
  const weatherScore = seasonMatch * 0.6 + (1 - thicknessGap) * 0.4

  // ② TPO — 격식 수준 매칭
  const itemFormality = FORMALITY_BY_MINOR[item.minorCategory] ?? 0.5
  const formalityScore = 1 - Math.abs(itemFormality - situationProfile.formality)

  // ③ 스타일 태그 — 상황 선호 + 사용자 선호
  const situationStyleMatch = situationProfile.styles.includes(item.style) ? 1 : 0.35
  const userStyleMatch = profile.preferredStyles.includes(item.style) ? 1 : 0.5
  const styleScore = situationStyleMatch * 0.6 + userStyleMatch * 0.4

  // ④ 퍼스널 컬러
  const colorScore = personalColorScore(item.color, personalColorPalette[profile.personalColor])

  // ⑤ 감점 — 최근 착용 / 제외 목록
  const excluded = options.excludeItemIds?.has(item.id) ? 1 : 0
  const penalty = recencyPenalty(item.lastWornAt) * 0.5 + excluded

  // 자주 입는 옷에는 소폭 가산
  const preferredBonus = item.isPreferred ? 0.08 : 0

  const total =
    weatherScore * 0.32 +
    formalityScore * 0.26 +
    styleScore * 0.22 +
    colorScore * 0.2 +
    preferredBonus -
    penalty

  return {
    item,
    total,
    weather: weatherScore,
    formality: formalityScore,
    style: styleScore,
    color: colorScore,
    penalty,
  }
}

/** 코디에 채울 칸 구성. 기온에 따라 아우터 포함 여부가 달라진다. */
function requiredCategories(feelsLike: number): MajorCategory[] {
  const base: MajorCategory[] = ['TOP', 'BOTTOM', 'SHOES', 'BAG']
  if (feelsLike < 20) return ['TOP', 'BOTTOM', 'OUTER', 'SHOES', 'BAG']
  return base
}

/**
 * 옷장에 해당 카테고리가 없을 때 제안할 브랜드 상품 (구매 추천).
 * TPO(situation)별로 다른 아이템을 제안한다 — 옷장이 비어 있으면 대부분의 칸이 이 표에서
 * 채워지는데, 예전엔 상황과 무관한 고정값 하나뿐이라 TPO를 바꿔도 코디가 그대로였다.
 */
const BRAND_FALLBACK: Record<
  Situation,
  Partial<Record<MajorCategory, Omit<CoordinateSlot, 'id' | 'majorCategory'>>>
> = {
  DAILY: {
    TOP: { minorCategory: 'T_SHIRT', name: '에어리즘 반팔티', brand: 'UNIQLO', color: '#f2f2f0', colorName: '화이트', price: 19900, source: 'BRAND' },
    BOTTOM: { minorCategory: 'DENIM', name: '와이드 스트레이트 데님', brand: "LEVI'S", color: '#8ba6cc', colorName: '라이트 블루', price: 89000, source: 'BRAND' },
    SHOES: { minorCategory: 'SNEAKERS', name: '캔버스 스니커즈', brand: 'CONVERSE', color: '#f2f2f0', colorName: '화이트', price: 69000, source: 'BRAND' },
    BAG: { minorCategory: 'TOTE_BAG', name: '캔버스 에코백', brand: 'MARHEN.J', color: '#d9b98c', colorName: '카멜', price: 39000, source: 'BRAND' },
  },
  CAMPUS: {
    TOP: { minorCategory: 'HOODIE', name: '오버핏 후디', brand: 'MUSINSA STANDARD', color: '#b8b8b6', colorName: '멜란지 그레이', price: 45900, source: 'BRAND' },
    BOTTOM: { minorCategory: 'DENIM', name: '스트레이트 데님', brand: 'UNIQLO', color: '#2f3e56', colorName: '진청', price: 49900, source: 'BRAND' },
    OUTER: { minorCategory: 'JACKET', name: '바시티 재킷', brand: 'NEW BALANCE', color: '#26262a', colorName: '블랙', price: 99000, source: 'BRAND' },
    SHOES: { minorCategory: 'SNEAKERS', name: '레트로 러닝화', brand: 'NEW BALANCE', color: '#c8b596', colorName: '베이지', price: 129000, source: 'BRAND' },
    BAG: { minorCategory: 'BACKPACK', name: '클래식 백팩', brand: 'HERSCHEL', color: '#1f2230', colorName: '블랙', price: 89000, source: 'BRAND' },
  },
  OFFICE: {
    TOP: { minorCategory: 'SWEATER', name: '베이직 크루넥 니트', brand: 'MARHEN.J', color: '#efe6d6', colorName: '크림', price: 68000, source: 'BRAND' },
    BOTTOM: { minorCategory: 'SLACKS', name: '테이퍼드 슬랙스', brand: 'MUSINSA STANDARD', color: '#b8b8b6', colorName: '라이트 그레이', price: 49900, source: 'BRAND' },
    OUTER: { minorCategory: 'JACKET', name: '오버핏 블레이저', brand: 'COS', color: '#2f3e56', colorName: '네이비', price: 189000, source: 'BRAND' },
    SHOES: { minorCategory: 'LOAFER', name: '클래식 로퍼', brand: 'CLARKS', color: '#8b6b4a', colorName: '브라운', price: 139000, source: 'BRAND' },
    BAG: { minorCategory: 'TOTE_BAG', name: '마멀레이드 토트백', brand: 'MARHEN.J', color: '#d9b98c', colorName: '카멜', price: 79000, source: 'BRAND' },
  },
  DATE: {
    TOP: { minorCategory: 'BLOUSE', name: '실크 블라우스', brand: 'ZARA', color: '#efe6d6', colorName: '아이보리', price: 59900, source: 'BRAND' },
    BOTTOM: { minorCategory: 'SKIRT', name: '플리츠 미디 스커트', brand: 'MUSINSA STANDARD', color: '#3b3b40', colorName: '차콜', price: 45000, source: 'BRAND' },
    OUTER: { minorCategory: 'COAT', name: '트렌치 코트', brand: 'COS', color: '#c8b596', colorName: '베이지', price: 259000, source: 'BRAND' },
    SHOES: { minorCategory: 'LOAFER', name: '미들굽 로퍼', brand: 'ZARA', color: '#26262a', colorName: '블랙', price: 79900, source: 'BRAND' },
    BAG: { minorCategory: 'TOTE_BAG', name: '미니 숄더백', brand: 'CHARLES & KEITH', color: '#a0b1f5', colorName: '라벤더', price: 69000, source: 'BRAND' },
  },
  TRAVEL: {
    TOP: { minorCategory: 'T_SHIRT', name: '에어리즘 반팔티', brand: 'UNIQLO', color: '#b9cbe8', colorName: '스카이 블루', price: 19900, source: 'BRAND' },
    BOTTOM: { minorCategory: 'SHORTS', name: '트레이닝 조거 반바지', brand: 'ADIDAS', color: '#1f2230', colorName: '블랙', price: 55000, source: 'BRAND' },
    OUTER: { minorCategory: 'JACKET', name: '경량 바람막이', brand: 'NIKE', color: '#c65f5f', colorName: '레드', price: 89000, source: 'BRAND' },
    SHOES: { minorCategory: 'SNEAKERS', name: '쿠셔닝 러닝화', brand: 'NIKE', color: '#f2f2f0', colorName: '화이트', price: 139000, source: 'BRAND' },
    BAG: { minorCategory: 'BACKPACK', name: '트래블 백팩', brand: 'THE NORTH FACE', color: '#2f3e56', colorName: '네이비', price: 119000, source: 'BRAND' },
  },
  WORKOUT: {
    TOP: { minorCategory: 'T_SHIRT', name: '드라이핏 반팔티', brand: 'NIKE', color: '#1f2230', colorName: '블랙', price: 39000, source: 'BRAND' },
    BOTTOM: { minorCategory: 'SHORTS', name: '트레이닝 조거 팬츠', brand: 'ADIDAS', color: '#6f7076', colorName: '그레이', price: 59000, source: 'BRAND' },
    OUTER: { minorCategory: 'JACKET', name: '윈드브레이커', brand: 'NIKE', color: '#26262a', colorName: '블랙', price: 99000, source: 'BRAND' },
    SHOES: { minorCategory: 'SNEAKERS', name: '러닝화', brand: 'ADIDAS', color: '#f2f2f0', colorName: '화이트', price: 119000, source: 'BRAND' },
    BAG: { minorCategory: 'BACKPACK', name: '스포츠 백팩', brand: 'NIKE', color: '#1f2230', colorName: '블랙', price: 59000, source: 'BRAND' },
  },
  PARTY: {
    TOP: { minorCategory: 'SHIRT', name: '새틴 셔츠', brand: 'ZARA', color: '#1c1c1f', colorName: '블랙', price: 49900, source: 'BRAND' },
    BOTTOM: { minorCategory: 'SLACKS', name: '슬림 슬랙스', brand: 'MUSINSA STANDARD', color: '#1c1c1f', colorName: '블랙', price: 55000, source: 'BRAND' },
    OUTER: { minorCategory: 'JACKET', name: '레더 재킷', brand: 'ZARA', color: '#26262a', colorName: '블랙', price: 159000, source: 'BRAND' },
    SHOES: { minorCategory: 'BOOTS', name: '첼시 부츠', brand: 'DR. MARTENS', color: '#26262a', colorName: '블랙', price: 259000, source: 'BRAND' },
    BAG: { minorCategory: 'TOTE_BAG', name: '클러치백', brand: 'CHARLES & KEITH', color: '#1c1c1f', colorName: '블랙', price: 59000, source: 'BRAND' },
  },
  WEDDING: {
    TOP: { minorCategory: 'SHIRT', name: '베이직 셔츠', brand: 'COS', color: '#f2f2f0', colorName: '화이트', price: 79000, source: 'BRAND' },
    BOTTOM: { minorCategory: 'SLACKS', name: '슬랙스', brand: 'MUSINSA STANDARD', color: '#1c1c1f', colorName: '블랙', price: 55000, source: 'BRAND' },
    OUTER: { minorCategory: 'JACKET', name: '테일러드 재킷', brand: 'ZARA', color: '#1f2230', colorName: '네이비', price: 179000, source: 'BRAND' },
    SHOES: { minorCategory: 'LOAFER', name: '더비 슈즈', brand: 'CLARKS', color: '#1c1c1f', colorName: '블랙', price: 149000, source: 'BRAND' },
    BAG: { minorCategory: 'TOTE_BAG', name: '미니 숄더백', brand: 'MARHEN.J', color: '#1c1c1f', colorName: '블랙', price: 89000, source: 'BRAND' },
  },
}

export interface RecommendOptions {
  closet: ClothingItem[]
  profile: UserProfile
  weather: WeatherSnapshot
  situation: Situation
  /** 옷장 아이템만 사용 (브랜드 상품 보완 끄기) */
  closetOnly?: boolean
  /** "다시 추천" 시 직전 조합을 피하기 위해 넘긴다 */
  excludeItemIds?: string[]
}

export interface RecommendResult {
  coordinate: Coordinate
  /** 추천 근거 — 상세 보기에 노출 */
  breakdown: ScoreBreakdown[]
  /** 옷장에 없어서 브랜드 상품으로 채운 카테고리 */
  filledByBrand: MajorCategory[]
}

/**
 * 옷장·날씨·TPO를 종합해 코디 하나를 만든다.
 * 김철수 인터뷰 요구사항대로 **선택지를 여러 개 주지 않고 정답 하나**만 낸다.
 */
export function recommendCoordinate(options: RecommendOptions): RecommendResult {
  const { closet, profile, weather, situation, closetOnly = false } = options
  const excludeItemIds = new Set(options.excludeItemIds ?? [])

  const categories = requiredCategories(weather.feelsLike)
  const slots: CoordinateSlot[] = []
  const breakdown: ScoreBreakdown[] = []
  const filledByBrand: MajorCategory[] = []

  for (const category of categories) {
    const candidates = closet
      .filter((item) => item.majorCategory === category)
      .map((item) => scoreItem(item, { weather, situation, profile, excludeItemIds }))
      .sort((a, b) => b.total - a.total)

    const best = candidates[0]

    if (best && best.total > 0) {
      breakdown.push(best)
      slots.push({
        id: `slot_${best.item.id}`,
        majorCategory: category,
        minorCategory: best.item.minorCategory,
        clothingItemId: best.item.id,
        name: best.item.name,
        brand: best.item.brand,
        color: best.item.color,
        colorName: best.item.colorName,
        source: 'CLOSET',
      })
      continue
    }

    if (closetOnly) continue

    const fallback = BRAND_FALLBACK[situation]?.[category]
    if (fallback) {
      filledByBrand.push(category)
      slots.push({
        id: `slot_brand_${category}`,
        majorCategory: category,
        ...fallback,
        discountRate: estimateDiscountRate(fallback.brand, fallback.name),
        searchUrl: buildBrandSearchUrl(fallback.brand, fallback.minorCategory),
      })
    }
  }

  const coordinate: Coordinate = {
    id: `coord_${situation}_${Math.round(weather.feelsLike)}_${slots.map((s) => s.id).join('-')}`,
    styleName: buildStyleName(situation, weather),
    situation,
    minTemperature: weather.temperatureLow,
    maxTemperature: weather.temperatureHigh,
    colorPalette: slots.map((slot) => slot.color),
    slots,
    reason: buildReason({ profile, weather, situation, breakdown, filledByBrand }),
    mascotComment: buildMascotComment(slots, weather),
    bodyShapeCompatibility: { [profile.bodyShape]: 0.9 },
    isGoodCoord: true,
    createdAt: new Date().toISOString(),
  }

  return { coordinate, breakdown, filledByBrand }
}

/* ─── 문구 생성 ───────────────────────────────────────────── */

function buildStyleName(situation: Situation, weather: WeatherSnapshot): string {
  const season = seasonForTemperature(weather.feelsLike)
  const seasonWord = { SPRING: '봄', SUMMER: '여름', AUTUMN: '가을', WINTER: '겨울' }[season]
  const tone: Record<Situation, string> = {
    DAILY: '편안한 데일리룩',
    CAMPUS: '가벼운 캠퍼스룩',
    OFFICE: '단정한 오피스룩',
    DATE: '분위기 있는 데이트룩',
    TRAVEL: '많이 걷는 여행룩',
    WORKOUT: '활동적인 운동복',
    PARTY: '힘준 파티룩',
    WEDDING: '격식 있는 경조사룩',
  }
  return `${seasonWord} ${tone[situation]}`
}

function buildReason(input: {
  profile: UserProfile
  weather: WeatherSnapshot
  situation: Situation
  breakdown: ScoreBreakdown[]
  filledByBrand: MajorCategory[]
}): string {
  const { profile, weather, situation, breakdown, filledByBrand } = input
  const parts: string[] = []

  parts.push(
    `최고 ${weather.temperatureHigh}℃ / 최저 ${weather.temperatureLow}℃, 체감 ${weather.feelsLike}℃라 ${
      weather.feelsLike < 12 ? '보온을 먼저 챙겼어요' : weather.feelsLike < 20 ? '가벼운 겉옷 한 겹이면 충분해요' : '얇게 입어도 괜찮아요'
    }.`,
  )

  if (weather.precipitationChance >= 40) {
    parts.push(`강수확률이 ${weather.precipitationChance}%라 젖어도 티가 덜 나는 색으로 골랐어요.`)
  }

  const bestColor = [...breakdown].sort((a, b) => b.color - a.color)[0]
  if (bestColor) {
    const toneWord = profile.personalColor.includes('WARM') ? '웜톤' : '쿨톤'
    parts.push(
      `${toneWord}인 ${profile.nickname}님께는 ${bestColor.item.colorName} 같은 색이 잘 받아서 ${minorCategoryLabel[bestColor.item.minorCategory]}로 중심을 잡았어요.`,
    )
  }

  parts.push(`${situationLabel[situation]} 상황에 맞춰 격식을 조정했어요.`)

  const recentlyWorn = breakdown.find((b) => b.penalty > 0.2)
  if (recentlyWorn) {
    parts.push(
      `${recentlyWorn.item.name}은 최근에 입으셨지만 오늘 조건에 가장 잘 맞아 그대로 뒀어요.`,
    )
  }

  if (filledByBrand.length > 0) {
    parts.push('옷장에 없는 칸은 어울리는 브랜드 상품으로 채웠어요.')
  }

  return parts.join(' ')
}

function buildMascotComment(slots: CoordinateSlot[], weather: WeatherSnapshot): string {
  const top = slots.find((s) => s.majorCategory === 'TOP')
  const bottom = slots.find((s) => s.majorCategory === 'BOTTOM')

  if (weather.precipitationChance >= 60) {
    return '오늘 비 온대요! 밑단 짧은 걸로 골랐어요 ☔'
  }
  if (weather.feelsLike < 8) {
    return '오늘 많이 추워요. 따뜻하게 입고 나가요! 🧣'
  }
  if (top && bottom) {
    return `${top.colorName} ${minorCategoryLabel[top.minorCategory]}에 ${bottom.colorName} ${minorCategoryLabel[bottom.minorCategory]}, 오늘은 이거예요! 💙`
  }
  return '오늘은 이거 어때요? 💙'
}
