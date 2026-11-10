#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"
load_config
need gcloud
need python3
require_auth
[[ -f "$ROOT/.build/image-ref.txt" ]] || die 'Run ./scripts/build-push.sh VERSION first.'
python3 "$ROOT/vm/registry.py" host "$(cat "$ROOT/.build/image-ref.txt")" >/dev/null
if [[ "$DEPLOYMENT_MODE" == single-vm ]]; then
  [[ -f "$ROOT/frontend/dist/index.html" && -d "$ROOT/frontend/dist/assets" ]] || die 'Build the frontend first: npm run build --prefix frontend'
fi
mkdir -p "$ROOT/.build"
stage=$(mktemp -d "$ROOT/.build/vm-files-XXXXXXXX")
trap 'rm -rf "$stage"' EXIT
mkdir "$stage/vm"
for name in deploy-from-registry.sh registry.py webdemo.service "webdemo-$DEPLOYMENT_MODE.conf"; do
  cp "$ROOT/vm/$name" "$stage/vm/$name"
done
cp "$ROOT/.build/image-ref.txt" "$stage/image-ref.txt"
if [[ "$DEPLOYMENT_MODE" == single-vm ]]; then
  for name in install-nginx.sh render-nginx.py nginx.conf.in nginx-security.conf; do
    cp "$ROOT/vm/$name" "$stage/vm/$name"
  done
  mkdir "$stage/frontend"
  cp -R "$ROOT/frontend/dist" "$stage/frontend/dist"
fi
COPYFILE_DISABLE=1 tar --no-xattrs -czf "$ROOT/.build/course-vm.tar.gz" -C "$stage" .
vm_scp "$ROOT/.build/course-vm.tar.gz" "$VM:~/course-vm.tar.gz"
printf 'Uploaded VM files through IAP. Follow the VM commands in the %s guide.\n' "$DEPLOYMENT_MODE"
