type Props = {
  size?: 'sm' | 'lg' | 'hero'
  animate?: boolean
}

export function BrandMark({ size = 'sm', animate }: Props) {
  const cls =
    size === 'hero'
      ? 'text-[clamp(2.6rem,7vw,4.6rem)] leading-[0.95]'
      : size === 'lg'
        ? 'text-3xl leading-none'
        : 'text-[1.35rem] leading-none'

  return (
    <div className={animate ? 'mp-brand' : undefined}>
      <p
        className={`font-display font-semibold tracking-tight text-[var(--color-ink)] ${cls}`}
      >
        Market<span className="text-[var(--color-accent)]">Pulse</span>
      </p>
    </div>
  )
}

/** Decorative pulse path — financial visual anchor, not a card */
export function PulseGlyph({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 320 80"
      fill="none"
      aria-hidden
    >
      <path
        className="mp-pulse-line"
        d="M8 52 H58 L78 20 L102 62 L128 34 L150 48 H210 L232 28 L258 58 L286 40 H312"
        stroke="var(--color-steel)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="312" cy="40" r="3.5" fill="var(--color-accent)" />
    </svg>
  )
}
