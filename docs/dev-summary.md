# 개발 내용 정리 (2026-09-14 기준)

## 무엇을 만들었나
프로토타입(`colorsense.html` → `frontend/`)을 **BFF 계약 기반 구조**로 바꾸고, 기상청 데이터를 받아들일 수 있는 공통 모델·매핑·테스트·문서를 갖췄다. 아직 BFF 서버 자체는 없고, 그 자리를 로컬 어댑터(Open-Meteo)와 모의 BFF가 대신한다.

## 코드 구조 (`frontend/`)
| 경로 | 역할 | 상태 |
|---|---|---|
| `database/catalog.json` | 도시 카탈로그 38개(한국 20 · 해외 18). 격자·지역코드·측정소·타임존 | 4개 도시 `verify` 대기 |
| `src/lib/model.js` | 공통 날씨 모델 `WeatherComposition`, WMO→모델, 대기질 등급, 데이터 상태 계산 | 완료 |
| `src/lib/kma.js` | 기상청 SKY/PTY/PCP/SNO/LGT/VIS/특보/PM10 → 공통 모델 (BFF와 공유할 순수 함수) | 완료·테스트 26건 |
| `src/lib/color.js` | 컬러 엔진 `skyStops`. 계절 틴트 제거, −15° 앵커, showers 처리 | 완료·골든 154건 |
| `src/lib/weather.js` | 라벨 조합(기상청 용어), 컬러 테스트 프리셋 | 완료 |
| `src/lib/bff.js` | BFF 클라이언트 + GPS→최근접 도시 + 개발용 URL 파라미터 + 로컬 어댑터 | 어댑터는 BFF 배포 시 제거 |
| `src/hooks/useWeather.js` | CityWeather → 뷰 모델, `nextUpdateAt` 자동 갱신, 포커스 시 갱신, 배지 계산 | 완료 |
| `src/components/*` | 배지 행, 체감온도, 시간별 스트립, 출처 줄, 제스처 범위 수정, 계절 칩 제거 | 완료 |
| `spec/color-engine.json` | 앱 이식용 스펙 + 골든 케이스 (`npm run golden` 으로 생성) | 완료 |
| `tests/*.test.mjs` | 매핑·골든·라벨·카탈로그 37건 (`npm test`) | 통과 |
| `backend/mock-bff/server.mjs` | 모의 BFF (계약 동일, 시나리오 지원) | 완료 |
| `scripts/catalog-smoke.mjs` | 기상청·에어코리아 실응답 확인 (키 필요) | 키 발급 대기 |
| `scripts/gen-golden.mjs`, `scripts/dev-mock.mjs` | 골든 생성 · dev+mock 동시 실행 | 완료 |

## 계약 요약
`GET /v1/catalog`, `GET /v1/weather/{cityId}`, `GET /v1/weather?ids=` → `CityWeather { source, updatedAt, nextUpdateAt, current, hourly[24], daily[7], sun, airQuality{kind}, marine{kind} }`. 값이 없으면 `kind: "unavailable"` 로 명시. 상세는 `backend/api-contract.md`.

## 동작 규칙
- 위치: GPS → 카탈로그 최근접(한국 50km·해외 150km) → 없으면 서울 + "기본 도시" 배지. IP 위치·역지오코딩 없음.
- 갱신: `nextUpdateAt` 이후에만, 탭 복귀 시 필요하면 1회. 실패 시 마지막 데이터 유지.
- 배지: stale(다음 갱신 30분 초과) · delayed(3시간 초과) · offline · fallback · defaultCity. 배경색은 불변.
- 라벨: 맑음·구름조금·구름많음·흐림, 소나기 단독, 강도 접두어 약한/강한.

## 2026-09-14 추가 (D10)
- 웹 홈에 하단 도크 적용(위치 칩 + ⌃), 좌표 문자열은 도크로 이동, `locKind`(gps/default/picked) 뷰 모델 노출. iOS 디자인 노트 `design/ios-design-notes.html` v1.1.

## 남은 일
1. 공공데이터포털 활용신청 4건 → `npm run smoke` → `verify` 정리 (Theo·Joy)
2. BFF 구현·배포 (Theo·Mark) → `VITE_BFF_URL` 주입, 로컬 어댑터 제거
3. 도시 검색·즐겨찾기·좌우 스와이프 UI (Lisiena·Cecilia)
4. 네이티브 컬러 엔진 이식 후 골든 대조 (Lily·Joy)
