import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { useAppData } from '@/hooks/useAppData'
import { useAuth } from '@/hooks/useAuth'
import { genderLabel } from '@/lib/labels'
import { GENDERS, type Gender } from '@/types'

export function SettingsPage() {
  const { user, usingMockAuth, emailVerified, updateProfile, resendVerificationEmail, signOut } =
    useAuth()
  const { remainingRecommendations } = useAppData()
  const navigate = useNavigate()

  const [nickname, setNickname] = useState(user?.nickname ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [sendingVerify, setSendingVerify] = useState(false)
  const [verifySent, setVerifySent] = useState(false)

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
    try {
      await resendVerificationEmail()
      setVerifySent(true)
    } finally {
      setSendingVerify(false)
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
                아직 이메일 인증이 완료되지 않았어요. 메일이 오지 않았다면 스팸함을 확인하거나 다시
                보내보세요.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResendVerification}
                disabled={sendingVerify}
              >
                {verifySent ? '다시 보냈어요' : '인증 메일 다시 보내기'}
              </Button>
            </>
          )}
        </Card>
      )}

      <Card className="tf-reveal" icon="✨" title="이용 현황">
        <p className="tf-caption">오늘 남은 무료 추천 {remainingRecommendations}회</p>
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
