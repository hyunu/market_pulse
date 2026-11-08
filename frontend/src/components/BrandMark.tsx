type Props = {
  size?: 'sm' | 'lg' | 'hero'
  animate?: boolean
}

export function BrandMark({ size = 'sm', animate }: Props) {
  const cls =
    size === 'hero'
      ? 'text-[clamp(2.1rem,6.5vw,3.6rem)] leading-[0.92]'
      : size === 'lg'
        ? 'text-3xl leading-none'
        : 'text-[1.2rem] leading-none'

  return (
    <div className={animate ? 'mp-brand' : undefined}>
      <p className={`font-display font-semibold tracking-tight text-[var(--color-ink)] ${cls}`}>
        Market<span className="text-[var(--color-accent)]">Pulse</span>
      </p>
    </div>
  )
}

/** Visible financial pulse path — hero visual anchor */
export function PulseGlyph({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 340 88" fill="none" aria-hidden>
      <path
        d="M4 58 H48"
        stroke="var(--color-line-strong)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        className="mp-pulse-line"
        d="M48 58 L78 58 L98 18 L124 70 L152 32 L176 52 H230 L254 24 L282 64 L310 38 H336"
        stroke="var(--color-steel)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="336" cy="38" r="4" fill="var(--color-accent)" />
      <circle cx="336" cy="38" r="8" stroke="var(--color-accent)" strokeOpacity="0.35" fill="none" />
    </svg>
  )
}
