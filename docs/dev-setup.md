# 로컬 개발·테스트 가이드

작성: 2026-09-14 · 대상: 팀 전원 · 위치: `frontend/`

## 0. 준비
Node 20 이상. `cd frontend && npm install` 한 번.

## 1. 세 가지 실행 모드

| 명령 | 데이터 | 용도 |
|---|---|---|
| `npm run dev` | 브라우저가 Open-Meteo 무료 티어 직접 호출(로컬 어댑터) | 실제 날씨로 색·레이아웃 확인. 비상업·개발 전용 |
| `npm run dev:mock` | 모의 BFF(`localhost:8787`) — 실제 계약과 같은 CityWeather | **QA·디자인 기본 모드.** 키 없음, 오프라인 가능, 시나리오 강제 가능 |
| `npm run build && npm run preview` | 빌드 결과 | 배포 전 확인 (`VITE_BFF_URL` 을 `.env.local` 에 두면 BFF 사용) |

`dev` 는 `http://localhost:5173`. GPS 는 localhost 에서 동작하며, 거부하면 "기본 도시" 배지와 함께 서울이 보인다.

## 2. URL 파라미터 (개발 빌드·모의 BFF)

- `?city=KR-PUS` — 카탈로그 도시 강제 (`database/catalog.json` 의 id). GPS 를 건너뛴다.
- `?scenario=stale` — 갱신 지연 배지 · `delayed` 오래된 데이터 · `fallback` 대체 데이터(기상청→Open-Meteo) · `error` 오류 화면 · `slow` 3초 지연(로딩 상태 확인)

예: `http://localhost:5173/?city=RU-MOW&scenario=delayed` → 영하 팔레트 + 적갈색 배지.
모의 BFF 는 도시 id 로 날씨가 고정되므로(서울 구름많음, 제주 구름많음&미세먼지, 모스크바 맑음 영하 …) 스크린샷 비교에 쓸 수 있다. 조합을 바꾸려면 `backend/mock-bff/server.mjs` 의 `KMA_SCENES`/`WMO_SCENES` 순서를 편집한다.

## 3. 검증 명령

- `npm test` — 기상청 매핑 테이블 26건, 컬러 골든 회귀(±1) 154건, 라벨(D3), 카탈로그 정합성 (node:test, 의존성 없음)
- `npm run check` — 테스트 + 빌드 한 번에 (CI 와 동일)
- `npm run golden` — 컬러 엔진을 바꿨을 때 `spec/color-engine.json` 재생성. 커밋에 포함해야 CI 를 통과한다.
- `npm run smoke` — 기상청·에어코리아 실제 응답 확인. `KMA_KEY=… AIR_KEY=… npm run smoke -- KR-YSU KR-MPK` 처럼 도시 지정 가능. 통과한 도시는 카탈로그에서 `verify:true` 제거.
- 컬러 테스트(설정 ⚙ → 컬러 테스트): 11개 프리셋 × 온도 × 주야를 손으로 확인. `design/golden-cases-and-states.md` 골든 표와 대조.

## 4. 수동 QA 체크리스트 (Joy)

1. GPS 허용 → 최근접 도시, 거부 → 서울 + "기본 도시" 배지
2. 시트 열고 주간 목록을 아래로 당겨 스크롤 → 시트가 닫히지 않음. 핸들을 당기면 닫힘
3. 언어 전환 시 라벨·배지·출처 줄이 모두 바뀌고 색은 그대로
4. `scenario=stale/delayed/fallback` 배지 색·문구, `error` 재시도 버튼, `slow` 로딩 오버레이
5. 시간별 24칸 가로 스크롤, 주간 7행, 체감온도 표시
6. 해외 도시(`?city=SG-SIN`) 대기질 "예측" 표기, 모스크바 영하 색

## 5. 알아둘 것
- `dist/` 는 `npm run build` 가 갱신한다. `_to_delete/` 는 삭제해도 되는 임시 파일.
- BFF 가 배포되면 `.env.local` 에 `VITE_BFF_URL=https://…` 를 넣는다. 로컬 어댑터(`src/lib/bff.js` 의 `localAdapter`)는 그때 제거.
- 모의 BFF 는 CORS `*` 로 열려 있으므로 앱(Lily)에서도 `http://<맥 IP>:8787` 로 붙을 수 있다.

## 6. Docker 로 띄우기 (선택)
`cd infra/docker && docker compose up` → 모의 BFF(8787) + 프론트(5173). 앱 팀은 `docker build -f infra/docker/Dockerfile.mock-bff -t colorsense-mock-bff . && docker run -p 8787:8787 colorsense-mock-bff` 로 모의 BFF 만 띄울 수 있다.

## 7. 앱(iOS·Android)
엔진 이식본과 골든 테스트는 `app/ios`, `app/android`에 있다. 프로젝트 생성 후 `frontend/spec/color-engine.json`을 테스트 리소스로 복사하고 골든 테스트를 먼저 통과시킨다. 실기기는 모의 BFF에 `http://<맥 IP>:8787`로 붙는다(`npm run mock`). 자세한 것은 `app/README.md`.

## 8. 원클릭 설정 (2026-09-14 추가)
저장소 루트에서 `npm run setup`(= `bash scripts/setup.sh`)이 도구 확인(node 20+, docker/Xcode/Android Studio는 선택) → `frontend` 의존성 설치 → `frontend/.env.local` 생성 → 테스트·빌드 → 모의 BFF 응답 확인까지 한 번에 한다. 이후 루트에서 `npm run dev`(모의 BFF + 웹), `npm run dev:live`, `npm test`, `npm run check`, `npm run docker`를 쓸 수 있다.
VS Code는 `.vscode/`에 실행 구성(Web + Mock BFF 복합 디버그), 작업, 추천 확장이 들어 있다. Node 버전은 `.nvmrc`(22), 코드 스타일은 `.editorconfig`, 루트 `.gitignore` 준비됨(`git init`은 팀 결정 후).
`VITE_CACHE_DIR=/tmp/vite-cs npm run dev` 로 Vite 의존성 캐시 위치를 바꿀 수 있다(파일 삭제가 제한된 환경).
