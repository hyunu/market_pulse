import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { EquityPage } from './pages/EquityPage'
import { GlobalMarketPage } from './pages/GlobalMarketPage'
import { LiquidityPage } from './pages/LiquidityPage'
import { MacroPage } from './pages/MacroPage'
import { PortfolioPage } from './pages/PortfolioPage'
import { RiskPage } from './pages/RiskPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="market" element={<GlobalMarketPage />} />
          <Route path="macro" element={<MacroPage />} />
          <Route path="liquidity" element={<LiquidityPage />} />
          <Route path="equity" element={<EquityPage />} />
          <Route path="risk" element={<RiskPage />} />
          <Route path="portfolio" element={<PortfolioPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
