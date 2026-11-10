#!/usr/bin/env bash
set -euo pipefail
umask 077
[[ $EUID -eq 0 ]] || { echo 'Run this installer with sudo.' >&2; exit 1; }
[[ $# -ge 2 && $# -le 3 ]] || { echo 'Use: deploy-from-registry.sh IMAGE_REFERENCE single-vm|alb-cdn [gemini|openai|preview]' >&2; exit 1; }
image_ref=$1
mode=$2
provider=${3:-}
case "$mode" in single-vm|alb-cdn) ;; *) echo 'Choose single-vm or alb-cdn.' >&2; exit 1 ;; esac
case "$provider" in ''|gemini|openai|preview) ;; *) echo 'Choose gemini, openai, or preview.' >&2; exit 1 ;; esac
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
registry_host=$(python3 "$SCRIPT_DIR/registry.py" host "$image_ref")
test -f /var/lib/gce-web-bootstrap.ready
docker info >/dev/null
registry_auth=$(mktemp -d /tmp/ac215-registry-XXXXXXXX)
trap 'rm -rf "$registry_auth"' EXIT
# The token comes from the attached VM identity and goes to Docker over stdin.
python3 "$SCRIPT_DIR/registry.py" token | docker --config "$registry_auth" login \
  --username oauth2accesstoken --password-stdin "https://$registry_host"
docker --config "$registry_auth" pull "$image_ref"
rm -rf "$registry_auth"

release=$(mktemp -d /opt/gce-web/releases/release-XXXXXXXX)
mkdir "$release/vm"
cp -R "$SCRIPT_DIR/." "$release/vm/"
if [[ "$mode" == single-vm ]]; then
  test -f "$SCRIPT_DIR/../frontend/dist/index.html"
  mkdir "$release/frontend"
  cp -R "$SCRIPT_DIR/../frontend/dist" "$release/frontend/dist"
fi
printf '%s\n' "$image_ref" > "$release/image-ref.txt"
chmod -R a+rX "$release"
ln -sfn "$release" /opt/gce-web/current
install -m 0644 "$release/vm/webdemo.service" /etc/systemd/system/webdemo.service
install -d -m 0755 /etc/systemd/system/webdemo.service.d
install -m 0644 "$release/vm/webdemo-$mode.conf" /etc/systemd/system/webdemo.service.d/10-network.conf
printf '[Service]\nEnvironment=API_IMAGE=%s\n' "$image_ref" > /etc/systemd/system/webdemo.service.d/20-image.conf
chmod 0644 /etc/systemd/system/webdemo.service.d/20-image.conf
if [[ -n "$provider" ]]; then
  printf '[Service]\nEnvironment=COURSE_PROVIDER=%s\n' "$provider" > /etc/systemd/system/webdemo.service.d/30-provider.conf
  chmod 0644 /etc/systemd/system/webdemo.service.d/30-provider.conf
fi
systemctl daemon-reload
systemctl enable webdemo
systemctl restart webdemo
for attempt in {1..30}; do
  if curl --fail --silent http://127.0.0.1:8000/api/health; then
    printf '\nRegistry image is running.\n'
    exit 0
  fi
  sleep 1
done
journalctl -u webdemo --no-pager -n 40
exit 1
