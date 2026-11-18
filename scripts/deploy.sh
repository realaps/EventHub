#!/usr/bin/env bash
# Shell deployment script for a Linux server (e.g. AWS EC2 with Docker installed).
# Covers the "Linux commands and shell deployment" practice item.
# Usage: ./scripts/deploy.sh [tag]      e.g. ./scripts/deploy.sh v1
set -euo pipefail
cd "$(dirname "$0")/.."

TAG="${1:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M)}"
NAME=eventhub
PORT=80

echo "==> Building $NAME:$TAG"
docker build -t "$NAME:$TAG" .

echo "==> Replacing running container (if any)"
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" --restart unless-stopped \
  -p "$PORT:3000" -e APP_VERSION="$TAG" "$NAME:$TAG"

echo "==> Waiting for health check"
for i in $(seq 1 20); do
  if curl -fsS "http://localhost:$PORT/api/health"; then
    echo; echo "==> EventHub $TAG is running on port $PORT"
    exit 0
  fi
  sleep 2
done

echo "!! Health check failed - container logs:"
docker logs --tail 50 "$NAME"
exit 1
