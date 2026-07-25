import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/hooks/useAuth'

const DISMISS_KEY = 'tofit.emailBannerDismissed'

/** 이메일 미인증 사용자에게 계속 보이는 배너 — 기능은 막지 않고 알림만 한다 */
export function EmailVerificationBanner() {
  const { emailVerified, resendVerificationEmail, refreshEmailVerified } = useAuth()
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === 'true')
  const [busy, setBusy] = useState<'resend' | 'check' | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  if (emailVerified || dismissed) return null

  async function handleResend() {
    setBusy('resend')
    setMessage(null)
    try {
      await resendVerificationEmail()
      setMessage('인증 메일을 다시 보냈어요. 받은편지함을 확인해 주세요.')
    } catch {
      setMessage('메일 전송에 실패했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setBusy(null)
    }
  }

  async function handleCheck() {
    setBusy('check')
    setMessage(null)
    try {
      await refreshEmailVerified()
      setMessage('아직 인증이 확인되지 않았어요. 메일함을 다시 확인해 주세요.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="tf-verify-banner" role="status">
      <span className="tf-verify-banner__text">
        📩 이메일 인증이 아직 완료되지 않았어요.
        {message && <span className="tf-verify-banner__msg"> {message}</span>}
      </span>
      <div className="tf-verify-banner__actions">
        <Button size="sm" variant="soft" onClick={handleCheck} disabled={busy !== null}>
          {busy === 'check' ? '확인 중…' : '인증 완료했어요'}
        </Button>
        <Button size="sm" variant="ghost" onClick={handleResend} disabled={busy !== null}>
          {busy === 'resend' ? '전송 중…' : '메일 재전송'}
        </Button>
        <button
          type="button"
          className="tf-icon-btn"
          aria-label="닫기"
          onClick={() => {
            sessionStorage.setItem(DISMISS_KEY, 'true')
            setDismissed(true)
          }}
        >
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
  )
}
