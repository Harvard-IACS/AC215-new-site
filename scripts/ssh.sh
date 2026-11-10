#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"
load_config
need gcloud
require_auth
vm_ssh "$@"
