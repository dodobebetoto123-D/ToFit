import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Mascot } from '@/components/brand/Mascot'
import { useAuth } from '@/hooks/useAuth'

export function RequireAuth() {
  const { user, ready, onboarded } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <div className="tf-splash">
        <Mascot size={72} floating />
        <p className="tf-caption">옷장을 여는 중…</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  // 진단을 안 끝냈으면 온보딩으로 보낸다.
  if (!onboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
