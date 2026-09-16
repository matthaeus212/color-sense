# frontend/ — Lisiena (프론트엔드)

## 책임

웹 페이지, WebView 대응. `src/lib/bff.js`가 BFF 계약을 소비하고(현재는 로컬 Open-Meteo 어댑터가 대신), `src/hooks/useWeather.js`가 뷰 모델을 만든다.

## 실행 모드 (자세히는 `../docs/dev-setup.md`)

- `npm run dev` — 로컬 Open-Meteo 어댑터 호출(비상업·개발 전용)
- `npm run dev:mock` — 모의 BFF, **QA·디자인 기본 모드**
- `?city=KR-PUS` — 카탈로그 도시 강제, `?scenario=stale|delayed|fallback|error|slow` — 상태 시나리오

## 지켜야 할 것

- `nextUpdateAt` 이전엔 재요청하지 않는다 — 한 번 불러오고 끝나는 구조는 금지
- 위치: GPS → 카탈로그 최근접 도시 → 실패 시 서울 + "기본 도시" 배지 (조용한 폴백 금지, IP 위치·역지오코딩 없음)
- 제스처는 시트 핸들/헤더 영역으로 한정 — 시트 내부 스크롤로 시트가 닫히는 건 회귀 버그
- 배지: `stale`(다음 갱신 30분 초과) · `delayed`(3시간 초과) · `offline` · `fallback` · `defaultCity` — 배경색은 절대 불변
- 라벨은 기상청 용어, 소나기 단독 라벨, 계절 칩 없음

## BFF 전환 시 해야 할 것

`.env.local`에 `VITE_BFF_URL` 설정 → `src/lib/bff.js`의 `localAdapter` 제거.

## Joy 체크리스트 (여기서 실행)

`npm test`(매핑 26건 · 골든 154건 · 라벨 · 카탈로그, 총 37건), `npm run check`(테스트+빌드). 수동 QA는 `../docs/dev-setup.md` 4장 — GPS 허용/거부, 시트 내부 스크롤, 언어 전환, 시나리오 배지, 시간별 24칸/주간 7행, 해외 도시 대기질 "예측" 표기.

## 다음 할 일 (`../docs/roadmap.md` 참고)

Cecilia의 와이어프레임을 받는 대로 도시 검색 · 즐겨찾기(로컬 10개 상한) UI 구현. BFF가 배포되면 로컬 어댑터 제거.
