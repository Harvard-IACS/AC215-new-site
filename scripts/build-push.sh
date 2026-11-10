#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"
load_config
need gcloud
need docker
need python3
require_auth
[[ $# -eq 1 && $1 =~ ^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,127}$ ]] || die 'Run: ./scripts/build-push.sh VERSION (for example v1).'
image_tag="$IMAGE_NAME:$1"
mkdir -p "$ROOT/.build"
rm -f "$ROOT/.build/image-ref.txt"
# Use the existing Docker context; configure the credential helper for this host.
gc auth configure-docker "$REGISTRY_HOST" --quiet
docker build --platform=linux/amd64 --pull --target production --tag "$image_tag" "$ROOT/backend"
CLOUDSDK_CORE_ACCOUNT="$ACCESS_SERVICE_ACCOUNT" docker push "$image_tag" | tee "$ROOT/.build/push.log"
python3 - "$ROOT/.build/push.log" "$IMAGE_NAME" "$ROOT/.build/image-ref.txt" <<'PY'
from pathlib import Path
import re
import sys

digests = re.findall(r'\bdigest:\s*(sha256:[a-f0-9]{64})\b', Path(sys.argv[1]).read_text())
if not digests:
    raise SystemExit('Push output did not contain an image digest. Inspect .build/push.log before deploying.')
reference = sys.argv[2] + '@' + digests[-1]
Path(sys.argv[3]).write_text(reference + '\n')
print('Pinned VM image: ' + reference)
PY
