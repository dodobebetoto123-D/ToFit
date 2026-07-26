import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { Mascot } from '@/components/brand/Mascot'
import { LegalDocumentDialog } from '@/components/legal/LegalDocumentDialog'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { fetchLegalManifest, type LegalDocumentMeta } from '@/services/legal'

type Mode = 'signIn' | 'signUp'

export function LoginPage() {
  const navigate = useNavigate()
  const { user, ready, signIn, signUp, usingMockAuth, onboarded } = useAuth()

  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('minji@tofit.app')
  const [password, setPassword] = useState('tofit1234')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // 약관 동의 — 문서 목록은 manifest에서 받아오고, 동의 여부는 문서 id별로 관리한다.
  const [legalDocs, setLegalDocs] = useState<LegalDocumentMeta[]>([])
  const [agreedIds, setAgreedIds] = useState<string[]>([])
  const [viewingDoc, setViewingDoc] = useState<LegalDocumentMeta | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchLegalManifest()
      .then((list) => {
        if (!cancelled) setLegalDocs(list.filter((doc) => doc.consent !== 'none'))
      })
      .catch(() => {
        // 목록을 못 받아도 가입 자체를 막지는 않는다 — 아래에서 기본 문구로 폴백한다.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const requiredDocs = useMemo(
    () => legalDocs.filter((doc) => doc.consent === 'required'),
    [legalDocs],
  )
  const allAgreed = legalDocs.length > 0 && legalDocs.every((doc) => agreedIds.includes(doc.id))
  const requiredSatisfied = requiredDocs.every((doc) => agreedIds.includes(doc.id))

  function toggleAgreement(id: string) {
    setAgreedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))
  }

  function toggleAll(checked: boolean) {
    setAgreedIds(checked ? legalDocs.map((doc) => doc.id) : [])
  }

  if (ready && user) return <Navigate to={onboarded ? '/' : '/onboarding'} replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (mode === 'signUp' && !requiredSatisfied) {
      setError('필수 약관에 동의해 주세요.')
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

              <div className="tf-consent">
                <label className="tf-check tf-consent__all">
                  <input
                    type="checkbox"
                    checked={allAgreed}
                    onChange={(event) => toggleAll(event.target.checked)}
                    disabled={legalDocs.length === 0}
                  />
                  <span>
                    <strong>전체 동의</strong>
                  </span>
                </label>

                <ul className="tf-consent__list">
                  {legalDocs.map((doc) => (
                    <li key={doc.id} className="tf-consent__item">
                      <label className="tf-check">
                        <input
                          type="checkbox"
                          checked={agreedIds.includes(doc.id)}
                          onChange={() => toggleAgreement(doc.id)}
                        />
                        <span>
                          <strong>[{doc.consent === 'required' ? '필수' : '선택'}]</strong>{' '}
                          {doc.title}에 동의합니다.
                        </span>
                      </label>
                      <button
                        type="button"
                        className="tf-consent__view"
                        onClick={() => setViewingDoc(doc)}
                      >
                        보기
                      </button>
                    </li>
                  ))}
                </ul>

                {legalDocs.length === 0 && (
                  <p className="tf-caption">약관을 불러오는 중이에요…</p>
                )}
              </div>
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

      <LegalDocumentDialog doc={viewingDoc} onClose={() => setViewingDoc(null)} />
    </div>
  )
}
