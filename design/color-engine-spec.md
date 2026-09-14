# 컬러 엔진 이식 스펙 (Lily) — iOS · Android · Flutter · React Native

작성: 2026-09-14 · 진실의 원천: `frontend/spec/color-engine.json` (생성기: `scripts/gen-golden.mjs`) · 알고리즘 참조 구현: `src/lib/color.js skyStops()`

## 1. 계약

입력 `(tempC: number, wx: WeatherComposition, isDay: 0|1)` → 출력 `6개 RGB 정수 배열` (top→bottom, 위치 `positions = [0,30,52,70,84,100]`%). 네이티브 구현은 `spec/color-engine.json`의 `cases[]` 154개에 대해 **각 채널 ±1 이내**로 같아야 한다(반올림 차이만 허용). Joy가 같은 JSON으로 웹·앱을 동시에 검증한다.

## 2. 알고리즘 (순서가 중요)

1. **온도 보간** — `tempC`를 [-15, 36]으로 클램프, `anchors`(온도별 6스톱) 사이를 선형 보간.
2. **구름** — `sky`별 `cloudMute[sky]`만큼 회색(luma 0.3/0.59/0.11)과 혼합 후 `cloudDarken[sky]` 곱.
3. **습윤** — `precip ∈ {rain, showers, drizzle, sleet}`이면 회색 0.3 혼합 후 0.68 곱(drizzle은 0.78).
4. **눈** — `precip ∈ {snow, sleet}`이면 위 3스톱은 흰색 0.16, 아래 3스톱은 0.30 혼합.
5. **안개** — 회색 0.5 혼합 후 0.92 곱.
6. **뇌우** — 0.78 곱.
7. **황사/미세먼지** — 회색 0.28 혼합 → 황토 `[198,168,112]`를 `amount[dust]`(1: 0.26, 2: 0.44)만큼 혼합 → 0.95 곱.
8. **야간** — `isDay === 0`이면 회색 0.22 혼합 후 스톱별 `night.factors` 곱.
9. **정수화** — 반올림 후 [0,255] 클램프.

계절 틴트는 D4에 따라 없다. `mix(a,b,r) = a + (b−a)·r`, 회색은 luma 3채널 복제.

## 3. 플랫폼별 메모

- **iOS(SwiftUI)**: `LinearGradient(stops:)`에 6스톱 그대로. `Color`는 sRGB, 감마 변환 금지(웹이 sRGB 공간에서 선형 혼합하므로 동일하게).
- **Android(Compose)**: `Brush.verticalGradient(colorStops = …)`. 
- **Flutter**: `LinearGradient(begin: topCenter, end: bottomCenter, stops: [0,.3,.52,.7,.84,1])`.
- **React Native**: `react-native-linear-gradient` 또는 `expo-linear-gradient`, `locations` 배열 사용. 웹과 로직 파일(`color.js`)을 그대로 공유 가능.
- 배경 전환 애니메이션은 1.2s ease(프로토와 동일). 대기 효과(비·눈·별·황사 입자)는 파티클 상한을 두고 저전력 모드에서 비활성화.

## 4. 카탈로그 번들

`database/catalog.json`을 앱 번들에 포함하고 `version`을 저장한다. 앱 시작 시 `GET /v1/catalog`(ETag)로 버전이 바뀌었을 때만 교체. 즐겨찾기는 `cityId` 배열(최대 10)로 로컬 저장, 계정 동기화는 2차.

## 5. 갱신 정책 (배터리)

포그라운드: `nextUpdateAt` 이후 첫 진입/포커스 시 1회. 백그라운드 갱신·위젯은 2차. 데이터 상태 배지는 `updatedAt` 기준 3시간 초과 시 `delayed`.
