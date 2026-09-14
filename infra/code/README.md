# infra/code

- `schedule.json` — EventBridge Scheduler 정의 원본(기상청 발표 시각 기준). SAM/CDK 템플릿은 이 파일에서 생성한다.
- 예정: `template.yaml`(SAM) — Collector Lambda · API Lambda · DynamoDB `weather` 테이블 · CloudFront. 설계는 `../README.md`.
