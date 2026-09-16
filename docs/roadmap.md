# ColorSense 로드맵 (진행 체크리스트)

작성 2026-09-15 · 웹에서 보기 편한 버전은 팀 공유 아티팩트, 여기는 커밋과 함께 체크하는 저장소용 버전.

## 지금 당장 확인할 것

- [ ] **[Mateus]** 에어코리아 활용신청 승인 상태 확인 — 남은 유일한 외부 대기 항목
- [ ] **[Mateus]** 스토어 공개 여부 최종 결정 — 남은 마지막 정책 결정
- [ ] Phase 1의 병렬 작업 착수 지시

## Phase 0 — 외부 승인 대기 (최상위 블로커)

- [x] **[Theo]** 공공데이터포털 활용신청 상태 확인 (2026-09-16, 실 호출로 검증)
  - 기상청 초단기실황·초단기예보·단기예보·중기예보 — 정상
  - 천문연 출몰시각 — 정상
  - 에어코리아 대기오염정보 — `NO_OPENAPI_SERVICE_ERROR`(미승인 추정). 대기질만 `unavailable` 로 나가고 날씨·색은 영향 없음

## Phase 1 — 지금 바로, 블로커 없이 병렬 착수

- [ ] **[Mateus]** 스토어 공개 여부 최종 결정
- [x] **[Theo]** 실제 BFF 서버(Node + Hono) 구현 착수 — `backend/bff`, `packages/core`. 라우트 3개 + 기상청/Open-Meteo 폴백까지 실 데이터로 동작
- [ ] **[Mark]** AWS 인프라 스캐폴딩(CDK) 착수
- [ ] **[Cecilia]** 커스텀 날씨 심볼 세트 제작 (약 2일)
- [ ] **[Cecilia]** 다중 도시 · 검색 · 즐겨찾기 와이어프레임
- [x] **[Lily]** iOS 프로젝트 생성 — `app/ios/ColorSense/ColorSense.xcodeproj`
- [ ] **[Lily]** Android 프로젝트 생성

## Phase 2 — Phase 1 산출물이 있어야 시작

- [x] **[Lily]** 컬러 엔진 Swift 이식 — 골든 154건 통과, 홈 화면 실제 렌더링 픽셀도 웹과 ±1 이내
- [ ] **[Lily]** 컬러 엔진 Kotlin 이식 (선행: Android 프로젝트 생성) — 골든 154건 대조
- [ ] **[Lily]** iOS 상세 시트·설정 화면
- [ ] **[Lisiena]** 도시 검색 · 즐겨찾기 UI 구현 (선행: Cecilia 와이어프레임)
- [ ] **[Mark]** BFF를 인프라에 연결 · 배포 (선행: Theo BFF 골격)

## Phase 3 — 키 발급 완료 후에만 가능

- [ ] **[Theo·Joy]** `npm run smoke` → verify 도시 확정, `database/catalog.json`에서 `verify:true` 제거 — 기상청 격자·중기 regId 는 4개 도시 모두 OK, 에어코리아 측정소명만 승인 후 확인 필요
- [ ] **[Theo]** 발표 시각 기준 수집 스케줄 가동 (지금은 요청 시 수집 + 메모리 캐시)
- [ ] **[Lisiena]** `.env.local`에 `VITE_BFF_URL` 주입 → `localAdapter` 제거
- [ ] **[Lily]** 앱을 모의 BFF에서 실 BFF로 전환

## Phase 4 — 통합 검증

- [ ] **[Joy]** 웹-앱 색상 대조(골든 154건 기준), 기후대별 시나리오(영하 · 열대 · 남반구 · 해안 · 황사), 오프라인/부분실패/권한거부 상태 전이
- [ ] **[Joy]** 저사양 기기 프레임 · 배터리 측정
- [ ] **[Mark]** 쿼터 80%/100% 알림, CI 골든 diff 게이트 연결

## Phase 5 — 출시 준비

- [ ] **[Mateus]** PRD 최종 확정, "1차 한국 → 2차 해외" 로드맵 문장 포함
- [ ] **[전원]** TestFlight · 내부 트랙 배포

---
근거 문서: `planning/04-decisions-team-review.md`, `planning/05-decisions.md`, `docs/dev-summary.md`
