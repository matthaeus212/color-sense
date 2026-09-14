# 형상관리 규칙

- 기본 브랜치 `main`은 항상 배포 가능한 상태. 직접 푸시하지 않고 PR로 합친다(CI 통과 필수).
- 브랜치 이름: `<영역>/<주제>` — 예 `frontend/city-picker`, `backend/kma-adapter`, `design/symbols`, `app-ios/dock`, `infra/cdk-dev`, `docs/dev-setup`.
- 커밋 메시지: `<영역>: <무엇을>` 한 줄 + 필요하면 본문에 근거(D#·F-##·P-##). 예 `frontend: 하단 도크 도입 (D10-1)`.
- 컬러 엔진(`frontend/src/lib/color.js`)을 바꾸면 같은 커밋에 `npm run golden` 결과(`frontend/spec/color-engine.json`)를 포함한다. CI가 검사한다.
- 카탈로그(`database/catalog.json`) 변경은 `npm run smoke`(키 필요) 결과를 PR에 첨부한다.
- 다른 담당 영역을 건드려야 하면 먼저 Mateus와 논의하고 PR 본문에 사이드 이펙트를 적는다.
- 비밀값(API 키·`.env.local`)은 커밋하지 않는다. `.gitignore`가 막지만 확인한다.
