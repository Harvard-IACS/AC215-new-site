#!/usr/bin/env bash
# Shared configuration and IAP commands for the student deployment helpers.
set -euo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
CONFIG_FILE="$ROOT/config.env"

die() { printf '%s\n' "$*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "Install $1 first; see README.md."; }

load_config() {
  [[ -f "$CONFIG_FILE" ]] || die 'Copy config.env.example to config.env and edit it first.'
  # config.env is your own trusted shell configuration, never a downloaded file.
  source "$CONFIG_FILE"
  : "${PROJECT_ID:?}" "${REGION:?}" "${ZONE:?}" "${PREFIX:?}" "${ACCESS_SERVICE_ACCOUNT:?}" "${SERVICE_ACCOUNT_KEY_FILE:?}"
  DEPLOYMENT_MODE=${DEPLOYMENT_MODE:-single-vm}
  case "$DEPLOYMENT_MODE" in single-vm|alb-cdn) ;; *) die 'DEPLOYMENT_MODE must be single-vm or alb-cdn.' ;; esac
  [[ "$PROJECT_ID" =~ ^[a-z][a-z0-9-]{4,28}[a-z0-9]$ ]] || die 'Invalid project ID.'
  [[ "$PROJECT_ID" != replace-* ]] || die 'Set your real project ID.'
  [[ "$REGION" =~ ^[a-z]+-[a-z]+[0-9]+$ ]] || die 'Invalid region.'
  [[ "$ZONE" =~ ^${REGION}-[a-z]$ ]] || die 'ZONE must be in REGION.'
  [[ "$PREFIX" =~ ^[a-z][a-z0-9-]{2,17}$ ]] || die 'PREFIX must be 3–18 lowercase letters, digits, or hyphens.'
  [[ "$ACCESS_SERVICE_ACCOUNT" =~ ^[a-z][a-z0-9-]{4,28}[a-z0-9]@${PROJECT_ID}\.iam\.gserviceaccount\.com$ ]] || die 'Set ACCESS_SERVICE_ACCOUNT to a service account in PROJECT_ID.'
  VM="$PREFIX-api"
  VM_SERVICE_ACCOUNT="$PREFIX-api@$PROJECT_ID.iam.gserviceaccount.com"
  SSH_SERVICE_ACCOUNT="$PREFIX-ssh@$PROJECT_ID.iam.gserviceaccount.com"
  [[ "$ACCESS_SERVICE_ACCOUNT" != "$VM_SERVICE_ACCOUNT" && "$ACCESS_SERVICE_ACCOUNT" != "$SSH_SERVICE_ACCOUNT" ]] || die 'The local access account must be separate from the managed SSH and VM runtime accounts.'
  case "$SERVICE_ACCOUNT_KEY_FILE" in
    /*) KEY_FILE_PATH="$SERVICE_ACCOUNT_KEY_FILE" ;;
    *) KEY_FILE_PATH="$ROOT/$SERVICE_ACCOUNT_KEY_FILE" ;;
  esac
  REGISTRY_HOST="$REGION-docker.pkg.dev"
  REGISTRY_REPOSITORY="$PREFIX-images"
  IMAGE_NAME="$REGISTRY_HOST/$PROJECT_ID/$REGISTRY_REPOSITORY/backend"
  export PROJECT_ID REGION ZONE PREFIX ACCESS_SERVICE_ACCOUNT
}

gc() { command gcloud --project="$PROJECT_ID" --account="$ACCESS_SERVICE_ACCOUNT" "$@"; }
require_auth() {
  [[ "$(gc auth list --filter="account=$ACCESS_SERVICE_ACCOUNT" --format='value(account)')" == "$ACCESS_SERVICE_ACCOUNT" ]] || die 'Run ./scripts/00-auth.sh to authenticate the configured local access service account.'
}
# Both shell access and file transfers always use IAP and the configured identity.
vm_ssh() {
  gc compute ssh "$VM" --zone="$ZONE" --tunnel-through-iap \
    --impersonate-service-account="$SSH_SERVICE_ACCOUNT" "$@"
}
vm_scp() {
  gc compute scp --zone="$ZONE" --tunnel-through-iap \
    --impersonate-service-account="$SSH_SERVICE_ACCOUNT" "$@"
}
