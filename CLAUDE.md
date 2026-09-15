# ColorSense — 프로젝트 공통 가이드

날씨를 배경색으로 보여주는 날씨 앱. 1차 목표: "기상청 API가 제공하는 범위(한국 주요 도시)에서 정확하고 완성도 높은 경험"을 완성하는 것.

## 역할과 폴더

| 역할 | 담당 | 폴더 | 가이드 |
|---|---|---|---|
| 기획·아키텍처 | Mateus | `planning/`, `docs/` | [planning/CLAUDE.md](planning/CLAUDE.md) |
| 디자인 | Cecilia | `design/` | [design/CLAUDE.md](design/CLAUDE.md) |
| 백엔드 | Theo | `backend/`, `database/` | [backend/CLAUDE.md](backend/CLAUDE.md) |
| 프론트엔드 | Lisiena | `frontend/` | [frontend/CLAUDE.md](frontend/CLAUDE.md) |
| 앱(iOS·Android) | Lily | `app/` | [app/CLAUDE.md](app/CLAUDE.md) |
| QA | Joy | 각 폴더의 tests/ | 각 CLAUDE.md의 "Joy 체크리스트" 참고 |
| 인프라 | Mark | `infra/` | [infra/CLAUDE.md](infra/CLAUDE.md) |

각 세션을 해당 역할 폴더 안에서(또는 그 폴더를 대상으로) 시작하면 그 역할의 CLAUDE.md가 자동으로 컨텍스트에 들어온다. 조율이 필요한 사안은 먼저 Mateus와 상의한 뒤, 각자 범위 안에서 진행한다.

## 절대 원칙 (모든 역할 공통)

- 클라이언트(웹·앱)는 외부 API를 직접 호출하지 않는다 — 항상 `backend/`의 BFF만 본다.
- 배경색 = 날씨. 데이터 상태(지연·대체·오프라인·기본도시)는 배지로만 표현하고 배경색은 절대 바꾸지 않는다.
- 컬러 엔진의 유일한 정답은 `frontend/spec/color-engine.json`(골든 케이스 154건)이다. 웹·iOS·Android는 모두 이 스펙과 ±1 오차 내로 일치해야 한다.
- 라벨은 기상청 용어(맑음·구름조금·구름많음·흐림), 소나기는 단독 라벨. 계절 틴트는 쓰지 않는다.
- 1차는 비공개 배포(TestFlight·내부 트랙), 광고·유료 없음 — Open-Meteo 무료 티어가 비상업 전용이기 때문.

## 자주 쓰는 명령 (루트에서)

- `npm run setup` — 최초 1회 환경 세팅
- `npm run dev` — 웹 + 모의 BFF (QA·디자인 기본 모드)
- `npm run dev:live` — 웹만, 로컬 Open-Meteo 어댑터
- `npm test` / `npm run check` — 테스트 / 테스트+빌드(CI와 동일)
- `npm run smoke` — 실 API(기상청·에어코리아) 확인, 키 필요
- `npm run docker` — 로컬 Docker 스택

## 지금 진행 상황

현재 로드맵과 Phase별 할 일은 [`docs/roadmap.md`](docs/roadmap.md) 참고.
