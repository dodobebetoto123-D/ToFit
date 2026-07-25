/**
 * ToFit 데이터 모델
 * 기획 문서 `3__데이터_구조__Data_Model_.md` 기준.
 *
 * tsconfig의 `erasableSyntaxOnly` 때문에 TypeScript enum은 쓸 수 없다.
 * 대신 `as const` 배열 + 유니온 타입으로 동일한 정합성을 얻는다.
 */

/* ─────────────────────────────────────────────────────────────
   공통
   ───────────────────────────────────────────────────────────── */

export const GENDERS = ['MALE', 'FEMALE', 'UNISEX'] as const
export type Gender = (typeof GENDERS)[number]

export const PERSONAL_COLORS = [
  'SPRING_WARM',
  'SUMMER_COOL',
  'AUTUMN_WARM',
  'WINTER_COOL',
] as const
export type PersonalColor = (typeof PERSONAL_COLORS)[number]

export const SEASONS = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'] as const
export type Season = (typeof SEASONS)[number]

export const BODY_SHAPES = ['STRAIGHT', 'WAVE', 'NATURAL'] as const
export type BodyShape = (typeof BODY_SHAPES)[number]

export const STYLE_TAGS = [
  'MINIMAL',
  'CASUAL',
  'LOVELY',
  'STREET',
  'AMEKAJI',
  'CLASSIC',
  'SPORTY',
  'CHIC',
] as const
export type StyleTag = (typeof STYLE_TAGS)[number]

/* ─────────────────────────────────────────────────────────────
   1. User
   ───────────────────────────────────────────────────────────── */

export interface UserProfile {
  id: string
  email: string
  nickname: string
  gender: Gender
  /** cm */
  height: number
  /** kg */
  weight: number
  personalColor: PersonalColor
  bodyShape: BodyShape
  preferredStyles: StyleTag[]
  /** 퍼스널 컬러 진단으로 도출된 대표 팔레트 (HEX) */
  colorPalette: string[]
  avatarUrl?: string
  /** 1분 맞춤 진단(온보딩) 완료 여부 — 기기 간 동기화를 위해 Firestore에 저장 */
  onboarded: boolean
  /** 팔로우한 스타일 트윈의 uid 목록 */
  following: string[]
  createdAt: string
  updatedAt: string
}

/* ─────────────────────────────────────────────────────────────
   2. Clothes (내 옷장)
   ───────────────────────────────────────────────────────────── */

export const MAJOR_CATEGORIES = ['TOP', 'BOTTOM', 'OUTER', 'SHOES', 'BAG', 'ACCESSORY'] as const
export type MajorCategory = (typeof MAJOR_CATEGORIES)[number]

export const MINOR_CATEGORIES = [
  'T_SHIRT',
  'SHIRT',
  'SWEATER',
  'HOODIE',
  'BLOUSE',
  'SLACKS',
  'DENIM',
  'SKIRT',
  'SHORTS',
  'CARDIGAN',
  'COAT',
  'JACKET',
  'PADDING',
  'SNEAKERS',
  'BOOTS',
  'LOAFER',
  'TOTE_BAG',
  'BACKPACK',
  'CAP',
  'MUFFLER',
] as const
export type MinorCategory = (typeof MINOR_CATEGORIES)[number]

export const MATERIALS = [
  'COTTON',
  'LINEN',
  'DENIM',
  'WOOL',
  'LEATHER',
  'POLYESTER',
  'NYLON',
  'KNIT',
] as const
export type Material = (typeof MATERIALS)[number]

export const THICKNESSES = ['THIN', 'MEDIUM', 'THICK'] as const
export type Thickness = (typeof THICKNESSES)[number]

