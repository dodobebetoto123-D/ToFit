import { NavLink } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { Icon } from '@/components/ui/Icon'

export function MobileTopBar() {
  return (
    <div className="tf-mobiletop">
      <NavLink to="/" aria-label="ToFit 홈">
        <Logo size="sm" />
      </NavLink>
      <div className="tf-mobiletop__tools">
        <NavLink to="/community" className="tf-icon-btn" aria-label="검색">
          <Icon name="search" size={19} />
        </NavLink>
        <NavLink to="/saved" className="tf-icon-btn" aria-label="찜한 코디">
          <Icon name="heart" size={19} />
        </NavLink>
      </div>
    </div>
  )
}
