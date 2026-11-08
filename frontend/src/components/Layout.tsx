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
      <div className="mp-shell mx-auto flex min-h-screen gap-0 lg:gap-10">
        <aside className="sticky top-0 hidden h-screen w-[12.75rem] shrink-0 flex-col border-r border-[var(--color-line)] py-6 pr-3 md:flex">
          <div className="mb-8">
            <BrandMark size="sm" />
            <p className="mt-1.5 text-[10px] leading-relaxed tracking-wide text-[var(--color-muted)]">
              GLOBAL DAILY MONITOR
            </p>
          </div>
          <nav className="flex flex-1 flex-col gap-0.5">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `relative px-2 py-1.5 text-[12.5px] font-medium transition-colors ${
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
          <div className="mt-auto border-t border-[var(--color-line)] pt-2.5 text-[9px] tracking-[0.08em] text-[var(--color-muted)]">
            <p>FEED</p>
            <p className="mt-1 font-medium tracking-normal text-[var(--color-ink-soft)]">
              {health ? `${health.status} · ${health.db}` : 'offline · sample'}
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-canvas)_88%,white)] px-3 py-2.5 backdrop-blur-sm md:hidden">
            <BrandMark size="sm" />
            <button
              type="button"
              className="min-h-9 min-w-9 px-2 text-[12px] font-medium text-[var(--color-ink-soft)]"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? 'Close' : 'Menu'}
            </button>
          </header>
          {menuOpen ? (
            <div className="border-b border-[var(--color-line)] bg-[var(--color-panel)] px-2 py-2 md:hidden">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `block px-2 py-2.5 text-[14px] ${
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
            className="mp-fade flex-1 px-3 py-5 sm:px-4 md:px-1 md:py-7 lg:px-2"
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
