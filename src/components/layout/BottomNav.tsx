import { NavLink } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils'
import { MOBILE_NAV } from './nav-items'

export function BottomNav() {
  return (
    <nav className="tf-bottomnav" aria-label="하단 메뉴">
      {MOBILE_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => cn('tf-bottomnav__item', isActive && 'is-active')}
        >
          <Icon name={item.icon} size={22} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
