import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/hooks/useAuth'
import { genderLabel } from '@/lib/labels'
import { fetchLegalManifest, formatEffectiveDate, type LegalDocumentMeta } from '@/services/legal'
import { GENDERS, type Gender } from '@/types'

export function SettingsPage() {
  const {
    user,
    usingMockAuth,
    emailVerified,
    updateProfile,
    resendVerificationEmail,
    refreshEmailVerified,
    signOut,
  } = useAuth()
  const navigate = useNavigate()

  const [nickname, setNickname] = useState(user?.nickname ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [sendingVerify, setSendingVerify] = useState(false)
  const [checkingVerify, setCheckingVerify] = useState(false)
  /** 인증 영역에 보여줄 결과 메시지 — 성공/실패를 모두 알려준다 */
  const [verifyNotice, setVerifyNotice] = useState<{ text: string; error: boolean } | null>(null)
  const [legalDocs, setLegalDocs] = useState<LegalDocumentMeta[]>([])

  useEffect(() => {
    let cancelled = false
    fetchLegalManifest()
      .then((list) => {
        if (!cancelled) setLegalDocs(list)
      })
      .catch(() => {
        // 목록을 못 받아도 설정 화면의 나머지는 그대로 동작해야 한다.
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!user) return null

  async function handleSaveNickname() {
    if (!nickname.trim() || nickname === user?.nickname) return
    setSaving(true)
    try {
      await updateProfile({ nickname: nickname.trim() })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  async function handleResendVerification() {
    setSendingVerify(true)
    setVerifyNotice(null)
    try {
      await resendVerificationEmail()
      setVerifyNotice({
        text: `${user?.email}로 인증 메일을 보냈어요. 메일함(스팸함 포함)을 확인해 주세요.`,
        error: false,
      })
    } catch (caught) {
      setVerifyNotice({
        text: caught instanceof Error ? caught.message : '인증 메일을 보내지 못했어요.',
        error: true,
      })
    } finally {
      setSendingVerify(false)
    }
  }

  /** 메일의 링크를 누르고 돌아왔을 때 — Firebase는 알아서 알려주지 않으므로 직접 확인한다 */
  async function handleCheckVerified() {
    setCheckingVerify(true)
    setVerifyNotice(null)
    try {
      const verified = await refreshEmailVerified()
      setVerifyNotice(
        verified
          ? { text: '인증이 확인됐어요!', error: false }
          : { text: '아직 인증되지 않았어요. 메일의 링크를 누른 뒤 다시 확인해 주세요.', error: true },
      )
    } finally {
      setCheckingVerify(false)
    }
  }

  async function handleSignOut() {
    if (!window.confirm('로그아웃 할까요?')) return
    await signOut()
    navigate('/login')
  }

  function handleGenderChange(value: Gender) {
    void updateProfile({ gender: value })
  }

  return (
    <div className="tf-page">
      <header className="tf-pagehead tf-reveal">
        <div>
          <h1 className="tf-display">설정</h1>
          <p className="tf-caption">계정 정보를 관리해요</p>
        </div>
      </header>

      <Card className="tf-reveal" icon="👤" title="계정 정보">
        <div className="tf-editform">
          <label className="tf-field">
            <span>이메일</span>
            <input className="tf-input" value={user.email} disabled />
          </label>
          <label className="tf-field">
            <span>닉네임</span>
            <div className="tf-inline-form">
              <input
                className="tf-input"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                maxLength={20}
              />
              <Button
                size="sm"
                onClick={handleSaveNickname}
                disabled={saving || !nickname.trim() || nickname === user.nickname}
              >
                {saved ? '저장됨' : '저장'}
              </Button>
            </div>
          </label>
          <fieldset className="tf-field">
            <legend>성별</legend>
            <div className="tf-chipset">
              {GENDERS.map((value) => (
                <Chip key={value} selected={user.gender === value} onClick={() => handleGenderChange(value)}>
                  {genderLabel[value]}
                </Chip>
              ))}
            </div>
          </fieldset>
        </div>
      </Card>

      {!usingMockAuth && (
        <Card className="tf-reveal" icon="✉️" title="이메일 인증">
          {emailVerified ? (
            <p className="tf-caption">인증이 완료된 이메일이에요.</p>
          ) : (
            <>
              <p className="tf-caption">
                아직 <b>{user.email}</b> 인증이 완료되지 않았어요. 메일이 오지 않았다면 스팸함을
                확인하거나 다시 보내보세요.
              </p>
              <div className="tf-inline-form">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleResendVerification}
                  disabled={sendingVerify}
                >
                  {sendingVerify ? '보내는 중…' : '인증 메일 다시 보내기'}
                </Button>
                {/* Firebase는 링크를 눌러도 이 탭에 알려주지 않는다 — 직접 확인 버튼이 필요하다 */}
                <Button
                  variant="soft"
                  size="sm"
                  onClick={handleCheckVerified}
                  disabled={checkingVerify}
                >
                  {checkingVerify ? '확인 중…' : '인증 완료했어요'}
                </Button>
              </div>
              {verifyNotice && (
                <p
                  className={verifyNotice.error ? 'tf-error' : 'tf-caption'}
                  role={verifyNotice.error ? 'alert' : 'status'}
                >
                  {verifyNotice.text}
                </p>
              )}
            </>
          )}
        </Card>
      )}

      <Card className="tf-reveal" icon="📄" title="약관 및 정책">
        {legalDocs.length === 0 ? (
          <p className="tf-caption">문서를 불러오는 중이에요…</p>
        ) : (
          <ul className="tf-linklist">
            {legalDocs.map((doc) => (
              <li key={doc.id}>
                <Link to={`/legal?doc=${doc.id}`} className="tf-linklist__row">
                  <span className="tf-linklist__text">
                    <span className="tf-linklist__title">{doc.title}</span>
                    <span className="tf-micro">
                      v{doc.version} · {formatEffectiveDate(doc.effectiveDate)} 시행
                    </span>
                  </span>
                  <Icon name="chevron-right" size={17} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="tf-reveal" icon="🚪" title="로그아웃">
        <p className="tf-caption">다른 계정으로 다시 로그인할 수 있어요.</p>
        <Button variant="ghost" onClick={handleSignOut}>
          로그아웃
        </Button>
      </Card>
    </div>
  )
}
