# MarketPulse Frontend (Phase 2)

React + TypeScript + Tailwind CSS + ECharts 시장 현황판입니다.

## 개발

```bash
npm install
npm run dev
```

Vite가 `/api`, `/health`를 `http://localhost:8000`으로 프록시합니다.  
API가 없거나 관측이 비면 샘플(목) 데이터로 폴백합니다.

## 빌드

```bash
npm run build
```

Docker: 저장소 루트에서 `docker compose up --build frontend`
