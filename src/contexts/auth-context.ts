import { createContext } from 'react'
import type { UserProfile } from '@/types'

export interface AuthContextValue {
  user: UserProfile | null
  /** 최초 세션 복구가 끝났는지 */
  ready: boolean
  /** Firebase 키가 없으면 목업 세션으로 동작한다 */
  usingMockAuth: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, nickname: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (patch: Partial<UserProfile>) => void
  /** 온보딩(1분 진단) 완료 여부 */
  onboarded: boolean
  completeOnboarding: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
