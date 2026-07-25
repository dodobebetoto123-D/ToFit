import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from '@/lib/firebase'
import { mockUser } from '@/data/mock'
import { personalColorPalette } from '@/lib/labels'
import type { UserProfile } from '@/types'
import { AuthContext, type AuthContextValue } from './auth-context'

const PROFILE_KEY = 'tofit.profile'
const ONBOARDED_KEY = 'tofit.onboarded'

function readStoredProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? (JSON.parse(raw) as UserProfile) : null
  } catch {
    return null
  }
}

function buildProfile(email: string, nickname: string): UserProfile {
  const now = new Date().toISOString()
  return {
    id: `user_${nickname}`,
    email,
    nickname,
    gender: 'UNISEX',
    height: 170,
    weight: 60,
    personalColor: 'SUMMER_COOL',
    bodyShape: 'NATURAL',
    preferredStyles: [],
    colorPalette: personalColorPalette.SUMMER_COOL,
    createdAt: now,
    updatedAt: now,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [ready, setReady] = useState(false)
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem(ONBOARDED_KEY) === 'true')

  // 프로필은 로컬에 캐싱한다. Firestore 연동 시 이 부분을 users/{uid} 문서 구독으로 교체한다.
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setUser(readStoredProfile())
      setReady(true)
      return
    }

    return onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setReady(true)
        return
      }
      const cached = readStoredProfile()
      const nickname = firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'user'
      setUser(
        cached?.email === firebaseUser.email
          ? cached
          : { ...buildProfile(firebaseUser.email ?? '', nickname), id: firebaseUser.uid },
      )
      setReady(true)
    })
  }, [])

  // ready 이전에는 실행하지 않는다 — 세션 복구 effect가 아직 user를 채우기 전이라
  // 초기 렌더의 user=null 값으로 이 effect가 먼저 돌면 방금 복구한 프로필을 지워버린다.
  useEffect(() => {
    if (!ready) return
    if (user) localStorage.setItem(PROFILE_KEY, JSON.stringify(user))
    else localStorage.removeItem(PROFILE_KEY)
  }, [user, ready])

  const signIn = useCallback(async (email: string, password: string) => {
    if (isFirebaseConfigured && auth) {
      await signInWithEmailAndPassword(auth, email, password)
      return
    }
    // 목업 모드 — 데모 시드 계정이면 시드 프로필을, 아니면 새 프로필을 만든다.
    const profile =
      email === mockUser.email ? mockUser : buildProfile(email, email.split('@')[0] || 'user')
    setUser(profile)
  }, [])

  const signUp = useCallback(async (email: string, password: string, nickname: string) => {
    if (isFirebaseConfigured && auth) {
      await createUserWithEmailAndPassword(auth, email, password)
      setUser((prev) => prev ?? buildProfile(email, nickname))
      return
    }
    setUser(buildProfile(email, nickname))
  }, [])

  const signOut = useCallback(async () => {
    if (isFirebaseConfigured && auth) await firebaseSignOut(auth)
    setUser(null)
    setOnboarded(false)
    localStorage.removeItem(ONBOARDED_KEY)
  }, [])

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setUser((prev) =>
      prev ? { ...prev, ...patch, updatedAt: new Date().toISOString() } : prev,
    )
  }, [])

  const completeOnboarding = useCallback(() => {
    setOnboarded(true)
    localStorage.setItem(ONBOARDED_KEY, 'true')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      usingMockAuth: !isFirebaseConfigured,
      signIn,
      signUp,
      signOut,
      updateProfile,
      onboarded,
      completeOnboarding,
    }),
    [user, ready, signIn, signUp, signOut, updateProfile, onboarded, completeOnboarding],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
