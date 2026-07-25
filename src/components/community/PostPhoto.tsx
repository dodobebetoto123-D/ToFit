/**
 * 커뮤니티 착장 사진 자리.
 * 실제 업로드 이미지가 붙기 전까지 테마별 그라디언트 + 인물 실루엣으로 대체한다.
 */
import type { OutfitPhotoTheme } from '@/types'

interface Theme {
  /** 배경 그라디언트 (from, to) */
  bg: [string, string]
  /** 상의 · 하의 · 아우터 색 */
  top: string
  bottom: string
  outer?: string
  skin: string
  hair: string
}

const THEMES: Record<OutfitPhotoTheme, Theme> = {
  STREET_DAY: {
    bg: ['#e8ecf8', '#cfd7ee'],
    top: '#f4f1ea',
    bottom: '#8ba6cc',
    outer: '#c8b596',
    skin: '#f2d9c4',
    hair: '#3a2f2a',
  },
  OFFICE_MORNING: {
    bg: ['#eef1fb', '#dbe2f6'],
    top: '#efe6d6',
    bottom: '#8ba6cc',
    skin: '#f4dcc7',
    hair: '#241f1c',
  },
  CAMPUS_AUTUMN: {
    bg: ['#f3eee6', '#e2d7c6'],
    top: '#e6dbc9',
    bottom: '#6f7d99',
    skin: '#f2d9c4',
    hair: '#4a3a2c',
  },
  DATE_EVENING: {
    bg: ['#e4e6f2', '#c9cddf'],
    top: '#ded3c0',
    bottom: '#3b3b40',
    outer: '#26262a',
    skin: '#f4dcc7',
    hair: '#1f1a17',
  },
  TRAVEL_SUNNY: {
    bg: ['#eaf1fa', '#d3e2f4'],
    top: '#ffffff',
    bottom: '#8ba6cc',
    skin: '#f2d9c4',
    hair: '#33291f',
  },
  CASUAL_INDOOR: {
    bg: ['#f4f2ef', '#e3e0dc'],
    top: '#b9cbe8',
    bottom: '#b8b8b6',
    skin: '#f4dcc7',
    hair: '#2c2420',
  },
}

export function PostPhoto({ theme }: { theme: OutfitPhotoTheme }) {
  const t = THEMES[theme]
  const gradientId = `pp-${theme}`

  return (
    <svg viewBox="0 0 200 240" className="tf-postphoto" role="presentation" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={t.bg[0]} />
          <stop offset="100%" stopColor={t.bg[1]} />
        </linearGradient>
      </defs>

      <rect width="200" height="240" fill={`url(#${gradientId})`} />

      {/* 배경 벽·바닥 구획 */}
      <rect y="196" width="200" height="44" fill="#000" opacity="0.05" />
      <rect x="140" width="60" height="196" fill="#fff" opacity="0.18" />

      {/* 다리 */}
      <path d={`M84 168h12v58H84Z`} fill={t.bottom} />
      <path d={`M104 168h12v58h-12Z`} fill={t.bottom} opacity="0.88" />
      {/* 신발 */}
      <rect x="80" y="222" width="20" height="8" rx="4" fill="#f2f2f0" />
      <rect x="102" y="222" width="20" height="8" rx="4" fill="#e6e6e4" />

      {/* 하의 */}
      <path d="M78 118h44l6 56H72Z" fill={t.bottom} />

      {/* 상의 */}
      <path d="M76 66q24-10 48 0l8 26-10 4v28H78V96l-10-4Z" fill={t.top} />

      {/* 아우터 */}
      {t.outer && (
        <>
          <path d="M74 66q-8 4-10 12l-4 34 10 3 2 46h14V72Z" fill={t.outer} />
          <path d="M126 66q8 4 10 12l4 34-10 3-2 46h-14V72Z" fill={t.outer} opacity="0.94" />
        </>
      )}

      {/* 목·얼굴·머리 */}
      <rect x="94" y="56" width="12" height="14" fill={t.skin} />
      <ellipse cx="100" cy="42" rx="17" ry="19" fill={t.skin} />
      <path d="M83 40q0-20 17-20t17 20q0-9-17-9t-17 9Z" fill={t.hair} />
      <path d="M82 38q-2 16 3 24-9-6-8-22Z" fill={t.hair} />
      <path d="M118 38q2 16-3 24 9-6 8-22Z" fill={t.hair} />
    </svg>
  )
}
