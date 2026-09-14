# database

## catalog.json — 도시 카탈로그 (백엔드 소유, 버전 관리)
스키마와 필드 설명은 `../backend/api-contract.md` §1. 프론트(`frontend/src/lib/bff.js`)와 모의 BFF, 테스트가 이 파일을 직접 읽는다. 배포 후에는 `GET /v1/catalog`로 제공되며 앱은 번들 사본을 갖는다.

## DynamoDB `weather` (예정)
- pk `cityId`, sk `kind` (`current` | `hourly` | `daily` | `aq` | `sun` | `marine`), 속성 `payload`, `source`, `updatedAt`, TTL 24h
- 카탈로그는 DynamoDB 가 아니라 정적 파일/S3 로 유지한다(변경이 드물고 ETag 캐시가 유리).
