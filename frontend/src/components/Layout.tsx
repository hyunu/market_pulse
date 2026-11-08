import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getHealth } from '../api/client'
import type { Health } from '../api/types'

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

  useEffect(() => {
    void getHealth().then(setHealth)
    const id = window.setInterval(() => {
      void getHealth().then(setHealth)
    }, 30000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-0 md:gap-6">
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-panel-2)]/60 px-4 py-6 backdrop-blur md:flex">
          <div className="mb-8">
            <p className="font-display text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              MarketPulse
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-muted)]">
              Daily global market monitor
            </p>
          </div>
          <nav className="flex flex-1 flex-col gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                      : 'text-[var(--color-muted)] hover:bg-white/5 hover:text-[var(--color-ink)]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto rounded-lg border border-[var(--color-line)] px-3 py-2 text-[11px]">
            <p className="text-[var(--color-muted)]">API health</p>
            <p className="mt-1 font-semibold text-[var(--color-ink)]">
              {health
                ? `${health.status} · db ${health.db}`
                : 'unreachable (mock fallback)'}
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3 md:hidden">
            <p className="font-display text-xl font-semibold">MarketPulse</p>
            <details className="relative">
              <summary className="cursor-pointer list-none rounded-md border border-[var(--color-line)] px-3 py-1 text-xs text-[var(--color-muted)]">
                메뉴
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] p-2 shadow-xl">
                {NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className="block rounded px-2 py-1.5 text-sm text-[var(--color-ink)] hover:bg-white/5"
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </details>
          </header>
          <main className="flex-1 px-4 py-6 md:px-2 md:py-8 lg:px-4">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
