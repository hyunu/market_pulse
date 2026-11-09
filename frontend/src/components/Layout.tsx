import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getHealth } from '../api/client'
import type { Health } from '../api/types'
import { BrandMark } from './BrandMark'

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/market', label: 'Global Market' },
  { to: '/macro', label: 'Macro' },
  { to: '/liquidity', label: 'Liquidity' },
  { to: '/equity', label: 'Equity' },
  { to: '/risk', label: 'Risk' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/settings', label: 'Settings' },
]

export function Layout() {
  const [health, setHealth] = useState<Health | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    void getHealth().then(setHealth)
    const id = window.setInterval(() => {
      void getHealth().then(setHealth)
    }, 30000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  return (
    <div className="min-h-screen">
      <div className="mp-shell mx-auto flex min-h-screen gap-0 lg:gap-[var(--space-6)]">
        <aside className="sticky top-0 hidden h-screen w-[12.75rem] shrink-0 flex-col border-r border-[var(--color-line)] py-[var(--space-5)] pr-[var(--space-4)] md:flex">
          <div className="mb-[var(--space-6)]">
            <BrandMark size="sm" />
            <p className="mt-[var(--space-2)] text-[10px] leading-relaxed tracking-wide text-[var(--color-muted)]">
              GLOBAL DAILY MONITOR
            </p>
          </div>
          <nav className="flex flex-1 flex-col gap-[var(--space-1)]">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `relative px-[var(--space-2)] py-[var(--space-2)] text-[12.5px] font-medium transition-colors ${
                    isActive
                      ? 'text-[var(--color-ink)]'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-ink-soft)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive ? (
                      <span className="absolute left-0 top-1/2 h-3.5 w-[2px] -translate-y-1/2 bg-[var(--color-accent)]" />
                    ) : null}
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto border-t border-[var(--color-line)] pt-[var(--space-3)] text-[9px] tracking-[0.08em] text-[var(--color-muted)]">
            <p>FEED</p>
            <p className="mt-[var(--space-1)] font-medium tracking-normal text-[var(--color-ink-soft)]">
              {health
                ? `${health.status} · ${health.db}${health.fred_key_configured === false ? ' · no FRED key' : ''}`
                : 'offline'}
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-canvas)_88%,white)] px-[var(--space-3)] py-[var(--space-2)] backdrop-blur-sm md:hidden">
            <BrandMark size="sm" />
            <button
              type="button"
              className="min-h-9 min-w-9 px-[var(--space-2)] text-[12px] font-medium text-[var(--color-ink-soft)]"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? 'Close' : 'Menu'}
            </button>
          </header>
          {menuOpen ? (
            <div className="border-b border-[var(--color-line)] bg-[var(--color-panel)] px-[var(--space-2)] py-[var(--space-2)] md:hidden">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `block px-[var(--space-2)] py-[var(--space-3)] text-[14px] ${
                      isActive ? 'font-semibold text-[var(--color-ink)]' : 'text-[var(--color-muted)]'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ) : null}

          <main
            key={location.pathname}
            className="mp-fade flex-1 px-[var(--space-3)] py-[var(--space-5)] sm:px-[var(--space-4)] md:px-[var(--space-2)] md:py-[var(--space-6)]"
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
