#!/usr/bin/env bash
# 클라우드 세션 시작 시 의존성을 미리 설치해 바로 lint/test를 돌릴 수 있게 함
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund
elif [ -f package.json ]; then
  npm install --no-audit --no-fund
fi
