/**
 * 위치를 못 받았을 때 보여주는 안내.
 *
 * 브라우저에서 위치를 한 번 "차단"하면 사이트가 다시 물어볼 방법이 없다 —
 * 재요청해도 프롬프트 없이 즉시 거부된다. 그래서 차단된 경우에는 버튼을 누르라고
 * 하는 대신 **직접 설정을 바꾸는 방법**을 알려준다.
 */
import { useState } from 'react'
import type { LocationIssue } from '@/hooks/useWeather'

interface LocationNoticeProps {
  issue: LocationIssue
  blocked: boolean
  onRetry: () => void
}

export function LocationNotice({ issue, blocked, onRetry }: LocationNoticeProps) {
  const [showHelp, setShowHelp] = useState(false)

  if (!issue) return null

  if (issue === 'UNSUPPORTED') {
    return <span className="tf-locnotice">이 브라우저는 위치를 지원하지 않아 서울 기준이에요</span>
  }

  if (blocked) {
    return (
      <span className="tf-locnotice">
        위치가 차단돼 서울 기준이에요
        <button type="button" className="tf-textlink" onClick={() => setShowHelp((v) => !v)}>
          허용하는 법
        </button>
        {showHelp && (
          <span className="tf-locnotice__help">
            주소창 왼쪽 자물쇠(또는 ⓘ) → 위치 → <b>허용</b>으로 바꾼 뒤 새로고침해 주세요.
          </span>
        )}
      </span>
    )
  }

  // 일시적 실패 — 다시 시도하면 될 수 있다.
  return (
    <span className="tf-locnotice">
      위치를 못 찾아 서울 기준이에요
      <button type="button" className="tf-textlink" onClick={onRetry}>
        다시 시도
      </button>
    </span>
  )
}
