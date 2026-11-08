# MarketPulse

글로벌 거시경제 분석과 개인 투자자산 관리를 통합한 **일일 금융 모니터링** 플랫폼입니다.

현재 저장소는 **Phase 1 데이터 기반 + Phase 2 시장 현황판**까지 포함합니다.

## 구성

| 경로 | 역할 |
| --- | --- |
| `backend/` | FastAPI (health, 지표·관측 조회, 수집 잡 트리거) |
| `collectors/` | FRED 수집 + BLS/BEA 스켈레톤 + Yahoo 시장 스켈레톤 |
| `scheduler/` | APScheduler 일일 잡 골격 |
| `database/migrations/` | PostgreSQL DDL |
| `config/indicators.yaml` | 초기 핵심 지표 30개 |
| `frontend/` | React + TypeScript + Tailwind + ECharts 대시보드 |
| `tests/` | 백엔드 단위 테스트 |

## 사전 준비

1. Docker / Docker Compose
2. (선택) Python 3.12+ — API·테스트
3. (선택) Node.js 22+ — 프론트 로컬 개발
4. [FRED API Key](https://fred.stlouisfed.org/docs/api/api_key.html) — 실수집 시

```bash
cp config/.env.example .env
# .env 에 FRED_API_KEY=... 를 채웁니다. 키는 절대 커밋하지 마세요.
```

## Docker Compose로 전체 기동

```bash
docker compose up --build -d
```

| 서비스 | URL |
| --- | --- |
| Frontend (현황판) | http://localhost:3000 |
| API health | http://localhost:8000/health |
| OpenAPI | http://localhost:8000/docs |
| PostgreSQL | `localhost:5432` (user/db/password: `marketpulse`) |

- `db` 최초 기동 시 `database/migrations/*.sql` 자동 적용
- `api` 기동 시 `indicators.yaml` → DB 동기화
- `frontend` 이미지는 nginx가 `/api`, `/health`를 `api:8000`으로 프록시

프론트만 재빌드:

```bash
docker compose up --build -d frontend
```

## 프론트엔드 로컬 개발 (Vite)

API가 `localhost:8000`에서 떠 있는 상태에서:

```bash
cd frontend
cp .env.example .env   # 선택
npm install
npm run dev
```

- 개발 서버: http://localhost:5173  
- Vite가 `/api`, `/health`를 `VITE_PROXY_TARGET`(기본 `http://localhost:8000`)으로 프록시합니다.  
- API가 없거나 관측이 비어 있으면 **샘플(목) 데이터로 자동 폴백**하며, 카드에 `api`/`mock` 배지가 표시됩니다.

프로덕션 빌드 확인:

```bash
cd frontend && npm run build && npm run preview
```

## 수동 수집

```bash
curl -X POST http://localhost:8000/api/v1/jobs/run \
  -H 'Content-Type: application/json' \
  -d '{"provider":"fred","job_type":"daily"}'

pip install -r backend/requirements.txt
python scripts/sync_indicators.py
python scripts/run_collect.py fred
```

Yahoo Finance는 **프로토타입 전용**이며, 상용 전 라이선스·약관 검토가 필요합니다.

## 백엔드 테스트

```bash
pip install -r backend/requirements.txt -r tests/requirements.txt
pytest -q
```

## 화면 메뉴 (Phase 2)

| 메뉴 | 내용 |
| --- | --- |
| Dashboard | 주요 지수·위험 요약·기간 차트 |
| Global Market | US/KR/CN 지수, VIX, 원달러 |
| Macro | 성장·고용·물가 |
| Liquidity | Fed 자산·M2·TGA·RRP(개별) + 금리 |
| Equity | 지수 프록시 (밸류 본지표는 Phase 3) |
| Risk | VIX·MOVE·HY·Stress·NFCI |
| Portfolio | Phase 4 placeholder |

모든 지표 카드/푸터에 **출처(provider/source_id)·기준일(as-of)** 을 표시합니다.

## 환경 변수

| 변수 | 설명 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL |
| `FRED_API_KEY` | FRED/ALFRED |
| `BLS_API_KEY` / `BEA_API_KEY` | 스켈레톤 |
| `INDICATORS_YAML` | 지표 YAML |
| `MARKET_COLLECTOR_LIVE` | Yahoo 실호출 |
| `VITE_API_BASE_URL` | 프론트 API base (비우면 동일 오리진) |

## Phase 로드맵

1. Phase 1 데이터 기반
2. **Phase 2 시장 현황판** ← 포함
3. Phase 3 Analytics / Regime / Scores
4. Phase 4 개인 포트폴리오

## 라이선스·고지

- FRED/BLS/BEA: 각 기관 이용 약관·귀속 요건 준수
- Yahoo Finance: 비공식·프로토타입. 재배포·상용 전 ToS 검토 필수
- 목 데이터는 데모 전용이며 실제 시장값이 아닙니다
