#!/usr/bin/env bash
# iOS 단위 테스트(골든 154건 포함): npm run test:ios
# 시뮬레이터를 바꾸려면 IOS_DEVICE="iPhone 16 Pro" npm run test:ios
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT/app/ios/ColorSense"

DEVICE="${IOS_DEVICE:-iPhone 17 Pro}"
exec xcodebuild test \
  -scheme ColorSense \
  -destination "platform=iOS Simulator,name=$DEVICE" \
  -only-testing:ColorSenseTests \
  -quiet
