import { useEffect } from 'react'

/**
 * 카카오 애드핏 광고 슬롯.
 * 광고단위 ID(`VITE_ADFIT_UNIT_ID`)가 없으면 광고 스크립트를 아예 로드하지 않고
 * 아무것도 렌더링하지 않는다 — 빈 광고 자리가 UI에 남지 않는다.
 */
const AD_UNIT_ID = import.meta.env.VITE_ADFIT_UNIT_ID as string | undefined
const SCRIPT_SRC = '//t1.daumcdn.net/kas/static/ba.min.js'

function ensureScriptLoaded() {
  if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return
  const script = document.createElement('script')
  script.src = SCRIPT_SRC
  script.async = true
  document.body.appendChild(script)
}

interface AdFitBannerProps {
  width: number
  height: number
  className?: string
}

export function AdFitBanner({ width, height, className }: AdFitBannerProps) {
  useEffect(() => {
    if (AD_UNIT_ID) ensureScriptLoaded()
  }, [])

  if (!AD_UNIT_ID) return null

  return (
    <ins
      className={['kakao_ad_area', className].filter(Boolean).join(' ')}
      style={{ display: 'block' }}
      data-ad-unit={AD_UNIT_ID}
      data-ad-width={width}
      data-ad-height={height}
    />
  )
}
