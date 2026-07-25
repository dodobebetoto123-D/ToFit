/**
 * 인터페이스 아이콘 세트.
 * 전부 24x24 그리드 · 1.7 stroke 로 통일해 두께가 어긋나지 않게 한다.
 */
export type IconName =
  | 'home'
  | 'closet'
  | 'sparkle'
  | 'body'
  | 'community'
  | 'heart'
  | 'heart-filled'
  | 'tag'
  | 'note'
  | 'store'
  | 'settings'
  | 'search'
  | 'bell'
  | 'plus'
  | 'refresh'
  | 'bookmark'
  | 'chevron-right'
  | 'chevron-down'
  | 'comment'
  | 'calendar'
  | 'close'
  | 'check'
  | 'camera'
  | 'trophy'

const PATHS: Record<IconName, string> = {
  home: 'M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1Z',
  closet: 'M4 4h16v16H4Zm8 0v16M9 11v2m6-2v2',
  sparkle: 'M12 3.5 13.9 9 19.5 11 13.9 13 12 18.5 10.1 13 4.5 11 10.1 9ZM18.5 4v3M17 5.5h3',
  body: 'M12 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM8.5 9h7l1 5-2 .6V20h-5v-5.4L7.5 14Z',
  community: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8.5 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3 19.5c0-3 2.7-5 6-5s6 2 6 5M16 14.6c2.9.2 5 2 5 4.9',
  heart: 'M12 20s-7.5-4.4-7.5-9.4A4.1 4.1 0 0 1 12 8.2a4.1 4.1 0 0 1 7.5 2.4C19.5 15.6 12 20 12 20Z',
  'heart-filled': 'M12 20s-7.5-4.4-7.5-9.4A4.1 4.1 0 0 1 12 8.2a4.1 4.1 0 0 1 7.5 2.4C19.5 15.6 12 20 12 20Z',
  tag: 'M4 11.5V5a1 1 0 0 1 1-1h6.5L20 12.5 12.5 20ZM8 8h.01',
  note: 'M6 3.5h9L19 8v12.5H6ZM14.5 3.5V8H19M9 12h7M9 16h5',
  store: 'M4 9.5 5.5 4h13L20 9.5M4 9.5h16M4 9.5v10h16v-10M4.5 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3a8 8 0 0 0-.2-1.7l2-1.5-2-3.4-2.3 1a8 8 0 0 0-2.9-1.7L14.2 2H9.8l-.4 2.7a8 8 0 0 0-2.9 1.7l-2.3-1-2 3.4 2 1.5a8.2 8.2 0 0 0 0 3.4l-2 1.5 2 3.4 2.3-1a8 8 0 0 0 2.9 1.7l.4 2.7h4.4l.4-2.7a8 8 0 0 0 2.9-1.7l2.3 1 2-3.4-2-1.5c.1-.5.2-1.1.2-1.7Z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5.2-1.8L21 21',
  bell: 'M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5s1.5-1.5 1.5-5.5ZM10 18.5a2 2 0 0 0 4 0',
  plus: 'M12 5.5v13M5.5 12h13',
  refresh: 'M19 12a7 7 0 1 1-2.3-5.2M19.5 4v4h-4',
  bookmark: 'M6.5 4h11v16l-5.5-4-5.5 4Z',
  'chevron-right': 'm9.5 5.5 6.5 6.5-6.5 6.5',
  'chevron-down': 'm5.5 9.5 6.5 6.5 6.5-6.5',
  comment: 'M4.5 5.5h15v10h-9L6 19.5v-4H4.5Z',
  calendar: 'M4.5 6.5h15v13h-15ZM4.5 10.5h15M8.5 4v4M15.5 4v4',
  close: 'm6 6 12 12M18 6 6 18',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  camera: 'M4 8h3.5L9 5.5h6L16.5 8H20v11.5H4Zm8 9.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  trophy:
    'M7 4h10v5a5 5 0 0 1-5 5 5 5 0 0 1-5-5Zm-3 1H2v2a4 4 0 0 0 4 4M17 5h5v2a4 4 0 0 1-4 4M10 14v3M9 20h6M9 17h6v3H9Z',
}

interface IconProps {
  name: IconName
  size?: number
  className?: string
}

export function Icon({ name, size = 20, className }: IconProps) {
  const filled = name === 'heart-filled'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
