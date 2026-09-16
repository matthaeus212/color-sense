# backend/ — Theo (백엔드)

## 책임

API 계약, 인증, 비즈니스 로직, DB 연동. `database/`도 Theo 소유(카탈로그·테이블 설계) — 자세한 내용은 아래 참고.

## 현재 상태

- `api-contract.md` — CityWeather 계약 정의 완료
- `mock-bff/server.mjs` — 모의 BFF(실 계약과 동일 스키마, 시나리오 지원: `stale`/`delayed`/`fallback`/`error`/`slow`)
- 실제 BFF(Node 22 + TypeScript + Hono + Zod)는 아직 미구현 — 키 발급을 기다릴 필요 없이 지금 골격 작업 시작 가능

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

1. (최우선, 외부 대기) 공공데이터포털 활용신청 4건 상태 확인 — 기상청 단기·중기예보, 에어코리아, 천문연
2. 실제 BFF 골격 구현 착수 — `packages/core`(model·kma·color) 공유 패키지 분리부터
3. 키 발급 후 `KMA_KEY=… AIR_KEY=… npm run smoke -- <cityId>` → verify 도시 확정 → 실 데이터 전환
