# app — iOS · Android (Lily)

작성: 2026-09-14 · 근거: `planning/05-decisions.md` D2·D4·D5·D6, `design/color-engine-spec.md`, `backend/api-contract.md`

## 1. 구현 방식 결정 (D7)

**1차는 네이티브 두 벌(SwiftUI · Jetpack Compose)로 간다.** 앱의 정체성이 "배경색 + 대기 효과"라 그라데이션·블러·파티클을 각 플랫폼 렌더러에서 직접 다루는 편이 품질과 배터리 모두 유리하고, 화면 수가 4장(홈·상세 시트·설정·도시 선택)이라 두 벌 유지 비용이 작다. 컬러 엔진은 JS 원본을 각 언어로 이식하되 `frontend/spec/color-engine.json` 골든 154건을 유닛 테스트로 걸어 웹과 ±1 안에서 같도록 강제한다.
Flutter/React Native는 채택하지 않는다. RN이면 `color.js`를 그대로 공유할 수 있다는 장점이 있으나, 대기 효과를 위해 결국 네이티브 모듈이 필요해지고 비공개 배포(D2) 규모에서는 이점이 작다. 2차에서 화면이 늘어나면 재검토.

## 2. 두 플랫폼 공통 규칙

| 항목 | 규칙 |
|---|---|
| 데이터 | BFF `GET /v1/weather?ids=`만 호출. 외부 API 직접 호출 금지. 개발 중에는 모의 BFF(`backend/mock-bff`, `http://<맥 IP>:8787`) |
| 카탈로그 | `database/catalog.json`을 번들에 포함, `version` 비교 후 `GET /v1/catalog`(ETag)로 교체 |
| 갱신 | 포그라운드 진입·`nextUpdateAt` 경과 시 1회. 그 전엔 재요청 금지. 백그라운드 갱신·위젯은 2차 |
| 데이터 상태 | `updatedAt`·`nextUpdateAt`으로 fresh/stale/delayed/offline 계산(3시간·30분 기준), 배지로만 표시, 배경 불변 |
| 위치 | 앱 시작 시 "사용 중" 권한 1회 요청. 거부 → 서울 + "기본 도시" 배지, 도시 선택으로 유도. 카탈로그 최근접(한국 50km·해외 150km) |
| 즐겨찾기 | `cityId` 배열 최대 10, 로컬 저장(UserDefaults / DataStore). 계정 동기화 2차 |
| 컬러 엔진 | `Engine/ColorEngine.swift`, `engine/ColorEngine.kt` — 골든 테스트 필수. 계절 입력 없음 |
| 대기 효과 | 파티클 상한: 비 56·눈 48·황사 30·별 46. 저전력 모드/접근성 "동작 줄이기"에서 정지 |
| 출처 표기 | 설정 하단 + 상세 시트 최하단: 기상청 · 에어코리아 · 천문연 · Open-Meteo(링크) |
| 배포 | iOS TestFlight 내부 테스트, Android 내부 테스트 트랙(D2). 광고·결제 SDK 없음 |
| 음향·햅틱 | `design/sound-and-haptics.md`. iOS AVAudioSession `.ambient` + AVAudioPlayer 루프/크로스페이드 + Core Haptics 패턴. Android Media3 ExoPlayer 루프/게인 + VibrationEffect. 음향 기본 꺼짐·햅틱 기본 켜짐, 백그라운드 즉시 정지 |
| 라벨 | 기상청 용어(D3). 문자열은 `frontend/src/i18n.js`와 같은 키를 쓴다 |

## 3. 화면 ↔ 네이티브 구성 요소

| 화면 | iOS | Android |
|---|---|---|
| 홈 배경 | `LinearGradient(stops:)` + `TimelineView` 시계 | `Brush.verticalGradient(colorStops)` + `LaunchedEffect` 틱 |
| 대기 효과 | `Canvas` + `TimelineView(.animation)` | `Canvas` + `withInfiniteAnimationFrameMillis` |
| 상세 시트 | `.sheet` 대신 커스텀 `DragGesture` 시트(부분 높이 78%, 내부 `ScrollView`와 제스처 분리) | `ModalBottomSheet`(Material3) 또는 `BottomSheetScaffold` |
| 설정·컬러 테스트 | 디버그 빌드에서만 노출(`#if DEBUG`) | `BuildConfig.DEBUG`에서만 |
| 도시 선택 | `searchable` 리스트, 행마다 엔진이 만든 색 조각 | `LazyColumn` + `SearchBar` |

## 4. 폴더

```
app/
  ios/       Xcode 프로젝트(예정) — Engine/ColorEngine.swift, Engine/WeatherComposition.swift, ColorSenseTests/ColorEngineGoldenTests.swift
  android/   Gradle 프로젝트(예정) — engine/ColorEngine.kt, engine/WeatherComposition.kt, test/ColorEngineGoldenTest.kt
```
엔진 파일과 골든 테스트는 지금 들어 있다. 프로젝트 파일(`.xcodeproj`, `build.gradle.kts`)은 Lily가 생성할 때 이 파일들을 그대로 추가하고, 골든 JSON은 `frontend/spec/color-engine.json`을 테스트 리소스로 복사한다(`npm run golden` 후 갱신).

## 5. 다음 단계
1. Xcode·Android Studio 프로젝트 생성, 엔진 파일 추가, 골든 테스트 통과 확인 (Lily)
2. 모의 BFF로 홈 화면 1장 구현 → 웹 스크린샷과 색 대조 (Lily·Joy)
3. 위치 권한 문구·도시 선택 화면 디자인 (Cecilia)
