import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * 카카오 애드핏 광고 슬롯.
 *
 * 광고단위 ID(`VITE_ADFIT_UNIT_ID`)가 없으면 아무것도 렌더링하지 않는다.
 *
 * 애드핏 스크립트(ba.min.js)는 **로드되는 순간에만** `.kakao_ad_area`를 훑는다.
 * 그래서 SPA에서는 두 가지를 지켜야 광고가 안정적으로 뜬다.
 *
 *  1. 스캔 시점에 `<ins>`가 **최종 규격으로** DOM에 있어야 한다.
 *     규격을 먼저 정하고 나서 `<ins>`를 그린다 — 임시 규격으로 그렸다가 나중에 바꾸면
 *     스캔이 두 번 돌면서 광고가 떴다 안 떴다 한다.
 *  2. 배너가 새로 마운트될 때마다 스크립트를 다시 붙여 재스캔을 유도해야 한다.
 *     여러 배너가 동시에 마운트될 수 있으므로 스캔 요청은 하나로 합친다.
 */
const AD_UNIT_ID = import.meta.env.VITE_ADFIT_UNIT_ID as string | undefined
const SCRIPT_SRC = '//t1.daumcdn.net/kas/static/ba.min.js'

/** 애드핏 표준 규격 중 좁은 화면에서 쓸 것 */
const MOBILE_SIZE = { width: 320, height: 100 }
/** 이 시간 안에 안 채워지면 빈 자리를 접는다 (재고 없음·광고 차단기) */
const FILL_TIMEOUT_MS = 4000

interface AdSize {
  width: number
  height: number
}

let rescanTimer: number | null = null

/**
 * 스크립트를 다시 붙여 재스캔시킨다.
 * 같은 프레임에 여러 배너가 마운트돼도 실제 재삽입은 한 번만 하도록 합친다.
 */
function scheduleRescan() {
  if (rescanTimer !== null) return
  rescanTimer = window.setTimeout(() => {
    rescanTimer = null
    document.querySelectorAll(`script[src="${SCRIPT_SRC}"]`).forEach((node) => node.remove())
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    document.body.appendChild(script)
  }, 0)
}

interface AdFitBannerProps {
  width: number
  height: number
  className?: string
}

export function AdFitBanner({ width, height, className }: AdFitBannerProps) {
  const holderRef = useRef<HTMLDivElement>(null)
  const insRef = useRef<HTMLModElement>(null)
  /** null이면 아직 크기를 못 정한 상태 — `<ins>`를 그리지 않는다 */
  const [size, setSize] = useState<AdSize | null>(null)
  const [failed, setFailed] = useState(false)

  // 자리 폭을 재서 규격을 먼저 확정한다. paint 전에 끝내야 깜빡임이 없다.
  useLayoutEffect(() => {
    if (!AD_UNIT_ID) return
    const available = holderRef.current?.clientWidth ?? window.innerWidth
    setSize(available > 0 && available < width ? MOBILE_SIZE : { width, height })
    setFailed(false)
  }, [width, height])

  // 최종 규격의 `<ins>`가 DOM에 올라온 뒤에 한 번만 스캔시킨다.
  useEffect(() => {
    if (!AD_UNIT_ID || !size) return
    scheduleRescan()

    // 재고가 없거나 광고 차단기에 막히면 영영 안 채워진다 — 빈 자리를 남기지 않는다.
    const timer = window.setTimeout(() => {
      const filled = (insRef.current?.childElementCount ?? 0) > 0
      if (!filled) setFailed(true)
    }, FILL_TIMEOUT_MS)

    return () => window.clearTimeout(timer)
  }, [size])

  if (!AD_UNIT_ID || failed) return null

  return (
    <div ref={holderRef} className={['tf-adslot', className].filter(Boolean).join(' ')}>
      {size && (
        <ins
          key={`${size.width}x${size.height}`}
          ref={insRef}
          className="kakao_ad_area"
          style={{ display: 'block' }}
          data-ad-unit={AD_UNIT_ID}
          data-ad-width={size.width}
          data-ad-height={size.height}
          data-ad-onfail="hide"
        />
      )}
    </div>
  )
}
