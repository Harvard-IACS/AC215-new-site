#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
command -v docker >/dev/null || { echo 'Install/start Docker first.' >&2; exit 1; }
# Set DOCKER_DEFAULT_PLATFORM=linux/amd64 on an ARM Mac to match an e2 VM.
docker build --target test --tag backend:check-test "$ROOT/backend"
docker run --rm --init --user 10001:10001 --read-only --cap-drop=ALL \
  --security-opt=no-new-privileges=true --memory=768m --memory-swap=768m --pids-limit=64 \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m backend:check-test
docker build --target production --tag backend:check "$ROOT/backend"
python3 "$ROOT/tests/check_docker.py"
