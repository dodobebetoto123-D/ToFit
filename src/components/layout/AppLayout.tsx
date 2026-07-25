import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { Header } from './Header'
import { MobileTopBar } from './MobileTopBar'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const { pathname } = useLocation()

  return (
    <div className="tf-shell">
      <Sidebar />
      <div className="tf-shell__main">
        <Header />
        <MobileTopBar />
        {/* key 로 경로가 바뀔 때마다 리마운트 → ⑤ page 프리셋 등장 모션이 매번 재생된다 */}
        <main className="tf-shell__content" key={pathname}>
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
