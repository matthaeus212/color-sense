# infra/ — Mark (인프라)

## 책임

AWS 인프라, CI/CD, 모니터링, 배포. 프리티어 범위 안에서 월 비용을 0에 가깝게 유지하는 것이 원칙(비공개 배포 전제).

## 현재 상태

- `docker/` — 로컬 스택(모의 BFF + 프론트) 완료: `docker compose -f infra/docker/docker-compose.yml up`
- `code/` — 스케줄 정의(`schedule.json`)만 있고 실제 IaC(AWS CDK)는 아직

## 목표 구성

Lambda + EventBridge Scheduler + API GW HTTP + DynamoDB(TTL 24h) + CloudFront+S3, IaC는 AWS CDK(TS). CI는 GitHub Actions(test → build → 골든 diff 강제 → CDK 배포).

## 지켜야 할 것

- Open-Meteo는 IP 단위 쿼터 제한 — NAT 게이트웨이 IP가 바뀌지 않도록 고정
- 쿼터 소진 80%에서 알림, 100%에서 수집 중단 → 자정 자동 재개
- 소스별(기상청 / Open-Meteo) 성공률 · 지연을 CloudWatch 지표로, 연속 실패 시 알림
- CI에 골든 diff 강제 게이트 — 컬러 엔진 스펙이 깨지면 빌드가 실패해야 한다
  - 게이트는 `npm run golden` 을 다시 돌려 `spec/color-engine.json` 에 diff 가 없어야 통과한다.
    생성기는 케이스 내용이 같으면 `generatedAt` 을 그대로 유지한다 — 날짜를 매번 새로 찍으면
    엔진을 건드리지 않아도 날이 바뀐 다음 실행부터 무조건 실패했다(2026-09-15 ~ 09-22 전부 빨간불).
    엔진이 실제로 바뀌면 케이스와 함께 날짜도 갱신되므로 게이트는 그대로 작동한다.
- 모니터링은 CloudWatch + Sentry(무료)만, 별도 분석 SDK는 넣지 않는다

## 다음 할 일 (`../docs/roadmap.md` 참고)

1. AWS 인프라 스캐폴딩(CDK) 착수 — Theo의 BFF 코드를 기다릴 필요 없이 골격부터
2. Theo의 BFF가 준비되는 대로 스택에 연결 · 배포
3. 쿼터 알림, CI 골든 diff 게이트 연결
