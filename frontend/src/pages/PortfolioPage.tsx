import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'

export function PortfolioPage() {
  return (
    <div>
      <PageHeader
        title="Portfolio"
        subtitle="개인 투자자산 모듈은 Phase 4에서 구현합니다. 거래 원장·XIRR·목표 배분은 이후 단계에서 연결됩니다."
      />
      <div className="max-w-xl rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/80 p-8">
        <p className="font-display text-2xl font-semibold text-[var(--color-ink)]">
          Coming in Phase 4
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
          종목·거래·평가·배당·환율 영향·자산배분 편차를 거시 노출과 함께 설명하는 화면이
          여기에 들어옵니다. 자동 매매 권유는 범위 밖입니다.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[#062016]"
        >
          Dashboard로 돌아가기
        </Link>
      </div>
    </div>
  )
}
