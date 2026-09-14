# BFF · 스케줄러 · 캐시 구성안 (Mark) — AWS 프리티어 기준

작성: 2026-09-14 · 근거: `planning/05-decisions.md` D1·D5, `backend/api-contract.md` §3·§4

## 1. 구성

```
[EventBridge Scheduler] ──▶ [Lambda collector]* ──▶ 기상청 / 에어코리아 / 천문연 / Open-Meteo
      (infra/schedule.json)         │
                                     ▼
                              [DynamoDB weather]  pk=cityId, sk=kind(current|hourly|daily|aq|sun), TTL 24h
                                     ▲
[CloudFront] ─▶ [API Gateway HTTP] ─▶ [Lambda api]  GET /v1/catalog, /v1/weather/{id}, /v1/weather?ids=
      (Cache-Control: max-age=nextUpdateAt-now, ETag)
```

- **Lambda collector**: 소스별 어댑터(`kma`, `airkorea`, `kasi`, `openmeteo`)가 원본을 받아 `src/lib/kma.js`·`model.js`와 같은 매핑 코드(공유 패키지)로 공통 모델을 만들어 DynamoDB에 쓴다. 실패 시 기존 항목을 유지하고 `updatedAt`을 갱신하지 않는다(스테일 판정은 클라이언트).
- **Lambda api**: DynamoDB 항목을 합쳐 CityWeather를 구성. 한국 도시의 기상청 항목이 3시간 이상 오래됐고 Open-Meteo 항목이 있으면 `source: open-meteo-fallback`으로 응답(폴백 배지).
- **CloudFront**: 응답의 `nextUpdateAt`까지 캐시. 즐겨찾기 일괄 요청은 최대 11개.
- **비밀**: 공공데이터포털 키 3개(기상청·에어코리아·천문연)는 SSM Parameter Store(SecureString). Open-Meteo는 키 없음.
- **고정 IP**: Open-Meteo 무료 티어는 IP 단위 제한이므로 collector를 VPC + NAT Gateway 고정 EIP로 둔다. NAT 비용(월 약 $32+)이 프리티어 밖의 유일한 고정 비용이라, 초기에는 VPC 없이 Lambda 기본 아웃바운드(IP 가변)로 시작하고 429가 관측되면 전환한다.

## 2. 프리티어 예산

| 자원 | 월 사용 추정 | 프리티어 |
|---|---|---|
| Lambda | 수집 약 90k 호출 + API 요청 수 | 100만 호출·40만 GB-s |
| DynamoDB | 쓰기 90k, 읽기 수십만 | 25 WCU/RCU 온디맨드 25GB |
| EventBridge Scheduler | 약 3k 스케줄 실행 | 1,400만 호출 |
| API Gateway HTTP | 요청 수 | 100만/12개월 |
| CloudFront | 소량 | 1TB/월 |
| CloudWatch | 알람 5개 | 10 알람 |

비공개 배포(D2) 규모에서는 전부 무료 범위. 스토어 공개 시 재산정.

## 3. 쿼터 알림·모니터링

- CloudWatch 사용자 지정 지표 `Quota/{source}/calls`(일 누적) — 80% 경고, 100% 시 collector가 해당 소스 수집을 자정까지 중단(D5 우선순위: 실황 > 단기 > 대기질 > 중기 > 해외).
- `Source/{source}/errors`, `Source/{source}/latency` — 연속 3회 실패 알람(SNS → 이메일/슬랙).
- `Freshness/{source}/ageMinutes` — 180분 초과 알람.
- 클라이언트 에러 리포팅은 2차(Sentry 무료 티어 후보).

## 4. CI/CD

- GitHub Actions: `npm test`(매핑 테이블·골든 케이스·카탈로그) + `vite build` + `scripts/gen-golden.mjs` 결과가 커밋된 `spec/color-engine.json`과 일치하는지 diff 검사(컬러 엔진 변경 시 스펙 갱신을 강제).
- 배포: `main` → SAM/CDK로 dev 스택, 태그 → prod 스택. 웹은 S3 + CloudFront, 접근 제한은 CloudFront 서명 쿠키 또는 Basic Auth(Lambda@Edge) — 비공개 배포 요건(D2).
- 카탈로그 변경 PR은 `scripts/catalog-smoke.mjs`(키는 Actions secret)를 수동 트리거로 실행해 `verify` 플래그를 정리한다.

## 5. 다음 단계
1. 공공데이터포털 활용신청 4건 → SSM 등록 (Theo와 함께).
2. `infra/schedule.json`을 EventBridge Scheduler 정의로 변환한 SAM 템플릿 초안.
3. dev 스택 배포 후 `VITE_BFF_URL`을 웹 빌드에 주입, 로컬 Open-Meteo 어댑터 경로 제거.
