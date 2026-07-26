import { createContext } from 'react'
import type { UserProfile } from '@/types'

export interface AuthContextValue {
  user: UserProfile | null
  /** 최초 세션 복구가 끝났는지 */
  ready: boolean
  /** Firebase 키가 없으면 목업 세션으로 동작한다 */
  usingMockAuth: boolean
  /** 이메일 인증 완료 여부 (usingMockAuth일 땐 항상 true) */
  emailVerified: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, nickname: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>
  /** 온보딩(1분 진단) 완료 여부 */
  onboarded: boolean
  completeOnboarding: () => void
  /** 인증 메일 재전송 */
  resendVerificationEmail: () => Promise<void>
  /** Firebase에서 최신 인증 상태를 다시 확인한다 (메일 인증 후 새로고침 없이 반영) */
  /** 메일 링크를 누른 뒤 상태를 다시 확인한다 — 인증 완료면 true */
  refreshEmailVerified: () => Promise<boolean>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
