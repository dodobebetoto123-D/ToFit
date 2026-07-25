import { use } from 'react'
import { AuthContext } from '@/contexts/auth-context'

export function useAuth() {
  const context = use(AuthContext)
  if (!context) throw new Error('useAuth 는 AuthProvider 안에서만 쓸 수 있습니다.')
  return context
}
