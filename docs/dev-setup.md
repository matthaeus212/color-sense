# 로컬 개발·테스트 가이드

작성: 2026-09-14 · 대상: 팀 전원 · 위치: `frontend/`

## 0. 준비

저장소 루트에서 `npm run setup` 한 번. Node 20 이상이 필요하고, 프론트·`packages/core`·`backend/bff` 의존성 설치와 BFF 빌드까지 한다.
기상청·천문연 키를 쓰려면 `backend/.env.local` 에 `KMA_KEY` / `AIR_KEY` / `ASTRO_KEY` 를 둔다(git 제외). 키가 없어도 전부 동작한다 — 한국 도시가 Open-Meteo 폴백으로 내려올 뿐이다.

## 1. 실행 모드 (전부 루트에서)

| 명령 | 뜨는 것 | 데이터 | 용도 |
|---|---|---|---|
| `npm run dev` | 모의 BFF `:8787` + 웹 `:5173` | 도시 id 로 고정된 가짜 날씨 | **QA·디자인 기본 모드.** 키 없음, 오프라인 가능, 시나리오 강제 |
| `npm run dev:bff` | 실 BFF `:8788` + 웹 `:5173` | 기상청·천문연·Open-Meteo 실데이터 | 실제 값으로 색·라벨·배지 확인 |
| `npm run dev:live` | 웹만 `:5173` | 브라우저가 Open-Meteo 직접 호출 | BFF 없이 빠르게 화면만 볼 때(비상업·개발 전용) |
| `npm run mock` / `npm run bff` | BFF 만 | — | 앱(iOS)에서 붙을 때 |
| `npm run docker` | 모의 BFF + 웹 | 모의 | 같은 스택을 컨테이너로 |

`npm run bff` 는 키가 있으면 기상청, 없으면 전 도시 Open-Meteo 로 답한다(`source` 필드와 "대체 데이터" 배지로 구분된다).

GPS 는 localhost 에서 동작하며, 거부하면 "기본 도시" 배지와 함께 서울이 보인다.

## 1-1. iOS 앱을 로컬 BFF 에 붙이기

```
npm run mock                      # 또는 npm run bff
open app/ios/ColorSense/ColorSense.xcodeproj
```

스킴 → Run → Arguments 의 환경변수로 바꾼다. 시뮬레이터 실행만 할 때는 이렇게도 된다:

```
SIMCTL_CHILD_BFF_URL=http://localhost:8788 SIMCTL_CHILD_CITY_ID=KR-PUS \
  xcrun simctl launch "iPhone 17 Pro" com.ksh.ColorSense
```

| 변수 | 뜻 |
|---|---|
| `BFF_URL` | 기본 `http://localhost:8787`. 실기기는 `http://<맥 IP>:8787` |
| `CITY_ID` | GPS 를 건너뛰고 그 도시로 — 웹의 `?city=` 와 같은 수단이라 같은 도시로 나란히 놓고 색을 대조할 수 있다 |

## 2. URL 파라미터 (개발 빌드·모의 BFF)

- `?city=KR-PUS` — 카탈로그 도시 강제 (`database/catalog.json` 의 id). GPS 를 건너뛴다.
- `?scenario=stale` — 갱신 지연 배지 · `delayed` 오래된 데이터 · `fallback` 대체 데이터(기상청→Open-Meteo) · `error` 오류 화면 · `slow` 3초 지연(로딩 상태 확인)

예: `http://localhost:5173/?city=RU-MOW&scenario=delayed` → 영하 팔레트 + 적갈색 배지.
모의 BFF 는 도시 id 로 날씨가 고정되므로(서울 구름많음, 제주 구름많음&미세먼지, 모스크바 맑음 영하 …) 스크린샷 비교에 쓸 수 있다. 조합을 바꾸려면 `backend/mock-bff/server.mjs` 의 `KMA_SCENES`/`WMO_SCENES` 순서를 편집한다.

## 3. 검증 명령

- `npm test` — 웹 37건(기상청 매핑 26 · 컬러 골든 ±1 154 · 라벨 · 카탈로그) + `packages/core` 웹·BFF 구현 동치 4건 + BFF 20건(발표 시각 규칙, 실 응답 픽스처 조립, 계약 스키마, 라우트)
- `npm run test:ios` — iOS 골든 154건(시뮬레이터 필요). 기기를 바꾸려면 `IOS_DEVICE="iPhone 16 Pro" npm run test:ios`
- `npm run test:all` — 위 둘을 한 번에
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
iOS 는 `app/ios/ColorSense/ColorSense.xcodeproj` 에 프로젝트가 있고 홈 화면까지 동작한다 — 실행·환경변수는 위 1-1 과 `app/ios/README.md`. Android 는 아직 골격만 있다(`app/android`).
`frontend/spec/color-engine.json` 과 `database/catalog.json` 은 앱 번들 안에 사본으로 들어가 있으므로, 원본이 바뀌면 `app/ios/ColorSense/ColorSenseTests/color-engine.json` · `app/ios/ColorSense/ColorSense/Resources/catalog.json` 도 같이 갱신한다.

## 8. 원클릭 설정 (2026-09-14 추가 · 2026-09-16 BFF 포함)
저장소 루트에서 `npm run setup`(= `bash scripts/setup.sh`)이 도구 확인(node 20+, docker/Xcode/Android Studio는 선택) → `frontend`·`packages/core`·`backend/bff` 의존성 설치와 BFF 빌드 → `frontend/.env.local` 생성 → 테스트·빌드 → 모의 BFF 응답 확인까지 한 번에 한다.
VS Code는 `.vscode/`에 실행 구성(Web + Mock BFF 복합 디버그), 작업, 추천 확장이 들어 있다. Node 버전은 `.nvmrc`(22), 코드 스타일은 `.editorconfig`, 루트 `.gitignore` 준비됨(`git init`은 팀 결정 후).
`VITE_CACHE_DIR=/tmp/vite-cs npm run dev` 로 Vite 의존성 캐시 위치를 바꿀 수 있다(파일 삭제가 제한된 환경).
