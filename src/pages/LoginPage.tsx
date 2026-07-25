import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { Mascot } from '@/components/brand/Mascot'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

type Mode = 'signIn' | 'signUp'

export function LoginPage() {
  const navigate = useNavigate()
  const { user, ready, signIn, signUp, usingMockAuth, onboarded } = useAuth()

  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('minji@tofit.app')
  const [password, setPassword] = useState('tofit1234')
  const [nickname, setNickname] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (ready && user) return <Navigate to={onboarded ? '/' : '/onboarding'} replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (mode === 'signUp' && !agreed) {
      setError('이용약관에 동의해 주세요.')
      return
    }

    setBusy(true)
    try {
      if (mode === 'signIn') {
        await signIn(email, password)
        navigate('/', { replace: true })
      } else {
        await signUp(email, password, nickname || email.split('@')[0])
        navigate('/onboarding', { replace: true })
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '로그인에 실패했어요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tf-auth">
      <section className="tf-auth__brand">
        <Logo size="lg" withMascot={false} />
        <p className="tf-auth__tagline">
          매일 아침 &lsquo;오늘 뭐 입지?&rsquo; 고민은 이제 끝.
          <br />
          내 체형과 퍼스널 컬러에 딱 맞는 코디를 골라드려요.
        </p>
        <Mascot size={128} mood="happy" floating />
      </section>

      <section className="tf-auth__panel tf-reveal">
        <div className="tf-auth__tabs" role="tablist" aria-label="로그인 · 회원가입">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signIn'}
            className={cn('tf-auth__tab', mode === 'signIn' && 'is-active')}
            onClick={() => setMode('signIn')}
          >
            로그인
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signUp'}
            className={cn('tf-auth__tab', mode === 'signUp' && 'is-active')}
            onClick={() => setMode('signUp')}
          >
            회원가입
          </button>
        </div>

        <form className="tf-auth__form" onSubmit={handleSubmit}>
          <label className="tf-field">
            <span>이메일</span>
            <input
              className="tf-input"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label className="tf-field">
            <span>비밀번호</span>
            <input
              className="tf-input"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            />
          </label>

          {mode === 'signUp' && (
            <>
              <label className="tf-field">
                <span>닉네임</span>
                <input
                  className="tf-input"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="앱에서 쓸 이름"
                />
              </label>

              <label className="tf-check">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(event) => setAgreed(event.target.checked)}
                />
                <span>
                  <strong>[필수]</strong> 이용약관 및 개인정보 처리방침에 동의합니다.
                </span>
              </label>
            </>
          )}

          {error && (
            <p className="tf-error" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" block size="lg" disabled={busy}>
            {busy ? '잠시만요…' : mode === 'signIn' ? '로그인' : '회원가입'}
          </Button>
        </form>

        {usingMockAuth && (
          <p className="tf-auth__hint">
            현재 <code>VITE_FIREBASE_*</code> 환경 변수가 없어 <strong>데모 모드</strong>로
            동작합니다. 아무 이메일로 로그인해 화면을 둘러볼 수 있어요.
          </p>
        )}
      </section>
    </div>
  )
}
