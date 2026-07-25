import type { IconName } from '@/components/ui/Icon'

export interface NavItem {
  to: string
  label: string
  icon: IconName
}

/** PC 사이드바 주 메뉴 · 상단 네비게이션 공용 */
export const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: '홈', icon: 'home' },
  { to: '/closet', label: '내 옷장', icon: 'closet' },
  { to: '/recommend', label: '코디 추천', icon: 'sparkle' },
  { to: '/body', label: '체형 맞춤', icon: 'body' },
  { to: '/community', label: '커뮤니티', icon: 'community' },
  { to: '/ranking', label: '랭킹', icon: 'trophy' },
]

/** PC 사이드바 보조 메뉴 */
export const SECONDARY_NAV: NavItem[] = [
  { to: '/saved', label: '찜한 코디', icon: 'heart' },
  { to: '/recent', label: '최근 본 상품', icon: 'tag' },
]

/** PC 사이드바 하단 메뉴 */
export const UTILITY_NAV: NavItem[] = [
  { to: '/notes', label: '스타일 노트', icon: 'note' },
  { to: '/brands', label: '브랜드 추천', icon: 'store' },
  { to: '/settings', label: '설정', icon: 'settings' },
]

/** 모바일 하단 탭바 */
export const MOBILE_NAV: NavItem[] = [
  { to: '/', label: '홈', icon: 'home' },
  { to: '/closet', label: '옷장', icon: 'closet' },
  { to: '/recommend', label: '추천', icon: 'sparkle' },
  { to: '/community', label: '커뮤니티', icon: 'community' },
  { to: '/ranking', label: '랭킹', icon: 'trophy' },
]
