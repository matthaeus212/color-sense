# app/ — Lily (앱: iOS·Android)

## 책임

네이티브 두 벌(SwiftUI, Jetpack Compose) 구현. Flutter/RN은 미채택(D7).

## 현재 상태

- **iOS** — `ios/ColorSense/ColorSense.xcodeproj` 생성 완료. 컬러 엔진 이식 + 골든 154건 통과, 홈 화면 1장 동작
  - 실행: Xcode 에서 `ColorSense` 스킴, 또는 `xcodebuild test -scheme ColorSense -destination 'platform=iOS Simulator,name=iPhone 17 Pro'`
  - BFF 주소·도시는 환경변수로 바꾼다 — `BFF_URL`(기본 `http://localhost:8787` 모의 BFF), `CITY_ID`(웹의 `?city=` 와 같은 QA 수단)
  - 웹과 색 대조를 실제 렌더링 픽셀로 확인함(6개 스톱 전부 ±1 이내)
- **Android** — `android/app/src/` 초기 골격만. 프로젝트 생성이 다음 차례

### iOS 구조

| 경로 | 역할 |
|---|---|
| `ColorSense/Engine/` | 컬러 엔진·공통 모델 (웹 `color.js`·`model.js` 이식) |
| `ColorSense/Model/` | `CityWeather`(BFF 계약), `Catalog`(번들 도시 목록·최근접 탐색) |
| `ColorSense/Data/` | `BFFClient`, `LocationProvider`, `WeatherStore`(상태·배지·재요청) |
| `ColorSense/UI/` | `HomeView`, `Labels`(기상청 용어 ko/en) |
| `ColorSense/Resources/catalog.json` | `database/catalog.json` 의 번들 사본 — 카탈로그가 바뀌면 같이 갱신 |

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

1. iOS 상세 시트 — 시스템 시트 `.presentationDetents([.fraction(0.78), .large])`, 시간별 24칸·주간 7행. 도크의 ⌃ 버튼은 이 시트가 생길 때 함께 붙인다(지금은 위치 칩만 있다)
2. iOS 설정(Form) — 언어·컬러 테스트(`#if DEBUG`)
3. Android 프로젝트 생성 → 컬러 엔진 이식 → 골든 테스트
4. Cecilia 의 커스텀 심볼 세트가 나오면 `Labels.symbol` 의 SF Symbols 매핑을 교체
