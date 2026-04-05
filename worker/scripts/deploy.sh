#!/bin/bash
set -e

# 프로젝트 루트에서 실행: ./worker/scripts/deploy.sh
# Docker 빌드 컨텍스트를 프로젝트 루트로 설정하여 agent/ 디렉토리 포함

cd "$(dirname "$0")/../.."

fly deploy \
  --app fireqa-workers \
  --config worker/fly.toml \
  --dockerfile worker/Dockerfile \
  --image-only

echo "Worker 이미지 배포 완료"
