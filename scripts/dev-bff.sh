#!/usr/bin/env bash
# 실 BFF + 웹을 한 번에 띄운다: npm run dev:bff
# 모의 BFF 대신 기상청·Open-Meteo 실 데이터를 보고 싶을 때 쓴다(키는 backend/.env.local).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"

PORT="${BFF_PORT:-8788}"
[ -f backend/.env.local ] && { set -a; . backend/.env.local; set +a; }

npm --prefix backend/bff run build --silent
PORT="$PORT" node backend/bff/dist/server.js &
BFF_PID=$!
trap 'kill "$BFF_PID" 2>/dev/null || true' EXIT INT TERM

# BFF 가 응답할 때까지 기다린 뒤 웹을 띄운다 — 첫 화면이 오류로 뜨는 걸 막는다
for _ in $(seq 1 40); do
  curl -sf "http://localhost:$PORT/health" >/dev/null && break
  sleep 0.25
done

VITE_BFF_URL="http://localhost:$PORT" npm --prefix frontend run dev
