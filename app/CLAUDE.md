# app/ — Lily (앱: iOS·Android)

## 책임

네이티브 두 벌(SwiftUI, Jetpack Compose) 구현. Flutter/RN은 미채택(D7).

## 현재 상태

- `ios/ColorSense/Engine/` — 컬러 엔진 이식 대상, `ios/ColorSenseTests/ColorEngineGoldenTests.swift` 골든 테스트 스켈레톤 있음
- `android/app/src/` — 초기 골격만 있음
- iOS/Android 모두 완성된 프로젝트 파일(.xcodeproj, gradle 전체 세팅)은 아직 없음 — 가장 먼저 할 일

## 지켜야 할 것

- 컬러 엔진은 `../frontend/spec/color-engine.json`(골든 케이스 154건)과 ±1 오차 내로 일치해야 한다 — 웹과 색이 다르게 보이면 버그
- BFF만 호출한다 (개발 중엔 모의 BFF `http://<맥 IP>:8787`)
- 카탈로그는 번들 + version 비교, `nextUpdateAt` 전 재요청 금지
- 데이터 상태 배지 표시, 배경색 불변
- 위치 권한은 "사용 중"·대략적 권한만 요청, 거부 시 서울 + 기본 도시 배지
- 즐겨찾기 10개 로컬 상한, 대기 효과는 파티클 상한/캔버스로(저사양 대응), 출처 표기, TestFlight/내부 트랙 배포

## 스택

- iOS: Swift 5.9 / SwiftUI / URLSession, AVFoundation(.ambient) + Core Haptics (D10로 최소 지원 iOS 27 상향)
- Android: Kotlin / Compose / Material3 / minSdk26, Retrofit + kotlinx.serialization, Media3 ExoPlayer + VibrationEffect, DataStore

## Joy 체크리스트

`ColorEngineGoldenTests.swift` / `ColorEngineGoldenTest.kt`가 웹 골든 케이스와 일치하는지, 저사양 기기 프레임 · 배터리, 모의 BFF로 렌더링한 홈 화면을 웹과 픽셀 대조.

## 다음 할 일 (`../docs/roadmap.md` 참고)

1. iOS/Android 프로젝트 생성부터 (완성된 프로젝트 파일 없음)
2. 컬러 엔진 이식 → 골든 테스트 통과
3. 모의 BFF로 홈 화면 1장 완성 → 웹과 색 대조
