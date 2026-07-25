import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from '@/lib/firebase'
import { fetchUserProfile, saveUserProfile, subscribeUserProfile } from '@/services/firestoreProfile'
import { personalColorPalette } from '@/lib/labels'
import type { UserProfile } from '@/types'
import { AuthContext, type AuthContextValue } from './auth-context'

const PROFILE_KEY = 'tofit.mockProfile'

function readStoredMockProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? (JSON.parse(raw) as UserProfile) : null
  } catch {
    return null
  }
}

function buildProfile(uid: string, email: string, nickname: string): UserProfile {
  const now = new Date().toISOString()
  return {
    id: uid,
    email,
    nickname,
    gender: 'UNISEX',
    height: 170,
    weight: 60,
    personalColor: 'SUMMER_COOL',
    bodyShape: 'NATURAL',
    preferredStyles: [],
    colorPalette: personalColorPalette.SUMMER_COOL,
    onboarded: false,
    following: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [ready, setReady] = useState(false)
  const [emailVerified, setEmailVerified] = useState(true)

  // Firebase 미설정 시(로컬 개발용 목업 모드) 세션 복구
  useEffect(() => {
    if (!ready && (!isFirebaseConfigured || !auth)) {
      setUser(readStoredMockProfile())
      setReady(true)
    }
  }, [ready])

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return

    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setEmailVerified(true)
        setReady(true)
        return
      }

      setEmailVerified(firebaseUser.emailVerified)

      let profile = await fetchUserProfile(firebaseUser.uid)
      if (!profile) {
        const nickname = firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'user'
        profile = buildProfile(firebaseUser.uid, firebaseUser.email ?? '', nickname)
        await saveUserProfile(profile)
      }
      setUser(profile)
      setReady(true)
    })
  }, [])

  // 프로필 실시간 구독 — 다른 기기·탭에서의 변경도 반영한다
  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !user) return
    const uid = user.id
    const unsubscribe = subscribeUserProfile(uid, (latest) => {
      if (latest) setUser(latest)
    })
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // 목업 모드에서만 localStorage가 소스 오브 트루스다 (Firestore 연동 시엔 그쪽이 진실).
  // ready 이전에 실행하면 초기 렌더의 user=null로 방금 복구한 프로필을 지워버리니 가드한다.
  useEffect(() => {
    if (isFirebaseConfigured || !ready) return
    if (user) localStorage.setItem(PROFILE_KEY, JSON.stringify(user))
    else localStorage.removeItem(PROFILE_KEY)
  }, [user, ready])

  const signIn = useCallback(async (email: string, password: string) => {
    if (isFirebaseConfigured && auth) {
      await signInWithEmailAndPassword(auth, email, password)
      return
    }
    setUser(buildProfile(`mock_${email}`, email, email.split('@')[0] || 'user'))
  }, [])

  const signUp = useCallback(async (email: string, password: string, nickname: string) => {
    if (isFirebaseConfigured && auth) {
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      await sendEmailVerification(credential.user)
      return
    }
    setUser(buildProfile(`mock_${email}`, email, nickname))
  }, [])

  const signOut = useCallback(async () => {
    if (isFirebaseConfigured && auth) await firebaseSignOut(auth)
    setUser(null)
  }, [])

  const updateProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      if (!user) return
      const updated = { ...user, ...patch, updatedAt: new Date().toISOString() }
      setUser(updated)
      if (isFirebaseConfigured) await saveUserProfile(updated)
    },
    [user],
  )

  const completeOnboarding = useCallback(() => {
    void updateProfile({ onboarded: true })
  }, [updateProfile])

  const resendVerificationEmail = useCallback(async () => {
    if (auth?.currentUser) await sendEmailVerification(auth.currentUser)
  }, [])

  const refreshEmailVerified = useCallback(async () => {
    if (!auth?.currentUser) return
    await auth.currentUser.reload()
    setEmailVerified(auth.currentUser.emailVerified)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      usingMockAuth: !isFirebaseConfigured,
      emailVerified: !isFirebaseConfigured || emailVerified,
      signIn,
      signUp,
      signOut,
      updateProfile,
      onboarded: user?.onboarded ?? false,
      completeOnboarding,
      resendVerificationEmail,
      refreshEmailVerified,
    }),
    [
      user,
      ready,
      emailVerified,
      signIn,
      signUp,
      signOut,
      updateProfile,
      completeOnboarding,
      resendVerificationEmail,
      refreshEmailVerified,
    ],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
