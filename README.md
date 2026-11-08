# MarketPulse

글로벌 거시경제 분석과 개인 투자자산 관리를 통합한 **일일 금융 모니터링** 플랫폼입니다.

현재 저장소는 **Phase 1 — 데이터 기반** 구현입니다. 대시보드 UI 본구현은 Phase 2입니다.

## 구성

| 경로 | 역할 |
| --- | --- |
| `backend/` | FastAPI (health, 지표·관측 조회, 수집 잡 트리거) |
| `collectors/` | FRED 수집 + BLS/BEA 스켈레톤 + Yahoo 시장 스켈레톤 |
| `scheduler/` | APScheduler 일일 잡 골격 |
| `database/migrations/` | PostgreSQL DDL |
| `config/indicators.yaml` | 초기 핵심 지표 30개 |
| `frontend/dist/` | Phase 1 플레이스홀더 정적 페이지 |
| `tests/` | 단위 테스트 |

## 사전 준비

1. Docker / Docker Compose
2. (선택) Python 3.12+ — 로컬에서 API·테스트 실행 시
3. [FRED API Key](https://fred.stlouisfed.org/docs/api/api_key.html) — 실제 수집 시 필요

```bash
cp config/.env.example .env
# .env 에 FRED_API_KEY=... 를 채웁니다. 키는 절대 커밋하지 마세요.
```

## Docker Compose로 기동

```bash
docker compose up --build -d
```

- API: http://localhost:8000/health  
- OpenAPI: http://localhost:8000/docs  
- Frontend placeholder: http://localhost:3000  
- PostgreSQL: `localhost:5432` / user·db·password `marketpulse`

최초 `db` 컨테이너 기동 시 `database/migrations/*.sql`이 자동 적용됩니다.  
API 기동 시 `config/indicators.yaml`을 `indicators` 테이블에 동기화합니다.

### 수동 수집

```bash
# API 경유
curl -X POST http://localhost:8000/api/v1/jobs/run \
  -H 'Content-Type: application/json' \
  -d '{"provider":"fred","job_type":"daily"}'

# 또는 호스트에서 (venv + DATABASE_URL/.env 설정 후)
pip install -r backend/requirements.txt
python scripts/sync_indicators.py
python scripts/run_collect.py fred
python scripts/run_collect.py yahoo          # 스켈레톤(네트워크 없음)
python scripts/run_collect.py yahoo --live   # 프로토타입 네트워크 호출
```

Yahoo Finance는 **프로토타입 전용**이며, 상용 전 라이선스·약관 검토가 필요합니다.

## 로컬 테스트

```bash
pip install -r backend/requirements.txt -r tests/requirements.txt
pytest -q
```

## 환경 변수

| 변수 | 설명 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 접속 URL |
| `FRED_API_KEY` | FRED/ALFRED |
| `BLS_API_KEY` | BLS (스켈레톤) |
| `BEA_API_KEY` | BEA (스켈레톤) |
| `INDICATORS_YAML` | 지표 YAML 경로 |
| `MARKET_COLLECTOR_LIVE` | `1`이면 스케줄러가 Yahoo 실호출 |

예시는 `config/.env.example`을 참고하세요.

## Phase 로드맵

1. **Phase 1** 데이터 기반 ← 현재
2. **Phase 2** 시장 현황판 (React + ECharts)
3. **Phase 3** Analytics / Regime / Scores
4. **Phase 4** 개인 포트폴리오

설계·TRS는 프로젝트 Context 문서(`technical-requirements.md`)를 기준으로 합니다.

## 라이선스·고지

- FRED/BLS/BEA: 각 기관 이용 약관·귀속 요건 준수
- Yahoo Finance: 비공식·프로토타입. 재배포·상용 전 ToS 검토 필수
