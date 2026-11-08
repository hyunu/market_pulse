import { useCallback, useEffect, useState } from 'react'
import { getFeedStatus, runCollectJob, type FeedStatus } from '../api/client'

export function FeedBanner() {
  const [feed, setFeed] = useState<FeedStatus | null>(null)
  const [busy, setBusy] = useState<'yahoo' | 'fred' | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const next = await getFeedStatus()
    setFeed(next)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function onCollect(provider: 'yahoo' | 'fred') {
    setBusy(provider)
    setMessage(null)
    const res = await runCollectJob(provider, { live: true })
    if (res.ok) {
      const upserted = Number(res.result.upserted ?? res.result.observations_upserted ?? 0)
      setMessage(`${provider} 수집 완료 · upsert ${upserted}`)
    } else {
      setMessage(res.error || `${provider} 수집 실패`)
    }
    await refresh()
    setBusy(null)
  }

  if (!feed) return null

  const liveCount = Object.keys(feed.observation_counts || {}).length
  const notes = feed.notes || []

  return (
    <div className="mp-banner mb-[var(--space-4)] space-y-[var(--space-2)]">
      <div className="flex flex-wrap items-end justify-between gap-[var(--space-3)]">
        <p className="min-w-0">
          <strong>FEED</strong>
          <span className="mx-2 text-[var(--color-line-strong)]">·</span>
          실관측 시리즈 {liveCount}개
          <span className="mx-2 text-[var(--color-line-strong)]">·</span>
          FRED 키 {feed.fred_key_configured ? '설정됨' : '미설정(로컬)'}
        </p>
        <div className="flex flex-wrap gap-[var(--space-2)]">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void onCollect('yahoo')}
            className="border border-[var(--color-line-strong)] px-[var(--space-3)] py-[var(--space-1)] text-[11px] font-semibold tracking-wide text-[var(--color-ink-soft)] disabled:opacity-50"
          >
            {busy === 'yahoo' ? 'Yahoo…' : 'Yahoo 수집'}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void onCollect('fred')}
            className="border border-[var(--color-accent)] px-[var(--space-3)] py-[var(--space-1)] text-[11px] font-semibold tracking-wide text-[var(--color-accent-ink)] disabled:opacity-50"
            title="FRED_API_KEY는 백엔드 환경변수에서만 사용됩니다"
          >
            {busy === 'fred' ? 'FRED…' : 'FRED 수집'}
          </button>
        </div>
      </div>
      <p className="text-[11px] text-[var(--color-muted)]">
        키는 브라우저에 두지 않습니다. 수집은 백엔드 <code className="text-[10px]">/api/v1/jobs/run</code> 만
        호출합니다.
      </p>
      {notes.slice(0, 2).map((n) => (
        <p key={n} className="text-[11px] text-[var(--color-muted)]">
          {n}
        </p>
      ))}
      {message ? (
        <p className="text-[11px] text-[var(--color-ink-soft)]">{message}</p>
      ) : null}
    </div>
  )
}
