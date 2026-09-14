# ColorSense — 날씨를 색으로 보여주는 앱

```
docs/       개발 정리 · 로컬 테스트 가이드 · 문서 지도
planning/   기획 문서와 확정 결정
design/     디자인 토큰 · 골든 케이스 · 컬러 엔진 스펙
backend/    API 계약 · 모의 BFF
frontend/   React 앱 (+ 프로토타입)
app/        iOS · Android (Swift/Kotlin 컬러 엔진 + 골든 테스트)
database/   도시 카탈로그 · 테이블 설계
infra/      AWS 구성안 · docker/ · code/
```

빠른 시작: `npm run setup` 한 번 → `npm run dev`(모의 BFF + 웹). 수동은 `cd frontend && npm install && npm run dev:mock` → http://localhost:5173 (`?city=KR-PUS&scenario=stale`). 자세한 것은 `docs/dev-setup.md`.
`_to_delete/` 는 지워도 되는 옛 파일이다.
