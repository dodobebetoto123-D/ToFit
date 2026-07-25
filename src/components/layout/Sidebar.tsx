import { NavLink } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { Mascot } from '@/components/brand/Mascot'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils'
import { PRIMARY_NAV, SECONDARY_NAV, UTILITY_NAV, type NavItem } from './nav-items'

function SidebarLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) => cn('tf-sidebar__link', isActive && 'is-active')}
    >
      <Icon name={item.icon} size={19} />
      <span>{item.label}</span>
    </NavLink>
  )
}

export function Sidebar() {
  return (
    <aside className="tf-sidebar">
      <NavLink to="/" className="tf-sidebar__brand" aria-label="ToFit 홈">
        <Logo size="sm" />
      </NavLink>

      <nav className="tf-sidebar__nav" aria-label="주 메뉴">
        {PRIMARY_NAV.map((item) => (
          <SidebarLink key={item.to} item={item} />
        ))}

        <hr className="tf-sidebar__divider" />

        {SECONDARY_NAV.map((item) => (
          <SidebarLink key={item.to} item={item} />
        ))}

        <hr className="tf-sidebar__divider" />

        {UTILITY_NAV.map((item) => (
          <SidebarLink key={item.to} item={item} />
        ))}
      </nav>

      <div className="tf-sidebar__promo">
        <p className="tf-sidebar__promo-title">ToFit 프리미엄</p>
        <p className="tf-sidebar__promo-desc">
          광고 없이 무제한 추천,
          <br />
          체형 정밀 분석까지
        </p>
        <NavLink to="/settings" className="tf-sidebar__promo-cta">
          자세히 보기
        </NavLink>
        <Mascot size={44} mood="happy" className="tf-sidebar__promo-mascot" />
      </div>
    </aside>
  )
}
