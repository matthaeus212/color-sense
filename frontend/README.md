# ColorSense — React (frontend/)

날씨를 **색으로** 보여주는 날씨 앱. 기존 `colorsense.html`(단일 파일)을 동일한 동작으로 **Vite + React**로 리팩터링한 버전입니다.

## 실행

```bash
npm install
npm run dev      # 개발 서버 (http://localhost:5173)
npm run build    # dist/ 로 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
```

브라우저에서 열면 실제 위치·날씨·시간을 불러옵니다. `file://`에서 크롬은 GPS를 막으므로 IP 기반 위치로 동작하며, 정확한 GPS를 원하면 `npm run dev` 로 실행하세요.

## 구조

```
src/
  main.jsx            진입점
  App.jsx             상태 오케스트레이션 (view 파생: 라이브 / 컬러테스트)
  i18n.js             한/영 사전 (UI + 날씨 라벨)
  styles.css          전역 스타일 (원본과 동일한 룩)
  lib/
    color.js          팔레트 앵커 · 보간 · skyGradient(온도+날씨→CSS 그라데이션)
    weather.js        WMO decode2 · catOf · wxLabel(복합 라벨) · 계절 · 컬러테스트 프리셋
    icons.js          흰색 라인 SVG (조건 아이콘=강수강도 반영, 예보 아이콘, 기어)
    format.js         날짜·시간·온도 포맷 (언어별)
    api.js            지오로케이션 · Open-Meteo(날씨/해양/대기질) · 역지오코딩
  hooks/
    useLang.js        언어 상태 + localStorage
    useClock.js       15초 틱 시계
    useWeather.js     위치→날씨 로드, 상태 모델 보유
  components/
    Phone.jsx         폰 프레임 + 스와이프 제스처
    SkyBackground     (Phone 내부 .sky)
    Effects.jsx       대기 효과 (별/글로우/구름/비/눈/안개/번개/황사 입자)
    SunArc.jsx        일출·일몰 아치 + 해 위치
    DetailHeader.jsx  시간/날짜/날씨/온도
    CityBlock.jsx     도시·좌표
    DetailSheet.jsx   스와이프업 상세 (바람/습도/강수확률/파도 + 주간 예보)
    Settings.jsx      컬러 테스트 + 언어 변경
    StatusOverlay.jsx 로딩/에러
    Svg.jsx           생성 SVG 렌더 헬퍼
```

## 데이터 (모두 무료 · 키 불필요 · CORS)

- 날씨/예보/일출일몰: Open-Meteo Forecast
- 파도: Open-Meteo Marine
- 미세먼지/황사: Open-Meteo Air Quality (PM10 · dust)
- 지명: BigDataCloud reverse geocoding (한/영 동시 캐시)
- 위치: 브라우저 Geolocation → IP 폴백(ipwho.is / ipapi.co)

## 기능

색=날씨(노을 다단계 팔레트), 복합 날씨 상태(흐림&비·부분 흐림&눈·흐림&뇌우·황사 등), 강수 강도 아이콘,
일출·일몰 아치, 스와이프업 상세, 설정의 컬러 테스트, 한국어/English 전환(지명 포함).

## 로컬 테스트

`npm run dev:mock` 이 기본이다(모의 BFF + Vite). `?city=KR-PUS&scenario=stale` 같은 URL 파라미터로 도시·상태를 강제할 수 있다. 전체 안내: `../docs/dev-setup.md-dev-setup.md`, 개발 내용 정리: `../docs/00-dev-summary.md`.

## 2026-09-14 변경 (역할별 1차 작업)

- `src/lib/model.js` 공통 날씨 모델 · `src/lib/kma.js` 기상청→공통 모델 매핑 · `src/lib/bff.js` BFF 클라이언트(미배포 시 Open-Meteo 로컬 어댑터) · `database/catalog.json` 도시 카탈로그(38개)
- 계절 틴트 제거, 라벨 기상청 용어, 영하 앵커(−15°) 추가, 시간별 24시간·체감온도·데이터 상태 배지·출처 표기 추가, 시트 내부 스크롤이 시트를 닫던 제스처 버그 수정
- `npm test` — 매핑 테이블·골든 케이스·카탈로그 테스트(node:test). `npm run golden` — `spec/color-engine.json` 재생성. `npm run smoke` — 기상청 키로 카탈로그 실응답 확인
- `dist/`는 이 세션에서 삭제 권한이 없어 갱신하지 못했다. `npm run build`를 한 번 실행하면 된다. `_to_delete/`는 지워도 되는 파일(구 api.js, 임시 빌드)이다.
- 문서 지도: `../docs/README.md`

- 2026-09-14 (D10) 하단 도크 도입: 커스텀 핸들 → 위치 칩(출처 아이콘·라벨·좌표 `UTC+9 · 35.18, 129.08`) + ⌃ 버튼. 도시명 아래 좌표 줄 제거. 도시 선택 화면은 다음 단계(현재 위치 칩 탭 시 안내).
