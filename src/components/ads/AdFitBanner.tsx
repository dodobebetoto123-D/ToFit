import { useEffect, useRef, useState } from 'react'

/**
 * 카카오 애드핏 광고 슬롯.
 *
 * 광고단위 ID(`VITE_ADFIT_UNIT_ID`)가 없으면 아무것도 렌더링하지 않는다.
 *
 * 두 가지를 신경 써야 한다.
 *  - 요청 크기가 화면보다 크면 광고가 아예 안 뜨고 가로 스크롤만 생긴다.
 *    화면 폭에 맞는 표준 규격으로 낮춰서 요청한다.
 *  - ba.min.js는 **로드되는 순간에만** `.kakao_ad_area`를 훑는다. SPA에서 라우트를
 *    옮겨 새 배너가 마운트되면 재스캔이 없어 빈 자리로 남는다. 그래서 마운트마다
 *    스크립트를 다시 붙여 스캔을 유도한다.
 */
const AD_UNIT_ID = import.meta.env.VITE_ADFIT_UNIT_ID as string | undefined
const SCRIPT_SRC = '//t1.daumcdn.net/kas/static/ba.min.js'

/** 애드핏 표준 규격 중 좁은 화면에서 쓸 것 */
const MOBILE_SIZE = { width: 320, height: 100 }

/** 광고를 붙일 때마다 스크립트를 새로 실행시켜 재스캔하게 한다 */
function rescanAds() {
  document.querySelectorAll(`script[src="${SCRIPT_SRC}"]`).forEach((node) => node.remove())
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
  const holderRef = useRef<HTMLDivElement>(null)
  // 실제로 요청할 규격 — 자리 폭보다 크면 모바일 규격으로 낮춘다.
  const [size, setSize] = useState({ width, height })

  useEffect(() => {
    if (!AD_UNIT_ID) return
    const holder = holderRef.current
    const available = holder?.clientWidth ?? window.innerWidth
    setSize(available < width ? MOBILE_SIZE : { width, height })
  }, [width, height])

  // size가 정해진 뒤에 스캔해야 올바른 규격으로 채워진다.
  useEffect(() => {
    if (!AD_UNIT_ID) return
    rescanAds()
  }, [size.width, size.height])

  if (!AD_UNIT_ID) return null

  return (
    <div ref={holderRef} className={['tf-adslot', className].filter(Boolean).join(' ')}>
      <ins
        // 규격이 바뀌면 새 슬롯으로 다시 만들어야 애드핏이 다시 채운다.
        key={`${size.width}x${size.height}`}
        className="kakao_ad_area"
        style={{ display: 'block' }}
        data-ad-unit={AD_UNIT_ID}
        data-ad-width={size.width}
        data-ad-height={size.height}
        data-ad-onfail="hide"
      />
    </div>
  )
}
