# 기술 스택 (D9)

선정 기준: 무료 한도 안에서 동작 · 웹/iOS/Android가 같은 공통 모델·골든 케이스를 공유 · 담당 1인이 운영 가능한 단순함 · 공개 배포 전환 시 재작성 없음.

| 영역 | 선정 | 이유 | 검토 후 제외 | 담당 |
|---|---|---|---|---|
| 프론트(웹) | React 18 + Vite 5, TypeScript 점진 전환, 토큰 CSS, 훅 상태, Vitest + Playwright, Web Audio API, `navigator.vibrate` | 동작 중인 리팩터링 결과물. 화면 4장이라 상태 라이브러리 불필요. TS 전환 시 BFF와 타입 공유 | Next.js, Tailwind, Redux/Zustand | Lisiena |
| iOS | Swift 5.9 · SwiftUI · iOS 16+, URLSession+Codable, Canvas/TimelineView, AVFoundation(`.ambient`, AVAudioPlayer), Core Haptics, UserDefaults, XCTest 골든 | D7. 표준 프레임워크만으로 충분, 외부 의존성 0 | Flutter, RN, Alamofire, Realm | Lily |
| Android | Kotlin 1.9 · Compose · Material3 · minSdk 26, Retrofit + kotlinx.serialization, Canvas, Media3 ExoPlayer, VibrationEffect/HapticFeedbackConstants, DataStore, JUnit 골든 | Compose 표준. Media3는 gapless 루프·볼륨 페이드 지원 | MediaPlayer, Room | Lily |
| 백엔드(BFF) | Node 22 + TypeScript, Hono(Lambda 어댑터), Zod, 소스 어댑터 4종(kma·airkorea·kasi·openmeteo), 공유 패키지 `packages/core` | 프론트와 같은 언어라 `kma.js`·`model.js` 공유, 골든 테스트 한 곳. Hono는 콜드스타트 작고 로컬 실행 동일 | FastAPI(매핑 이중화), NestJS, Go | Theo |
| 데이터베이스 | DynamoDB 단일 테이블 `weather`(pk cityId, sk kind, TTL 24h) + S3 정적 `catalog.json`(ETag). 즐겨찾기 기기 로컬 | 키-값·TTL·온디맨드가 요구 전부. 프리티어 25GB | RDS/PostgreSQL, Redis, Firebase | Theo |
| 인프라 | AWS Lambda·EventBridge Scheduler·API Gateway HTTP·CloudFront+S3(웹·카탈로그·오디오)·SSM·CloudWatch. IaC AWS CDK(TypeScript). 로컬 Docker Compose | 백엔드와 같은 TS로 IaC. 프리티어 안. 오디오 에셋은 CDN 배포로 앱 용량 절감 | SAM, Terraform, Vercel/Netlify | Mark |
| CI/CD | GitHub Actions: test → build → 골든 JSON diff → CDK deploy(dev/prod). iOS Xcode Cloud/fastlane → TestFlight, Android Gradle → 내부 트랙 | 골든 diff로 웹·앱 색 불일치를 커밋 단계에서 차단 | Jenkins, Bitrise | Mark·Lily |
| 모니터링 | CloudWatch(쿼터·신선도·소스 오류) + Sentry 무료(크래시). 분석 SDK 없음(P-10) | 필요한 지표는 "데이터가 오래됐는가"·"앱이 죽는가" | Datadog, Firebase Analytics | Mark·Joy |
| 사운드 제작 | CC0 필드 레코딩 + Audacity/Reaper, 파일명 = 매핑표 코드, m4a(AAC 96k)·ogg(Opus 64k), 파일 ≤300KB·총 ≤3MB | 재배포 가능 라이선스만, 출처 표기 | 유료 라이브러리, 합성음 | Cecilia |

## 저장소 배치
`frontend/`(웹) · `app/ios`, `app/android` · `backend/`(Hono BFF + 어댑터) · `packages/core`(공유 model·kma·color — 지금의 `frontend/src/lib/{model,kma,color}.js`를 옮겨 시작) · `database/` · `infra/code`(CDK) · `infra/docker`.

## 도입 순서
1. `packages/core` 분리 + TS 전환(Lisiena·Theo) — 골든·매핑 테스트가 그대로 통과해야 함
2. Hono BFF 골격 + 어댑터 4종 + 모의 BFF와 계약 일치 테스트(Theo)
3. CDK dev 스택(Mark) → `VITE_BFF_URL` 주입
4. iOS/Android 프로젝트 생성 + 골든 통과 + 오디오/햅틱 모듈(Lily)
