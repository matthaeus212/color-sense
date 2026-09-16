# iOS (SwiftUI, iOS 27+ · D10-4)

프로젝트는 `ColorSense/ColorSense.xcodeproj`. 폴더 동기화 그룹이라 `ColorSense/` 아래에 파일을 두면 타깃에 자동으로 들어간다.

## 실행

```
npm run mock                      # 모의 BFF :8787 (앱 기본값)
npm run bff                       # 실 BFF :8788 (키는 backend/.env.local)
open app/ios/ColorSense/ColorSense.xcodeproj
```

환경변수로 붙을 곳과 도시를 바꾼다(스킴 → Run → Arguments, 또는 `simctl launch`):

| 변수 | 뜻 |
|---|---|
| `BFF_URL` | 기본 `http://localhost:8787`. 실 BFF 는 `http://localhost:8788`, 실기기는 `http://<맥 IP>:8787` |
| `CITY_ID` | GPS 를 건너뛰고 그 도시로 — 웹의 `?city=KR-PUS` 와 같은 QA 수단 |

```
xcodebuild test -scheme ColorSense -destination 'platform=iOS Simulator,name=iPhone 17 Pro'
SIMCTL_CHILD_BFF_URL=http://localhost:8788 SIMCTL_CHILD_CITY_ID=KR-PUS \
  xcrun simctl launch "iPhone 17 Pro" com.ksh.ColorSense
```

## 유지할 것

- `ColorSenseTests/color-engine.json` 은 `frontend/spec/color-engine.json` 사본 — `npm run golden` 후 함께 갱신.
- `ColorSense/Resources/catalog.json` 은 `database/catalog.json` 사본 — 카탈로그가 바뀌면 함께 갱신.
- 위치 문구(`INFOPLIST_KEY_NSLocationWhenInUseUsageDescription`)는 빌드 설정에 있다(Info.plist 파일 없음).
- 실기기에서 평문 HTTP 로 붙을 때만 ATS 예외를 DEBUG 구성에 추가한다. 시뮬레이터의 `localhost` 는 예외 없이 된다.
- 배포: TestFlight 내부 테스트(D2).

## 디자인 기준 (2026-09-14)
`design/ios-design-notes.html` — Liquid Glass 적용(홈 Clear+디밍, 시트·설정 Regular), 하단 도크 캡슐, 시스템 시트(.fraction(0.78)/.large), SF Pro Dynamic Type(최소 11pt, 온도 78pt thin @ScaledMetric), 44pt 히트 영역, NavigationStack+.searchable 도시 선택, Form 설정, sensoryFeedback 햅틱 매핑, Icon Composer 아이콘. 최소 지원 버전 **iOS 27**(D10-4). 하단 도크는 위치 칩(출처 아이콘+라벨+좌표) + ⌃ 구성(D10-1). SwiftUI API 매핑표는 노트 §8.
