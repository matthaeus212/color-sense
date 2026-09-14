# iOS (SwiftUI, iOS 27+ · D10-4)

1. Xcode → App(SwiftUI) 프로젝트 `ColorSense` 생성, 이 폴더에 저장.
2. `ColorSense/Engine/*.swift` 를 타깃에 추가, `ColorSenseTests/ColorEngineGoldenTests.swift` 를 테스트 타깃에 추가.
3. `frontend/spec/color-engine.json` 을 테스트 타깃 리소스로 복사(이름 `color-engine.json`). `npm run golden` 할 때마다 갱신.
4. `Info.plist`: `NSLocationWhenInUseUsageDescription` = "가장 가까운 도시의 날씨를 보여주기 위해 위치를 사용합니다. 허용하지 않으면 도시를 직접 고를 수 있어요."
5. 개발 중 BFF: 시뮬레이터는 `http://localhost:8787`, 실기기는 `http://<맥 IP>:8787` (`ATS` 예외를 DEBUG 구성에만 추가).
6. 배포: TestFlight 내부 테스트(D2).

## 디자인 기준 (2026-09-14)
`design/ios-design-notes.html` — Liquid Glass 적용(홈 Clear+디밍, 시트·설정 Regular), 하단 도크 캡슐, 시스템 시트(.fraction(0.78)/.large), SF Pro Dynamic Type(최소 11pt, 온도 78pt thin @ScaledMetric), 44pt 히트 영역, NavigationStack+.searchable 도시 선택, Form 설정, sensoryFeedback 햅틱 매핑, Icon Composer 아이콘. 최소 지원 버전 **iOS 27**(D10-4). 하단 도크는 위치 칩(출처 아이콘+라벨+좌표) + ⌃ 구성(D10-1). SwiftUI API 매핑표는 노트 §8.
