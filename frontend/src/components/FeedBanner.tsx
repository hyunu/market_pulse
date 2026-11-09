import { useCallback, useEffect, useRef, useState } from 'react'
import { getFeedStatus, runCollectJob, type FeedStatus } from '../api/client'

const COOLDOWN_MS = 45_000

export function FeedBanner() {
  const [feed, setFeed] = useState<FeedStatus | null>(null)
  const [busy, setBusy] = useState<'yahoo' | 'fred' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [cooldownUntil, setCooldownUntil] = useState<Record<string, number>>({})
  const [now, setNow] = useState(Date.now())
  const inflight = useRef(false)

  const refresh = useCallback(async () => {
    const next = await getFeedStatus()
    setFeed(next)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  function remainSec(provider: string): number {
    const until = cooldownUntil[provider] || 0
    return Math.max(0, Math.ceil((until - now) / 1000))
  }

  async function onCollect(provider: 'yahoo' | 'fred') {
    if (inflight.current || busy) return
    if (remainSec(provider) > 0) {
      setMessage(`${provider} 쿨다운 ${remainSec(provider)}초`)
      return
    }
    inflight.current = true
    setBusy(provider)
    setMessage(null)
    const res = await runCollectJob(provider, { live: true })
    setCooldownUntil((prev) => ({ ...prev, [provider]: Date.now() + COOLDOWN_MS }))
    if (res.ok) {
      const upserted = Number(res.result.upserted ?? res.result.observations_upserted ?? 0)
      setMessage(`${provider} 수집 완료 · upsert ${upserted}`)
    } else if (res.error?.includes('429') || res.error?.toLowerCase().includes('retry')) {
      setMessage(res.error)
    } else {
      setMessage(res.error || `${provider} 수집 실패`)
    }
    await refresh()
    setBusy(null)
    inflight.current = false
  }

  if (!feed) return null

  const liveCount = Object.keys(feed.observation_counts || {}).length
  const notes = feed.notes || []
  const yahooLeft = remainSec('yahoo')
  const fredLeft = remainSec('fred')

  return (
    <div className="mp-banner mb-[var(--space-4)] space-y-[var(--space-2)]">
      <div className="flex flex-wrap items-end justify-between gap-[var(--space-3)]">
        <div className="min-w-0">
          <p className="text-[13px] leading-snug text-[var(--color-ink-soft)]">
            <strong className="text-[var(--color-accent-ink)]">FEED</strong>
            <span className="mx-2 text-[var(--color-line-strong)]">·</span>
            실관측 {liveCount}시리즈
            <span className="mx-2 text-[var(--color-line-strong)]">·</span>
            FRED {feed.fred_key_configured ? '키 OK' : '키 없음'}
          </p>
          <p className="mt-[var(--space-1)] text-[11px] text-[var(--color-muted)]">
            수집은 서버 API만 호출 · 연타 방지 쿨다운 {Math.round(COOLDOWN_MS / 1000)}초
          </p>
        </div>
        <div className="flex flex-wrap gap-[var(--space-2)]">
          <button
            type="button"
            disabled={busy !== null || yahooLeft > 0}
            onClick={() => void onCollect('yahoo')}
            className="min-h-9 border border-[var(--color-line-strong)] px-[var(--space-3)] py-[var(--space-2)] text-[11px] font-semibold tracking-wide text-[var(--color-ink-soft)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy === 'yahoo' ? 'Yahoo 수집 중…' : yahooLeft > 0 ? `Yahoo ${yahooLeft}s` : 'Yahoo 수집'}
          </button>
          <button
            type="button"
            disabled={busy !== null || fredLeft > 0}
            onClick={() => void onCollect('fred')}
            className="min-h-9 border border-[var(--color-accent)] px-[var(--space-3)] py-[var(--space-2)] text-[11px] font-semibold tracking-wide text-[var(--color-accent-ink)] disabled:cursor-not-allowed disabled:opacity-45"
            title="FRED_API_KEY는 백엔드 환경변수에서만 사용"
          >
            {busy === 'fred' ? 'FRED 수집 중…' : fredLeft > 0 ? `FRED ${fredLeft}s` : 'FRED 수집'}
          </button>
        </div>
      </div>
      {notes.slice(0, 1).map((n) => (
        <p key={n} className="text-[11px] leading-relaxed text-[var(--color-muted)]">
          {n}
        </p>
      ))}
      {message ? <p className="text-[12px] text-[var(--color-ink-soft)]">{message}</p> : null}
    </div>
  )
}
