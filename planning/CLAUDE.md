# planning/ — Mateus (기획·아키텍처)

## 책임

사용자 플로우, 기능 정의, 정책 결정. 각 역할이 자기 범위에서 판단하기 애매한 사안을 최종 결정하고 이 폴더(`05-decisions.md` 등)에 기록한다.

## 이 폴더의 문서

`01-prototype-review.md`(목표 대비 갭) → `02-data-source-options.md`(데이터 소스 비교) → `03-planning-prerequisites.md`(설계 전 확인 사항) → `04-decisions-team-review.md`(역할별 의견 정리) → `05-decisions.md`(최종 확정) → `06-planning-and-screen-spec.html` → `07-tech-stack.md`.

## 확정된 결정 (요약)

- 1차 런칭 = 기상청 API 제공 범위(한국). 해외는 2차, 무료 데이터 소스 확정 후 (`03`)
- 데이터 소스는 무료 범위만: 기상청 계열 + Open-Meteo 무료 티어 — Open-Meteo Standard(유료) 미채택 (`02`)
- 1차 비공개 배포(TestFlight·내부 트랙), 광고·유료 없음 — 상업 전환 시 데이터 계약 재검토 (D2)
- 라벨은 기상청 용어, 소나기는 단독 라벨 (D3)
- 계절 틴트 제거, 데이터 상태는 배지로만, 배경색 불변 (D4)
- 네이티브 이원화(SwiftUI + Jetpack Compose), Flutter/RN 미채택 (D7)
- 음향 기본 꺼짐, 햅틱 기본 켜짐 (D8)
- 웹/iOS/Android 모두 Node/TS+Hono BFF, DynamoDB+S3, AWS CDK 기반 (D9)
- 하단 도크 도입 + 좌표 문자열 유지, 웹도 도크로 통일, 커스텀 심볼 세트, 최소 지원 iOS 27 (D10)

## 아직 열려 있는 결정

스토어 공개 여부 — 결정되는 대로 이 파일과 `05-decisions.md`를 갱신할 것. 결정 즉시 각 역할 CLAUDE.md에도 영향이 있으면 반영.

## 다음 할 일

`docs/roadmap.md` Phase 1 — 스토어 공개 여부 결정, Phase 1 병렬 작업 킥오프.