export interface ClothingItem {
  id: string
  userId: string
  /** 상품명 또는 별칭 */
  name: string
  brand: string
  majorCategory: MajorCategory
  minorCategory: MinorCategory
  style: StyleTag
  /** 대표 색상 HEX */
  color: string
  /** 색상 한글 표기 (예: 아이보리) */
  colorName: string
  material: Material
  thickness: Thickness
  seasons: Season[]
  /** 원 단위. 미입력 시 undefined */
  price?: number
  photoUrl?: string
  isPreferred: boolean
  /** 코디에 사용될 때마다 증가 */
  wearCount: number
  /** 마지막 착용일 (ISO date) — 최근 착용 아이템 가중치 하향에 사용 */
  lastWornAt?: string
  createdAt: string
  updatedAt: string
}

/* ─────────────────────────────────────────────────────────────
   Schedule / TPO
   ───────────────────────────────────────────────────────────── */

export const SITUATIONS = [
  'DAILY',
  'CAMPUS',
  'OFFICE',
  'DATE',
  'TRAVEL',
  'WORKOUT',
  'PARTY',
  'WEDDING',
] as const
export type Situation = (typeof SITUATIONS)[number]

export interface WeatherSnapshot {
  /** ℃ */
  temperature: number
  temperatureHigh: number
  temperatureLow: number
  /** 체감온도 ℃ */
  feelsLike: number
  status: '맑음' | '구름' | '흐림' | '비' | '눈'
  /** 강수확률 % */
  precipitationChance: number
  locationName: string
}

export interface ScheduleSituation {
  id: string
  userId: string
  /** ISO date (YYYY-MM-DD) */
  eventDate: string
  /** HH:mm */
  eventTime?: string
  title: string
  situationTag: Situation
  latitude?: number
  longitude?: number
  temperatureHigh?: number
  temperatureLow?: number
  weatherStatus?: string
}

/* ─────────────────────────────────────────────────────────────
   3~4. Coordinate / CoordinateItem
   ───────────────────────────────────────────────────────────── */

/** 코디를 구성하는 한 칸. 내 옷장 아이템이거나, 부족분을 채우는 브랜드 상품이다. */
export interface CoordinateSlot {
  id: string
  majorCategory: MajorCategory
  minorCategory: MinorCategory
  /** 내 옷장 아이템에서 매칭된 경우 해당 아이템 id */
  clothingItemId?: string
  name: string
  brand: string
  color: string
  colorName: string
  /** 옷장에 없어서 구매를 제안하는 상품이면 가격이 붙는다 (정가) */
  price?: number
  /** 0~1, 브랜드 제안 아이템에 한해 표시하는 추정 할인율 — 실시간 가격 연동 전까지의 추정치 */
  discountRate?: number
  /** 브랜드+상품명으로 연결되는 실제 검색결과 페이지 (무신사) */
  searchUrl?: string
  /** 내 옷장 아이템에 실제 사진이 있으면 여기 담긴다 — 없으면 일러스트로 대체한다 */
  photoUrl?: string
  source: 'CLOSET' | 'BRAND'
}

export interface Coordinate {
  id: string
  styleName: string
  situation: Situation
  minTemperature: number
  maxTemperature: number
  /** 코디를 구성하는 주요 HEX 배열 */
  colorPalette: string[]
  slots: CoordinateSlot[]
  /** 추천 이유 — 사용자에게 그대로 노출된다 */
  reason: string
  /** 마스코트 한마디 */
  mascotComment: string
  /** 체형별 추천 가중치 */
  bodyShapeCompatibility: Partial<Record<BodyShape, number>>
  /** AI 학습용 라벨 */
  isGoodCoord: boolean
  createdAt: string
}

/* ─────────────────────────────────────────────────────────────
   저장 · 착용 기록 · 피드백
   ───────────────────────────────────────────────────────────── */

export interface SavedOutfit {
  id: string
  coordinate: Coordinate
  savedAt: string
  /** 실제 착용 체크 */
  worn: boolean
  /** 착용 예약 날짜 (ISO date) */
  scheduledFor?: string
}

export const FEEDBACK_TAGS = ['COMFY', 'COMPLIMENTED', 'NOT_MY_STYLE', 'TOO_COLD', 'TOO_HOT'] as const
export type FeedbackTag = (typeof FEEDBACK_TAGS)[number]

