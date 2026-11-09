import { useEffect, useState } from 'react'
import { getBrief, type BriefPayload } from '../api/client'

export function AiBriefPanel() {
  const [brief, setBrief] = useState<BriefPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const data = await getBrief(true)
      if (!cancelled) {
        setBrief(data)
        setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="mp-rise border-t border-[var(--color-line)] pt-[var(--space-4)]">
      <div className="mb-[var(--space-3)] flex flex-wrap items-end justify-between gap-[var(--space-2)]">
        <div>
          <h2 className="mp-section-title">Daily brief</h2>
          <p className="mp-section-lead">
            {brief?.mode === 'ai'
              ? `AI · ${brief.provider || ''} / ${brief.model || ''}`
              : '규칙 기반 요약 (Settings에서 AI 연결 시 보강)'}
          </p>
        </div>
        <span className="mp-source">{brief?.mode || '…'}</span>
      </div>
      {loading ? (
        <p className="text-[13px] text-[var(--color-muted)]">브리프 작성 중…</p>
      ) : (
        <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-[var(--color-ink-soft)]">
          {brief?.text || '브리프를 만들 수 없습니다.'}
        </pre>
      )}
      {brief?.error ? (
        <p className="mt-[var(--space-2)] text-[11px] text-[var(--color-down)]">{brief.error}</p>
      ) : null}
    </section>
  )
}
