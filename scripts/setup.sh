#!/usr/bin/env bash
# ColorSense 로컬 개발환경 설정 (macOS / Linux). 저장소 루트에서: npm run setup  또는  bash scripts/setup.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
ok(){ printf '  \033[32m✓\033[0m %s\n' "$*"; }; warn(){ printf '  \033[33m!\033[0m %s\n' "$*"; }; fail(){ printf '  \033[31m✗\033[0m %s\n' "$*"; exit 1; }

echo "ColorSense 개발환경 설정"
echo "1) 도구 확인"
if command -v node >/dev/null; then
  NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
  [ "$NODE_MAJOR" -ge 20 ] && ok "node $(node -v)" || fail "node 20 이상이 필요합니다 (현재 $(node -v)). nvm use 22 또는 https://nodejs.org"
else fail "node 가 없습니다. 'brew install node@22' 또는 nvm 으로 설치 후 다시 실행"; fi
command -v npm >/dev/null && ok "npm $(npm -v)"
command -v docker >/dev/null && ok "docker $(docker --version | sed 's/Docker version //;s/,.*//') (선택)" || warn "docker 없음 — 선택 사항. 없어도 npm run dev 로 동작"
command -v xcodebuild >/dev/null && ok "Xcode $(xcodebuild -version 2>/dev/null | head -1 | sed 's/Xcode //') (iOS)" || warn "Xcode 없음 — iOS 작업 시 App Store 에서 설치 (iOS 27 SDK)"
[ -d "/Applications/Android Studio.app" ] && ok "Android Studio" || warn "Android Studio 없음 — Android 작업 시 설치"

echo "2) 프론트 의존성 설치"
( cd frontend && npm install --no-audit --no-fund --loglevel=error ) && ok "frontend/node_modules"

echo "2-1) BFF 의존성 설치 (packages/core 포함)"
( cd packages/core && npm install --no-audit --no-fund --loglevel=error ) && ok "packages/core"
( cd backend/bff && npm install --no-audit --no-fund --loglevel=error && npm run build --silent ) && ok "backend/bff (빌드까지)"

echo "3) 환경 파일"
if [ ! -f frontend/.env.local ]; then
  # 기본은 비워 두어 dev 는 Open-Meteo 직접 호출, dev:mock 은 스크립트가 VITE_BFF_URL 을 주입
  printf '# 비워 두면 브라우저가 Open-Meteo 를 직접 호출(개발용). BFF 배포 후 https://... 로.\nVITE_BFF_URL=\n' > frontend/.env.local
  ok "frontend/.env.local 생성 (VITE_BFF_URL 비움)"
else ok "frontend/.env.local 있음 (유지)"; fi

echo "4) 검증"
( cd frontend && npm test --silent 2>&1 | grep -E '^# (pass|fail)' | tr '\n' ' ' ) && echo
( cd frontend && npx vite build --outDir .vite-check --emptyOutDir --logLevel error ) && ok "vite build"; rm -rf frontend/.vite-check 2>/dev/null || true

echo "5) 모의 BFF 응답 확인"
( node backend/mock-bff/server.mjs & echo $! > /tmp/cs-mock.pid; sleep 1
  if curl -sf "http://localhost:8787/v1/weather/KR-SEL" >/dev/null; then ok "mock BFF  http://localhost:8787"; else warn "mock BFF 응답 없음 (포트 8787 사용 중?)"; fi
  kill "$(cat /tmp/cs-mock.pid)" 2>/dev/null; rm -f /tmp/cs-mock.pid ) || true

echo
echo "다음 명령"
echo "  npm run dev        # 모의 BFF + 웹 (기본)  → http://localhost:5173/?city=KR-PUS&scenario=stale"
echo "  npm run dev:live   # Open-Meteo 직접 호출 (실제 날씨, 개발 전용)"
echo "  npm run bff        # 실 BFF (기상청·Open-Meteo). 키는 backend/.env.local"
echo "  npm test · npm run check · npm run golden · npm run smoke"
echo "  npm run docker     # 같은 스택을 Docker 로"
echo "  앱: app/ios/README.md · app/android/README.md"
