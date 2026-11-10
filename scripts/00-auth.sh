#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"
load_config
need gcloud
need python3
[[ -f "$KEY_FILE_PATH" ]] || die 'Place the local access JSON key at SERVICE_ACCOUNT_KEY_FILE; see docs/access.md.'
# Validate the identity without logging any private key material.
python3 - "$KEY_FILE_PATH" "$ACCESS_SERVICE_ACCOUNT" <<'PY'
import json
from pathlib import Path
import sys

try:
    key = json.loads(Path(sys.argv[1]).read_text())
except (OSError, ValueError):
    raise SystemExit('Could not read the service-account JSON key.')
if not isinstance(key, dict) or key.get('type') != 'service_account':
    raise SystemExit('Use a service-account JSON key.')
if key.get('client_email') != sys.argv[2]:
    raise SystemExit('The JSON key does not match ACCESS_SERVICE_ACCOUNT.')
PY
gc auth activate-service-account "$ACCESS_SERVICE_ACCOUNT" --key-file="$KEY_FILE_PATH"
require_auth
printf 'Authenticated local access account: %s\n' "$ACCESS_SERVICE_ACCOUNT"
printf 'Next: build/push the backend image. Use ./scripts/ssh.sh after creating the VM.\n'
