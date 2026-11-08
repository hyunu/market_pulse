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
  const location = useLocation()

  useEffect(() => {
    void getHealth().then(setHealth)
    const id = window.setInterval(() => {
      void getHealth().then(setHealth)
    }, 30000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[72rem] gap-0 lg:gap-10">
        <aside className="sticky top-0 hidden h-screen w-[13.5rem] shrink-0 flex-col border-r border-[var(--color-line)] py-7 pr-4 md:flex">
          <div className="mb-10">
            <BrandMark size="sm" />
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-muted)]">
              Global daily monitor
            </p>
          </div>
          <nav className="flex flex-1 flex-col gap-0.5">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `relative px-2 py-2 text-[13px] font-medium transition-colors ${
                    isActive
                      ? 'text-[var(--color-ink)]'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-ink-soft)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive ? (
                      <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 bg-[var(--color-accent)]" />
                    ) : null}
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto border-t border-[var(--color-line)] pt-3 text-[10px] tracking-wide text-[var(--color-muted)]">
            <p>FEED</p>
            <p className="mt-1 font-medium text-[var(--color-ink-soft)]">
              {health ? `${health.status} · ${health.db}` : 'offline · sample'}
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3 md:hidden">
            <BrandMark size="sm" />
            <details className="relative">
              <summary className="cursor-pointer list-none px-2 py-1 text-xs text-[var(--color-muted)]">
                Menu
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-48 border border-[var(--color-line)] bg-[var(--color-panel)] p-2">
                {NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className="block px-2 py-1.5 text-sm text-[var(--color-ink)]"
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </details>
          </header>
          <main
            key={location.pathname}
            className="mp-fade flex-1 px-4 py-6 md:px-1 md:py-8 lg:px-2"
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
