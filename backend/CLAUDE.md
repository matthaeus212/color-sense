# backend/ — Theo (백엔드)

## 책임

API 계약, 인증, 비즈니스 로직, DB 연동. `database/`도 Theo 소유(카탈로그·테이블 설계) — 자세한 내용은 아래 참고.

## 현재 상태

- `api-contract.md` — CityWeather 계약 정의 완료
- `mock-bff/server.mjs` — 모의 BFF(실 계약과 동일 스키마, 시나리오 지원: `stale`/`delayed`/`fallback`/`error`/`slow`)
- `bff/` — 실제 BFF(TypeScript + Hono + Zod) 골격 동작. 기상청·천문연·Open-Meteo 실 응답으로 확인함
  - 루트에서 `npm run bff`(빌드 후 실행) · `npm run bff:dev`(watch) → `http://localhost:8788`
  - 키는 `backend/.env.local`(git 제외). 키가 없으면 모든 도시를 Open-Meteo 로 응답한다
- `../packages/core` — 공통 모델·기상청 매핑의 TypeScript 원본. 웹(`frontend/src/lib`)과의 동치는 `packages/core/tests/parity.test.mjs` 가 지킨다

### BFF 구조

| 파일 | 역할 |
|---|---|
| `bff/src/app.ts` | 라우트 3개 + `/health`, 입력 검증, CORS |
| `bff/src/service.ts` | 캐시 → 소스 호출 → 폴백 → 계약 검증 순서의 오케스트레이션 |
| `bff/src/sources/` | 기상청 4종 · 에어코리아 · 천문연 · Open-Meteo 호출 |
| `bff/src/build/` | 원본 → `CityWeather` 조립 (`kmaCity.ts`, `openMeteoCity.ts`) |
| `bff/src/contract.ts` | Zod 계약. 응답 직전에 검증해서 깨진 응답이 화면에 도달하지 않게 한다 |
| `bff/src/time.ts` | 기상청 발표 시각 계산(초단기 :40/:30, 단기 8회, 중기 06·18시) |

### 키 상태 (2026-09-16 실 호출로 확인)

| 서비스 | 상태 |
|---|---|
| 기상청 단기·초단기·중기예보 | 정상 |
| 천문연 출몰시각 | 정상 |
| 에어코리아 대기오염정보 | `NO_OPENAPI_SERVICE_ERROR` — 활용신청 미승인으로 보임. 대기질은 `kind:"unavailable"` 로 내려간다 |

## 계약 요약

`GET /v1/catalog`, `GET /v1/weather/{cityId}`, `GET /v1/weather?ids=` → `CityWeather { source, updatedAt, nextUpdateAt, current, hourly[24], daily[7], sun, airQuality{kind}, marine{kind} }`. 값이 없으면 `kind:"unavailable"`로 명시한다 — 0이나 null로 감춰서 "정상"처럼 보이게 하지 않는다.

## 지켜야 할 것

- 클라이언트는 절대 외부 API를 직접 호출하지 않는다 — BFF가 유일한 관문
- 기상청(SKY/PTY/PCP/특보/시정/PM10) + Open-Meteo(WMO) → 공통 모델 `{sky, precip, inten, fog, storm, dust}`로 정규화해서 내려준다. `frontend/src/lib/kma.js`의 순수 함수가 기준(BFF와 공유 가능하게 설계됨)
- 한국은 발표 시각 기준 스케줄 수집(하루 약 2,900건, 10,000건 한도 내), 해외는 수요 기반 캐시(최근 조회된 도시만 갱신)
- 기상청 장애 시 Open-Meteo로 자동 폴백 + 응답의 `source` 필드에 명시, 화면엔 "대체 데이터" 배지만 노출
- 공공데이터 쿼터: 개발계정 일 10,000건, API허브 일 20,000건 — 초과 방지 확인 필수

## database/ 카탈로그

`database/catalog.json` — 도시 38개(한국 20 · 해외 18). 각 행: nx/ny 격자, 중기예보 regId(육상·기온), 에어코리아 측정소, 해안 여부, 타임존, 한/영 표기. 4개 도시는 `verify:true`(실 API 미확인) — `npm run smoke`로 확정 후 플래그 제거.

## 다음 할 일 (`docs/roadmap.md` 참고)

1. (외부 대기) 에어코리아 활용신청 승인 — 승인되면 `airkorea.ts` 는 그대로 두고 키만 넣으면 `kind:"observed"` 로 바뀐다
2. 캐시를 DynamoDB(TTL 24h)로 — 지금은 프로세스 메모리(`cache.ts`)라 Lambda 인스턴스마다 따로 논다. Mark의 스택과 함께
3. 발표 시각 기준 수집 스케줄(EventBridge) — 지금은 요청이 올 때 채우는 방식
4. `verify:true` 4개 도시(`KR-YSU`·`KR-MPK`·`KR-ADG`·`KR-HSG`) — 기상청 격자·중기 regId 는 확인됨. 에어코리아 측정소명은 승인 후 확인하고 플래그 제거
5. 특보(`warnings`)·시정(`VIS`) 연동 — `fromKma` 는 이미 받지만 수집원이 아직 없다(storm/fog 정확도)
