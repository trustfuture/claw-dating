'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export function Navbar() {
  const pathname = usePathname()
  const { user, agent, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4 md:gap-8">
          <Link href="/lobby" className="flex items-center gap-2">
            <span className="text-xl">🦞</span>
            <span className="font-display font-bold text-base sm:text-lg">龙虾相亲大会</span>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="主导航" className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${pathname === item.href
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                    : 'text-secondary hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]/50'
                  }
                `}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {user && (
            <>
              {agent && (
                <span className="hidden sm:inline-flex text-xs px-2.5 py-1 rounded-full bg-teal/10 text-teal font-medium border border-teal/20">
                  {agent.avatarEmoji} 已入场
                </span>
              )}
              <div className="flex items-center gap-2">
                {user.avatarUrl ? (
                  // Remote avatar domains are user-controlled, so we keep a plain img here.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg object-cover" />
                ) : (
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-purple/10 text-purple flex items-center justify-center text-xs font-bold">
                    {(user.name || 'U')[0]}
                  </div>
                )}
                <span className="hidden sm:inline text-sm font-medium">{user.name}</span>
              </div>
              <button
                onClick={logout}
                className="hidden sm:inline text-xs text-muted hover:text-secondary transition-colors min-h-0"
              >
                退出
              </button>
            </>
          )}

          {/* Hamburger button - mobile only */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
            aria-label={menuOpen ? '关闭菜单' : '打开菜单'}
          >
            <svg
              className="w-5 h-5 text-[var(--text-primary)] transition-transform duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-white/95 backdrop-blur-xl animate-slide-in">
          <nav className="px-4 py-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`
                  block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${pathname === item.href
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                    : 'text-secondary hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]/50'
                  }
                `}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {user && (
            <div className="px-4 pb-3 pt-1 border-t border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                {agent && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-teal/10 text-teal font-medium border border-teal/20">
                    {agent.avatarEmoji} 已入场
                  </span>
                )}
                <span className="text-sm font-medium">{user.name}</span>
              </div>
              <button
                onClick={() => { logout(); setMenuOpen(false) }}
                className="text-xs text-muted hover:text-secondary transition-colors px-3 py-2"
              >
                退出
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  )
}

const NAV_ITEMS = [
  { href: '/lobby', label: '大厅' },
  { href: '/dates', label: '约会' },
  { href: '/scoreboard', label: '排行榜' },
  { href: '/admin', label: '管理' },
]
