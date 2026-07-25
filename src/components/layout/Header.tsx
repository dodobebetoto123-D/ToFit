import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

export function Header() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')

  return (
    <header className="tf-header">
      <div className="tf-header__tools">
        <form
          className="tf-search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault()
            navigate(`/community?q=${encodeURIComponent(query)}`)
          }}
        >
          <Icon name="search" size={17} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="아이템을 입력해 보세요"
            aria-label="검색"
          />
        </form>

        <div className="tf-header__user">
          <button
            type="button"
            className={cn('tf-header__user-btn', menuOpen && 'is-open')}
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <Avatar nickname={user?.nickname ?? '게스트'} size={28} />
            <span className="tf-header__user-name">{user?.nickname ?? '게스트'}</span>
            <Icon name="chevron-down" size={15} />
          </button>

          {menuOpen && (
            <div className="tf-menu" role="menu">
              <NavLink to="/settings" role="menuitem" onClick={() => setMenuOpen(false)}>
                프로필 설정
              </NavLink>
              <NavLink to="/onboarding" role="menuitem" onClick={() => setMenuOpen(false)}>
                1분 진단 다시 하기
              </NavLink>
              <button
                type="button"
                role="menuitem"
                onClick={async () => {
                  setMenuOpen(false)
                  await signOut()
                  navigate('/login')
                }}
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