export interface OutfitFeedback {
  id: string
  outfitId: string
  /** 1~5 */
  rating: number
  tags: FeedbackTag[]
  memo?: string
  createdAt: string
}

/* ─────────────────────────────────────────────────────────────
   5. CommunityPost
   ───────────────────────────────────────────────────────────── */

export interface CommunityPost {
  id: string
  authorId: string
  authorNickname: string
  authorAvatarColor: string
  title: string
  content: string
  hashtags: string[]
  outfitPhotoTheme: OutfitPhotoTheme
  /** 실제로 업로드한 착장 사진 (있으면 테마 일러스트 대신 이걸 보여준다) */
  photoUrl?: string
  /** 글쓴이가 저장한 코디를 첨부한 경우의 스냅샷 — 게시글 상세에서 옷 정보로 노출 */
  outfitSlots?: CoordinateSlot[]
  /** Firestore에 저장되는 원본 — 좋아요 누른 사용자 uid 목록 */
  likedBy: string[]
  likeCount: number
  commentCount: number
  /** 조회수 — 게시글을 열 때마다 1씩 오른다 */
  viewCount: number
  /** 현재 로그인한 사용자 기준 파생값 (likedBy.includes(내 uid)) — Firestore에 저장하지 않는다 */
  liked: boolean
  createdAt: string
}

export interface PostComment {
  id: string
  postId: string
  authorId: string
  authorNickname: string
  authorAvatarColor: string
  content: string
  createdAt: string
}

/** 브랜드 검색 결과에서 실제로 눌러본 상품 — "최근 본 상품" 페이지에 쓰인다 */
export interface RecentlyViewedItem {
  id: string
  name: string
  brand: string
  color: string
  colorName: string
  majorCategory: MajorCategory
  minorCategory: MinorCategory
  price?: number
  discountRate?: number
  searchUrl: string
  viewedAt: string
}

/** 실사 이미지 대신 쓰는 일러스트 프리셋 (에셋 연결 전까지 사용) */
export const OUTFIT_PHOTO_THEMES = [
  'STREET_DAY',
  'OFFICE_MORNING',
  'CAMPUS_AUTUMN',
  'DATE_EVENING',
  'TRAVEL_SUNNY',
  'CASUAL_INDOOR',
] as const
export type OutfitPhotoTheme = (typeof OUTFIT_PHOTO_THEMES)[number]

/* ─────────────────────────────────────────────────────────────
   10. 스타일 트윈
   ───────────────────────────────────────────────────────────── */

export interface StyleTwin {
  id: string
  nickname: string
  avatarColor: string
  height: number
  weight: number
  bodyShape: BodyShape
  styleTags: StyleTag[]
  /** 코사인 유사도 0~1 */
  similarity: number
  following: boolean
}

/* ─────────────────────────────────────────────────────────────
   공개 프로필 (스타일 트윈 매칭 · 랭킹용, 이메일 등 비공개 정보 없음)
   ───────────────────────────────────────────────────────────── */

export interface PublicProfileStats {
  /** 옷장 아이템 전체 착용 횟수 합 */
  wearCount: number
  closetCount: number
  /** 0~1, 옷장 아이템 중 한 번이라도 입은 비율 */
  closetUtilization: number
  savedOutfitCount: number
  /** 랭킹에 쓰는 종합 활동 점수 */
  activityScore: number
}

export interface PublicProfile {
  uid: string
  nickname: string
  avatarColor: string
  height: number
  weight: number
  bodyShape: BodyShape
  personalColor: PersonalColor
  styleTags: StyleTag[]
  stats: PublicProfileStats
  updatedAt: string
}

/* ─────────────────────────────────────────────────────────────
   랭킹
   ───────────────────────────────────────────────────────────── */

export const RANKING_SCOPES = ['WEEK', 'MONTH', 'ALL'] as const
export type RankingScope = (typeof RANKING_SCOPES)[number]
