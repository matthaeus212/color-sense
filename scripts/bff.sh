#!/usr/bin/env bash
# 실 BFF 실행. backend/.env.local 이 있으면 키를 읽어 기상청·에어코리아·천문연을 쓰고,
# 없으면 키 없이 떠서 모든 도시를 Open-Meteo 로 응답한다(한국은 open-meteo-fallback).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"

if [ -f backend/.env.local ]; then
  set -a; . backend/.env.local; set +a
  echo "backend/.env.local 에서 키를 읽었습니다"
else
  echo "backend/.env.local 없음 — 키 없이 실행합니다(한국 도시는 Open-Meteo 폴백)"
fi

exec npm --prefix backend/bff run "${1:-live}"
