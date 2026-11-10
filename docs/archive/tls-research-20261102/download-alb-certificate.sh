#!/usr/bin/env bash
# Copy only the ALB TLS files for Console import. Never copy Google credentials.
set -euo pipefail
umask 077
source "$(dirname "$0")/lib.sh"
load_config
need gcloud
require_auth
destination="$ROOT/secrets/alb-tls"
mkdir -p "$destination"
chmod 0700 "$ROOT/secrets" "$destination"
vm_ssh --command='set -eu
source_dir=/etc/letsencrypt-alb/live/gceweb-alb
sudo test -f "$source_dir/fullchain.pem"
sudo test -f "$source_dir/privkey.pem"
export_dir="$HOME/gceweb-alb-certificate-export"
install -d -m 0700 "$export_dir"
sudo install -m 0600 -o "$(id -u)" -g "$(id -g)" "$source_dir/fullchain.pem" "$export_dir/fullchain.pem"
sudo install -m 0600 -o "$(id -u)" -g "$(id -g)" "$source_dir/privkey.pem" "$export_dir/privkey.pem"'
cleanup_export() {
  vm_ssh --quiet --command='rm -f "$HOME/gceweb-alb-certificate-export/fullchain.pem" "$HOME/gceweb-alb-certificate-export/privkey.pem"; rmdir "$HOME/gceweb-alb-certificate-export" 2>/dev/null || true' >/dev/null
}
trap cleanup_export EXIT
vm_scp "$VM:~/gceweb-alb-certificate-export/fullchain.pem" "$destination/fullchain.pem"
vm_scp "$VM:~/gceweb-alb-certificate-export/privkey.pem" "$destination/privkey.pem"
chmod 0600 "$destination/fullchain.pem" "$destination/privkey.pem"
printf 'Saved the ALB certificate and private key in ignored secrets/alb-tls/. Import them only into the lab HTTPS certificate in Console.\n'
